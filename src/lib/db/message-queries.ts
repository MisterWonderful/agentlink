import { db, type LocalMessage, type MessageStatus } from './indexeddb';
import { updateConversationLastMessage } from './conversation-queries';

/**
 * Get all messages for a conversation, sorted by createdAt ascending.
 * @param conversationId - Conversation ID
 * @returns Array of messages in chronological order
 */
export async function getMessagesByConversation(
  conversationId: string
): Promise<LocalMessage[]> {
  return db.messages
    .where('[conversationId+createdAt]')
    .equals([conversationId, Dexie.minKey])
    .until(msg => msg.conversationId !== conversationId)
    .toArray();
}

/**
 * Get a single message by its ID.
 * @param id - Message ID
 * @returns The message or undefined if not found
 */
export async function getMessageById(id: string): Promise<LocalMessage | undefined> {
  return db.messages.get(id);
}

/**
 * Create a new message.
 * @param message - Message data (without id, createdAt)
 * @param updateConversation - Whether to update conversation metadata (default: true)
 * @returns The created message
 */
export async function createMessage(
  message: Omit<LocalMessage, 'id' | 'createdAt'>,
  updateConversation: boolean = true
): Promise<LocalMessage> {
  const now = new Date().toISOString();
  const newMessage: LocalMessage = {
    ...message,
    id: crypto.randomUUID(),
    createdAt: now,
  };
  
  await db.messages.add(newMessage);
  
  // Update conversation metadata
  if (updateConversation) {
    try {
      await updateConversationLastMessage(
        message.conversationId,
        message.content,
        message.role === 'assistant' ? 'assistant' : 'user'
      );
    } catch {
      // Conversation might not exist, ignore error
    }
  }
  
  return newMessage;
}

/**
 * Update an existing message.
 * @param id - Message ID to update
 * @param updates - Partial message data to update
 * @throws Error if message not found
 */
export async function updateMessage(
  id: string,
  updates: Partial<Omit<LocalMessage, 'id' | 'createdAt'>>
): Promise<void> {
  const existing = await db.messages.get(id);
  if (!existing) {
    throw new Error(`Message with id ${id} not found`);
  }
  
  await db.messages.update(id, updates);
}

/**
 * Append content to an existing message (for streaming).
 * @param id - Message ID
 * @param contentDelta - Content to append
 */
export async function appendMessageContent(
  id: string,
  contentDelta: string
): Promise<void> {
  const existing = await db.messages.get(id);
  if (!existing) {
    throw new Error(`Message with id ${id} not found`);
  }
  
  await db.messages.update(id, {
    content: existing.content + contentDelta,
  });
}

/**
 * Update message status.
 * @param id - Message ID
 * @param status - New status
 * @param error - Optional error message for failed status
 */
export async function updateMessageStatus(
  id: string,
  status: MessageStatus,
  error?: string
): Promise<void> {
  const updates: Partial<LocalMessage> = { status };
  if (error !== undefined) {
    updates.error = error;
  }
  await db.messages.update(id, updates);
}

/**
 * Increment retry count for a message.
 * @param id - Message ID
 */
export async function incrementRetryCount(id: string): Promise<void> {
  const existing = await db.messages.get(id);
  if (!existing) {
    throw new Error(`Message with id ${id} not found`);
  }
  
  await db.messages.update(id, {
    retryCount: existing.retryCount + 1,
  });
}

/**
 * Delete a single message.
 * @param id - Message ID to delete
 */
export async function deleteMessage(id: string): Promise<void> {
  await db.messages.delete(id);
}

/**
 * Delete all messages for a conversation.
 * @param conversationId - Conversation ID
 */
export async function deleteMessagesByConversation(conversationId: string): Promise<void> {
  await db.messages
    .where('conversationId')
    .equals(conversationId)
    .delete();
}

/**
 * Get messages with 'queued' status (pending send).
 * @returns Array of queued messages
 */
export async function getQueuedMessages(): Promise<LocalMessage[]> {
  return db.messages
    .where('status')
    .equals('queued')
    .toArray();
}

/**
 * Get messages with 'failed' status.
 * @returns Array of failed messages
 */
export async function getFailedMessages(): Promise<LocalMessage[]> {
  return db.messages
    .where('status')
    .equals('failed')
    .toArray();
}

/**
 * Get messages with 'sending' or 'streaming' status.
 * Useful for resuming interrupted operations on app startup.
 * @returns Array of in-progress messages
 */
export async function getInProgressMessages(): Promise<LocalMessage[]> {
  return db.messages
    .where('status')
    .anyOf(['sending', 'streaming'])
    .toArray();
}

/**
 * Search messages by content.
 * Uses case-insensitive substring matching.
 * @param query - Search query string
 * @param agentId - Optional agent ID to limit search to specific agent's conversations
 * @param limit - Maximum number of results (default: 50)
 * @returns Array of matching messages
 */
export async function searchMessages(
  query: string,
  agentId?: string,
  limit: number = 50
): Promise<LocalMessage[]> {
  const lowerQuery = query.toLowerCase();
  
  if (agentId) {
    // Get conversation IDs for this agent first
    const conversations = await db.conversations
      .where('agentId')
      .equals(agentId)
      .toArray();
    const conversationIds = conversations.map(c => c.id);
    
    if (conversationIds.length === 0) {
      return [];
    }
    
    return db.messages
      .where('conversationId')
      .anyOf(conversationIds)
      .filter(msg => msg.content.toLowerCase().includes(lowerQuery))
      .reverse()
      .limit(limit)
      .toArray();
  }
  
  // Search all messages
  return db.messages
    .orderBy('createdAt')
    .reverse()
    .filter(msg => msg.content.toLowerCase().includes(lowerQuery))
    .limit(limit)
    .toArray();
}

/**
 * Get the most recent messages across all conversations.
 * @param limit - Maximum number of messages (default: 50)
 * @returns Array of recent messages
 */
export async function getRecentMessages(limit: number = 50): Promise<LocalMessage[]> {
  return db.messages
    .orderBy('createdAt')
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * Get message count for a conversation.
 * @param conversationId - Conversation ID
 * @returns Message count
 */
export async function countMessagesByConversation(conversationId: string): Promise<number> {
  return db.messages
    .where('conversationId')
    .equals(conversationId)
    .count();
}

/**
 * Get total message count across all conversations.
 * @returns Total message count
 */
export async function countAllMessages(): Promise<number> {
  return db.messages.count();
}

/**
 * Bulk create messages (useful for import/sync).
 * @param messages - Array of message data
 * @returns Array of created messages
 */
export async function bulkCreateMessages(
  messages: Omit<LocalMessage, 'id' | 'createdAt'>[]
): Promise<LocalMessage[]> {
  const now = new Date().toISOString();
  
  const newMessages: LocalMessage[] = messages.map(message => ({
    ...message,
    id: crypto.randomUUID(),
    createdAt: now,
  }));
  
  await db.messages.bulkAdd(newMessages);
  return newMessages;
}

/**
 * Delete old messages to free up storage space.
 * @param beforeDate - Delete messages created before this date
 * @returns Number of messages deleted
 */
export async function pruneMessages(beforeDate: Date): Promise<number> {
  const isoDate = beforeDate.toISOString();
  return db.messages
    .where('createdAt')
    .below(isoDate)
    .delete();
}

/**
 * Get messages by status.
 * @param status - Message status to filter by
 * @returns Array of messages with the specified status
 */
export async function getMessagesByStatus(status: MessageStatus): Promise<LocalMessage[]> {
  return db.messages
    .where('status')
    .equals(status)
    .toArray();
}

/**
 * Clear error from a failed message and set status to queued for retry.
 * @param id - Message ID
 */
export async function retryFailedMessage(id: string): Promise<void> {
  const existing = await db.messages.get(id);
  if (!existing) {
    throw new Error(`Message with id ${id} not found`);
  }
  
  if (existing.status !== 'failed') {
    throw new Error(`Message with id ${id} is not in failed status`);
  }
  
  await db.messages.update(id, {
    status: 'queued',
    error: undefined,
  });
}

// Import Dexie for minKey and conversations table reference
import Dexie from 'dexie';
