/**
 * AgentLink Type Definitions
 * 
 * Central export point for all types and schemas.
 * Includes both Zod schemas and runtime types.
 */

// Re-export all schemas and types from schemas directory
export * from './schemas';

// Re-export macro types
export * from './macros';

// Re-export database types for backward compatibility
export {
  db,
  AgentLinkDB,
  initDatabase,
  deleteDatabase,
  closeDatabase,
  type LocalAgent,
  type LocalConversation,
  type LocalMessage,
} from '@/lib/db/indexeddb';

// Additional type utilities
import type { z } from 'zod';

/**
 * Helper type to extract the inferred type from any Zod schema
 */
export type Infer<T extends z.ZodTypeAny> = z.infer<T>;

/**
 * Helper type for API response wrappers
 */
export type ApiResponse<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: string };

/**
 * Helper type for paginated results
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Helper type for sort order
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Helper type for sort configuration
 */
export interface SortConfig<TField = string> {
  field: TField;
  order: SortOrder;
}

/**
 * Theme type for UI
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * App Settings type
 */
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  enterToSend: boolean;
  showTimestamp: boolean;
  autoScroll: boolean;
  soundEnabled: boolean;
  hapticFeedback: boolean;
  offlineMode: boolean;
  syncEnabled: boolean;
}
