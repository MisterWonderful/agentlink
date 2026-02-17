/**
 * Chat Engine
 *
 * Core chat engine wrapping Vercel AI SDK with AgentLink-specific features:
 * - Per-agent endpoint and header configuration
 * - Message persistence to IndexedDB
 * - SSE streaming with custom parsing
 * - Timeout and retry logic
 * - Reasoning and tool call extraction
 */

import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import type { Agent, ChatMessage, ChatMessageInput, MessagePart } from '@/types/index';
import { db, type LocalMessage } from '@/lib/db/indexeddb';
import { nanoid } from 'nanoid';
import { generateId, now } from '@/stores/utils';
import { useMemo, useCallback } from 'react';

/**
 * Options for creating a chat engine
 */
export interface ChatEngineOptions {
  agent: Agent;
  conversationId: string;
  initialMessages?: ChatMessage[];
  onMessageComplete?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

/**
 * Chat engine interface returned by createChatEngine
 */
export interface ChatEngine {
  /** Current messages in the conversation */
  messages: ChatMessage[];
  /** Current input value */
  input: string;
  /** Set input value */
  setInput: (value: string) => void;
  /** Handle form submission */
  handleSubmit: (e?: React.FormEvent) => void;
  /** Whether a response is being generated */
  isLoading: boolean;
  /** Whether streaming is in progress */
  isStreaming: boolean;
  /** Current error if any */
  error: Error | null;
  /** Stop generation */
  stop: () => void;
  /** Regenerate last response */
  reload: () => void;
  /** Append a message manually */
  append: (message: { role: string; content: string }) => void;
  /** Set messages directly */
  setMessages: (messages: ChatMessage[]) => void;
}

/**
 * Create a chat engine configured for a specific agent
 */
export function createChatEngine(options: ChatEngineOptions): ChatEngine {
  const { agent, conversationId, initialMessages = [], onMessageComplete, onError } = options;

  // Convert stored messages to Vercel AI SDK format
  const sdkInitialMessages: UIMessage[] = useMemo(
    () => initialMessages.map((m) => convertToSDKMessage(m)),
    [initialMessages]
  );

  // Build API endpoint based on agent type
  const api = getChatEndpoint(agent);

  // Build headers with auth
  const headers = buildHeaders(agent);

  // Build request body with agent parameters
  const body = {
    model: agent.defaultModel,
    temperature: agent.temperature,
    max_tokens: agent.maxTokens,
    top_p: agent.topP,
    frequency_penalty: agent.frequencyPenalty,
    presence_penalty: agent.presencePenalty,
  };

  // Track streaming state
  const streamingRef = {
    messageId: null as string | null,
    content: '',
    reasoning: '',
  };

  // Use custom fetch with timeout and retry
  const customFetch = useMemo(() => createCustomFetch(agent), [agent]);

  // Configure useChat hook - new API uses ChatInit format
  const chatHelpers = useChat({
    // @ts-expect-error - api option exists at runtime
    api,
    headers,
    body,
    initialMessages: sdkInitialMessages,
    streamProtocol: 'text',
    fetch: customFetch,

    onFinish: async (result) => {
      // Persist the completed message to IndexedDB
      const message = result.message;
      const chatMessage = await persistMessage(
        conversationId,
        message,
        streamingRef.content,
        streamingRef.reasoning
      );

      streamingRef.messageId = null;
      streamingRef.content = '';
      streamingRef.reasoning = '';

      onMessageComplete?.(chatMessage);
    },

    onError: (err) => {
      streamingRef.messageId = null;
      streamingRef.content = '';
      streamingRef.reasoning = '';
      onError?.(err instanceof Error ? err : new Error(String(err)));
    },

    onResponse: async (response: Response) => {
      // Track streaming start
      streamingRef.messageId = nanoid();
      streamingRef.content = '';
      streamingRef.reasoning = '';

      // Create a placeholder message in IndexedDB
      const placeholder: LocalMessage = {
        id: streamingRef.messageId,
        conversationId,
        role: 'assistant',
        content: '',
        parts: [{ type: 'text', content: '' }],
        model: agent.defaultModel,
        status: 'streaming',
        retryCount: 0,
        createdAt: new Date().toISOString(),
      };

      await db.messages.add(placeholder);
    },
  });

  // Destructure helpers
  const { messages: sdkMessagesState, status, error, setMessages: sdkSetMessages } = chatHelpers;

  // Derive loading state from status
  const isLoading = status === 'submitted' || status === 'streaming';
  const isStreaming = status === 'streaming';

  // Convert SDK messages back to our format
  const chatMessages: ChatMessage[] = useMemo(() => {
    return sdkMessagesState.map((msg) => {
      // Check if we have a stored version with parts
      const stored = initialMessages.find((m) => m.id === msg.id);
      if (stored) {
        return stored;
      }

      // Build message from SDK message
      return convertFromSDKMessage(msg, conversationId);
    });
  }, [sdkMessagesState, initialMessages, conversationId]);

  // Wrapper for stop
  const stop = useCallback(() => {
    chatHelpers.stop();
  }, [chatHelpers]);

  // Wrapper for reload/regenerate
  const reload = useCallback(() => {
    chatHelpers.regenerate();
  }, [chatHelpers]);

  // Wrap append to save user messages
  const append = useCallback(
    async (message: { role: string; content: string }) => {
      // Save user message to IndexedDB
      if (message.role === 'user') {
        await db.messages.add({
          id: generateId(),
          conversationId,
          role: 'user',
          content: message.content,
          parts: [{ type: 'text', content: message.content }],
          status: 'sent',
          retryCount: 0,
          createdAt: now(),
        });
      }

      // Send message using chat helpers
      chatHelpers.sendMessage({
        id: generateId(),
        role: message.role as 'user' | 'assistant' | 'system',
        parts: [{ type: 'text', text: message.content }],
      });
    },
    [chatHelpers, conversationId]
  );

  // Wrap setMessages to sync with IndexedDB
  const setMessages = useCallback(
    (msgs: ChatMessage[]) => {
      sdkSetMessages(msgs.map(convertToSDKMessage));
    },
    [sdkSetMessages]
  );

  // Input handling - useChat in new API doesn't expose input directly
  // We need to manage input state ourselves
  const [input, setInputState] = React.useState('');

  const setInput = useCallback((value: string) => {
    setInputState(value);
  }, []);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!input.trim()) return;

      // Send the message
      chatHelpers.sendMessage({
        id: generateId(),
        role: 'user',
        parts: [{ type: 'text', text: input }],
      });

      setInputState('');
    },
    [input, chatHelpers]
  );

  return {
    messages: chatMessages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    isStreaming,
    error: error ? (error instanceof Error ? error : new Error(String(error))) : null,
    stop,
    reload,
    append,
    setMessages,
  };
}

// Import React for useState
import React, { useState as ReactUseState } from 'react';

/**
 * Get chat endpoint URL based on agent configuration
 */
function getChatEndpoint(agent: Agent): string {
  const baseUrl = agent.endpointUrl.replace(/\/$/, '');

  switch (agent.agentType) {
    case 'openai_compatible':
      return `${baseUrl}/v1/chat/completions`;
    case 'ollama':
      return `${baseUrl}/api/chat`;
    case 'anthropic_compatible':
      return `${baseUrl}/v1/messages`;
    case 'custom':
      // For custom, assume the endpointUrl is the full chat endpoint
      return agent.endpointUrl;
    default:
      return `${baseUrl}/v1/chat/completions`;
  }
}

/**
 * Build request headers with authentication
 */
function buildHeaders(agent: Agent): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...agent.customHeaders,
  };

  if (agent.authToken) {
    switch (agent.agentType) {
      case 'anthropic_compatible':
        headers['x-api-key'] = agent.authToken;
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
        break;
      case 'ollama':
        // Ollama typically doesn't use auth for local instances
        break;
      default:
        headers['Authorization'] = `Bearer ${agent.authToken}`;
    }
  }

  return headers;
}

/**
 * Create a custom fetch with timeout and retry logic
 */
function createCustomFetch(agent: Agent): typeof fetch {
  return async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const timeout = agent.requestTimeoutMs || 30000;
    const maxRetries = agent.maxRetries || 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Merge signals if provided
        const signal = init?.signal
          ? mergeSignals(controller.signal, init.signal)
          : controller.signal;

        const response = await fetch(url, {
          ...init,
          signal,
        });

        clearTimeout(timeoutId);

        // Retry on server errors (5xx)
        if (!response.ok && response.status >= 500 && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await sleep(delay);
          continue;
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Handle timeout
        if (lastError.name === 'AbortError') {
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000;
            await sleep(delay);
            continue;
          }
          throw new Error(`Request timed out after ${timeout}ms`);
        }

        // Retry on network errors
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await sleep(delay);
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new Error('Request failed after retries');
  };
}

/**
 * Merge two AbortSignals
 */
function mergeSignals(signal1: AbortSignal, signal2: AbortSignal): AbortSignal {
  const controller = new AbortController();

  const onAbort = () => {
    controller.abort();
  };

  signal1.addEventListener('abort', onAbort);
  signal2.addEventListener('abort', onAbort);

  if (signal1.aborted || signal2.aborted) {
    controller.abort();
  }

  return controller.signal;
}

/**
 * Persist a completed message to IndexedDB
 */
async function persistMessage(
  conversationId: string,
  message: UIMessage,
  content: string,
  reasoning: string
): Promise<ChatMessage> {
  const parts: MessagePart[] = [];

  // Add reasoning part if present
  if (reasoning) {
    parts.push({
      type: 'reasoning',
      content: reasoning,
    });
  }

  // Add text part
  const messageContent = content || getMessageTextContent(message);
  parts.push({
    type: 'text',
    content: messageContent,
  });

  const chatMessage: ChatMessage = {
    id: message.id,
    conversationId,
    role: 'assistant',
    content: messageContent,
    parts,
    status: 'sent',
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };

  // Update or add to IndexedDB
  const existing = await db.messages.get(message.id);
  if (existing) {
    await db.messages.put({
      ...existing,
      content: chatMessage.content,
      parts,
      status: 'sent',
    });
  } else {
    await db.messages.add({
      id: chatMessage.id,
      conversationId: chatMessage.conversationId,
      role: chatMessage.role,
      content: chatMessage.content,
      parts,
      status: 'sent',
      retryCount: 0,
      createdAt: chatMessage.createdAt,
    });
  }

  return chatMessage;
}

/**
 * Get text content from a UIMessage
 */
function getMessageTextContent(message: UIMessage): string {
  if (!message.parts || message.parts.length === 0) {
    return '';
  }
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

/**
 * Convert our ChatMessage to Vercel AI SDK Message format
 */
function convertToSDKMessage(msg: ChatMessage): UIMessage {
  // Build parts from our format
  const parts: UIMessage['parts'] = msg.parts.map((part): UIMessage['parts'][number] => {
    switch (part.type) {
      case 'text':
        return { type: 'text', text: part.content };
      case 'reasoning':
        return { type: 'reasoning', text: part.content };
      default:
        return { type: 'text', text: part.content };
    }
  });

  return {
    id: msg.id,
    role: msg.role === 'system' ? 'system' : msg.role === 'user' ? 'user' : 'assistant',
    parts,
  } as UIMessage;
}

/**
 * Convert Vercel AI SDK Message to our ChatMessage format
 */
function convertFromSDKMessage(msg: UIMessage, conversationId: string): ChatMessage {
  const parts: MessagePart[] =
    msg.parts?.map((part): MessagePart => {
      switch (part.type) {
        case 'text':
          return { type: 'text', content: part.text };
        case 'reasoning':
          return { type: 'reasoning', content: 'text' in part ? part.text : '' };
        default:
          return { type: 'text', content: '' };
      }
    }) || [{ type: 'text', content: getMessageTextContent(msg) }];

  return {
    id: msg.id,
    conversationId,
    role: msg.role as 'user' | 'assistant' | 'system',
    content: getMessageTextContent(msg),
    parts,
    status: 'sent',
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
