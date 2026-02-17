/**
 * OpenAI-Compatible Adapter
 * 
 * Supports OpenAI API and compatible endpoints (DeepSeek, OpenRouter, etc.)
 * Endpoint: /v1/chat/completions
 * Models: /v1/models
 */

import type { AgentAdapter, ChatRequestParams, StreamDelta, ParsedMessage } from './base-adapter';
import type { AgentType, MessagePart } from '@/types/index';

export class OpenAIAdapter implements AgentAdapter {
  readonly agentType: AgentType = 'openai_compatible';

  getChatEndpoint(baseUrl: string): string {
    const normalized = baseUrl.replace(/\/$/, '');
    return `${normalized}/v1/chat/completions`;
  }

  getModelsEndpoint(baseUrl: string): string {
    const normalized = baseUrl.replace(/\/$/, '');
    return `${normalized}/v1/models`;
  }

  formatHeaders(authToken?: string, customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders,
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
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
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      top_p: params.topP,
      frequency_penalty: params.frequencyPenalty,
      presence_penalty: params.presencePenalty,
      stream: params.stream,
    };
  }

  parseStreamChunk(chunk: string): StreamDelta | null {
    // Handle SSE format: data: {...}
    const trimmed = chunk.trim();
    
    if (!trimmed.startsWith('data: ')) {
      return null;
    }

    const data = trimmed.slice(6); // Remove 'data: ' prefix

    // Handle stream end
    if (data === '[DONE]') {
      return { type: 'done' };
    }

    try {
      const parsed = JSON.parse(data);
      const choice = parsed.choices?.[0];

      if (!choice) {
        return null;
      }

      // Handle finish
      if (choice.finish_reason) {
        return {
          type: 'done',
          finishReason: choice.finish_reason,
        };
      }

      const delta = choice.delta;

      if (!delta) {
        return null;
      }

      // Handle reasoning content (DeepSeek R1 style)
      if (delta.reasoning_content) {
        return {
          type: 'reasoning',
          content: delta.reasoning_content,
        };
      }

      // Handle tool calls
      if (delta.tool_calls?.length > 0) {
        const toolCall = delta.tool_calls[0];
        return {
          type: 'tool_call',
          toolName: toolCall.function?.name,
          toolArgs: toolCall.function?.arguments,
        };
      }

      // Handle regular content
      if (typeof delta.content === 'string') {
        return {
          type: 'text',
          content: delta.content,
        };
      }

      return null;
    } catch (error) {
      return {
        type: 'error',
        error: `Failed to parse SSE chunk: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  parseCompleteResponse(response: object): ParsedMessage {
    const resp = response as {
      choices?: Array<{
        message?: {
          content?: string;
          reasoning_content?: string;
          tool_calls?: Array<{
            function?: {
              name?: string;
              arguments?: string;
            };
          }>;
        };
      }>;
      model?: string;
    };

    const message = resp.choices?.[0]?.message;
    const parts: MessagePart[] = [];
    let content = '';

    // Add reasoning part if present (DeepSeek R1 style)
    if (message?.reasoning_content) {
      parts.push({
        type: 'reasoning',
        content: message.reasoning_content,
      });
      content += message.reasoning_content;
    }

    // Add tool call parts
    if (message?.tool_calls?.length) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.function) {
          parts.push({
            type: 'tool-call',
            content: '',
            toolName: toolCall.function.name || 'unknown',
            toolArgs: toolCall.function.arguments || '{}',
          });
        }
      }
    }

    // Add text content
    if (message?.content) {
      parts.push({
        type: 'text',
        content: message.content,
      });
      content += message.content;
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
    };

    if (!Array.isArray(resp.data)) {
      return [];
    }

    return resp.data
      .map((model) => model.id)
      .filter((id): id is string => typeof id === 'string');
  }
}

// Export singleton instance
export const openAIAdapter = new OpenAIAdapter();
