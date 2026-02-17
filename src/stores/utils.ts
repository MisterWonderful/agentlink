/**
 * Store Utilities
 * Helper functions for Zustand stores
 */

import type { Agent, Conversation, ChatMessage } from '@/types/schemas';
import type {
  LocalAgent,
  LocalConversation,
  LocalMessage,
} from '@/lib/db/indexeddb';

// ============================================
// Agent Converters
// ============================================

/**
 * Convert LocalAgent (DB format) to Agent (app format)
 */
export function localAgentToAgent(local: LocalAgent): Agent {
  return {
    id: local.id,
    name: local.name,
    avatarUrl: local.avatarUrl,
    accentColor: local.accentColor,
    agentType: local.agentType,
    endpointUrl: local.endpointUrl,
    authToken: local.authToken,
    systemPrompt: local.systemPrompt,
    defaultModel: local.defaultModel,
    temperature: local.temperature,
    maxTokens: local.maxTokens,
    contextLength: local.contextLength,
    topP: local.topP,
    frequencyPenalty: local.frequencyPenalty,
    presencePenalty: local.presencePenalty,
    capabilities: local.capabilities,
    customHeaders: local.customHeaders,
    requestTimeoutMs: local.requestTimeoutMs,
    maxRetries: local.maxRetries,
    customCaCert: local.customCaCert,
    isActive: local.isActive,
    lastSeenAt: local.lastSeenAt,
    avgLatencyMs: local.avgLatencyMs,
    sortOrder: local.sortOrder,
    createdAt: local.createdAt,
    updatedAt: local.updatedAt,
  };
}

/**
 * Convert Agent (app format) to LocalAgent (DB format)
 */
export function agentToLocalAgent(agent: Agent): LocalAgent {
  return {
    id: agent.id,
    name: agent.name,
    avatarUrl: agent.avatarUrl,
    accentColor: agent.accentColor,
    agentType: agent.agentType,
    endpointUrl: agent.endpointUrl,
    authToken: agent.authToken,
    systemPrompt: agent.systemPrompt,
    defaultModel: agent.defaultModel,
    temperature: agent.temperature,
    maxTokens: agent.maxTokens,
    contextLength: agent.contextLength,
    topP: agent.topP,
    frequencyPenalty: agent.frequencyPenalty,
    presencePenalty: agent.presencePenalty,
    capabilities: agent.capabilities,
    customHeaders: agent.customHeaders as Record<string, string>,
    requestTimeoutMs: agent.requestTimeoutMs,
    maxRetries: agent.maxRetries,
    customCaCert: agent.customCaCert,
    isActive: agent.isActive,
    lastSeenAt: agent.lastSeenAt,
    avgLatencyMs: agent.avgLatencyMs,
    sortOrder: agent.sortOrder,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}

// ============================================
// Conversation Converters
// ============================================

/**
 * Convert LocalConversation (DB format) to Conversation (app format)
 */
export function localConversationToConversation(local: LocalConversation): Conversation {
  return {
    id: local.id,
    agentId: local.agentId,
    title: local.title,
    messageCount: local.messageCount,
    lastMessagePreview: local.lastMessagePreview,
    lastMessageRole: local.lastMessageRole,
    isPinned: local.isPinned,
    isArchived: local.isArchived,
    folder: local.folder,
    tags: local.tags,
    forkedFromConversationId: local.forkedFromConversationId,
    forkedFromMessageIndex: local.forkedFromMessageIndex,
    createdAt: local.createdAt,
    updatedAt: local.updatedAt,
  };
}

/**
 * Convert Conversation (app format) to LocalConversation (DB format)
 */
export function conversationToLocalConversation(conv: Conversation): LocalConversation {
  return {
    id: conv.id,
    agentId: conv.agentId,
    title: conv.title,
    messageCount: conv.messageCount,
    lastMessagePreview: conv.lastMessagePreview,
    lastMessageRole: conv.lastMessageRole,
    isPinned: conv.isPinned,
    isArchived: conv.isArchived,
    folder: conv.folder,
    tags: conv.tags,
    forkedFromConversationId: conv.forkedFromConversationId,
    forkedFromMessageIndex: conv.forkedFromMessageIndex,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
  };
}

// ============================================
// Message Converters
// ============================================

/**
 * Convert LocalMessage (DB format) to ChatMessage (app format)
 */
export function localMessageToMessage(local: LocalMessage): ChatMessage {
  return {
    id: local.id,
    conversationId: local.conversationId,
    role: local.role,
    content: local.content,
    parts: local.parts,
    model: local.model,
    tokenCount: local.tokenCount,
    latencyMs: local.latencyMs,
    status: local.status,
    error: local.error,
    retryCount: local.retryCount,
    createdAt: local.createdAt,
  };
}

/**
 * Convert ChatMessage (app format) to LocalMessage (DB format)
 */
export function messageToLocalMessage(msg: ChatMessage): LocalMessage {
  return {
    id: msg.id,
    conversationId: msg.conversationId,
    role: msg.role,
    content: msg.content,
    parts: msg.parts,
    model: msg.model,
    tokenCount: msg.tokenCount,
    latencyMs: msg.latencyMs,
    status: msg.status,
    error: msg.error,
    retryCount: msg.retryCount,
    createdAt: msg.createdAt,
  };
}

// ============================================
// ID Generation
// ============================================

/**
 * Generate a unique ID using crypto.randomUUID if available,
 * fallback to timestamp + random
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get current timestamp in ISO format
 */
export function now(): string {
  return new Date().toISOString();
}
