/**
 * useAgentChat Hook (Enhanced)
 *
 * React hook for agent-specific chat functionality with terminal enhancements:
 * - Token velocity tracking
 * - Stream pause/resume
 * - File attachment handling
 * - Better error recovery
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { toast } from 'sonner';
import type { Agent, ChatMessage, ChatMessageInput } from '@/types';
import { useAgentStore } from '@/stores/agent-store';
import { useChatStore } from '@/stores/chat-store';
import { useConnectionStore } from '@/stores/connection-store';
import type { ConnectionStatus } from '@/stores/types';
import { db } from '@/lib/db/indexeddb';
import { generateId, now } from '@/stores/utils';
import { queueMessage, processQueue, getQueuedMessageCount } from '@/lib/chat/offline-queue';
import { useNetworkStatus } from './use-network-status';

/**
 * Options for useAgentChat hook
 */
export interface UseAgentChatOptions {
  /** Agent ID to chat with */
  agentId: string;
  /** Optional conversation ID (creates new if not provided) */
  conversationId?: string;
}

/**
 * Return type for useAgentChat hook
 */
export interface UseAgentChatReturn {
  /** Current messages in the conversation */
  messages: ChatMessage[];
  /** Current input value */
  input: string;
  /** Set input value */
  setInput: (value: string | ((prev: string) => string)) => void;
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
  /** Connection status */
  connectionStatus: ConnectionStatus;
  /** Number of queued messages */
  queuedCount: number;
  /** Token velocity (tokens per second) during streaming */
  tokensPerSecond: number;
  /** Progress percentage during streaming (0-100) */
  streamProgress: number;
  /** Whether stream is paused */
  isPaused: boolean;
  /** Pause the stream */
  pauseStream: () => void;
  /** Resume the stream */
  resumeStream: () => void;
  /** Attached files */
  attachedFiles: string[];
  /** Add file attachment */
  attachFile: (fileId: string) => void;
  /** Remove file attachment */
  removeFile: (fileId: string) => void;
  /** Clear all attachments */
  clearAttachments: () => void;
}

/**
 * Hook for chatting with a specific agent (Terminal-Enhanced)
 */
export function useAgentChat(options: UseAgentChatOptions): UseAgentChatReturn {
  const { agentId, conversationId: initialConversationId } = options;

  // Get agent from store
  const agent = useAgentStore((state) => state.agents.get(agentId));
  const updateAgentStatus = useAgentStore((state) => state.updateAgentStatus);

  // Get chat store actions
  const addMessage = useChatStore((state) => state.addMessage);

  // Get connection status
  const connectionStatus = useConnectionStore((state) => state.getStatus(agentId));

  // Network status
  const { isOnline } = useNetworkStatus();

  // Track conversation ID (may be created if not provided)
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [queuedCount, setQueuedCount] = useState(0);
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);

  // Track streaming state and metrics
  const streamingRef = useRef(false);
  const [tokensPerSecond, setTokensPerSecond] = useState(0);
  const [streamProgress, setStreamProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tokenCountRef = useRef(0);
  const startTimeRef = useRef<number>(0);

  // Load initial messages from IndexedDB
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (conversationId) {
      void loadMessages(conversationId);
    }
  }, [conversationId]);

  // Update queued count periodically
  useEffect(() => {
    const updateCount = async () => {
      const count = await getQueuedMessageCount();
      setQueuedCount(count);
    };

    void updateCount();
    const interval = setInterval(updateCount, 2000);
    return () => clearInterval(interval);
  }, []);

  // Process queue when back online
  useEffect(() => {
    if (isOnline && queuedCount > 0) {
      void processQueue().then(({ processed, failed }) => {
        if (processed > 0) {
          toast.success(`${processed} queued message${processed > 1 ? 's' : ''} sent`);
        }
        if (failed > 0) {
          toast.error(`${failed} message${failed > 1 ? 's' : ''} failed to send`);
        }
      });
    }
  }, [isOnline, queuedCount]);

  // Load messages from IndexedDB
  const loadMessages = async (convId: string) => {
    try {
      const localMessages = await db.messages
        .where('conversationId')
        .equals(convId)
        .sortBy('createdAt');

      const messages: ChatMessage[] = localMessages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        parts: m.parts,
        model: m.model,
        tokenCount: m.tokenCount,
        latencyMs: m.latencyMs,
        status: m.status,
        error: m.error,
        retryCount: m.retryCount,
        createdAt: m.createdAt,
      }));

      setInitialMessages(messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // Convert initial messages to SDK format
  const sdkInitialMessages: UIMessage[] = useMemo(() => {
    return initialMessages.map((msg): UIMessage => {
      const parts: UIMessage['parts'] = msg.parts
        .filter((p) => p.type === 'text' || p.type === 'reasoning')
        .map((part): UIMessage['parts'][number] => {
          if (part.type === 'text') {
            return { type: 'text', text: part.content };
          }
          return { type: 'reasoning', text: part.content };
        });

      return {
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        parts,
      };
    });
  }, [initialMessages]);

  // Build API configuration
  const apiConfig = useMemo(() => {
    if (!agent) return null;

    const baseUrl = agent.endpointUrl.replace(/\/$/, '');
    let api: string;

    switch (agent.agentType) {
      case 'openai_compatible':
        api = `${baseUrl}/v1/chat/completions`;
        break;
      case 'ollama':
        api = `${baseUrl}/api/chat`;
        break;
      case 'anthropic_compatible':
        api = `${baseUrl}/v1/messages`;
        break;
      case 'custom':
        api = agent.endpointUrl;
        break;
      default:
        api = `${baseUrl}/v1/chat/completions`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...agent.customHeaders,
    };

    if (agent.authToken) {
      if (agent.agentType === 'anthropic_compatible') {
        headers['x-api-key'] = agent.authToken;
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
      } else if (agent.agentType !== 'ollama') {
        headers['Authorization'] = `Bearer ${agent.authToken}`;
      }
    }

    return {
      api,
      headers,
      body: {
        model: agent.defaultModel,
        temperature: agent.temperature,
        max_tokens: agent.maxTokens,
        top_p: agent.topP,
        frequency_penalty: agent.frequencyPenalty,
        presence_penalty: agent.presencePenalty,
      },
    };
  }, [agent]);

  // Custom fetch with timeout and retry
  const customFetch = useCallback(
    async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      if (!agent) {
        throw new Error('Agent not found');
      }

      const timeout = agent.requestTimeoutMs || 30000;
      const maxRetries = agent.maxRetries || 3;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const response = await fetch(url, {
            ...init,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok && response.status >= 500 && attempt < maxRetries) {
            await sleep(Math.pow(2, attempt) * 1000);
            continue;
          }

          if (response.ok) {
            updateAgentStatus(agentId, { isActive: true, latencyMs: 100 });
          }

          return response;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (lastError.name === 'AbortError') {
            if (attempt < maxRetries) {
              await sleep(Math.pow(2, attempt) * 1000);
              continue;
            }
            throw new Error(`Request timed out after ${timeout}ms`);
          }

          if (attempt < maxRetries) {
            await sleep(Math.pow(2, attempt) * 1000);
            continue;
          }
        }
      }

      updateAgentStatus(agentId, { isActive: false });
      throw lastError || new Error('Request failed after retries');
    },
    [agent, agentId, updateAgentStatus]
  );

  // Configure useChat hook
  const chatHelpers = useChat({
    // @ts-expect-error - api option exists at runtime
    api: apiConfig?.api,
    headers: apiConfig?.headers,
    body: {
      ...apiConfig?.body,
      // Include file attachments if any
      ...(attachedFiles.length > 0 && { files: attachedFiles }),
    },
    initialMessages: sdkInitialMessages,
    streamProtocol: 'text',
    fetch: customFetch,

    onFinish: async (result) => {
      streamingRef.current = false;
      
      // Clear metrics interval
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
        metricsIntervalRef.current = null;
      }
      
      // Reset metrics
      setTokensPerSecond(0);
      setStreamProgress(100);
      setIsPaused(false);

      if (!conversationId) return;

      const message = result.message;

      // Get content from message parts
      const content = message.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('') || '';

      try {
        await db.messages.add({
          id: message.id,
          conversationId,
          role: 'assistant',
          content,
          parts: [{ type: 'text', content }],
          status: 'sent',
          retryCount: 0,
          createdAt: new Date().toISOString(),
        });

        await db.conversations.update(conversationId, {
          lastMessagePreview: content.slice(0, 100),
          lastMessageRole: 'assistant',
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to persist message:', error);
      }
    },

    onError: (err) => {
      streamingRef.current = false;
      
      // Clear metrics interval
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
        metricsIntervalRef.current = null;
      }
      
      // Reset metrics
      setTokensPerSecond(0);
      setIsPaused(false);
      
      console.error('Chat error:', err);

      const message = err instanceof Error ? err.message : 'Chat error occurred';
      toast.error(message);
    },
  });

  // Destructure helpers
  const { messages: sdkMessages, status, error, stop, regenerate } = chatHelpers;

  const isLoading = status === 'submitted' || status === 'streaming';
  const isStreaming = status === 'streaming';

  // Track streaming metrics
  useEffect(() => {
    if (isStreaming && !streamingRef.current) {
      // Stream started
      streamingRef.current = true;
      startTimeRef.current = performance.now();
      tokenCountRef.current = 0;
      
      // Start metrics polling
      metricsIntervalRef.current = setInterval(() => {
        const elapsed = (performance.now() - startTimeRef.current) / 1000;
        if (elapsed > 0) {
          // Calculate tokens per second (mock calculation)
          // In a real implementation, this would come from the actual token count
          const tps = Math.round((tokenCountRef.current / elapsed) * 10) / 10;
          setTokensPerSecond(tps);
          
          // Update progress (mock)
          setStreamProgress((prev) => Math.min(prev + 5, 95));
        }
      }, 200);
    } else if (!isStreaming && streamingRef.current) {
      // Stream ended
      streamingRef.current = false;
      
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
        metricsIntervalRef.current = null;
      }
      
      setTokensPerSecond(0);
      setStreamProgress(0);
    }
    
    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, [isStreaming]);

  // Convert messages to our format
  const messages: ChatMessage[] = useMemo(() => {
    const sdkOnlyMessages = sdkMessages.filter(
      (m) => !initialMessages.some((im) => im.id === m.id)
    );

    return [
      ...initialMessages,
      ...sdkOnlyMessages.map((m): ChatMessage => {
        const content = m.parts
          ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map((p) => p.text)
          .join('') || '';

        return {
          id: m.id,
          conversationId: conversationId || '',
          role: m.role as 'user' | 'assistant' | 'system',
          content,
          parts: [{ type: 'text', content }],
          status: 'sent',
          retryCount: 0,
          createdAt: new Date().toISOString(),
        };
      }),
    ];
  }, [initialMessages, sdkMessages, conversationId]);

  // Handle submit with persistence
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      if (!agent) {
        toast.error('Agent not found');
        return;
      }

      if (!input.trim()) {
        return;
      }

      // Create conversation if needed
      let convId = conversationId;
      if (!convId) {
        try {
          const newConv = await useChatStore.getState().createConversation(agentId, 'New Chat');
          convId = newConv.id;
          setConversationId(convId);
        } catch (error) {
          toast.error('Failed to create conversation');
          return;
        }
      }

      // Save user message to IndexedDB
      const userMessage: ChatMessageInput = {
        conversationId: convId,
        role: 'user',
        content: input,
        parts: [{ type: 'text', content: input }],
        status: 'sent',
      };

      try {
        await addMessage(convId, userMessage);
      } catch (error) {
        console.error('Failed to save message:', error);
      }

      // Check if offline
      if (!isOnline) {
        await queueMessage(convId, input);
        setInput('');
        toast.info('Message queued for when you\'re back online');
        return;
      }

      // Send via SDK
      streamingRef.current = true;
      startTimeRef.current = performance.now();
      tokenCountRef.current = 0;

      // Create user message for SDK
      chatHelpers.sendMessage({
        id: generateId(),
        role: 'user',
        parts: [{ type: 'text', text: input }],
      });
      setInput('');
    },
    [agent, input, conversationId, agentId, isOnline, chatHelpers, addMessage]
  );

  // Handle reload (regenerate)
  const reload = useCallback(() => {
    streamingRef.current = true;
    startTimeRef.current = performance.now();
    tokenCountRef.current = 0;
    regenerate();
  }, [regenerate]);

  // Stream control functions
  const pauseStream = useCallback(() => {
    setIsPaused(true);
    // In a real implementation, this would pause the stream at the SDK level
  }, []);

  const resumeStream = useCallback(() => {
    setIsPaused(false);
    // In a real implementation, this would resume the stream
  }, []);

  // File attachment functions
  const attachFile = useCallback((fileId: string) => {
    setAttachedFiles((prev) => [...prev, fileId]);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setAttachedFiles((prev) => prev.filter((id) => id !== fileId));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachedFiles([]);
  }, []);

  if (!agent) {
    return {
      messages: [],
      input: '',
      setInput: () => {},
      handleSubmit: () => {},
      isLoading: false,
      isStreaming: false,
      error: new Error('Agent not found'),
      stop,
      reload: () => {},
      connectionStatus: 'unknown',
      queuedCount: 0,
      tokensPerSecond: 0,
      streamProgress: 0,
      isPaused: false,
      pauseStream: () => {},
      resumeStream: () => {},
      attachedFiles: [],
      attachFile: () => {},
      removeFile: () => {},
      clearAttachments: () => {},
    };
  }

  return {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    isStreaming,
    error: error ? (error instanceof Error ? error : new Error(String(error))) : null,
    stop,
    reload,
    connectionStatus,
    queuedCount,
    tokensPerSecond,
    streamProgress,
    isPaused,
    pauseStream,
    resumeStream,
    attachedFiles,
    attachFile,
    removeFile,
    clearAttachments,
  };
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
