"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAgentStore } from "@/stores";

/**
 * Root page component
 * 
 * Handles initial app routing:
 * - If agents exist → redirect to /agents
 * - If no agents → redirect to /agents/new (onboarding)
 * - Shows loading state while determining
 * 
 * This ensures users always land on a useful page:
 * - Returning users see their agents
 * - New users are guided to create their first agent
 */
export default function RootPage(): React.JSX.Element {
  const router = useRouter();
  const { agents, isLoading } = useAgentStore();

  useEffect(() => {
    // Wait for stores to hydrate
    if (isLoading) {
      return;
    }

    const agentCount = agents.size;
    
    if (agentCount === 0) {
      // No agents - send to onboarding
      console.log("[RootPage] No agents found, redirecting to onboarding");
      router.replace("/agents/new");
    } else {
      // Has agents - send to agents list
      console.log(`[RootPage] ${agentCount} agents found, redirecting to /agents`);
      router.replace("/agents");
    }
  }, [agents, isLoading, router]);

  // Show loading state while determining
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        {/* Animated spinner */}
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-muted" />
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}
