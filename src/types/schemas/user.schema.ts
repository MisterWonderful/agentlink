import { z } from 'zod';

/**
 * User Plan Schema
 * Subscription tiers available
 */
export const UserPlanSchema = z.enum(['free', 'pro', 'team']);

/**
 * User Schema
 * User account information
 */
export const UserSchema = z.object({
  // Identity
  id: z.string(),
  clerkId: z.string(),

  // Profile
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  avatarUrl: z.string().optional(),

  // Subscription
  plan: UserPlanSchema.catch('free'),

  // Settings
  syncEnabled: z.boolean().catch(false),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * User Preferences Schema
 * User-specific application settings
 */
export const UserPreferencesSchema = z.object({
  userId: z.string(),

  // Appearance
  theme: z.enum(['light', 'dark', 'system']).catch('system'),
  fontSize: z.enum(['small', 'medium', 'large']).catch('medium'),
  codeTheme: z.string().catch('github-dark'),

  // Behavior
  enterToSend: z.boolean().catch(true),
  showTokenCount: z.boolean().catch(true),
  autoScroll: z.boolean().catch(true),
  soundEnabled: z.boolean().catch(false),

  // Privacy
  shareAnalytics: z.boolean().catch(false),
  storeLocalHistory: z.boolean().catch(true),

  // Notifications
  pushNotifications: z.boolean().catch(false),
  emailNotifications: z.boolean().catch(false),

  updatedAt: z.string().datetime(),
});

/**
 * User Input Schema (for creation)
 * Omits auto-generated fields and rejects them if provided
 */
export const UserInputSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).strict();

/**
 * User Update Schema
 * Makes all fields optional except id
 */
export const UserUpdateSchema = UserSchema.partial().required({ id: true });

/**
 * User Session Schema
 * Active session information
 */
export const UserSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  deviceName: z.string().optional(),
  deviceType: z.enum(['mobile', 'tablet', 'desktop', 'web']).optional(),
  lastActiveAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  isValid: z.boolean().catch(true),
});

/**
 * Agent Status Schema
 * Real-time agent connection status
 */
export const AgentStatusSchema = z.object({
  agentId: z.string(),
  isOnline: z.boolean(),
  latencyMs: z.number().int().optional(),
  lastCheckedAt: z.string().datetime(),
  error: z.string().optional(),
});

/**
 * Connection State Schema
 * WebSocket/connection status
 */
export const ConnectionStateSchema = z.object({
  isConnected: z.boolean(),
  isConnecting: z.boolean(),
  error: z.string().optional(),
});

/**
 * Type exports
 */
export type UserPlan = z.infer<typeof UserPlanSchema>;
export type User = z.infer<typeof UserSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type UserInput = z.infer<typeof UserInputSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
export type UserSession = z.infer<typeof UserSessionSchema>;
export type AgentStatus = z.infer<typeof AgentStatusSchema>;
export type ConnectionState = z.infer<typeof ConnectionStateSchema>;
