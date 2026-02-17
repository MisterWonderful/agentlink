import { z } from 'zod';

/**
 * Agent Type Schema
 * Defines the supported agent provider types
 */
export const AgentTypeSchema = z.enum([
  'openai_compatible',
  'ollama',
  'anthropic_compatible',
  'custom',
]);

/**
 * Agent Capabilities Schema
 * Defines what features an agent supports
 */
export const AgentCapabilitiesSchema = z.object({
  vision: z.boolean().catch(false),
  tools: z.boolean().catch(false),
  reasoning: z.boolean().catch(false),
  fileUpload: z.boolean().catch(false),
  codeExecution: z.boolean().catch(false),
});

/**
 * Agent Schema
 * Complete agent configuration and metadata
 * Aligned with LocalAgent interface from IndexedDB
 */
export const AgentSchema = z.object({
  // Identity
  id: z.string(),
  serverId: z.string().optional(),
  name: z.string().min(1).max(100),
  avatarUrl: z.string().optional(),
  accentColor: z.string().catch('#3b82f6'),

  // Configuration
  agentType: AgentTypeSchema,
  endpointUrl: z.string().url(),
  authToken: z.string().optional(),
  systemPrompt: z.string().catch(''),
  defaultModel: z.string().optional(),

  // Model Parameters - no .catch() to preserve range validation
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().positive(),
  contextLength: z.number().int().positive(),
  topP: z.number().min(0).max(1).catch(1),
  frequencyPenalty: z.number().catch(0),
  presencePenalty: z.number().catch(0),

  // Capabilities
  capabilities: AgentCapabilitiesSchema,

  // Network & Retry - no .catch() on maxRetries to preserve range validation
  customHeaders: z.record(z.string(), z.string()).catch({}),
  requestTimeoutMs: z.number().int().positive().catch(30000),
  maxRetries: z.number().int().min(0).max(10),
  customCaCert: z.string().optional(),

  // Status
  isActive: z.boolean().catch(true),
  lastSeenAt: z.string().datetime().optional(),
  avgLatencyMs: z.number().int().optional(),
  sortOrder: z.number().int().catch(0),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Agent Input Schema (for creation)
 * Omits auto-generated fields and rejects them if provided
 */
export const AgentInputSchema = AgentSchema.omit({
  id: true,
  serverId: true,
  createdAt: true,
  updatedAt: true,
  lastSeenAt: true,
  avgLatencyMs: true,
}).strict();

/**
 * Agent Update Schema
 * Makes all fields optional except id
 */
export const AgentUpdateSchema = AgentSchema.partial().required({ id: true });

/**
 * Type exports - aligned with LocalAgent from IndexedDB
 */
export type Agent = z.infer<typeof AgentSchema>;
export type AgentType = z.infer<typeof AgentTypeSchema>;
export type AgentCapabilities = z.infer<typeof AgentCapabilitiesSchema>;
export type AgentInput = z.infer<typeof AgentInputSchema>;
export type AgentUpdate = z.infer<typeof AgentUpdateSchema>;
