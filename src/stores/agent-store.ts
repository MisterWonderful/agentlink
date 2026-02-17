import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import type { Agent } from '@/types/schemas';
import { db } from '@/lib/db/indexeddb';
import type { AgentStore } from './types';
import { localAgentToAgent, agentToLocalAgent, generateId, now } from './utils';

const initialState = {
  agents: new Map<string, Agent>(),
  activeAgentId: null as string | null,
  isLoading: false,
  error: null as string | null,
};

export const useAgentStore = create<AgentStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      loadAgents: async () => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const localAgents = await db.agents.toArray();
          const agents = new Map<string, Agent>();

          for (const local of localAgents) {
            agents.set(local.id, localAgentToAgent(local));
          }

          set((state) => {
            state.agents = agents;
            state.isLoading = false;
          });
        } catch (err) {
          set((state) => {
            state.isLoading = false;
            state.error =
              err instanceof Error ? err.message : 'Failed to load agents';
          });
        }
      },

      addAgent: async (agentInput) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const timestamp = now();
          const id = generateId();

          const agent: Agent = {
            ...agentInput,
            id,
            createdAt: timestamp,
            updatedAt: timestamp,
          };

          // Save to IndexedDB
          await db.agents.add(agentToLocalAgent(agent));

          // Optimistic update
          set((state) => {
            state.agents.set(id, agent);
            state.isLoading = false;
          });

          return agent;
        } catch (err) {
          set((state) => {
            state.isLoading = false;
            state.error =
              err instanceof Error ? err.message : 'Failed to add agent';
          });
          throw err;
        }
      },

      updateAgent: async (id, updates) => {
        set((state) => {
          state.error = null;
        });

        try {
          const existing = get().agents.get(id);
          if (!existing) {
            throw new Error(`Agent not found: ${id}`);
          }

          const updated: Agent = {
            ...existing,
            ...updates,
            id, // Ensure id doesn't change
            updatedAt: now(),
          };

          // Save to IndexedDB
          await db.agents.put(agentToLocalAgent(updated));

          // Optimistic update
          set((state) => {
            state.agents.set(id, updated);
          });
        } catch (err) {
          set((state) => {
            state.error =
              err instanceof Error ? err.message : 'Failed to update agent';
          });
          throw err;
        }
      },

      removeAgent: async (id) => {
        set((state) => {
          state.error = null;
        });

        try {
          // Delete from IndexedDB
          await db.agents.delete(id);

          // Also delete related conversations and messages
          const conversations = await db.conversations
            .where('agentId')
            .equals(id)
            .toArray();
          const conversationIds = conversations.map((c) => c.id);

          await db.conversations.bulkDelete(conversationIds);

          for (const convId of conversationIds) {
            const messages = await db.messages
              .where('conversationId')
              .equals(convId)
              .toArray();
            await db.messages.bulkDelete(messages.map((m) => m.id));
          }

          // Optimistic update
          set((state) => {
            state.agents.delete(id);
            if (state.activeAgentId === id) {
              state.activeAgentId = null;
            }
          });
        } catch (err) {
          set((state) => {
            state.error =
              err instanceof Error ? err.message : 'Failed to remove agent';
          });
          throw err;
        }
      },

      setActiveAgent: (id) => {
        set((state) => {
          if (id === null || state.agents.has(id)) {
            state.activeAgentId = id;
          }
        });
      },

      getAgent: (id) => {
        return get().agents.get(id);
      },

      reorderAgents: async (orderedIds) => {
        try {
          // Update sortOrder for each agent
          const updates: Agent[] = [];
          
          for (let i = 0; i < orderedIds.length; i++) {
            const agent = get().agents.get(orderedIds[i]);
            if (!agent) continue;
            
            updates.push({
              ...agent,
              sortOrder: i,
              updatedAt: now(),
            });
          }

          // Save to IndexedDB
          await db.agents.bulkPut(updates.map(agentToLocalAgent));

          // Optimistic update
          set((state) => {
            for (let i = 0; i < orderedIds.length; i++) {
              const agent = state.agents.get(orderedIds[i]);
              if (agent) {
                agent.sortOrder = i;
                agent.updatedAt = updates[i]?.updatedAt ?? agent.updatedAt;
              }
            }
          });
        } catch (err) {
          set((state) => {
            state.error =
              err instanceof Error ? err.message : 'Failed to reorder agents';
          });
          throw err;
        }
      },

      updateAgentStatus: (id, status) => {
        const agent = get().agents.get(id);
        if (!agent) return;

        const updated: Agent = {
          ...agent,
          isActive: status.isActive,
          avgLatencyMs: status.latencyMs ?? agent.avgLatencyMs,
          lastSeenAt: now(),
          updatedAt: now(),
        };

        // Update IndexedDB in background
        db.agents.put(agentToLocalAgent(updated)).catch(console.error);

        // Optimistic update
        set((state) => {
          state.agents.set(id, updated);
        });
      },

      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },
    })),
    { name: 'agent-store' }
  )
);
