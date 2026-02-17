import { z } from 'zod';

/**
 * Message Part Type Schema
 * Defines the different types of message content parts
 */
export const MessagePartTypeSchema = z.enum([
  'text',
  'reasoning',
  'tool-call',
  'tool-result',
  'file',
  'source-url',
]);

/**
 * Message Status Schema
 * Represents the delivery status of a message
 */
export const MessageStatusSchema = z.enum([
  'sending',
  'sent',
  'queued',
  'failed',
  'streaming',
]);

/**
 * Message Part Schema
 * Represents a structured part of a message
 * Aligned with MessagePart interface from IndexedDB
 */
export const MessagePartSchema = z.object({
  type: MessagePartTypeSchema,
  content: z.string(),
  // Tool fields
  toolName: z.string().optional(),
  toolArgs: z.string().optional(),
  toolResult: z.string().optional(),
  // File fields
  fileName: z.string().optional(),
  fileType: z.string().optional(),
  fileUrl: z.string().optional(),
  // Source URL fields
  sourceUrl: z.string().optional(),
  sourceTitle: z.string().optional(),
  // Reasoning fields
  thinkingTimeMs: z.number().optional(),
});

/**
 * Chat Message Schema
 * Complete message structure
 * Aligned with LocalMessage interface from IndexedDB
 */
export const ChatMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  parts: z.array(MessagePartSchema),
  model: z.string().optional(),
  tokenCount: z.number().int().min(0).optional(),
  latencyMs: z.number().int().optional(),
  status: MessageStatusSchema,
  error: z.string().optional(),
  retryCount: z.number().int(),
  createdAt: z.string().datetime(),
});

/**
 * Message Input Schema (for creation)
 * Omits auto-generated fields and rejects them if provided
 */
export const ChatMessageInputSchema = ChatMessageSchema.omit({
  id: true,
  createdAt: true,
  tokenCount: true,
  latencyMs: true,
  retryCount: true,
}).strict();

/**
 * Message Update Schema
 * Makes all fields optional except id
 */
export const ChatMessageUpdateSchema = ChatMessageSchema.partial().required({
  id: true,
});

/**
 * Type exports - aligned with LocalMessage/MessagePart from IndexedDB
 */
export type MessagePartType = z.infer<typeof MessagePartTypeSchema>;
export type MessageStatus = z.infer<typeof MessageStatusSchema>;
export type MessagePart = z.infer<typeof MessagePartSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatMessageInput = z.infer<typeof ChatMessageInputSchema>;
export type ChatMessageUpdate = z.infer<typeof ChatMessageUpdateSchema>;
