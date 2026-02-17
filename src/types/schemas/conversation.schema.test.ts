import { describe, it, expect } from 'vitest';
import {
  ConversationSchema,
  ConversationInputSchema,
  ConversationUpdateSchema,
  ConversationFilterSchema,
  type Conversation,
  type ConversationFilter,
} from './conversation.schema';

describe('ConversationSchema', () => {
  const validConversation: Conversation = {
    id: 'conv-1',
    agentId: 'agent-1',
    title: 'Test Conversation',
    messageCount: 5,
    lastMessagePreview: 'Last message...',
    lastMessageRole: 'assistant',
    isPinned: false,
    isArchived: false,
    folder: 'work',
    tags: ['important', 'work'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should validate a complete valid conversation', () => {
    const result = ConversationSchema.safeParse(validConversation);
    expect(result.success).toBe(true);
  });

  it('should reject invalid field types', () => {
    const conversationWithInvalidTypes = {
      id: 'conv-1',
      agentId: 'agent-1',
      title: 123,
      messageCount: 'five',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = ConversationSchema.safeParse(conversationWithInvalidTypes);
    expect(result.success).toBe(false);
  });

  it('should catch invalid field types with catch()', () => {
    const conversationWithInvalidTypes = {
      id: 'conv-1',
      agentId: 'agent-1',
      messageCount: 5,
      title: 123, // will be caught
      isPinned: 'yes', // will be caught
      tags: 'tag1', // will be caught
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = ConversationSchema.safeParse(conversationWithInvalidTypes);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('New Conversation');
      expect(result.data.isPinned).toBe(false);
      expect(result.data.tags).toEqual([]);
    }
  });

  it('should validate forked conversation', () => {
    const forkedConversation: Conversation = {
      ...validConversation,
      forkedFromConversationId: 'conv-original',
      forkedFromMessageIndex: 5,
    };

    const result = ConversationSchema.safeParse(forkedConversation);
    expect(result.success).toBe(true);
  });

  it('should reject negative messageCount', () => {
    const invalidConversation = {
      ...validConversation,
      messageCount: -1,
    };

    const result = ConversationSchema.safeParse(invalidConversation);
    expect(result.success).toBe(false);
  });

  it('should reject invalid lastMessageRole', () => {
    const invalidConversation = {
      ...validConversation,
      lastMessageRole: 'system',
    };

    const result = ConversationSchema.safeParse(invalidConversation);
    expect(result.success).toBe(false);
  });

  it('should validate pinned conversation', () => {
    const pinnedConversation: Conversation = {
      ...validConversation,
      isPinned: true,
    };

    const result = ConversationSchema.safeParse(pinnedConversation);
    expect(result.success).toBe(true);
  });

  it('should validate archived conversation', () => {
    const archivedConversation: Conversation = {
      ...validConversation,
      isArchived: true,
    };

    const result = ConversationSchema.safeParse(archivedConversation);
    expect(result.success).toBe(true);
  });

  it('should validate conversation with empty tags', () => {
    const conversationWithEmptyTags: Conversation = {
      ...validConversation,
      tags: [],
    };

    const result = ConversationSchema.safeParse(conversationWithEmptyTags);
    expect(result.success).toBe(true);
  });

  it('should validate conversation with multiple tags', () => {
    const conversationWithTags: Conversation = {
      ...validConversation,
      tags: ['tag1', 'tag2', 'tag3'],
    };

    const result = ConversationSchema.safeParse(conversationWithTags);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toHaveLength(3);
    }
  });
});

describe('ConversationInputSchema', () => {
  it('should validate without auto-generated fields', () => {
    const input = {
      agentId: 'agent-1',
    };

    const result = ConversationInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should validate with minimal fields', () => {
    const input = {
      agentId: 'agent-1',
    };

    const result = ConversationInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject if id is provided', () => {
    const inputWithId = {
      id: 'should-not-be-here',
      agentId: 'agent-1',
    };

    const result = ConversationInputSchema.safeParse(inputWithId);
    expect(result.success).toBe(false);
  });
});

describe('ConversationUpdateSchema', () => {
  it('should validate with only id', () => {
    const update = { id: 'conv-1' };

    const result = ConversationUpdateSchema.safeParse(update);
    expect(result.success).toBe(true);
  });

  it('should validate with partial fields', () => {
    const update = {
      id: 'conv-1',
      title: 'Updated Title',
      isPinned: true,
    };

    const result = ConversationUpdateSchema.safeParse(update);
    expect(result.success).toBe(true);
  });

  it('should validate archive operation', () => {
    const update = {
      id: 'conv-1',
      isArchived: true,
    };

    const result = ConversationUpdateSchema.safeParse(update);
    expect(result.success).toBe(true);
  });

  it('should validate pin operation', () => {
    const update = {
      id: 'conv-1',
      isPinned: true,
    };

    const result = ConversationUpdateSchema.safeParse(update);
    expect(result.success).toBe(true);
  });

  it('should reject without id', () => {
    const update = { title: 'Updated Title' };

    const result = ConversationUpdateSchema.safeParse(update);
    expect(result.success).toBe(false);
  });
});

describe('ConversationFilterSchema', () => {
  it('should validate empty filter', () => {
    const filter = {};

    const result = ConversationFilterSchema.safeParse(filter);
    expect(result.success).toBe(true);
  });

  it('should validate with all fields', () => {
    const filter: ConversationFilter = {
      agentId: 'agent-1',
      isPinned: true,
      isArchived: false,
      folder: 'work',
      tags: ['important'],
      searchQuery: 'hello',
      dateFrom: new Date('2024-01-01').toISOString(),
      dateTo: new Date().toISOString(),
    };

    const result = ConversationFilterSchema.safeParse(filter);
    expect(result.success).toBe(true);
  });

  it('should validate partial filter', () => {
    const filter: ConversationFilter = {
      agentId: 'agent-1',
    };

    const result = ConversationFilterSchema.safeParse(filter);
    expect(result.success).toBe(true);
  });

  it('should validate tag filter', () => {
    const filter: ConversationFilter = {
      tags: ['work', 'personal'],
    };

    const result = ConversationFilterSchema.safeParse(filter);
    expect(result.success).toBe(true);
  });

  it('should validate date range filter', () => {
    const filter: ConversationFilter = {
      dateFrom: new Date('2024-01-01').toISOString(),
      dateTo: new Date('2024-12-31').toISOString(),
    };

    const result = ConversationFilterSchema.safeParse(filter);
    expect(result.success).toBe(true);
  });
});
