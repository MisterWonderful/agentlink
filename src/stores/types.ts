/**
 * Store Types
 * Type definitions for Zustand stores
 */

import type {
  Agent,
  Conversation,
  ChatMessage,
  ChatMessageInput,
} from '@/types/schemas';

// ============================================
// Agent Store Types
// ============================================

export interface AgentStoreState {
  agents: Map<string, Agent>;
  activeAgentId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface AgentStoreActions {
  loadAgents: () => Promise<void>;
  addAgent: (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Agent>;
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<void>;
  removeAgent: (id: string) => Promise<void>;
  setActiveAgent: (id: string | null) => void;
  getAgent: (id: string) => Agent | undefined;
  reorderAgents: (orderedIds: string[]) => Promise<void>;
  updateAgentStatus: (
    id: string,
    status: { isActive: boolean; latencyMs?: number }
  ) => void;
  clearError: () => void;
}

export type AgentStore = AgentStoreState & AgentStoreActions;

// ============================================
// Chat Store Types
// ============================================

export interface ChatStoreState {
  conversations: Map<string, Conversation>;
  messages: Map<string, ChatMessage[]>;
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface ChatStoreActions {
  loadConversations: (agentId?: string) => Promise<void>;
  loadAllConversations: () => Promise<void>;
  createConversation: (agentId: string, title?: string) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  loadMessages: (conversationId: string) => Promise<void>;
  loadAllMessages: () => Promise<void>;
  addMessage: (
    conversationId: string,
    message: Omit<ChatMessageInput, 'conversationId'>
  ) => Promise<ChatMessage>;
  updateMessage: (
    conversationId: string,
    messageId: string,
    updates: Partial<ChatMessage>
  ) => Promise<void>;
  getConversationsByAgent: (agentId: string) => Conversation[];
  getMessagesByConversation: (conversationId: string) => ChatMessage[];
  updateConversationMetadata: (
    conversationId: string,
    lastMessage: ChatMessage
  ) => Promise<void>;
  updateConversation: (
    conversationId: string,
    updates: Partial<Conversation>
  ) => Promise<void>;
  clearError: () => void;
}

export type ChatStore = ChatStoreState & ChatStoreActions;

// ============================================
// Connection Store Types
// ============================================

export type ConnectionStatus = 'online' | 'slow' | 'offline' | 'unknown';

export interface ConnectionStoreState {
  statuses: Map<string, ConnectionStatus>;
  latencies: Map<string, number[]>;
  lastChecked: Map<string, Date>;
}

export interface ConnectionStoreActions {
  updateStatus: (agentId: string, status: ConnectionStatus) => void;
  addLatency: (agentId: string, latencyMs: number) => void;
  getStatus: (agentId: string) => ConnectionStatus;
  getAverageLatency: (agentId: string) => number | undefined;
  getLatencyHistory: (agentId: string) => number[];
  clearAgentData: (agentId: string) => void;
  clearAll: () => void;
}

export type ConnectionStore = ConnectionStoreState & ConnectionStoreActions;

// ============================================
// UI Store Types
// ============================================

export type Theme = 'light' | 'dark' | 'system';
export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

export interface OnboardingProgress {
  welcomeSeen: boolean;
  firstAgentAdded: boolean;
  firstConversationStarted: boolean;
  settingsExplored: boolean;
  completed: boolean;
}

export interface UIStoreState {
  theme: Theme;
  sidebarOpen: boolean;
  activeModal: string | null;
  toasts: Toast[];
  isOffline: boolean;
  queuedMessageCount: number;
  isFirstTimeUser: boolean;
  onboardingCompleted: boolean;
  onboardingProgress: OnboardingProgress;
}

export interface UIStoreActions {
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  setOffline: (isOffline: boolean) => void;
  setQueuedMessageCount: (count: number) => void;
  incrementQueuedCount: () => void;
  decrementQueuedCount: () => void;
  setFirstTimeUser: (isFirstTime: boolean) => void;
  completeOnboarding: () => void;
  updateOnboardingProgress: (progress: Partial<OnboardingProgress>) => void;
  resetOnboarding: () => void;
}

export type UIStore = UIStoreState & UIStoreActions;

// ============================================
// Macro Store Types
// ============================================

export type {
  MacroStore,
  MacroStoreState,
  MacroStoreActions,
} from '@/types/macros';
