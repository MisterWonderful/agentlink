/**
 * Stream Parser
 *
 * Parses SSE (Server-Sent Events) streams from different agent types.
 * Handles OpenAI-compatible, Ollama, Anthropic, and custom formats.
 */

import type { AgentType, MessagePart } from '@/types/index';
import { createParser, type EventSourceMessage } from 'eventsource-parser';

/**
 * Stream delta types emitted during parsing
 */
export interface StreamDelta {
  type: 'text' | 'reasoning' | 'tool-call' | 'tool-result' | 'done' | 'error';
  content?: string;
  toolName?: string;
  toolArgs?: string;
  finishReason?: string;
  error?: string;
}

/**
 * Callbacks for stream parser
 */
export interface StreamParserCallbacks {
  onDelta: (delta: StreamDelta) => void;
  onError?: (error: Error) => void;
  onFinish?: () => void;
}

/**
 * Create a stream parser for the specified agent type
 */
export function createStreamParser(
  agentType: AgentType,
  callbacks: StreamParserCallbacks
): {
  parse: (chunk: string) => void;
  reset: () => void;
  finish: () => void;
} {
  const parser = createParser({
    onEvent: (event: EventSourceMessage) => {
      handleEvent(event.data, agentType, callbacks);
    },
  });

  return {
    parse: (chunk: string) => {
      try {
        parser.feed(chunk);
      } catch (error) {
        callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    },
    reset: () => {
      parser.reset();
    },
    finish: () => {
      callbacks.onFinish?.();
    },
  };
}

/**
 * Handle a parsed SSE event based on agent type
 */
function handleEvent(
  data: string,
  agentType: AgentType,
  callbacks: StreamParserCallbacks
): void {
  // Skip empty data
  if (!data || data.trim() === '') {
    return;
  }
  // Handle special events
  if (data === '[DONE]') {
    callbacks.onDelta({ type: 'done' });
    return;
  }

  try {
    const json = JSON.parse(data);

    switch (agentType) {
      case 'openai_compatible':
        parseOpenAIEvent(json, callbacks);
        break;
      case 'ollama':
        parseOllamaEvent(json, callbacks);
        break;
      case 'anthropic_compatible':
        parseAnthropicEvent(json, callbacks);
        break;
      case 'custom':
        parseCustomEvent(json, callbacks);
        break;
      default:
        parseOpenAIEvent(json, callbacks);
    }
  } catch (error) {
    // Some streams send non-JSON data (like Ollama's NDJSON)
    // Try parsing as NDJSON
    if (agentType === 'ollama') {
      try {
        const json = JSON.parse(data);
        parseOllamaEvent(json, callbacks);
      } catch {
        callbacks.onError?.(new Error(`Failed to parse stream data: ${data.slice(0, 100)}`));
      }
    } else {
      callbacks.onError?.(new Error(`Failed to parse stream data: ${data.slice(0, 100)}`));
    }
  }
}

/**
 * Parse OpenAI-compatible streaming event
 */
function parseOpenAIEvent(json: unknown, callbacks: StreamParserCallbacks): void {
  if (!isOpenAIChunk(json)) return;

  const choice = (json as { choices?: Array<{ delta?: Record<string, unknown>; finish_reason?: string | null }> }).choices?.[0];
  if (!choice) return;

  // Handle finish reason
  if (choice.finish_reason) {
    callbacks.onDelta({
      type: 'done',
      finishReason: choice.finish_reason,
    });
    return;
  }

  const delta = choice.delta as Record<string, unknown> | undefined;

  // Handle reasoning content (DeepSeek, etc.)
  if (delta?.reasoning_content && typeof delta.reasoning_content === 'string') {
    callbacks.onDelta({
      type: 'reasoning',
      content: delta.reasoning_content,
    });
    return;
  }

  // Handle tool calls
  if (delta?.tool_calls && Array.isArray(delta.tool_calls)) {
    const toolCall = delta.tool_calls[0] as { function?: { name?: string; arguments?: string } } | undefined;
    if (toolCall?.function) {
      callbacks.onDelta({
        type: 'tool-call',
        toolName: toolCall.function.name || '',
        toolArgs: toolCall.function.arguments || '',
      });
      return;
    }
  }

  // Handle regular content
  if (delta?.content && typeof delta.content === 'string') {
    callbacks.onDelta({
      type: 'text',
      content: delta.content,
    });
  }
}

/**
 * Parse Ollama streaming event
 */
function parseOllamaEvent(json: unknown, callbacks: StreamParserCallbacks): void {
  if (!isOllamaChunk(json)) return;

  const chunk = json as { done?: boolean; message?: { content?: string } };

  // Check for completion
  if (chunk.done) {
    callbacks.onDelta({
      type: 'done',
      finishReason: 'stop',
    });
    return;
  }

  // Handle message content
  if (chunk.message?.content && typeof chunk.message.content === 'string') {
    callbacks.onDelta({
      type: 'text',
      content: chunk.message.content,
    });
  }
}

/**
 * Parse Anthropic-compatible streaming event
 */
function parseAnthropicEvent(json: unknown, callbacks: StreamParserCallbacks): void {
  if (!isAnthropicChunk(json)) return;

  const chunk = json as { type: string; delta?: { type?: string; text?: string; thinking?: string }; error?: { message?: string } };

  switch (chunk.type) {
    case 'content_block_delta':
      if (chunk.delta?.type === 'text' && typeof chunk.delta.text === 'string') {
        callbacks.onDelta({
          type: 'text',
          content: chunk.delta.text,
        });
      } else if (chunk.delta?.type === 'thinking' && typeof chunk.delta.thinking === 'string') {
        callbacks.onDelta({
          type: 'reasoning',
          content: chunk.delta.thinking,
        });
      }
      break;

    case 'message_stop':
      callbacks.onDelta({
        type: 'done',
        finishReason: 'stop',
      });
      break;

    case 'error':
      callbacks.onDelta({
        type: 'error',
        error: chunk.error?.message || 'Unknown error',
      });
      break;
  }
}

/**
 * Parse custom agent streaming event
 * Attempts to extract content from common field patterns
 */
function parseCustomEvent(json: unknown, callbacks: StreamParserCallbacks): void {
  const obj = json as Record<string, unknown>;

  // Try common field patterns
  const content =
    obj?.content ||
    obj?.text ||
    (obj?.message as Record<string, unknown> | undefined)?.content ||
    obj?.response;

  if (typeof content === 'string') {
    callbacks.onDelta({
      type: 'text',
      content,
    });
    return;
  }

  // Check for done flag
  if (obj?.done === true) {
    callbacks.onDelta({
      type: 'done',
      finishReason: 'stop',
    });
  }
}

/**
 * Type guard for OpenAI chunk
 */
function isOpenAIChunk(json: unknown): json is {
  choices?: Array<{
    delta?: {
      content?: string;
      reasoning_content?: string;
      tool_calls?: Array<{
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string | null;
  }>;
} {
  return typeof json === 'object' && json !== null;
}

/**
 * Type guard for Ollama chunk
 */
function isOllamaChunk(json: unknown): json is {
  message?: { content?: string };
  done?: boolean;
} {
  return typeof json === 'object' && json !== null;
}

/**
 * Type guard for Anthropic chunk
 */
function isAnthropicChunk(json: unknown): json is {
  type: string;
  delta?: { type?: string; text?: string; thinking?: string };
  error?: { message?: string };
} {
  return typeof json === 'object' && json !== null && 'type' in json;
}

/**
 * Extract message parts from a complete streamed response
 * Used when we need to convert streaming content to stored message parts
 */
export function extractPartsFromStream(content: string, reasoning?: string): MessagePart[] {
  const parts: MessagePart[] = [];

  if (reasoning && reasoning.trim()) {
    parts.push({
      type: 'reasoning',
      content: reasoning,
    });
  }

  if (content) {
    parts.push({
      type: 'text',
      content,
    });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: '' }];
}

/**
 * Create a simple text-only parser for non-SSE streams
 */
export function createTextParser(callbacks: StreamParserCallbacks): {
  parse: (chunk: string) => void;
  reset: () => void;
  finish: () => void;
} {
  let buffer = '';

  return {
    parse: (chunk: string) => {
      buffer += chunk;
      callbacks.onDelta({
        type: 'text',
        content: chunk,
      });
    },
    reset: () => {
      buffer = '';
    },
    finish: () => {
      callbacks.onFinish?.();
    },
  };
}
