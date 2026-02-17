import Dexie, { type Table } from 'dexie';

/**
 * Supported agent protocol types.
 */
export type AgentType = 'openai_compatible' | 'ollama' | 'anthropic_compatible' | 'custom';

/**
 * Agent capabilities - features supported by the agent endpoint.
 */
export interface AgentCapabilities {
  vision: boolean;
  tools: boolean;
  reasoning: boolean;
  fileUpload: boolean;
  codeExecution: boolean;
}

/**
 * Message status indicating the state of message processing.
 */
export type MessageStatus = 'sending' | 'sent' | 'queued' | 'failed' | 'streaming';

/**
 * MessagePart represents a structured part of a message.
 * Used for text, reasoning, tool calls, files, and source URLs.
 */
export interface MessagePart {
  type: 'text' | 'reasoning' | 'tool-call' | 'tool-result' | 'file' | 'source-url';
  content: string;
  /** Tool name for tool-call type */
  toolName?: string;
  /** Tool arguments (JSON string) for tool-call type */
  toolArgs?: string;
  /** Tool result for tool-result type */
  toolResult?: string;
  /** File name for file type */
  fileName?: string;
  /** MIME type for file type */
  fileType?: string;
  /** Local blob URL for file type */
  fileUrl?: string;
  /** Source URL for source-url type */
  sourceUrl?: string;
  /** Source title for source-url type */
  sourceTitle?: string;
  /** Thinking time in ms for reasoning type */
  thinkingTimeMs?: number;
}

/**
 * LocalAgent represents an agent configuration stored in IndexedDB.
 * Note: endpointUrl and authToken are decrypted and only exist client-side.
 */
export interface LocalAgent {
  /** Unique local ID (UUID) */
  id: string;
  /** Supabase ID when synced */
  serverId?: string;
  /** Display name */
  name: string;
  /** Avatar URL or emoji */
  avatarUrl?: string;
  /** Accent color for UI differentiation (hex) */
  accentColor: string;
  /** Protocol adapter type */
  agentType: AgentType;
  /** Agent endpoint URL (decrypted) */
  endpointUrl: string;
  /** Auth token if required (decrypted) */
  authToken?: string;
  /** System prompt for the agent */
  systemPrompt: string;
  /** Default model to use */
  defaultModel?: string;
  /** Sampling temperature (0-2) */
  temperature: number;
  /** Maximum tokens per response */
  maxTokens: number;
  /** Context window length */
  contextLength: number;
  /** Nucleus sampling parameter */
  topP: number;
  /** Frequency penalty (-2 to 2) */
  frequencyPenalty: number;
  /** Presence penalty (-2 to 2) */
  presencePenalty: number;
  /** Supported capabilities */
  capabilities: AgentCapabilities;
  /** Custom headers to include in requests */
  customHeaders: Record<string, string>;
  /** Request timeout in milliseconds */
  requestTimeoutMs: number;
  /** Max retry attempts for failed requests */
  maxRetries: number;
  /** Custom CA certificate (PEM format) for self-signed certs */
  customCaCert?: string;
  /** Whether the agent is currently active/online */
  isActive: boolean;
  /** ISO timestamp of last successful health check */
  lastSeenAt?: string;
  /** Average latency in milliseconds from health checks */
  avgLatencyMs?: number;
  /** Sort order for display */
  sortOrder: number;
  /** ISO timestamp when created */
  createdAt: string;
  /** ISO timestamp when last updated */
  updatedAt: string;
}

/**
 * LocalConversation represents a chat conversation stored in IndexedDB.
 */
export interface LocalConversation {
  /** Unique local ID (UUID) */
  id: string;
  /** Associated agent ID */
  agentId: string;
  /** Conversation title */
  title: string;
  /** Number of messages in conversation */
  messageCount: number;
  /** Preview of last message (first 100 chars) */
  lastMessagePreview?: string;
  /** Role of last message sender */
  lastMessageRole?: 'user' | 'assistant';
  /** Whether conversation is pinned to top */
  isPinned: boolean;
  /** Whether conversation is archived */
  isArchived: boolean;
  /** Folder/category for organization */
  folder?: string;
  /** Tags for filtering */
  tags: string[];
  /** Original conversation ID if this is a fork */
  forkedFromConversationId?: string;
  /** Message index where fork occurred */
  forkedFromMessageIndex?: number;
  /** ISO timestamp when created */
  createdAt: string;
  /** ISO timestamp when last updated */
  updatedAt: string;
}

/**
 * LocalMessage represents a chat message stored in IndexedDB.
 */
export interface LocalMessage {
  /** Unique local ID (UUID) */
  id: string;
  /** Parent conversation ID */
  conversationId: string;
  /** Message sender role */
  role: 'user' | 'assistant' | 'system';
  /** Plain text content */
  content: string;
  /** Structured message parts */
  parts: MessagePart[];
  /** Model that generated this response */
  model?: string;
  /** Estimated token count */
  tokenCount?: number;
  /** Response generation time in ms */
  latencyMs?: number;
  /** Current message status */
  status: MessageStatus;
  /** Error message if status is 'failed' */
  error?: string;
  /** Number of retry attempts */
  retryCount: number;
  /** ISO timestamp when created */
  createdAt: string;
}

/**
 * Stored file metadata and blob
 */
export interface LocalFile {
  id: string;
  name: string;
  size: number;
  type: string;
  category: string;
  mimeType: string;
  extension: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  uploadProgress: number;
  uploadStatus: string;
  errorMessage?: string;
  checksum?: string;
  createdAt: Date;
  conversationId: string;
  messageId?: string;
  blob: Blob;
  thumbnailBlob?: Blob;
  isQueued: number; // 0 or 1 for Dexie boolean
  uploadAttempts: number;
  lastUploadAttempt?: number;
  expiresAt?: number;
}

/**
 * Upload session for resumable uploads
 */
export interface LocalUploadSession {
  checksum: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  chunks: {
    index: number;
    start: number;
    end: number;
    size: number;
    retries: number;
    status: string;
  }[];
  endpoint: string;
  createdAt: number;
  metadata: LocalFile;
}

/**
 * AgentLinkDB - Main Dexie database class for AgentLink.
 * 
 * Stores all message content and local copies of agent configs.
 * Messages are never synced to server - only agent metadata and conversation
 * metadata sync to Supabase when user has Pro/Team plan.
 */
export class AgentLinkDB extends Dexie {
  /** Agents table - stores agent configurations */
  agents!: Table<LocalAgent>;
  /** Conversations table - stores conversation metadata */
  conversations!: Table<LocalConversation>;
  /** Messages table - stores all message content */
  messages!: Table<LocalMessage>;
  /** Files table - stores file blobs and metadata */
  files!: Table<LocalFile>;
  /** Upload sessions table - stores resumable upload state */
  uploadSessions!: Table<LocalUploadSession>;

  constructor() {
    super('agentlink');
    
    this.version(1).stores({
      // Primary key is 'id', indexes for common queries
      agents: 'id, serverId, name, agentType, isActive, sortOrder',
      // [agentId+updatedAt] compound index for listing conversations per agent
      conversations: 'id, agentId, title, isPinned, isArchived, updatedAt, [agentId+updatedAt]',
      // [conversationId+createdAt] compound index for loading messages in order
      messages: 'id, conversationId, role, status, createdAt, [conversationId+createdAt]',
    });
    
    // Version 2: Add files and uploadSessions tables
    this.version(2).stores({
      agents: 'id, serverId, name, agentType, isActive, sortOrder',
      conversations: 'id, agentId, title, isPinned, isArchived, updatedAt, [agentId+updatedAt]',
      messages: 'id, conversationId, role, status, createdAt, [conversationId+createdAt]',
      // [conversationId+createdAt] compound index for listing files per conversation
      files: 'id, conversationId, messageId, isQueued, uploadStatus, createdAt, [conversationId+createdAt], [messageId+createdAt]',
      // checksum as primary key for resumable uploads
      uploadSessions: 'checksum, fileId, createdAt',
    });
  }
}

/**
 * Singleton database instance for AgentLink.
 * Use this for direct database access when needed.
 * 
 * @example
 * ```typescript
 * import { db } from '@/lib/db/indexeddb';
 * 
 * // Direct query example
 * const agent = await db.agents.get(agentId);
 * const conversations = await db.conversations
 *   .where('agentId')
 *   .equals(agentId)
 *   .toArray();
 * ```
 */
export const db = new AgentLinkDB();

/**
 * Initialize the database and handle upgrade scenarios.
 * Call this on app startup to ensure DB is ready.
 */
export async function initDatabase(): Promise<void> {
  await db.open();
}

/**
 * Delete the entire database. Use with caution - mainly for testing.
 */
export async function deleteDatabase(): Promise<void> {
  await db.delete();
}

/**
 * Close the database connection.
 */
export async function closeDatabase(): Promise<void> {
  db.close();
}

/**
 * Check if the database is currently open.
 */
export function isDatabaseOpen(): boolean {
  return db.isOpen();
}

/**
 * Wait for the database to be ready.
 * Returns immediately if already open.
 */
export async function waitForDatabase(timeoutMs = 5000): Promise<void> {
  const startTime = Date.now();
  
  while (!db.isOpen() && Date.now() - startTime < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  if (!db.isOpen()) {
    throw new Error('Database failed to open within timeout');
  }
}
