import { z } from 'zod';

/**
 * Conversation Schema
 * Represents a chat conversation thread
 * Aligned with LocalConversation interface from IndexedDB
 */
export const ConversationSchema = z.object({
  // Identity
  id: z.string(),
  agentId: z.string(),

  // Display
  title: z.string().catch('New Conversation'),

  // Statistics - no .catch() to preserve validation
  messageCount: z.number().int().min(0),
  lastMessagePreview: z.string().optional(),
  lastMessageRole: z.enum(['user', 'assistant']).optional(),

  // Organization
  isPinned: z.boolean().catch(false),
  isArchived: z.boolean().catch(false),
  folder: z.string().optional(),
  tags: z.array(z.string()).catch([]),

  // Forking (for conversation branching)
  forkedFromConversationId: z.string().optional(),
  forkedFromMessageIndex: z.number().int().optional(),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Conversation Input Schema (for creation)
 * Omits auto-generated fields and rejects them if provided
 */
export const ConversationInputSchema = ConversationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  messageCount: true,
  lastMessagePreview: true,
  lastMessageRole: true,
}).strict();

/**
 * Conversation Update Schema
 * Makes all fields optional except id
 */
export const ConversationUpdateSchema = ConversationSchema.partial().required({
  id: true,
});

/**
 * Conversation Filter Schema
 * For filtering conversation lists
 */
export const ConversationFilterSchema = z.object({
  agentId: z.string().optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  folder: z.string().optional(),
  tags: z.array(z.string()).optional(),
  searchQuery: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

/**
 * Type exports - aligned with LocalConversation from IndexedDB
 */
export type Conversation = z.infer<typeof ConversationSchema>;
export type ConversationInput = z.infer<typeof ConversationInputSchema>;
export type ConversationUpdate = z.infer<typeof ConversationUpdateSchema>;
export type ConversationFilter = z.infer<typeof ConversationFilterSchema>;
