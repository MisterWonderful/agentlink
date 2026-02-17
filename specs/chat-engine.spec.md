# Spec: Chat Engine

## Overview

The chat engine wraps Vercel AI SDK's `useChat` hook with AgentLink-specific logic: per-agent endpoint routing, protocol adaptation, offline queuing, and local persistence.

## Core Hook: useAgentChat

```typescript
// src/hooks/use-agent-chat.ts

interface UseAgentChatOptions {
  agentId: string;
  conversationId: string;
}

interface UseAgentChatReturn {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e?: React.FormEvent) => void;
  isLoading: boolean;
  isStreaming: boolean;
  error: Error | null;
  stop: () => void;
  reload: () => void;        // Regenerate last response
  append: (message: { role: string; content: string }) => void;
  connectionStatus: 'online' | 'slow' | 'offline';
  queuedCount: number;       // Messages waiting to send
}
```

## Implementation Architecture

```
useAgentChat (custom hook)
  ├── Reads agent config from agentStore (endpoint, token, model, params)
  ├── Reads/writes messages from IndexedDB via chatStore
  ├── Configures useChat with:
  │   ├── api: agent.endpointUrl (via adapter.getChatEndpoint())
  │   ├── headers: adapter.formatHeaders(agent.authToken)
  │   ├── body: { model, temperature, max_tokens, system prompt, etc. }
  │   ├── streamProtocol: 'text' (SSE) or 'data' (AI SDK protocol)
  │   └── onFinish: persist message to IndexedDB
  ├── Handles offline: queues messages, sends on reconnect
  └── Handles errors: retry with exponential backoff
```

## Vercel AI SDK Integration

```typescript
import { useChat } from 'ai/react';

function useChatForAgent(agent: Agent, conversationId: string) {
  const adapter = getAdapter(agent);

  const {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    error,
    stop,
    reload,
    append,
  } = useChat({
    // Route to agent's endpoint
    api: adapter.getChatEndpoint(agent.endpointUrl),

    // Agent-specific headers
    headers: adapter.formatHeaders(agent.authToken, agent.customHeaders),

    // Include agent parameters in every request
    body: {
      model: agent.defaultModel,
      temperature: agent.temperature,
      max_tokens: agent.maxTokens,
      top_p: agent.topP,
      frequency_penalty: agent.frequencyPenalty,
      presence_penalty: agent.presencePenalty,
    },

    // System prompt as first message
    initialMessages: agent.systemPrompt
      ? [{ id: 'system', role: 'system', content: agent.systemPrompt }]
      : [],

    // Streaming configuration
    streamProtocol: 'text',  // SSE text streams (OpenAI-compatible)

    // Custom fetch for timeout and retry
    fetch: createAgentFetch(agent),

    // Persist on completion
    onFinish: async (message) => {
      await db.messages.add({
        id: message.id,
        conversationId,
        role: message.role,
        content: message.content,
        parts: extractParts(message),
        status: 'sent',
        retryCount: 0,
        createdAt: new Date().toISOString(),
      });

      // Update conversation metadata
      await db.conversations.update(conversationId, {
        messageCount: messages.length + 1,
        lastMessagePreview: message.content.slice(0, 100),
        lastMessageRole: message.role,
        updatedAt: new Date().toISOString(),
      });
    },

    onError: (error) => {
      console.error('Chat error:', error);
      // Show toast with error message
    },
  });

  return { messages, input, setInput, handleSubmit, isLoading, error, stop, reload, append };
}
```

## Message Parts Extraction

The Vercel AI SDK provides `message.parts` which may include reasoning, tool calls, etc. Map these to our local storage format:

```typescript
function extractParts(message: Message): MessagePart[] {
  if (!message.parts || message.parts.length === 0) {
    return [{ type: 'text', content: message.content }];
  }

  return message.parts.map(part => {
    switch (part.type) {
      case 'text':
        return { type: 'text', content: part.text };
      case 'reasoning':
        return {
          type: 'reasoning',
          content: part.reasoning,
          thinkingTimeMs: part.details?.thinkingTime,
        };
      case 'tool-call':
        return {
          type: 'tool-call',
          content: JSON.stringify(part.args),
          toolName: part.toolName,
          toolArgs: JSON.stringify(part.args),
        };
      case 'tool-result':
        return {
          type: 'tool-result',
          content: JSON.stringify(part.result),
          toolName: part.toolName,
          toolResult: JSON.stringify(part.result),
        };
      case 'file':
        return {
          type: 'file',
          content: '',
          fileName: part.name,
          fileType: part.mimeType,
          fileUrl: part.url,
        };
      case 'source-url':
        return {
          type: 'source-url',
          content: '',
          sourceUrl: part.url,
          sourceTitle: part.title,
        };
      default:
        return { type: 'text', content: String(part) };
    }
  });
}
```

## Custom Fetch with Timeout & Retry

```typescript
function createAgentFetch(agent: Agent) {
  return async (url: string | URL, init?: RequestInit) => {
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
          // Server error — retry with backoff
          await sleep(Math.pow(2, attempt) * 1000);
          continue;
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        if (error instanceof DOMException && error.name === 'AbortError') {
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

    throw lastError || new Error('Request failed after retries');
  };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## Offline Message Queue

```typescript
// src/lib/chat/offline-queue.ts

export async function queueMessage(
  conversationId: string,
  content: string,
  agentId: string
) {
  const message: LocalMessage = {
    id: nanoid(),
    conversationId,
    role: 'user',
    content,
    parts: [{ type: 'text', content }],
    status: 'queued',
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };

  await db.messages.add(message);
  return message;
}

export async function processQueue() {
  const queuedMessages = await db.messages
    .where('status')
    .equals('queued')
    .sortBy('createdAt');

  for (const message of queuedMessages) {
    const conversation = await db.conversations.get(message.conversationId);
    if (!conversation) continue;

    const agent = await db.agents.get(conversation.agentId);
    if (!agent) continue;

    try {
      // Build full message history for context
      const history = await db.messages
        .where('conversationId')
        .equals(message.conversationId)
        .filter(m => m.status === 'sent' || m.id === message.id)
        .sortBy('createdAt');

      const adapter = getAdapter(agent as unknown as Agent);
      const chatUrl = adapter.getChatEndpoint(agent.endpointUrl);

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: adapter.formatHeaders(agent.authToken),
        body: JSON.stringify(adapter.formatChatBody({
          model: agent.defaultModel || 'default',
          messages: history.map(m => ({ role: m.role, content: m.content })),
          systemPrompt: agent.systemPrompt,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
          topP: agent.topP,
          frequencyPenalty: agent.frequencyPenalty,
          presencePenalty: agent.presencePenalty,
          stream: false, // Don't stream queued messages
        })),
        signal: AbortSignal.timeout(30000),
      });

      if (response.ok) {
        await db.messages.update(message.id, { status: 'sent' });

        // Save assistant response
        const data = await response.json();
        const parsed = adapter.parseCompleteResponse(data);
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
      } else {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const newRetryCount = message.retryCount + 1;
      if (newRetryCount >= 3) {
        await db.messages.update(message.id, {
          status: 'failed',
          retryCount: newRetryCount,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } else {
        await db.messages.update(message.id, { retryCount: newRetryCount });
      }
    }
  }
}
```

## Network Connectivity Detection

```typescript
// src/hooks/use-network-status.ts

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processQueue(); // Process queued messages when back online
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

## Streaming Markdown Rendering

Use Streamdown for rendering assistant messages during streaming:

```tsx
import { Streamdown } from 'streamdown';

function AssistantMessage({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  return (
    <Streamdown
      content={content}
      isStreaming={isStreaming}
      components={{
        code: ({ children, language }) => (
          <CodeBlock language={language}>{children}</CodeBlock>
        ),
      }}
    />
  );
}
```

Streamdown handles:
- Incomplete markdown during streaming (unclosed code blocks, partial tables)
- Shiki syntax highlighting (160+ languages)
- KaTeX math rendering
- Mermaid diagram support
- Significantly better performance than react-markdown during streaming
