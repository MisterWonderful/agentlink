"use client";

import * as React from "react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Server, RefreshCw, MoreVertical, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentCard } from "./agent-card";
import { useAgentStore, useConnectionStore } from "@/stores";
import { useAllAgentsHealthMonitor } from "@/hooks/use-health-monitor";
import type { Agent } from "@/types/schemas";
import type { ConnectionStatus } from "@/stores/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface AgentListProps {
  onAddAgent: () => void;
  onSelectAgent: (agentId: string) => void;
}

// Empty state illustration component
function EmptyState({ onAdd }: { onAdd: () => void }): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full" />
        <div className="relative h-24 w-24 rounded-3xl bg-surface border border-border flex items-center justify-center">
          <Server className="h-10 w-10 text-muted-foreground" />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2">
        No agents yet
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        Connect to your self-hosted LLMs like Ollama, OpenClaw, or any OpenAI-compatible endpoint.
      </p>
      
      <Button onClick={onAdd} className="gap-2">
        <Plus className="h-4 w-4" />
        Add Your First Agent
      </Button>
    </motion.div>
  );
}

// Pull to refresh hook
function usePullToRefresh(onRefresh: () => void, isRefreshing: boolean) {
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const threshold = 80;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0 && window.scrollY === 0) {
      const resistance = 0.5;
      setPullDistance(Math.min(diff * resistance, threshold * 1.5));
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    
    isPulling.current = false;
    
    if (pullDistance >= threshold && !isRefreshing) {
      onRefresh();
    }
    setPullDistance(0);
  }, [pullDistance, threshold, onRefresh, isRefreshing]);

  useEffect(() => {
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, threshold };
}

export function AgentList({ onAddAgent, onSelectAgent }: AgentListProps): React.ReactElement {
  const router = useRouter();
  const { agents, loadAgents, removeAgent, isLoading } = useAgentStore();
  const { statuses, latencies } = useConnectionStore();
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Health monitoring for all agents
  const { isChecking, checkAll } = useAllAgentsHealthMonitor(60000);

  // Pull to refresh
  const { pullDistance, threshold } = usePullToRefresh(() => {
    setIsRefreshing(true);
    checkAll();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, isChecking || isRefreshing);

  // Load agents on mount
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleDelete = async () => {
    if (!agentToDelete) return;
    
    try {
      await removeAgent(agentToDelete.id);
      toast.success(`${agentToDelete.name} deleted`);
    } catch (error) {
      toast.error("Failed to delete agent");
    } finally {
      setAgentToDelete(null);
    }
  };

  const agentsArray = Array.from(agents.values()).sort((a, b) => 
    (a.sortOrder || 0) - (b.sortOrder || 0)
  );

  const onlineCount = agentsArray.filter(a => a.isActive).length;

  // Mock last messages (in real app, fetch from conversation store)
  const getLastMessage = (agentId: string): { preview: string; timestamp: Date } | undefined => {
    // Placeholder - would be fetched from actual conversation data
    return undefined;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Pull to refresh indicator */}
      <div 
        className="flex items-center justify-center overflow-hidden transition-all"
        style={{ height: pullDistance > 0 ? Math.min(pullDistance, threshold) : 0 }}
      >
        <motion.div
          animate={{ 
            rotate: isRefreshing ? 360 : (pullDistance / threshold) * 180,
          }}
          transition={{ duration: isRefreshing ? 1 : 0.2, repeat: isRefreshing ? Infinity : 0, ease: "linear" }}
        >
          <RefreshCw className={cn(
            "h-5 w-5",
            pullDistance >= threshold ? "text-accent" : "text-muted-foreground"
          )} />
        </motion.div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Agents</h1>
          <p className="text-xs text-muted-foreground">
            {agentsArray.length} agent{agentsArray.length !== 1 ? "s" : ""} • {onlineCount} online
          </p>
        </div>
        <Button 
          size="sm" 
          onClick={onAddAgent}
          className="gap-1.5 h-9"
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && agentsArray.length === 0 ? (
          // Loading skeletons
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i} 
                className="h-20 bg-card rounded-2xl animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        ) : agentsArray.length === 0 ? (
          <EmptyState onAdd={onAddAgent} />
        ) : (
          <motion.div 
            className="p-3 space-y-2"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.05,
                },
              },
            }}
          >
            <AnimatePresence mode="popLayout">
              {agentsArray.map((agent) => {
                const status = statuses.get(agent.id) || (agent.isActive ? "online" : "offline");
                const latencyHistory = latencies.get(agent.id) || [];
                const avgLatency = latencyHistory.length > 0
                  ? latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length
                  : agent.avgLatencyMs;

                return (
                  <motion.div
                    key={agent.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AgentCard
                      agent={agent}
                      status={status as ConnectionStatus}
                      latency={avgLatency}
                      lastMessage={getLastMessage(agent.id)}
                      onClick={() => onSelectAgent(agent.id)}
                      onLongPress={() => router.push(`/agents/${agent.id}`)}
                      onConfigure={() => router.push(`/agents/${agent.id}`)}
                      onDelete={() => setAgentToDelete(agent)}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!agentToDelete} onOpenChange={() => setAgentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{agentToDelete?.name}</strong> and all associated conversations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
