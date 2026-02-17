/**
 * useHealthMonitor Hook
 *
 * Hook for monitoring agent health status.
 * Periodically checks agent reachability and latency.
 * Supports visibility-aware checking that pauses when app is backgrounded.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { ConnectionStatus } from '@/stores/types';
import { useConnectionStore } from '@/stores/connection-store';
import { useAgentStore } from '@/stores/agent-store';
import {
  checkAgentHealth,
  checkAllAgentsHealth,
  toConnectionStatus,
  type HealthCheckResult,
} from '@/lib/agents/health-checker';
import type { Agent } from '@/types/schemas';

/**
 * Options for useHealthMonitor hook
 */
export interface UseHealthMonitorOptions {
  /** Agent ID to monitor (for single agent monitoring) */
  agentId?: string;
  /** Agent IDs to monitor (for multi-agent monitoring) */
  agentIds?: string[];
  /** Check interval in milliseconds (default: 60000 = 60s) */
  intervalMs?: number;
  /** Whether monitoring is enabled */
  enabled?: boolean;
  /** Whether to pause checks when tab is hidden (default: true) */
  pauseWhenHidden?: boolean;
}

/**
 * Return type for single agent useHealthMonitor hook
 */
export interface UseHealthMonitorReturn {
  /** Current connection status */
  status: ConnectionStatus;
  /** Current health check result */
  health?: HealthCheckResult;
  /** Average latency in milliseconds */
  latency?: number;
  /** Whether a check is in progress */
  isChecking: boolean;
  /** When the agent was last checked */
  lastChecked?: Date;
  /** Trigger a health check immediately */
  checkNow: () => Promise<void>;
}

/**
 * Return type for multi-agent useHealthMonitor hook
 */
export interface UseMultiHealthMonitorReturn {
  /** Map of agent IDs to their health results */
  healthMap: Map<string, HealthCheckResult>;
  /** Whether any check is in progress */
  isChecking: boolean;
  /** When each agent was last checked */
  lastChecked: Map<string, Date>;
  /** Trigger health checks for all monitored agents */
  checkNow: () => Promise<void>;
}

const DEFAULT_INTERVAL_MS = 60_000; // 60 seconds

/**
 * Hook for monitoring a single agent's health
 *
 * Features:
 * - Periodic health checks at specified interval
 * - Automatic pause when app is backgrounded
 * - Immediate check when app becomes visible
 * - Updates connection-store with results
 * - Updates agent-store with status
 */
export function useHealthMonitor(options: UseHealthMonitorOptions): UseHealthMonitorReturn {
  const {
    agentId,
    intervalMs = DEFAULT_INTERVAL_MS,
    enabled = true,
    pauseWhenHidden = true,
  } = options;

  // Get stores
  const agent = useAgentStore((state) => (agentId ? state.agents.get(agentId) : undefined));
  const updateAgentStatus = useAgentStore((state) => state.updateAgentStatus);
  const connectionStatus = useConnectionStore((state) =>
    agentId ? state.getStatus(agentId) : 'unknown'
  );
  const updateConnectionStatus = useConnectionStore((state) => state.updateStatus);
  const addLatency = useConnectionStore((state) => state.addLatency);
  const averageLatency = useConnectionStore((state) =>
    agentId ? state.getAverageLatency(agentId) : undefined
  );
  const storeLastChecked = useConnectionStore((state) =>
    agentId ? state.lastChecked.get(agentId) : undefined
  );

  // Local state
  const [isChecking, setIsChecking] = useState(false);
  const [isVisible, setIsVisible] = useState(typeof document !== 'undefined' ? !document.hidden : true);
  const [health, setHealth] = useState<HealthCheckResult | undefined>();

  // Refs for interval management
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Perform a single health check
   */
  const performCheck = useCallback(async (): Promise<void> => {
    if (!agent || !agentId) return;

    setIsChecking(true);
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const result = await checkAgentHealth(agent);

      // Update local state
      setHealth(result);

      // Update connection store
      const status = toConnectionStatus(result.status);
      updateConnectionStatus(agentId, status);

      if (result.status !== 'offline') {
        addLatency(agentId, result.latencyMs);
      }

      // Update agent store
      updateAgentStatus(agentId, {
        isActive: result.status !== 'offline',
        latencyMs: result.status !== 'offline' ? result.latencyMs : undefined,
      });
    } catch {
      // Error handling is done in checkAgentHealth
      const errorResult: HealthCheckResult = {
        status: 'offline',
        latencyMs: -1,
        lastChecked: new Date(),
        error: 'Health check failed',
      };

      setHealth(errorResult);
      updateConnectionStatus(agentId, 'offline');
      updateAgentStatus(agentId, { isActive: false });
    } finally {
      setIsChecking(false);
    }
  }, [agent, agentId, updateConnectionStatus, addLatency, updateAgentStatus]);

  /**
   * Trigger a check immediately
   */
  const checkNow = useCallback(async () => {
    await performCheck();
  }, [performCheck]);

  // Set up interval for health checks
  useEffect(() => {
    if (!enabled || !agent || !agentId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Only run checks if visible or not pausing when hidden
    const shouldRunChecks = !pauseWhenHidden || isVisible;

    if (!shouldRunChecks) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Immediate check
    void performCheck();

    // Interval checks
    intervalRef.current = setInterval(() => {
      void performCheck();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      abortControllerRef.current?.abort();
    };
  }, [enabled, agent, agentId, isVisible, pauseWhenHidden, intervalMs, performCheck]);

  // Handle visibility changes
  useEffect(() => {
    if (!pauseWhenHidden) return;

    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);

      if (visible && enabled && agent) {
        // Trigger check when coming back to foreground
        void performCheck();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pauseWhenHidden, enabled, agent, performCheck]);

  return {
    status: connectionStatus,
    health,
    latency: averageLatency,
    isChecking,
    lastChecked: storeLastChecked,
    checkNow,
  };
}

/**
 * Hook for monitoring health of multiple agents
 *
 * Features:
 * - Batch health checks for all specified agents
 * - Automatic pause when app is backgrounded
 * - Immediate check when app becomes visible
 * - Updates connection-store with results
 */
export function useMultiAgentHealthMonitor(
  options: UseHealthMonitorOptions
): UseMultiHealthMonitorReturn {
  const {
    agentIds = [],
    intervalMs = DEFAULT_INTERVAL_MS,
    enabled = true,
    pauseWhenHidden = true,
  } = options;

  // Get stores
  const allAgents = useAgentStore((state) => state.agents);
  const updateAgentStatus = useAgentStore((state) => state.updateAgentStatus);
  const updateConnectionStatus = useConnectionStore((state) => state.updateStatus);
  const addLatency = useConnectionStore((state) => state.addLatency);

  // Local state
  const [isChecking, setIsChecking] = useState(false);
  const [isVisible, setIsVisible] = useState(typeof document !== 'undefined' ? !document.hidden : true);
  const [healthMap, setHealthMap] = useState<Map<string, HealthCheckResult>>(new Map());
  const [lastChecked, setLastChecked] = useState<Map<string, Date>>(new Map());

  // Refs for interval management
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get agents to monitor
  const agentsToMonitor = agentIds
    .map((id) => allAgents.get(id))
    .filter((agent): agent is Agent => agent !== undefined);

  /**
   * Perform health checks for all monitored agents
   */
  const performChecks = useCallback(async (): Promise<void> => {
    if (agentsToMonitor.length === 0) return;

    setIsChecking(true);

    try {
      const results = await checkAllAgentsHealth(agentsToMonitor);

      // Update local state
      setHealthMap(new Map(results));

      // Update connection store and agent store for each result
      const newLastChecked = new Map<string, Date>();

      results.forEach((result, agentId) => {
        const status = toConnectionStatus(result.status);
        updateConnectionStatus(agentId, status);
        newLastChecked.set(agentId, result.lastChecked);

        if (result.status !== 'offline') {
          addLatency(agentId, result.latencyMs);
        }

        updateAgentStatus(agentId, {
          isActive: result.status !== 'offline',
          latencyMs: result.status !== 'offline' ? result.latencyMs : undefined,
        });
      });

      setLastChecked(newLastChecked);
    } catch {
      // Handle errors gracefully
      const errorResults = new Map<string, HealthCheckResult>();
      const errorTimestamp = new Date();

      agentsToMonitor.forEach((agent) => {
        errorResults.set(agent.id, {
          status: 'offline',
          latencyMs: -1,
          lastChecked: errorTimestamp,
          error: 'Health check failed',
        });
        updateConnectionStatus(agent.id, 'offline');
        updateAgentStatus(agent.id, { isActive: false });
      });

      setHealthMap(errorResults);
    } finally {
      setIsChecking(false);
    }
  }, [agentsToMonitor, updateConnectionStatus, addLatency, updateAgentStatus]);

  /**
   * Trigger checks immediately
   */
  const checkNow = useCallback(async () => {
    await performChecks();
  }, [performChecks]);

  // Set up interval for health checks
  useEffect(() => {
    if (!enabled || agentsToMonitor.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Only run checks if visible or not pausing when hidden
    const shouldRunChecks = !pauseWhenHidden || isVisible;

    if (!shouldRunChecks) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Immediate check
    void performChecks();

    // Interval checks
    intervalRef.current = setInterval(() => {
      void performChecks();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, agentsToMonitor.length, isVisible, pauseWhenHidden, intervalMs, performChecks]);

  // Handle visibility changes
  useEffect(() => {
    if (!pauseWhenHidden) return;

    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);

      if (visible && enabled && agentsToMonitor.length > 0) {
        // Trigger checks when coming back to foreground
        void performChecks();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pauseWhenHidden, enabled, agentsToMonitor.length, performChecks]);

  return {
    healthMap,
    isChecking,
    lastChecked,
    checkNow,
  };
}

/**
 * Hook for monitoring health of all active agents
 *
 * Automatically monitors all agents in the agent store.
 * Useful for global health monitoring.
 */
export function useAllAgentsHealthMonitor(
  intervalMs: number = DEFAULT_INTERVAL_MS
): {
  isChecking: boolean;
  checkAll: () => Promise<void>;
  healthMap: Map<string, HealthCheckResult>;
} {
  const agents = useAgentStore((state) => state.agents);
  const agentIds = Array.from(agents.keys());

  const { healthMap, isChecking, checkNow } = useMultiAgentHealthMonitor({
    agentIds,
    intervalMs,
    enabled: true,
    pauseWhenHidden: true,
  });

  return {
    isChecking,
    checkAll: checkNow,
    healthMap,
  };
}
