# Agent Types & Protocol Adapters

## Overview

AgentLink supports multiple agent communication protocols through an adapter pattern. Each agent type has a protocol adapter that normalizes requests/responses into a common format the UI can render.

## Agent Type Enum

```typescript
export const AgentType = {
  OPENAI_COMPATIBLE: 'openai_compatible',
  OLLAMA: 'ollama',
  ANTHROPIC_COMPATIBLE: 'anthropic_compatible',
  CUSTOM: 'custom',
} as const;

export type AgentType = typeof AgentType[keyof typeof AgentType];
```

## Adapter Interface

```typescript
// src/lib/agents/base-adapter.ts

export interface AgentAdapter {
  readonly agentType: AgentType;

  /** Get the full chat endpoint URL */
  getChatEndpoint(baseUrl: string): string;

  /** Get the models list endpoint URL */
  getModelsEndpoint(baseUrl: string): string;

  /** Format headers for requests to this agent type */
  formatHeaders(authToken?: string, customHeaders?: Record<string, string>): Record<string, string>;

  /** Format the request body for a chat completion */
  formatChatBody(params: ChatRequestParams): object;

  /** Parse an SSE chunk into a normalized delta */
  parseStreamChunk(chunk: string): StreamDelta | null;

  /** Parse a complete (non-streaming) response into messages */
  parseCompleteResponse(response: object): ParsedMessage;

  /** Parse the models list response */
  parseModelsResponse(response: object): string[];

  /** Test if a response matches this adapter's expected format */
  matchesResponseFormat(response: object): boolean;
}

export interface ChatRequestParams {
  model: string;
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stream: boolean;
}

export interface StreamDelta {
  type: 'text' | 'reasoning' | 'tool_call' | 'done' | 'error';
  content?: string;
  toolName?: string;
  toolArgs?: string;
  finishReason?: string;
  error?: string;
}

export interface ParsedMessage {
  role: 'assistant';
  content: string;
  parts: Array<{
    type: 'text' | 'reasoning' | 'tool-call' | 'tool-result';
    content: string;
    [key: string]: unknown;
  }>;
  model?: string;
}
```

## Adapter Implementations

### OpenAI-Compatible Adapter

```typescript
// src/lib/agents/openai-adapter.ts

class OpenAIAdapter implements AgentAdapter {
  readonly agentType = AgentType.OPENAI_COMPATIBLE;

  getChatEndpoint(baseUrl: string): string {
    return `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
  }

  getModelsEndpoint(baseUrl: string): string {
    return `${baseUrl.replace(/\/$/, '')}/v1/models`;
  }

  formatHeaders(authToken?: string, customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  }

  // SSE chunk format: data: {"choices":[{"delta":{"content":"Hello"}}]}
  parseStreamChunk(chunk: string): StreamDelta | null {
    if (chunk === '[DONE]') return { type: 'done' };
    try {
      const data = JSON.parse(chunk);
      const delta = data.choices?.[0]?.delta;
      const finishReason = data.choices?.[0]?.finish_reason;
      if (finishReason === 'stop') return { type: 'done', finishReason };
      if (delta?.content) return { type: 'text', content: delta.content };
      if (delta?.reasoning_content) return { type: 'reasoning', content: delta.reasoning_content };
      return null;
    } catch {
      return null;
    }
  }
}
```

### Ollama Adapter

```typescript
// src/lib/agents/ollama-adapter.ts

class OllamaAdapter implements AgentAdapter {
  readonly agentType = AgentType.OLLAMA;

  getChatEndpoint(baseUrl: string): string {
    return `${baseUrl.replace(/\/$/, '')}/api/chat`;
  }

  getModelsEndpoint(baseUrl: string): string {
    return `${baseUrl.replace(/\/$/, '')}/api/tags`;
  }

  formatHeaders(authToken?: string): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Basic ${btoa(authToken)}`;
    return headers;
  }

  // Ollama uses newline-delimited JSON, not SSE
  // Each line: {"model":"llama3","message":{"role":"assistant","content":"Hi"},"done":false}
  parseStreamChunk(chunk: string): StreamDelta | null {
    try {
      const data = JSON.parse(chunk);
      if (data.done) return { type: 'done' };
      if (data.message?.content) return { type: 'text', content: data.message.content };
      return null;
    } catch {
      return null;
    }
  }

  parseModelsResponse(response: object): string[] {
    const data = response as { models?: Array<{ name: string }> };
    return data.models?.map(m => m.name) ?? [];
  }
}
```

### Anthropic-Compatible Adapter

```typescript
// src/lib/agents/anthropic-adapter.ts

class AnthropicAdapter implements AgentAdapter {
  readonly agentType = AgentType.ANTHROPIC_COMPATIBLE;

  getChatEndpoint(baseUrl: string): string {
    return `${baseUrl.replace(/\/$/, '')}/v1/messages`;
  }

  formatHeaders(authToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    };
    if (authToken) headers['x-api-key'] = authToken;
    return headers;
  }

  // System prompt goes in a separate field, not in messages array
  formatChatBody(params: ChatRequestParams): object {
    const messages = params.messages.filter(m => m.role !== 'system');
    return {
      model: params.model,
      max_tokens: params.maxTokens,
      system: params.systemPrompt || undefined,
      messages,
      temperature: params.temperature,
      top_p: params.topP,
      stream: params.stream,
    };
  }

  // Anthropic SSE uses event types:
  // event: content_block_delta\ndata: {"delta":{"type":"text_delta","text":"Hello"}}
  // event: content_block_delta\ndata: {"delta":{"type":"thinking_delta","thinking":"Let me..."}}
  parseStreamChunk(chunk: string): StreamDelta | null {
    try {
      const data = JSON.parse(chunk);
      if (data.type === 'message_stop') return { type: 'done' };
      if (data.delta?.type === 'text_delta') return { type: 'text', content: data.delta.text };
      if (data.delta?.type === 'thinking_delta') return { type: 'reasoning', content: data.delta.thinking };
      return null;
    } catch {
      return null;
    }
  }
}
```

### Custom Adapter

```typescript
// src/lib/agents/custom-adapter.ts

interface CustomAdapterConfig {
  chatEndpointPath: string;      // e.g., "/api/generate"
  method: 'POST' | 'GET';
  bodyTemplate: string;          // JSON string with {{messages}} placeholder
  responseJsonPath: string;      // JSONPath to extract text, e.g., "$.output"
  streamEnabled: boolean;
  streamChunkJsonPath?: string;  // JSONPath for streaming chunks
}

class CustomAdapter implements AgentAdapter {
  readonly agentType = AgentType.CUSTOM;
  private config: CustomAdapterConfig;

  constructor(config: CustomAdapterConfig) {
    this.config = config;
  }

  getChatEndpoint(baseUrl: string): string {
    return `${baseUrl.replace(/\/$/, '')}${this.config.chatEndpointPath}`;
  }

  // Uses jsonpath-plus or a simple dot-notation resolver
  // to extract response text from arbitrary JSON structures
}
```

## Adapter Factory

```typescript
// src/lib/agents/adapter-factory.ts

import { OpenAIAdapter } from './openai-adapter';
import { OllamaAdapter } from './ollama-adapter';
import { AnthropicAdapter } from './anthropic-adapter';
import { CustomAdapter } from './custom-adapter';
import type { AgentAdapter } from './base-adapter';
import type { Agent } from '@/types';

const adapters: Record<string, () => AgentAdapter> = {
  openai_compatible: () => new OpenAIAdapter(),
  ollama: () => new OllamaAdapter(),
  anthropic_compatible: () => new AnthropicAdapter(),
};

export function getAdapter(agent: Agent): AgentAdapter {
  if (agent.agentType === 'custom' && agent.customAdapterConfig) {
    return new CustomAdapter(agent.customAdapterConfig);
  }
  const factory = adapters[agent.agentType];
  if (!factory) throw new Error(`Unknown agent type: ${agent.agentType}`);
  return factory();
}
```

## Auto-Detection

When agent type is unknown, try adapters in this order:

1. **OpenAI-compatible** — try GET `/v1/models`. If 200 with expected format, it's OpenAI-compatible.
2. **Ollama** — try GET `/api/tags`. If 200 with `models` array, it's Ollama.
3. **Anthropic** — try POST `/v1/messages` with minimal body. If response has Anthropic-style events, it's Anthropic.
4. **Fallback** — mark as Custom, ask user to configure.

```typescript
// src/lib/agents/connection-tester.ts

export async function autoDetectAgentType(
  baseUrl: string,
  authToken?: string
): Promise<AgentType> {
  // Try OpenAI first (most common)
  try {
    const res = await fetch(`${baseUrl}/v1/models`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.data && Array.isArray(data.data)) return AgentType.OPENAI_COMPATIBLE;
    }
  } catch {}

  // Try Ollama
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.models && Array.isArray(data.models)) return AgentType.OLLAMA;
    }
  } catch {}

  // Default to custom
  return AgentType.CUSTOM;
}
```

## Agent Type Presets (UI Defaults)

When user selects an agent type in the onboarding flow, pre-fill these defaults:

| Field | OpenClaw/NanoClaw | Ollama | vLLM/llama.cpp | Commercial | Custom |
|---|---|---|---|---|---|
| Endpoint hint | `https://your-server/v1` | `http://localhost:11434` | `https://your-server/v1` | `https://api.openai.com` | `https://...` |
| Auth hint | "Bearer token from your agent" | "Usually none for local" | "Bearer token" | "API key from provider" | "Configure as needed" |
| Default model | Auto-detect via /v1/models | Auto-detect via /api/tags | Auto-detect | Provider-specific | Manual entry |
| Capabilities | All toggleable | All toggleable | All toggleable | Known from provider | All manual |
