/**
 * Message Formatter
 *
 * Formats messages for different agent types and protocols.
 * Handles conversion between internal message format and API-specific formats.
 */

import type { AgentType, ChatMessage, MessagePart } from '@/types/index';

/**
 * Formatted message for API requests
 */
export interface FormattedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
}

/**
 * Format messages for a specific agent type
 */
export function formatMessagesForAgent(
  messages: ChatMessage[],
  agentType: AgentType
): FormattedMessage[] {
  switch (agentType) {
    case 'openai_compatible':
      return formatOpenAIMessages(messages);
    case 'ollama':
      return formatOllamaMessages(messages);
    case 'anthropic_compatible':
      return formatAnthropicMessages(messages);
    case 'custom':
      return formatCustomMessages(messages);
    default:
      return formatOpenAIMessages(messages);
  }
}

/**
 * Format messages for OpenAI-compatible APIs
 * Includes reasoning as system messages if present
 */
function formatOpenAIMessages(messages: ChatMessage[]): FormattedMessage[] {
  const formatted: FormattedMessage[] = [];

  for (const msg of messages) {
    // Skip system messages from user/assistant (they're handled separately)
    if (msg.role === 'system') {
      formatted.push({
        role: 'system',
        content: msg.content,
      });
      continue;
    }

    // Build content from parts
    let content = '';
    const reasoningParts: string[] = [];

    for (const part of msg.parts) {
      switch (part.type) {
        case 'text':
          content += part.content;
          break;
        case 'reasoning':
          reasoningParts.push(part.content);
          break;
        case 'tool-result':
          content += `\n[Tool Result: ${part.toolName}]\n${part.content}`;
          break;
        // Skip tool-call parts - they're handled by the tool system
        case 'tool-call':
        case 'file':
        case 'source-url':
          // These are display-only, don't include in API context
          break;
      }
    }

    // If we have reasoning content and it's an assistant message,
    // prepend it as a special format (some models support this)
    if (reasoningParts.length > 0 && msg.role === 'assistant') {
      const reasoning = reasoningParts.join('\n\n');
      // Use the reasoning_content field format (DeepSeek-style)
      formatted.push({
        role: msg.role,
        content: content.trim(),
      });
    } else {
      formatted.push({
        role: msg.role,
        content: content.trim() || msg.content,
      });
    }
  }

  return formatted;
}

/**
 * Format messages for Ollama native API
 * Similar to OpenAI but with some differences in tool handling
 */
function formatOllamaMessages(messages: ChatMessage[]): FormattedMessage[] {
  const formatted: FormattedMessage[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      formatted.push({
        role: 'system',
        content: msg.content,
      });
      continue;
    }

    let content = '';

    for (const part of msg.parts) {
      switch (part.type) {
        case 'text':
          content += part.content;
          break;
        case 'reasoning':
          // Ollama doesn't have native reasoning support yet
          // Include as part of content with marker
          content += `<thinking>${part.content}</thinking>`;
          break;
        case 'tool-result':
          content += `\nResult: ${part.content}`;
          break;
        case 'tool-call':
          content += `\nUsing tool: ${part.toolName}(${part.toolArgs || ''})`;
          break;
      }
    }

    formatted.push({
      role: msg.role,
      content: content.trim() || msg.content,
    });
  }

  return formatted;
}

/**
 * Format messages for Anthropic-compatible APIs
 * Anthropic uses a different message format with distinct content blocks
 */
function formatAnthropicMessages(messages: ChatMessage[]): FormattedMessage[] {
  // Anthropic format is similar to OpenAI but with specific requirements:
  // - Must alternate user/assistant (no two user messages in a row)
  // - System prompt is handled separately in the request body

  const formatted: FormattedMessage[] = [];
  let lastRole: string | null = null;

  for (const msg of messages) {
    // Skip system messages - they're handled separately in Anthropic API
    if (msg.role === 'system') {
      continue;
    }

    let content = '';

    for (const part of msg.parts) {
      switch (part.type) {
        case 'text':
          content += part.content;
          break;
        case 'reasoning':
          // Anthropic has native thinking support via the thinking content block type
          // This is handled at the API level, not in the message content
          content += part.content;
          break;
        case 'tool-result':
          content += `\n[Result: ${part.content}]`;
          break;
        case 'tool-call':
          content += `\n[Tool: ${part.toolName}]`;
          break;
      }
    }

    // Ensure alternation between user and assistant
    if (msg.role === lastRole) {
      // Merge with previous message of same role
      const last = formatted[formatted.length - 1];
      if (last) {
        last.content += '\n\n' + (content.trim() || msg.content);
        continue;
      }
    }

    formatted.push({
      role: msg.role,
      content: content.trim() || msg.content,
    });
    lastRole = msg.role;
  }

  return formatted;
}

/**
 * Format messages for custom agent endpoints
 * Simple format that preserves content as-is
 */
function formatCustomMessages(messages: ChatMessage[]): FormattedMessage[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: extractTextContent(msg.parts) || msg.content,
  }));
}

/**
 * Extract text content from message parts
 */
export function extractTextContent(parts: MessagePart[]): string {
  return parts
    .filter((p) => p.type === 'text')
    .map((p) => p.content)
    .join('');
}

/**
 * Extract reasoning content from message parts
 */
export function extractReasoningContent(parts: MessagePart[]): string {
  return parts
    .filter((p) => p.type === 'reasoning')
    .map((p) => p.content)
    .join('\n\n');
}

/**
 * Extract tool calls from message parts
 */
export function extractToolCalls(parts: MessagePart[]): Array<{
  name: string;
  args: Record<string, unknown>;
}> {
  return parts
    .filter((p) => p.type === 'tool-call')
    .map((p) => ({
      name: p.toolName || 'unknown',
      args: safeParseJSON(p.toolArgs || '{}'),
    }));
}

/**
 * Build message parts from Vercel AI SDK message
 * Handles conversion from SDK's part format to our internal format
 */
export function buildMessageParts(
  content: string,
  sdkParts?: Array<{
    type: string;
    text?: string;
    reasoning?: string;
    toolName?: string;
    toolCallId?: string;
    args?: Record<string, unknown>;
    result?: unknown;
  }>
): MessagePart[] {
  if (!sdkParts || sdkParts.length === 0) {
    return [{ type: 'text', content }];
  }

  const parts: MessagePart[] = [];

  for (const part of sdkParts) {
    switch (part.type) {
      case 'text':
        if (part.text) {
          parts.push({ type: 'text', content: part.text });
        }
        break;
      case 'reasoning':
        if (part.reasoning) {
          parts.push({ type: 'reasoning', content: part.reasoning });
        }
        break;
      case 'tool-call':
        parts.push({
          type: 'tool-call',
          content: JSON.stringify(part.args || {}),
          toolName: part.toolName,
          toolArgs: JSON.stringify(part.args || {}),
        });
        break;
      case 'tool-result':
        parts.push({
          type: 'tool-result',
          content: JSON.stringify(part.result || {}),
          toolName: part.toolName,
          toolResult: JSON.stringify(part.result || {}),
        });
        break;
    }
  }

  return parts.length > 0 ? parts : [{ type: 'text', content }];
}

/**
 * Convert internal messages to a text-only format for simple APIs
 */
export function messagesToText(messages: ChatMessage[]): string {
  return messages
    .map((msg) => {
      const role = msg.role === 'assistant' ? 'Assistant' : msg.role === 'system' ? 'System' : 'User';
      return `${role}: ${extractTextContent(msg.parts) || msg.content}`;
    })
    .join('\n\n');
}

/**
 * Count approximate tokens in messages (rough estimate)
 */
export function estimateTokenCount(messages: ChatMessage[]): number {
  let charCount = 0;

  for (const msg of messages) {
    charCount += (extractTextContent(msg.parts) || msg.content).length;
    // Add overhead for message format
    charCount += 10;
  }

  // Rough approximation: ~4 characters per token
  return Math.ceil(charCount / 4);
}

/**
 * Truncate messages to fit within token limit
 * Keeps most recent messages, removes oldest first
 */
export function truncateMessages(
  messages: ChatMessage[],
  maxTokens: number,
  preserveSystem = true
): ChatMessage[] {
  const systemMessages = preserveSystem ? messages.filter((m) => m.role === 'system') : [];
  const otherMessages = preserveSystem ? messages.filter((m) => m.role !== 'system') : messages;

  let currentTokens = estimateTokenCount(systemMessages);
  const result: ChatMessage[] = [...systemMessages];

  // Add messages from the end (most recent) first
  for (let i = otherMessages.length - 1; i >= 0; i--) {
    const msg = otherMessages[i];
    const msgTokens = estimateTokenCount([msg]);

    if (currentTokens + msgTokens > maxTokens) {
      break;
    }

    result.unshift(msg);
    currentTokens += msgTokens;
  }

  return result;
}

/**
 * Safe JSON parse with fallback
 */
function safeParseJSON(str: string): Record<string, unknown> {
  try {
    return JSON.parse(str) as Record<string, unknown>;
  } catch {
    return {};
  }
}
