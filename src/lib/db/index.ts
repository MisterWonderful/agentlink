/**
 * Database Module
 * 
 * Central export point for all database-related functionality.
 * Includes IndexedDB operations for agents, conversations, and messages.
 */

// Database instance and initialization
export {
  db,
  type AgentLinkDB,
  initDatabase,
  deleteDatabase,
  closeDatabase,
} from "./indexeddb";

// Database types
export type {
  LocalAgent,
  LocalConversation,
  LocalMessage,
  AgentType,
  AgentCapabilities,
  MessageStatus,
  MessagePart,
} from "./indexeddb";

// Agent queries
export {
  getAllAgents,
  getAgentById,
  getAgentByServerId,
  getActiveAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  reorderAgents,
  updateAgentStatus,
  searchAgents,
  countAgents,
  bulkCreateAgents,
  duplicateAgent,
} from "./agent-queries";

// Conversation queries
export {
  getConversationsByAgent,
  getConversationById,
  createConversation,
  updateConversation,
  updateConversationLastMessage,
  deleteConversation,
  getPinnedConversations,
  getArchivedConversations,
  archiveConversation,
  unarchiveConversation,
  pinConversation,
  unpinConversation,
  togglePinConversation,
  forkConversation,
  searchConversations,
  countConversationsByAgent,
  getAllConversations,
  addConversationTag,
  removeConversationTag,
} from "./conversation-queries";

// Message queries
export {
  getMessagesByConversation,
  getMessageById,
  createMessage,
  updateMessage,
  appendMessageContent,
  updateMessageStatus,
  incrementRetryCount,
  deleteMessage,
  deleteMessagesByConversation,
  getQueuedMessages,
  getFailedMessages,
  getInProgressMessages,
  searchMessages,
  getRecentMessages,
  countMessagesByConversation,
  countAllMessages,
  bulkCreateMessages,
  pruneMessages,
  getMessagesByStatus,
  retryFailedMessage,
} from "./message-queries";
