import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import type { ConnectionStore, ConnectionStatus } from './types';

const LATENCY_HISTORY_LIMIT = 10;
const SLOW_THRESHOLD_MS = 500;

const initialState = {
  statuses: new Map<string, ConnectionStatus>(),
  latencies: new Map<string, number[]>(),
  lastChecked: new Map<string, Date>(),
};

export const useConnectionStore = create<ConnectionStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      updateStatus: (agentId, status) => {
        set((state) => {
          state.statuses.set(agentId, status);
          state.lastChecked.set(agentId, new Date());
        });
      },

      addLatency: (agentId, latencyMs) => {
        set((state) => {
          const existing = state.latencies.get(agentId) ?? [];
          const updated = [...existing, latencyMs];

          // Keep only last N measurements
          if (updated.length > LATENCY_HISTORY_LIMIT) {
            updated.shift();
          }

          state.latencies.set(agentId, updated);
          state.lastChecked.set(agentId, new Date());

          // Auto-update status based on latency
          if (latencyMs > SLOW_THRESHOLD_MS) {
            state.statuses.set(agentId, 'slow');
          } else {
            state.statuses.set(agentId, 'online');
          }
        });
      },

      getStatus: (agentId) => {
        return get().statuses.get(agentId) ?? 'unknown';
      },

      getAverageLatency: (agentId) => {
        const history = get().latencies.get(agentId) ?? [];
        if (history.length === 0) return undefined;

        const sum = history.reduce((acc, val) => acc + val, 0);
        return Math.round(sum / history.length);
      },

      getLatencyHistory: (agentId) => {
        return get().latencies.get(agentId) ?? [];
      },

      clearAgentData: (agentId) => {
        set((state) => {
          state.statuses.delete(agentId);
          state.latencies.delete(agentId);
          state.lastChecked.delete(agentId);
        });
      },

      clearAll: () => {
        set((state) => {
          state.statuses.clear();
          state.latencies.clear();
          state.lastChecked.clear();
        });
      },
    })),
    { name: 'connection-store' }
  )
);
