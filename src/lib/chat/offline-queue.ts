/**
 * Offline Message Queue
 *
 * Manages queuing and processing of messages when offline.
 * Messages are stored in IndexedDB and sent when connectivity returns.
 */

import { nanoid } from 'nanoid';
import type { ChatMessage, ChatMessageInput } from '@/types/index';
import { db, type LocalMessage } from '@/lib/db/indexeddb';

/**
 * Queue a message for sending when back online
 */
export async function queueMessage(
  conversationId: string,
  content: string
): Promise<ChatMessage> {
  const timestamp = new Date().toISOString();
  const id = nanoid();

  const localMessage: LocalMessage = {
    id,
    conversationId,
    role: 'user',
    content,
    parts: [{ type: 'text', content }],
    status: 'queued',
    retryCount: 0,
    createdAt: timestamp,
  };

  // Save to IndexedDB
  await db.messages.add(localMessage);

  return {
    id,
    conversationId,
    role: 'user',
    content,
    parts: [{ type: 'text', content }],
    status: 'queued',
    retryCount: 0,
    createdAt: timestamp,
  };
}

/**
 * Get all queued messages for a conversation
 */
export async function getQueuedMessages(conversationId: string): Promise<LocalMessage[]> {
  return db.messages
    .where({ conversationId, status: 'queued' })
    .sortBy('createdAt');
}

/**
 * Get total count of queued messages across all conversations
 */
export async function getQueuedMessageCount(): Promise<number> {
  return db.messages.where('status').equals('queued').count();
}

/**
 * Process all queued messages
 * Attempts to send each message and updates status accordingly
 */
export async function processQueue(): Promise<{
  processed: number;
  failed: number;
  remaining: number;
}> {
  const queuedMessages = await db.messages
    .where('status')
    .equals('queued')
    .sortBy('createdAt');

  let processed = 0;
  let failed = 0;

  for (const message of queuedMessages) {
    try {
      await processQueuedMessage(message);
      processed++;
    } catch (error) {
      const newRetryCount = message.retryCount + 1;
      const maxRetries = 3;

      if (newRetryCount >= maxRetries) {
        // Mark as failed after max retries
        await db.messages.update(message.id, {
          status: 'failed',
          retryCount: newRetryCount,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      } else {
        // Increment retry count, keep queued
        await db.messages.update(message.id, {
          retryCount: newRetryCount,
        });
      }
    }
  }

  const remaining = await getQueuedMessageCount();

  return { processed, failed, remaining };
}

/**
 * Process a single queued message
 * Requires the agent chat hook to handle the actual sending
 */
async function processQueuedMessage(message: LocalMessage): Promise<void> {
  // Get conversation to find agent
  const conversation = await db.conversations.get(message.conversationId);
  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Get agent config
  const agent = await db.agents.get(conversation.agentId);
  if (!agent) {
    throw new Error('Agent not found');
  }

  // Mark as sending
  await db.messages.update(message.id, { status: 'sending' });

  // Build message history for context
  const history = await db.messages
    .where('conversationId')
    .equals(message.conversationId)
    .filter((m) => m.status === 'sent' || m.id === message.id)
    .sortBy('createdAt');

  // Prepare request body based on agent type
  const body = {
    model: agent.defaultModel || 'default',
    messages: history.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: agent.temperature,
    max_tokens: agent.maxTokens,
    top_p: agent.topP,
    frequency_penalty: agent.frequencyPenalty,
    presence_penalty: agent.presencePenalty,
    stream: false, // Don't stream queued messages
  };

  // Determine endpoint
  const endpoint = getChatEndpoint(agent.agentType, agent.endpointUrl);

  // Send request
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(agent.authToken && { Authorization: `Bearer ${agent.authToken}` }),
      ...agent.customHeaders,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(agent.requestTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // Parse response based on agent type
  const data = (await response.json()) as unknown;
  const parsed = parseResponse(agent.agentType, data);

  // Mark user message as sent
  await db.messages.update(message.id, {
    status: 'sent',
  });

  // Add assistant response
  await db.messages.add({
    id: nanoid(),
    conversationId: message.conversationId,
    role: 'assistant',
    content: parsed.content,
    parts: parsed.parts,
    status: 'sent',
    retryCount: 0,
    createdAt: new Date().toISOString(),
  });

  // Update conversation metadata
  await db.conversations.update(message.conversationId, {
    messageCount: history.length + 1,
    lastMessagePreview: parsed.content.slice(0, 100),
    lastMessageRole: 'assistant',
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Clear all failed messages from the queue
 */
export async function clearFailedMessages(conversationId?: string): Promise<number> {
  let query = db.messages.where('status').equals('failed');

  if (conversationId) {
    query = query.filter((m) => m.conversationId === conversationId);
  }

  const failed = await query.toArray();
  await db.messages.bulkDelete(failed.map((m) => m.id));

  return failed.length;
}

/**
 * Retry a failed message
 */
export async function retryFailedMessage(messageId: string): Promise<void> {
  const message = await db.messages.get(messageId);
  if (!message || message.status !== 'failed') {
    throw new Error('Message not found or not in failed state');
  }

  await db.messages.update(messageId, {
    status: 'queued',
    retryCount: 0,
    error: undefined,
  });

  // Try to process immediately
  await processQueue();
}

/**
 * Get chat endpoint URL based on agent type
 */
function getChatEndpoint(agentType: string, baseUrl: string): string {
  const normalized = baseUrl.replace(/\/$/, '');

  switch (agentType) {
    case 'openai_compatible':
      return `${normalized}/v1/chat/completions`;
    case 'ollama':
      return `${normalized}/api/chat`;
    case 'anthropic_compatible':
      return `${normalized}/v1/messages`;
    default:
      return `${normalized}/v1/chat/completions`;
  }
}

/**
 * Parse response based on agent type
 */
function parseResponse(
  agentType: string,
  data: unknown
): { content: string; parts: ChatMessage['parts'] } {
  const obj = data as Record<string, unknown>;

  switch (agentType) {
    case 'openai_compatible':
      // OpenAI format: choices[0].message.content
      if (obj.choices && Array.isArray(obj.choices)) {
        const choice = obj.choices[0] as Record<string, unknown>;
        const message = choice?.message as Record<string, unknown>;
        const content = String(message?.content || '');
        return {
          content,
          parts: [{ type: 'text' as const, content }],
        };
      }
      break;

    case 'ollama':
      // Ollama format: message.content
      if (obj.message) {
        const message = obj.message as Record<string, unknown>;
        const content = String(message.content || '');
        return {
          content,
          parts: [{ type: 'text' as const, content }],
        };
      }
      break;

    case 'anthropic_compatible':
      // Anthropic format: content[0].text
      if (obj.content && Array.isArray(obj.content)) {
        const content = (obj.content as Array<{ text?: string }>)
          .map((c) => c.text)
          .filter(Boolean)
          .join('');
        return {
          content,
          parts: [{ type: 'text' as const, content }],
        };
      }
      break;
  }

  // Fallback: try common patterns
  const content = String(
    obj.content || obj.text || obj.response || obj.output || ''
  );
  return {
    content,
    parts: [{ type: 'text' as const, content }],
  };
}

/**
 * Subscribe to queue changes
 * Returns a function to unsubscribe
 */
export function subscribeToQueue(
  callback: (count: number) => void
): () => void {
  let lastCount = -1;

  // Check queue count periodically
  const checkCount = async () => {
    const count = await getQueuedMessageCount();
    if (count !== lastCount) {
      lastCount = count;
      callback(count);
    }
  };

  // Initial check
  void checkCount();

  // Set up interval
  const interval = setInterval(checkCount, 2000);

  // Return unsubscribe function
  return () => clearInterval(interval);
}
