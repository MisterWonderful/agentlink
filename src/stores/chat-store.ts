import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import type { Conversation, ChatMessage, ChatMessageInput } from '@/types/schemas';
import { db } from '@/lib/db/indexeddb';
import type { ChatStore } from './types';
import {
  localConversationToConversation,
  conversationToLocalConversation,
  localMessageToMessage,
  messageToLocalMessage,
  generateId,
  now,
} from './utils';

const initialState = {
  conversations: new Map<string, Conversation>(),
  messages: new Map<string, ChatMessage[]>(),
  activeConversationId: null as string | null,
  isLoading: false,
  error: null as string | null,
};

export const useChatStore = create<ChatStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      loadConversations: async (agentId) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          let localConversations;

          if (agentId) {
            localConversations = await db.conversations
              .where('agentId')
              .equals(agentId)
              .reverse()
              .sortBy('updatedAt');
          } else {
            localConversations = await db.conversations
              .reverse()
              .sortBy('updatedAt');
          }

          const conversations = new Map<string, Conversation>();
          for (const local of localConversations) {
            conversations.set(local.id, localConversationToConversation(local));
          }

          set((state) => {
            state.conversations = conversations;
            state.isLoading = false;
          });
        } catch (err) {
          set((state) => {
            state.isLoading = false;
            state.error =
              err instanceof Error ? err.message : 'Failed to load conversations';
          });
        }
      },

      loadAllConversations: async () => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const localConversations = await db.conversations
            .reverse()
            .sortBy('updatedAt');

          const conversations = new Map<string, Conversation>();
          for (const local of localConversations) {
            conversations.set(local.id, localConversationToConversation(local));
          }

          set((state) => {
            state.conversations = conversations;
            state.isLoading = false;
          });
        } catch (err) {
          set((state) => {
            state.isLoading = false;
            state.error =
              err instanceof Error ? err.message : 'Failed to load conversations';
          });
        }
      },

      createConversation: async (agentId, title) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const timestamp = now();
          const id = generateId();

          const conversation: Conversation = {
            id,
            agentId,
            title: title ?? 'New Conversation',
            messageCount: 0,
            isPinned: false,
            isArchived: false,
            tags: [],
            createdAt: timestamp,
            updatedAt: timestamp,
          };

          // Save to IndexedDB
          await db.conversations.add(conversationToLocalConversation(conversation));

          // Optimistic update
          set((state) => {
            state.conversations.set(id, conversation);
            state.isLoading = false;
          });

          return conversation;
        } catch (err) {
          set((state) => {
            state.isLoading = false;
            state.error =
              err instanceof Error
                ? err.message
                : 'Failed to create conversation';
          });
          throw err;
        }
      },

      deleteConversation: async (id) => {
        set((state) => {
          state.error = null;
        });

        try {
          // Delete from IndexedDB (cascade deletes messages)
          await db.conversations.delete(id);

          // Delete related messages
          const messages = await db.messages
            .where('conversationId')
            .equals(id)
            .toArray();
          await db.messages.bulkDelete(messages.map((m) => m.id));

          // Optimistic update
          set((state) => {
            state.conversations.delete(id);
            state.messages.delete(id);
            if (state.activeConversationId === id) {
              state.activeConversationId = null;
            }
          });
        } catch (err) {
          set((state) => {
            state.error =
              err instanceof Error
                ? err.message
                : 'Failed to delete conversation';
          });
          throw err;
        }
      },

      setActiveConversation: (id) => {
        set((state) => {
          if (id === null || state.conversations.has(id)) {
            state.activeConversationId = id;
          }
        });
      },

      loadMessages: async (conversationId) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const localMessages = await db.messages
            .where('conversationId')
            .equals(conversationId)
            .sortBy('createdAt');

          const messages = localMessages.map(localMessageToMessage);

          set((state) => {
            state.messages.set(conversationId, messages);
            state.isLoading = false;
          });
        } catch (err) {
          set((state) => {
            state.isLoading = false;
            state.error =
              err instanceof Error ? err.message : 'Failed to load messages';
          });
        }
      },

      loadAllMessages: async () => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const localMessages = await db.messages.toArray();

          // Group messages by conversation
          const messagesByConversation = new Map<string, ChatMessage[]>();
          for (const local of localMessages) {
            const msg = localMessageToMessage(local);
            const list = messagesByConversation.get(msg.conversationId) ?? [];
            list.push(msg);
            messagesByConversation.set(msg.conversationId, list);
          }

          set((state) => {
            state.messages = messagesByConversation;
            state.isLoading = false;
          });
        } catch (err) {
          set((state) => {
            state.isLoading = false;
            state.error =
              err instanceof Error ? err.message : 'Failed to load messages';
          });
        }
      },

      addMessage: async (conversationId, messageInput) => {
        set((state) => {
          state.error = null;
        });

        try {
          const id = generateId();

          const message: ChatMessage = {
            ...messageInput,
            id,
            conversationId,
            retryCount: 0,
            createdAt: now(),
          };

          // Save to IndexedDB
          await db.messages.add(messageToLocalMessage(message));

          // Optimistic update
          set((state) => {
            const existing = state.messages.get(conversationId) ?? [];
            state.messages.set(conversationId, [...existing, message]);
          });

          // Update conversation metadata
          if (message.role === 'user' || message.role === 'assistant') {
            await get().updateConversationMetadata(conversationId, message);
          }

          return message;
        } catch (err) {
          set((state) => {
            state.error =
              err instanceof Error ? err.message : 'Failed to add message';
          });
          throw err;
        }
      },

      updateMessage: async (conversationId, messageId, updates) => {
        set((state) => {
          state.error = null;
        });

        try {
          const messages = get().messages.get(conversationId);
          if (!messages) {
            throw new Error(`Conversation not found: ${conversationId}`);
          }

          const message = messages.find((m) => m.id === messageId);
          if (!message) {
            throw new Error(`Message not found: ${messageId}`);
          }

          const updated: ChatMessage = {
            ...message,
            ...updates,
            id: messageId,
            conversationId,
          };

          // Save to IndexedDB
          await db.messages.put(messageToLocalMessage(updated));

          // Optimistic update
          set((state) => {
            const msgList = state.messages.get(conversationId);
            if (msgList) {
              const index = msgList.findIndex((m: ChatMessage) => m.id === messageId);
              if (index !== -1) {
                msgList[index] = updated;
              }
            }
          });
        } catch (err) {
          set((state) => {
            state.error =
              err instanceof Error ? err.message : 'Failed to update message';
          });
          throw err;
        }
      },

      getConversationsByAgent: (agentId) => {
        const conversations: Conversation[] = [];
        for (const conv of get().conversations.values()) {
          if (conv.agentId === agentId) {
            conversations.push(conv);
          }
        }
        return conversations.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      },

      getMessagesByConversation: (conversationId) => {
        return get().messages.get(conversationId) ?? [];
      },

      updateConversationMetadata: async (conversationId, lastMessage) => {
        try {
          const conversation = get().conversations.get(conversationId);
          if (!conversation) return;

          const updated: Conversation = {
            ...conversation,
            messageCount: conversation.messageCount + 1,
            lastMessagePreview: lastMessage.content.slice(0, 100),
            lastMessageRole: lastMessage.role === 'system' ? undefined : lastMessage.role,
            updatedAt: now(),
          };

          // Save to IndexedDB
          await db.conversations.put(conversationToLocalConversation(updated));

          // Optimistic update
          set((state) => {
            state.conversations.set(conversationId, updated);
          });
        } catch (err) {
          console.error('Failed to update conversation metadata:', err);
        }
      },

      updateConversation: async (conversationId, updates) => {
        set((state) => {
          state.error = null;
        });

        try {
          const conversation = get().conversations.get(conversationId);
          if (!conversation) {
            throw new Error(`Conversation not found: ${conversationId}`);
          }

          const updated: Conversation = {
            ...conversation,
            ...updates,
            id: conversationId,
            updatedAt: now(),
          };

          // Save to IndexedDB
          await db.conversations.put(conversationToLocalConversation(updated));

          // Optimistic update
          set((state) => {
            state.conversations.set(conversationId, updated);
          });
        } catch (err) {
          set((state) => {
            state.error =
              err instanceof Error ? err.message : 'Failed to update conversation';
          });
          throw err;
        }
      },

      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },
    })),
    { name: 'chat-store' }
  )
);
