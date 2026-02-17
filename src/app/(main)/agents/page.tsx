"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Server, AlertCircle, Users, Activity, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/layout/app-header";
import { PageContainer } from "@/components/layout/page-container";
import { useAgentStore } from "@/stores";
import type { Agent } from "@/types/schemas";
import { cn } from "@/lib/utils";
import { seedDemoData, DEMO_AGENT_ID, DEMO_CONVERSATION_ID } from "@/lib/demo-data";
import { useUIStore } from "@/stores";

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
  index: number;
}

/**
 * Agent card component displaying agent info
 */
function AgentCard({ agent, onClick, index }: AgentCardProps): React.ReactElement {
  const getHealthColor = (isActive?: boolean): string => {
    if (isActive === undefined) return "bg-muted-foreground";
    return isActive ? "bg-success" : "bg-error";
  };

  const getHealthLabel = (isActive?: boolean): string => {
    if (isActive === undefined) return "Unknown";
    return isActive ? "Online" : "Offline";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
    >
      <Card
        className="cursor-pointer hover:border-accent transition-colors group"
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Server className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-base group-hover:text-accent transition-colors">
                  {agent.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  {agent.agentType}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={cn("h-2 w-2 rounded-full", getHealthColor(agent.isActive))}
              />
              <span className="text-xs text-muted-foreground">
                {getHealthLabel(agent.isActive)}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {agent.systemPrompt || "No description provided"}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {agent.defaultModel || "Default model"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Skeleton loader for agent cards
 */
function AgentCardSkeleton(): React.ReactElement {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-2 w-2 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  );
}

/**
 * Agents list page
 * 
 * Features:
 * - Display all configured AI agents
 * - Filter by status (all, online, offline)
 * - Quick stats (total, online count)
 * - Add new agent button
 * - Responsive grid layout
 */
export default function AgentsPage(): React.ReactElement {
  const router = useRouter();
  const { agents, isLoading, error, loadAgents } = useAgentStore();
  const { updateOnboardingProgress } = useUIStore();
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all");
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleLoadDemo = async () => {
    setIsLoadingDemo(true);
    try {
      await seedDemoData();
      await loadAgents();
      updateOnboardingProgress({ firstAgentAdded: true });
      router.push(`/agents/${DEMO_AGENT_ID}/chat/${DEMO_CONVERSATION_ID}`);
    } catch (error) {
      console.error('Failed to load demo:', error);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const agentsArray = Array.from(agents.values());

  const filteredAgents = agentsArray.filter((agent) => {
    if (filter === "online") return agent.isActive === true;
    if (filter === "offline") return agent.isActive === false;
    return true;
  });

  const onlineCount = agentsArray.filter((a) => a.isActive === true).length;
  const offlineCount = agentsArray.filter((a) => a.isActive === false).length;

  return (
    <div className="min-h-full flex flex-col">
      <AppHeader
        title="Your Agents"
        subtitle={`${agentsArray.length} agents • ${onlineCount} online`}
        rightContent={
          <Button
            onClick={() => router.push("/agents/new")}
            className="gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Agent</span>
          </Button>
        }
      />

      <PageContainer padBottom className="flex-1">
        <div className="max-w-5xl mx-auto w-full">
          {/* Filter Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-6 overflow-x-auto pb-2"
          >
            <FilterButton
              active={filter === "all"}
              onClick={() => setFilter("all")}
              icon={<Users className="h-4 w-4" />}
              label="All"
              count={agentsArray.length}
            />
            <FilterButton
              active={filter === "online"}
              onClick={() => setFilter("online")}
              icon={<Activity className="h-4 w-4" />}
              label="Online"
              count={onlineCount}
            />
            <FilterButton
              active={filter === "offline"}
              onClick={() => setFilter("offline")}
              icon={<Server className="h-4 w-4" />}
              label="Offline"
              count={offlineCount}
            />
          </motion.div>

          {/* Error State */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 p-4 mb-6 rounded-lg bg-error/10 text-error"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading State */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <AgentCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            /* Agents Grid */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <AnimatePresence mode="popLayout">
                {filteredAgents.map((agent, index) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    index={index}
                    onClick={() => router.push(`/agents/${agent.id}`)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Empty State */}
          {!isLoading && filteredAgents.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="h-12 w-12 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Server className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {filter === "all" ? "No agents yet" : `No ${filter} agents`}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                {filter === "all"
                  ? "Add your first AI agent to start chatting. Connect to Ollama, OpenClaw, or any OpenAI-compatible endpoint."
                  : `You don't have any ${filter} agents.`}
              </p>
              {filter === "all" && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => router.push("/agents/new")}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Your First Agent
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleLoadDemo}
                    disabled={isLoadingDemo}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {isLoadingDemo ? 'Loading Demo...' : 'Try Demo'}
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </PageContainer>
    </div>
  );
}

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}

function FilterButton({ active, onClick, icon, label, count }: FilterButtonProps): React.ReactElement {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className="gap-2 shrink-0"
    >
      {icon}
      <span>{label}</span>
      <Badge variant={active ? "secondary" : "outline"} className="ml-1 text-xs">
        {count}
      </Badge>
    </Button>
  );
}
