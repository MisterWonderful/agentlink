// Zustand Stores - Barrel Export
export { useAgentStore } from './agent-store';
export { useChatStore } from './chat-store';
export { useConnectionStore } from './connection-store';
export { useUIStore } from './ui-store';
export { useSettingsStore } from './settings-store';
export { useMacroStore, useMacrosByCategory, useFavoriteMacros, useRecentMacros, useMacroById, useSearchedMacros } from './macro-store';

// Re-export types
export type {
  AgentStore,
  AgentStoreState,
  AgentStoreActions,
  ChatStore,
  ChatStoreState,
  ChatStoreActions,
  ConnectionStore,
  ConnectionStoreState,
  ConnectionStoreActions,
  ConnectionStatus,
  UIStore,
  UIStoreState,
  UIStoreActions,
  Theme,
  Toast,
  ToastType,
} from './types';

// Hydration utility
export {
  hydrateStores,
  getHydrationState,
  isHydrated,
  resetHydrationState,
  waitForHydration,
} from './hydration';

// Utilities
export {
  localAgentToAgent,
  agentToLocalAgent,
  localConversationToConversation,
  conversationToLocalConversation,
  localMessageToMessage,
  messageToLocalMessage,
  generateId,
  now,
} from './utils';
