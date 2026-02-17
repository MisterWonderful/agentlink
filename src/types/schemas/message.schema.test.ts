import { describe, it, expect } from 'vitest';
import {
  MessagePartTypeSchema,
  MessagePartSchema,
  MessageStatusSchema,
  ChatMessageSchema,
  ChatMessageInputSchema,
  ChatMessageUpdateSchema,
  type MessagePart,
  type MessageStatus,
  type ChatMessage,
} from './message.schema';

describe('MessagePartTypeSchema', () => {
  it('should validate valid part types', () => {
    const validTypes = [
      'text',
      'reasoning',
      'tool-call',
      'tool-result',
      'file',
      'source-url',
    ];

    for (const type of validTypes) {
      const result = MessagePartTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid part types', () => {
    const invalidTypes = ['image', 'video', 'audio', ''];

    for (const type of invalidTypes) {
      const result = MessagePartTypeSchema.safeParse(type);
      expect(result.success).toBe(false);
    }
  });
});

describe('MessagePartSchema', () => {
  it('should validate text part', () => {
    const part: MessagePart = {
      type: 'text',
      content: 'Hello world',
    };

    const result = MessagePartSchema.safeParse(part);
    expect(result.success).toBe(true);
  });

  it('should validate reasoning part with thinking time', () => {
    const part: MessagePart = {
      type: 'reasoning',
      content: 'Let me think...',
      thinkingTimeMs: 1200,
    };

    const result = MessagePartSchema.safeParse(part);
    expect(result.success).toBe(true);
  });

  it('should validate reasoning part without thinking time', () => {
    const part: MessagePart = {
      type: 'reasoning',
      content: 'Let me think...',
    };

    const result = MessagePartSchema.safeParse(part);
    expect(result.success).toBe(true);
  });

  it('should validate tool call part', () => {
    const part: MessagePart = {
      type: 'tool-call',
      content: 'Calling weather API',
      toolName: 'get_weather',
      toolArgs: '{"city": "London"}',
    };

    const result = MessagePartSchema.safeParse(part);
    expect(result.success).toBe(true);
  });

  it('should validate tool call with optional fields missing', () => {
    const part = {
      type: 'tool-call' as const,
      content: 'Calling weather API',
    };

    const result = MessagePartSchema.safeParse(part);
    expect(result.success).toBe(true);
  });

  it('should validate tool result part', () => {
    const part: MessagePart = {
      type: 'tool-result',
      content: 'Weather data received',
      toolName: 'get_weather',
      toolResult: '{"temp": 22, "unit": "C"}',
    };

    const result = MessagePartSchema.safeParse(part);
    expect(result.success).toBe(true);
  });

  it('should validate file part', () => {
    const part: MessagePart = {
      type: 'file',
      content: 'Document.pdf',
      fileName: 'document.pdf',
      fileType: 'application/pdf',
      fileUrl: 'https://example.com/files/doc.pdf',
    };

    const result = MessagePartSchema.safeParse(part);
    expect(result.success).toBe(true);
  });

  it('should validate source URL part', () => {
    const part: MessagePart = {
      type: 'source-url',
      content: 'Reference from OpenAI',
      sourceUrl: 'https://openai.com',
      sourceTitle: 'OpenAI Website',
    };

    const result = MessagePartSchema.safeParse(part);
    expect(result.success).toBe(true);
  });

  it('should reject invalid part type', () => {
    const invalidPart = {
      type: 'unknown',
      content: 'test',
    };

    const result = MessagePartSchema.safeParse(invalidPart);
    expect(result.success).toBe(false);
  });
});

describe('MessageStatusSchema', () => {
  it('should validate valid statuses', () => {
    const validStatuses: MessageStatus[] = [
      'sending',
      'sent',
      'queued',
      'failed',
      'streaming',
    ];

    for (const status of validStatuses) {
      const result = MessageStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid statuses', () => {
    const invalidStatuses = ['pending', 'delivered', 'read', ''];

    for (const status of invalidStatuses) {
      const result = MessageStatusSchema.safeParse(status);
      expect(result.success).toBe(false);
    }
  });
});

describe('ChatMessageSchema', () => {
  const validMessage: ChatMessage = {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'user',
    content: 'Hello',
    parts: [{ type: 'text', content: 'Hello' }],
    status: 'sent',
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };

  it('should validate a complete valid message', () => {
    const result = ChatMessageSchema.safeParse(validMessage);
    expect(result.success).toBe(true);
  });

  it('should validate with optional fields', () => {
    const message: ChatMessage = {
      ...validMessage,
      model: 'gpt-4',
      tokenCount: 42,
      latencyMs: 150,
      error: undefined,
    };

    const result = ChatMessageSchema.safeParse(message);
    expect(result.success).toBe(true);
  });

  it('should reject missing retryCount', () => {
    const message = {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'Hello',
      parts: [{ type: 'text', content: 'Hello' }],
      status: 'sent',
      createdAt: new Date().toISOString(),
    };

    const result = ChatMessageSchema.safeParse(message);
    expect(result.success).toBe(false);
  });

  it('should reject invalid role', () => {
    const invalidMessage = {
      ...validMessage,
      role: 'bot',
    };

    const result = ChatMessageSchema.safeParse(invalidMessage);
    expect(result.success).toBe(false);
  });

  it('should reject negative tokenCount', () => {
    const invalidMessage = {
      ...validMessage,
      tokenCount: -1,
    };

    const result = ChatMessageSchema.safeParse(invalidMessage);
    expect(result.success).toBe(false);
  });

  it('should validate assistant message', () => {
    const assistantMessage: ChatMessage = {
      ...validMessage,
      role: 'assistant',
      model: 'claude-3',
      parts: [
        { type: 'reasoning', content: 'Let me think...', thinkingTimeMs: 500 },
        { type: 'text', content: 'Here is my response' },
      ],
    };

    const result = ChatMessageSchema.safeParse(assistantMessage);
    expect(result.success).toBe(true);
  });

  it('should validate system message', () => {
    const systemMessage: ChatMessage = {
      ...validMessage,
      role: 'system',
      content: 'You are a helpful assistant.',
    };

    const result = ChatMessageSchema.safeParse(systemMessage);
    expect(result.success).toBe(true);
  });

  it('should validate message with multiple parts', () => {
    const message: ChatMessage = {
      ...validMessage,
      role: 'assistant',
      parts: [
        { type: 'text', content: 'Let me check the weather.' },
        { type: 'tool-call', content: 'Checking weather...', toolName: 'get_weather', toolArgs: '{}' },
        { type: 'tool-result', content: 'Weather result', toolName: 'get_weather', toolResult: '{}' },
        { type: 'text', content: 'The weather is sunny!' },
      ],
    };

    const result = ChatMessageSchema.safeParse(message);
    expect(result.success).toBe(true);
  });

  it('should validate message with error', () => {
    const messageWithError: ChatMessage = {
      ...validMessage,
      status: 'failed',
      error: 'Network timeout',
    };

    const result = ChatMessageSchema.safeParse(messageWithError);
    expect(result.success).toBe(true);
  });
});

describe('ChatMessageInputSchema', () => {
  it('should validate without auto-generated fields', () => {
    const input = {
      conversationId: 'conv-1',
      role: 'user' as const,
      content: 'Hello',
      parts: [{ type: 'text' as const, content: 'Hello' }],
      status: 'sending' as const,
    };

    const result = ChatMessageInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject if id is provided', () => {
    const inputWithId = {
      id: 'should-not-be-here',
      conversationId: 'conv-1',
      role: 'user' as const,
      content: 'Hello',
      parts: [{ type: 'text' as const, content: 'Hello' }],
      status: 'sending' as const,
    };

    const result = ChatMessageInputSchema.safeParse(inputWithId);
    expect(result.success).toBe(false);
  });
});

describe('ChatMessageUpdateSchema', () => {
  it('should validate with only id', () => {
    const update = { id: 'msg-1' };

    const result = ChatMessageUpdateSchema.safeParse(update);
    expect(result.success).toBe(true);
  });

  it('should validate with partial fields', () => {
    const update = {
      id: 'msg-1',
      content: 'Updated content',
      status: 'sent' as const,
    };

    const result = ChatMessageUpdateSchema.safeParse(update);
    expect(result.success).toBe(true);
  });

  it('should reject without id', () => {
    const update = { content: 'Updated content' };

    const result = ChatMessageUpdateSchema.safeParse(update);
    expect(result.success).toBe(false);
  });
});
