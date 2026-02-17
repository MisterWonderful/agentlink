"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Settings,
  Trash2,
  Activity,
  ChevronRight,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AppHeader } from "@/components/layout/app-header";
import { PageContainer } from "@/components/layout/page-container";
import { useAgentStore } from "@/stores";
import type { Agent } from "@/types/schemas";
import { cn } from "@/lib/utils";

interface AgentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Agent detail/configuration page
 * 
 * Features:
 * - Display agent configuration details
 * - Status indicator with online/offline state
 * - Quick actions (Start Chat, Edit, Delete)
 * - Configuration details card
 * - Responsive layout for mobile and desktop
 */
export default function AgentDetailPage({ params }: AgentDetailPageProps): React.JSX.Element {
  const router = useRouter();
  const { id } = use(params);
  const { agents, removeAgent, loadAgents } = useAgentStore();

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const agent = agents.get(id);

  if (!agent) {
    return (
      <div className="min-h-full flex flex-col">
        <AppHeader title="Agent Not Found" showBack onBack={() => router.push("/agents")} />
        <PageContainer centered>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <h1 className="text-xl font-semibold text-foreground mb-2">
              Agent Not Found
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              The agent you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button onClick={() => router.push("/agents")}>Back to Agents</Button>
          </motion.div>
        </PageContainer>
      </div>
    );
  }

  const getHealthColor = (isActive?: boolean): string => {
    if (isActive === undefined) return "text-muted-foreground";
    return isActive ? "text-success" : "text-error";
  };

  const getHealthLabel = (isActive?: boolean): string => {
    if (isActive === undefined) return "Unknown";
    return isActive ? "Online" : "Offline";
  };

  const handleDelete = async (): Promise<void> => {
    if (confirm("Are you sure you want to delete this agent?")) {
      await removeAgent(agent.id);
      router.push("/agents");
    }
  };

  return (
    <div className="min-h-full flex flex-col">
      <AppHeader
        title={agent.name}
        subtitle={agent.agentType}
        showBack
        onBack={() => router.back()}
        rightContent={
          <Button
            variant="outline"
            size="icon"
            onClick={handleDelete}
            className="text-error hover:text-error"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        }
      />

      <PageContainer padBottom>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-2xl mx-auto w-full space-y-6"
        >
          {/* Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">Status</CardTitle>
                </div>
                <Badge
                  variant={agent.isActive ? "default" : "secondary"}
                  className={cn(getHealthColor(agent.isActive))}
                >
                  {getHealthLabel(agent.isActive)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm text-muted-foreground">
                {agent.avgLatencyMs !== undefined && (
                  <p>Average latency: {agent.avgLatencyMs}ms</p>
                )}
                {agent.lastSeenAt && (
                  <p>
                    Last seen: {new Date(agent.lastSeenAt).toLocaleString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() => router.push(`/agents/${agent.id}/chat`)}
            >
              <MessageSquare className="h-5 w-5" />
              Start Chat
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full gap-2"
              onClick={() => {/* TODO: Edit functionality */}}
            >
              <Edit className="h-5 w-5" />
              Edit Agent
            </Button>
          </div>

          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Configuration</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {agent.systemPrompt && (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      System Prompt
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {agent.systemPrompt}
                    </p>
                  </div>
                  <Separator />
                </>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Endpoint URL
                </p>
                <p className="text-sm text-foreground font-mono break-all">
                  {agent.endpointUrl}
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Protocol
                  </p>
                  <Badge variant="secondary">{agent.agentType}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Model
                  </p>
                  <p className="text-sm text-foreground">
                    {agent.defaultModel || "Default"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Temperature
                  </p>
                  <p className="text-sm text-foreground">{agent.temperature}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Max Tokens
                  </p>
                  <p className="text-sm text-foreground">{agent.maxTokens}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Created
                  </p>
                  <p className="text-sm text-foreground">
                    {new Date(agent.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Last Updated
                  </p>
                  <p className="text-sm text-foreground">
                    {new Date(agent.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </PageContainer>
    </div>
  );
}
