# Spec: Agent Health Monitoring

## Overview

The health monitor checks reachability and latency of each configured agent at regular intervals. Results are displayed as status badges in the agent list and chat header.

## Status Definitions

| Status | Condition | Badge | Color |
|---|---|---|---|
| Online | Last check succeeded, latency < 500ms | 🟢 | `#16a34a` (green-600) |
| Slow | Last check succeeded, latency >= 500ms | 🟡 | `#f59e0b` (amber-500) |
| Offline | Last check failed or timed out | 🔴 | `#ef4444` (red-500) |
| Unknown | Never checked / newly added | ⚪ | `#9ca3af` (gray-400) |

## Health Check Implementation

```typescript
// src/lib/agents/health-checker.ts

interface HealthCheckResult {
  agentId: string;
  status: 'online' | 'slow' | 'offline' | 'unknown';
  latencyMs: number | null;
  checkedAt: string;
  error?: string;
}

export async function checkAgentHealth(agent: LocalAgent): Promise<HealthCheckResult> {
  const startTime = performance.now();

  try {
    // Lightweight request — HEAD preferred, fallback to GET
    const response = await fetch(agent.endpointUrl, {
      method: 'HEAD',
      headers: agent.authToken
        ? { Authorization: `Bearer ${agent.authToken}` }
        : {},
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    const latencyMs = Math.round(performance.now() - startTime);

    // Any successful response (even 4xx for auth) means the server is reachable
    // 5xx means the server is having issues
    if (response.status >= 500) {
      return {
        agentId: agent.id,
        status: 'offline',
        latencyMs,
        checkedAt: new Date().toISOString(),
        error: `Server error: ${response.status}`,
      };
    }

    return {
      agentId: agent.id,
      status: latencyMs < 500 ? 'online' : 'slow',
      latencyMs,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      agentId: agent.id,
      status: 'offline',
      latencyMs: null,
      checkedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

export async function checkAllAgents(agents: LocalAgent[]): Promise<HealthCheckResult[]> {
  // Check all agents concurrently
  return Promise.all(agents.map(checkAgentHealth));
}
```

## Health Monitor Hook

```typescript
// src/hooks/use-health-monitor.ts

const DEFAULT_INTERVAL_MS = 60_000; // 60 seconds
const LATENCY_HISTORY_SIZE = 10;

export function useHealthMonitor(intervalMs: number = DEFAULT_INTERVAL_MS) {
  const agents = useAgentStore(s => s.agents);
  const updateStatus = useConnectionStore(s => s.updateStatus);
  const addLatency = useConnectionStore(s => s.addLatency);
  const [isActive, setIsActive] = useState(true);

  // Run health checks on interval
  useEffect(() => {
    if (!isActive) return;

    const check = async () => {
      const agentList = Array.from(agents.values()).filter(a => a.isActive);
      const results = await checkAllAgents(agentList);

      for (const result of results) {
        updateStatus(result.agentId, result.status);
        if (result.latencyMs !== null) {
          addLatency(result.agentId, result.latencyMs);
        }
      }
    };

    // Immediate check on mount
    check();

    // Then check on interval
    const timer = setInterval(check, intervalMs);
    return () => clearInterval(timer);
  }, [agents, intervalMs, isActive]);

  // Pause when app is backgrounded
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsActive(false);
      } else {
        setIsActive(true);
        // Trigger immediate check when foregrounded
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return { isActive };
}
```

## Connection Store

```typescript
// src/stores/connection-store.ts

interface ConnectionState {
  statuses: Map<string, 'online' | 'slow' | 'offline' | 'unknown'>;
  latencies: Map<string, number[]>;  // Last N latency measurements
  lastChecked: Map<string, string>;  // ISO timestamps

  updateStatus: (agentId: string, status: 'online' | 'slow' | 'offline' | 'unknown') => void;
  addLatency: (agentId: string, latencyMs: number) => void;
  getStatus: (agentId: string) => 'online' | 'slow' | 'offline' | 'unknown';
  getLatencyHistory: (agentId: string) => number[];
  getAverageLatency: (agentId: string) => number | null;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  statuses: new Map(),
  latencies: new Map(),
  lastChecked: new Map(),

  updateStatus: (agentId, status) => {
    set(state => {
      const newStatuses = new Map(state.statuses);
      const newLastChecked = new Map(state.lastChecked);
      newStatuses.set(agentId, status);
      newLastChecked.set(agentId, new Date().toISOString());
      return { statuses: newStatuses, lastChecked: newLastChecked };
    });
  },

  addLatency: (agentId, latencyMs) => {
    set(state => {
      const newLatencies = new Map(state.latencies);
      const history = newLatencies.get(agentId) || [];
      const updated = [...history, latencyMs].slice(-LATENCY_HISTORY_SIZE);
      newLatencies.set(agentId, updated);
      return { latencies: newLatencies };
    });
  },

  getStatus: (agentId) => get().statuses.get(agentId) || 'unknown',

  getLatencyHistory: (agentId) => get().latencies.get(agentId) || [],

  getAverageLatency: (agentId) => {
    const history = get().latencies.get(agentId);
    if (!history || history.length === 0) return null;
    return Math.round(history.reduce((a, b) => a + b, 0) / history.length);
  },
}));
```

## UI Components

### AgentStatusBadge

```tsx
// src/components/agents/agent-status-badge.tsx

interface AgentStatusBadgeProps {
  agentId: string;
  showLatency?: boolean;  // Show "142ms" next to badge
  size?: 'sm' | 'md';
}

function AgentStatusBadge({ agentId, showLatency = false, size = 'md' }: AgentStatusBadgeProps) {
  const status = useConnectionStore(s => s.getStatus(agentId));
  const avgLatency = useConnectionStore(s => s.getAverageLatency(agentId));

  const config = {
    online: { color: 'bg-green-500', label: 'Online', pulse: false },
    slow: { color: 'bg-amber-500', label: 'Slow', pulse: false },
    offline: { color: 'bg-red-500', label: 'Offline', pulse: false },
    unknown: { color: 'bg-gray-400', label: 'Unknown', pulse: true },
  }[status];

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn(
        'rounded-full',
        size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5',
        config.color,
        config.pulse && 'animate-pulse',
      )} />
      {showLatency && avgLatency !== null && (
        <span className="text-xs text-muted-foreground">{avgLatency}ms</span>
      )}
    </div>
  );
}
```

### LatencySparkline

Tiny inline chart showing last 10 latency measurements. Use SVG path for simplicity:

```tsx
function LatencySparkline({ agentId }: { agentId: string }) {
  const history = useConnectionStore(s => s.getLatencyHistory(agentId));

  if (history.length < 2) return null;

  const width = 60;
  const height = 20;
  const max = Math.max(...history, 500); // Floor at 500ms
  const min = Math.min(...history, 0);

  const points = history.map((val, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = height - ((val - min) / (max - min)) * height;
    return `${x},${y}`;
  });

  const color = history[history.length - 1] < 500 ? '#16a34a' : '#f59e0b';

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
```

## Pull-to-Refresh

In the agent list, pulling down triggers an immediate health check on all agents:

```typescript
const handleRefresh = async () => {
  const agentList = Array.from(agents.values()).filter(a => a.isActive);
  await checkAllAgents(agentList);
};
```

Use `framer-motion` or a `pull-to-refresh` library for the gesture handling on mobile.
