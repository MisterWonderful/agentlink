import { useAgentStore } from './agent-store';
import { useChatStore } from './chat-store';

/**
 * Hydration state tracking
 */
interface HydrationState {
  isHydrated: boolean;
  isHydrating: boolean;
  error: string | null;
}

let hydrationState: HydrationState = {
  isHydrated: false,
  isHydrating: false,
  error: null,
};

/**
 * Get current hydration state
 */
export function getHydrationState(): HydrationState {
  return { ...hydrationState };
}

/**
 * Check if stores have been hydrated
 */
export function isHydrated(): boolean {
  return hydrationState.isHydrated;
}

/**
 * Hydrate all stores from IndexedDB
 * Call this once during app initialization
 */
export async function hydrateStores(): Promise<void> {
  if (hydrationState.isHydrating || hydrationState.isHydrated) {
    return;
  }

  hydrationState.isHydrating = true;
  hydrationState.error = null;

  try {
    // Hydrate agent store
    await useAgentStore.getState().loadAgents();

    // Hydrate chat store (conversations only, not messages)
    await useChatStore.getState().loadConversations();

    hydrationState.isHydrated = true;
    hydrationState.isHydrating = false;

    console.log('[hydration] Stores hydrated successfully');
  } catch (err) {
    hydrationState.isHydrating = false;
    hydrationState.error =
      err instanceof Error ? err.message : 'Failed to hydrate stores';

    console.error('[hydration] Failed to hydrate stores:', err);
    throw err;
  }
}

/**
 * Reset hydration state (useful for testing)
 */
export function resetHydrationState(): void {
  hydrationState = {
    isHydrated: false,
    isHydrating: false,
    error: null,
  };
}

/**
 * Wait for hydration to complete
 * Useful for components that need to ensure data is loaded
 */
export async function waitForHydration(timeoutMs = 10000): Promise<void> {
  if (hydrationState.isHydrated) {
    return;
  }

  if (!hydrationState.isHydrating) {
    await hydrateStores();
    return;
  }

  // Wait for hydration to complete
  const startTime = Date.now();
  while (hydrationState.isHydrating && Date.now() - startTime < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!hydrationState.isHydrated) {
    throw new Error(
      hydrationState.error ?? 'Hydration timeout'
    );
  }
}
