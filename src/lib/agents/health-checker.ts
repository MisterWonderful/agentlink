/**
 * Health Checker
 *
 * Provides health check functionality for agents.
 * Determines if agents are online, slow, or offline based on latency.
 */

import type { Agent } from '@/types/schemas';
import type { ConnectionStatus } from '@/stores/types';

/**
 * Result of a health check
 */
export interface HealthCheckResult {
  /** Current status of the agent */
  status: 'online' | 'slow' | 'offline';
  /** Latency in milliseconds */
  latencyMs: number;
  /** When the check was performed */
  lastChecked: Date;
  /** Error message if check failed */
  error?: string;
}

/**
 * Latency thresholds for determining agent status
 */
export const THRESHOLDS = {
  /** Below this is considered online (green) */
  ONLINE_MS: 500,
  /** Below this is considered slow (yellow), above is offline (red) */
  SLOW_MS: 2000,
  /** Maximum timeout for health checks */
  TIMEOUT_MS: 10000,
} as const;

/**
 * Determine status from latency
 */
function getStatusFromLatency(latencyMs: number): HealthCheckResult['status'] {
  if (latencyMs < THRESHOLDS.ONLINE_MS) return 'online';
  if (latencyMs < THRESHOLDS.SLOW_MS) return 'slow';
  return 'offline';
}

/**
 * Get health check endpoint for an agent
 * Uses a lightweight endpoint appropriate for the agent type
 */
function getHealthCheckEndpoint(agent: Agent): string {
  const normalized = agent.endpointUrl.replace(/\/$/, '');

  // For most agents, try to hit a models/health endpoint first
  switch (agent.agentType) {
    case 'openai_compatible':
      // Try the models endpoint which is lightweight
      return `${normalized}/v1/models`;
    case 'ollama':
      // Ollama has a simple tags endpoint
      return `${normalized}/api/tags`;
    case 'anthropic_compatible':
      // Try models endpoint
      return `${normalized}/v1/models`;
    default:
      // For custom agents, use the base URL
      return normalized;
  }
}

/**
 * Format auth headers for health check
 */
function formatAuthHeaders(agent: Agent): Record<string, string> {
  if (!agent.authToken) return {};

  // Anthropic uses x-api-key header
  if (agent.agentType === 'anthropic_compatible') {
    return {
      'x-api-key': agent.authToken,
      'anthropic-version': '2023-06-01',
    };
  }

  // Standard Bearer token
  return {
    Authorization: `Bearer ${agent.authToken}`,
  };
}

/**
 * Check the health of a single agent
 *
 * @param agent - The agent to check
 * @returns Health check result with status and latency
 */
export async function checkAgentHealth(agent: Agent): Promise<HealthCheckResult> {
  const startTime = performance.now();
  const endpoint = getHealthCheckEndpoint(agent);
  const authHeaders = formatAuthHeaders(agent);

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), THRESHOLDS.TIMEOUT_MS);

    // Try HEAD request first (more lightweight), then fallback to GET
    const methods: ('HEAD' | 'GET')[] = ['HEAD', 'GET'];
    let response: Response | null = null;
    let lastError: Error | null = null;

    for (const method of methods) {
      try {
        response = await fetch(endpoint, {
          method,
          headers: {
            ...authHeaders,
            ...agent.customHeaders,
          },
          signal: controller.signal,
          // Don't follow redirects for health checks
          redirect: 'manual',
        });
        break; // Success, stop trying
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // If HEAD fails with method not allowed, try GET
        if (method === 'HEAD') continue;
        // Both methods failed
        throw lastError;
      }
    }

    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    // Check response status
    if (!response) {
      return {
        status: 'offline',
        latencyMs,
        lastChecked: new Date(),
        error: 'No response from agent',
      };
    }

    // Server errors indicate agent is offline
    if (response.status >= 500) {
      return {
        status: 'offline',
        latencyMs,
        lastChecked: new Date(),
        error: `Server error: ${response.status}`,
      };
    }

    // Auth errors don't necessarily mean agent is offline
    // but we should note them
    if (response.status === 401 || response.status === 403) {
      // Still return status based on latency, but include auth error
      const status = getStatusFromLatency(latencyMs);
      return {
        status,
        latencyMs,
        lastChecked: new Date(),
        error: response.status === 401 ? 'Authentication required' : 'Access denied',
      };
    }

    // Any response we got means the agent is reachable
    // Determine status based on latency
    const status = getStatusFromLatency(latencyMs);

    return {
      status,
      latencyMs,
      lastChecked: new Date(),
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startTime);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          status: 'offline',
          latencyMs: THRESHOLDS.TIMEOUT_MS,
          lastChecked: new Date(),
          error: 'Connection timed out',
        };
      }

      if (error.message.includes('fetch') || error.message.includes('network')) {
        return {
          status: 'offline',
          latencyMs,
          lastChecked: new Date(),
          error: 'Network error - unable to reach agent',
        };
      }

      return {
        status: 'offline',
        latencyMs,
        lastChecked: new Date(),
        error: error.message,
      };
    }

    return {
      status: 'offline',
      latencyMs,
      lastChecked: new Date(),
      error: 'Unknown error',
    };
  }
}

/**
 * Check health of multiple agents in parallel
 *
 * @param agents - Array of agents to check
 * @returns Map of agent IDs to health check results
 */
export async function checkAllAgentsHealth(
  agents: Agent[]
): Promise<Map<string, HealthCheckResult>> {
  const results = new Map<string, HealthCheckResult>();

  // Check all agents in parallel with individual error handling
  const checkPromises = agents.map(async (agent) => {
    try {
      const result = await checkAgentHealth(agent);
      results.set(agent.id, result);
    } catch {
      // This shouldn't happen due to error handling in checkAgentHealth,
      // but just in case
      results.set(agent.id, {
        status: 'offline',
        latencyMs: -1,
        lastChecked: new Date(),
        error: 'Health check failed',
      });
    }
  });

  await Promise.all(checkPromises);
  return results;
}

/**
 * Check health of multiple agents with batching
 * Useful when checking many agents to avoid overwhelming the network
 *
 * @param agents - Array of agents to check
 * @param batchSize - Number of agents to check concurrently (default: 5)
 * @returns Map of agent IDs to health check results
 */
export async function checkAgentsHealthBatched(
  agents: Agent[],
  batchSize: number = 5
): Promise<Map<string, HealthCheckResult>> {
  const results = new Map<string, HealthCheckResult>();

  // Process in batches
  for (let i = 0; i < agents.length; i += batchSize) {
    const batch = agents.slice(i, i + batchSize);
    const batchResults = await checkAllAgentsHealth(batch);

    // Merge results
    batchResults.forEach((result, agentId) => {
      results.set(agentId, result);
    });
  }

  return results;
}

/**
 * Convert health check result status to connection store status
 */
export function toConnectionStatus(
  healthStatus: HealthCheckResult['status']
): ConnectionStatus {
  switch (healthStatus) {
    case 'online':
      return 'online';
    case 'slow':
      return 'slow';
    case 'offline':
      return 'offline';
    default:
      return 'unknown';
  }
}

/**
 * Get human-readable status description
 */
export function getStatusDescription(status: HealthCheckResult['status']): string {
  switch (status) {
    case 'online':
      return 'Agent is responding quickly';
    case 'slow':
      return 'Agent is responding slowly';
    case 'offline':
      return 'Agent is unreachable';
    default:
      return 'Unknown status';
  }
}

/**
 * Check if an agent status is considered healthy (online or slow)
 */
export function isHealthy(status: HealthCheckResult['status']): boolean {
  return status === 'online' || status === 'slow';
}
