/**
 * Anthropic-Compatible Adapter
 * 
 * Supports Anthropic Claude API and compatible endpoints
 * Endpoint: /v1/messages
 * Auth: x-api-key header + anthropic-version header
 */

import type { AgentAdapter, ChatRequestParams, StreamDelta, ParsedMessage } from './base-adapter';
import type { AgentType, MessagePart } from '@/types/index';

export class AnthropicAdapter implements AgentAdapter {
  readonly agentType: AgentType = 'anthropic_compatible';
  readonly apiVersion = '2023-06-01';

  getChatEndpoint(baseUrl: string): string {
    const normalized = baseUrl.replace(/\/$/, '');
    return `${normalized}/v1/messages`;
  }

  getModelsEndpoint(baseUrl: string): string {
    const normalized = baseUrl.replace(/\/$/, '');
    return `${normalized}/v1/models`;
  }

  formatHeaders(authToken?: string, customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'anthropic-version': this.apiVersion,
      ...customHeaders,
    };

    if (authToken) {
      headers['x-api-key'] = authToken;
    }

    return headers;
  }

  formatChatBody(params: ChatRequestParams): object {
    // Convert messages to Anthropic format
    const messages = params.messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    const body: Record<string, unknown> = {
      model: params.model,
      messages,
      max_tokens: params.maxTokens,
      stream: params.stream,
    };

    // Add system prompt as top-level field (Anthropic-specific)
    if (params.systemPrompt) {
      body.system = params.systemPrompt;
    }

    // Add optional parameters
    if (params.temperature !== undefined) {
      body.temperature = params.temperature;
    }

    if (params.topP !== undefined && params.topP !== 1) {
      body.top_p = params.topP;
    }

    return body;
  }

  parseStreamChunk(chunk: string): StreamDelta | null {
    // Anthropic uses SSE format with event types
    const trimmed = chunk.trim();

    // Parse event type if present
    let eventType = 'message';
    const eventMatch = trimmed.match(/^event: (\w+)$/m);
    if (eventMatch) {
      eventType = eventMatch[1];
    }

    // Extract data portion
    const dataMatch = trimmed.match(/data: (.+)$/m);
    if (!dataMatch) {
      return null;
    }

    const data = dataMatch[1];

    try {
      const parsed = JSON.parse(data);

      switch (eventType) {
        case 'content_block_delta':
        case 'message_delta': {
          const delta = parsed.delta;

          if (!delta) {
            return null;
          }

          // Handle text content
          if (delta.type === 'text_delta' && delta.text) {
            return {
              type: 'text',
              content: delta.text,
            };
          }

          // Handle stop reason
          if (delta.stop_reason) {
            return {
              type: 'done',
              finishReason: delta.stop_reason,
            };
          }

          return null;
        }

        case 'content_block_start':
          // New content block starting
          if (parsed.content_block?.type === 'thinking') {
            return {
              type: 'reasoning',
              content: parsed.content_block.thinking || '',
            };
          }
          if (parsed.content_block?.type === 'text') {
            return {
              type: 'text',
              content: parsed.content_block.text || '',
            };
          }
          return null;

        case 'message_stop':
          return { type: 'done' };

        case 'error':
          return {
            type: 'error',
            error: parsed.error?.message || 'Unknown Anthropic error',
          };

        default:
          return null;
      }
    } catch (error) {
      return {
        type: 'error',
        error: `Failed to parse Anthropic SSE chunk: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  parseCompleteResponse(response: object): ParsedMessage {
    const resp = response as {
      content?: Array<{
        type: string;
        text?: string;
        thinking?: string;
      }>;
      model?: string;
      stop_reason?: string;
    };

    const parts: MessagePart[] = [];
    let content = '';

    if (Array.isArray(resp.content)) {
      for (const block of resp.content) {
        if (block.type === 'thinking' && block.thinking) {
          parts.push({
            type: 'reasoning',
            content: block.thinking,
          });
          content += block.thinking;
        } else if (block.type === 'text' && block.text) {
          parts.push({
            type: 'text',
            content: block.text,
          });
          content += block.text;
        }
      }
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
      data?: Array<{ id: string }>;
      models?: Array<{ id: string }>;
    };

    // Try different response formats
    const models = resp.data || resp.models || [];

    if (!Array.isArray(models)) {
      return [];
    }

    return models
      .map((model) => model.id)
      .filter((id): id is string => typeof id === 'string');
  }
}

// Export singleton instance
export const anthropicAdapter = new AnthropicAdapter();
