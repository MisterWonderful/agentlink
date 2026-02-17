/**
 * Ollama Native Adapter
 * 
 * Supports Ollama's native API endpoints
 * Endpoint: /api/chat
 * Models: /api/tags
 */

import type { AgentAdapter, ChatRequestParams, StreamDelta, ParsedMessage } from './base-adapter';
import type { AgentType, MessagePart } from '@/types/index';

export class OllamaAdapter implements AgentAdapter {
  readonly agentType: AgentType = 'ollama';

  getChatEndpoint(baseUrl: string): string {
    const normalized = baseUrl.replace(/\/$/, '');
    return `${normalized}/api/chat`;
  }

  getModelsEndpoint(baseUrl: string): string {
    const normalized = baseUrl.replace(/\/$/, '');
    return `${normalized}/api/tags`;
  }

  formatHeaders(authToken?: string, customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/x-ndjson',
      ...customHeaders,
    };

    // Ollama can use basic auth if token is provided
    if (authToken) {
      headers['Authorization'] = `Basic ${btoa(authToken)}`;
    }

    return headers;
  }

  formatChatBody(params: ChatRequestParams): object {
    const messages: Array<{ role: string; content: string }> = [];

    // Add system prompt if provided
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }

    // Add conversation messages
    messages.push(...params.messages);

    return {
      model: params.model,
      messages,
      stream: params.stream,
      options: {
        temperature: params.temperature,
        num_predict: params.maxTokens,
        top_p: params.topP,
        frequency_penalty: params.frequencyPenalty,
        presence_penalty: params.presencePenalty,
      },
    };
  }

  parseStreamChunk(chunk: string): StreamDelta | null {
    // Ollama uses newline-delimited JSON (NDJSON)
    const trimmed = chunk.trim();
    
    if (!trimmed) {
      return null;
    }

    try {
      const parsed = JSON.parse(trimmed);

      // Check for completion
      if (parsed.done === true) {
        return {
          type: 'done',
          finishReason: 'stop',
        };
      }

      // Ollama sends message in the 'message' field
      const message = parsed.message;

      if (!message || typeof message.content !== 'string') {
        return null;
      }

      // Handle reasoning/thinking content if present
      // Some Ollama models may include reasoning in the content
      if (message.role === 'assistant') {
        return {
          type: 'text',
          content: message.content,
        };
      }

      return {
        type: 'text',
        content: message.content,
      };
    } catch (error) {
      return {
        type: 'error',
        error: `Failed to parse NDJSON chunk: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  parseCompleteResponse(response: object): ParsedMessage {
    const resp = response as {
      message?: {
        role?: string;
        content?: string;
      };
      model?: string;
    };

    const message = resp.message;
    const content = message?.content || '';
    const parts: MessagePart[] = [];

    // Add text content as a part
    if (content) {
      parts.push({
        type: 'text',
        content,
      });
    }

    return {
      role: 'assistant',
      content,
      parts,
      model: resp.model,
    };
  }

  parseModelsResponse(response: object): string[] {
    const resp = response as {
      models?: Array<{ name: string; model?: string }>;
    };

    if (!Array.isArray(resp.models)) {
      return [];
    }

    return resp.models
      .map((model) => model.name || model.model)
      .filter((name): name is string => typeof name === 'string');
  }
}

// Export singleton instance
export const ollamaAdapter = new OllamaAdapter();
