/**
 * Chat Module
 *
 * Core chat functionality for AgentLink.
 */

// Chat Engine
export {
  createChatEngine,
  type ChatEngine,
  type ChatEngineOptions,
} from './chat-engine';

// Stream Parser
export {
  createStreamParser,
  createTextParser,
  extractPartsFromStream,
  type StreamDelta,
  type StreamParserCallbacks,
} from './stream-parser';

// Message Formatter
export {
  formatMessagesForAgent,
  extractTextContent,
  extractReasoningContent,
  extractToolCalls,
  buildMessageParts,
  messagesToText,
  estimateTokenCount,
  truncateMessages,
  type FormattedMessage,
} from './message-formatter';

// Offline Queue
export {
  queueMessage,
  processQueue,
  getQueuedMessageCount,
  getQueuedMessages,
  clearFailedMessages,
  retryFailedMessage,
  subscribeToQueue,
} from './offline-queue';
