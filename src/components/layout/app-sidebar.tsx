"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Settings,
  Plus,
  Server,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAgentStore, useChatStore, useUIStore } from "@/stores";
import type { Agent } from "@/types/schemas";
import { useState, useMemo } from "react";

interface AppSidebarProps {
  /** Optional className for styling overrides */
  className?: string;
}

/**
 * Desktop sidebar navigation component
 * 
 * Features:
 * - Logo and app name at top
 * - Agent list with status indicators
 * - Selected agent shows conversation list
 * - Collapsible sidebar with toggle button
 * - New agent button
 * - Only visible on desktop (>= 768px)
 */
export function AppSidebar({ className }: AppSidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { agents, isLoading } = useAgentStore();
  const { conversations } = useChatStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const agentsArray = useMemo(() => Array.from(agents.values()), [agents]);
  const onlineCount = agentsArray.filter((a) => a.isActive).length;

  // Get conversations for selected agent
  const agentConversations = useMemo(() => {
    if (!selectedAgentId) return [];
    return Array.from(conversations.values())
      .filter((c) => c.agentId === selectedAgentId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [conversations, selectedAgentId]);

  const selectedAgent = selectedAgentId ? agents.get(selectedAgentId) : null;

  const handleAgentClick = (agentId: string) => {
    if (selectedAgentId === agentId) {
      // Toggle off if already selected
      setSelectedAgentId(null);
    } else {
      setSelectedAgentId(agentId);
    }
  };

  const handleConversationClick = (conversationId: string) => {
    if (selectedAgentId) {
      router.push(`/agents/${selectedAgentId}/chat/${conversationId}`);
    }
  };

  const navItems = [
    { name: "All Agents", href: "/agents", icon: Bot },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div
      className={cn(
        "hidden md:flex h-full flex-col bg-surface border-r border-border",
        sidebarOpen ? "w-72" : "w-16",
        "transition-all duration-300 ease-in-out",
        className
      )}
    >
      {/* Header with Logo */}
      <div className="flex items-center justify-between p-4 border-b border-border h-16 shrink-0">
        <Link
          href="/agents"
          className={cn(
            "flex items-center gap-3 overflow-hidden",
            !sidebarOpen && "justify-center w-full"
          )}
        >
          <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-lg font-semibold text-foreground whitespace-nowrap"
              >
                AgentLink
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* Collapse toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(
                "h-8 w-8 shrink-0",
                !sidebarOpen && "absolute right-2 top-4"
              )}
            >
              {sidebarOpen ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {sidebarOpen ? "Collapse" : "Expand"}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* New Agent Button */}
      <div className="p-3 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              className={cn(
                "gap-2 transition-all duration-200",
                sidebarOpen ? "w-full justify-start" : "w-full justify-center px-0"
              )}
            >
              <Link href="/agents/new">
                <Plus className="h-4 w-4 shrink-0" />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      New Agent
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </Button>
          </TooltipTrigger>
          {!sidebarOpen && (
            <TooltipContent side="right">New Agent</TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* Main Navigation */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full gap-3 transition-all duration-200",
                      sidebarOpen ? "justify-start" : "justify-center px-0",
                      isActive && "bg-accent/10 text-accent hover:bg-accent/20"
                    )}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      <AnimatePresence>
                        {sidebarOpen && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            className="whitespace-nowrap overflow-hidden"
                          >
                            {item.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {sidebarOpen && item.name === "All Agents" && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {onlineCount}/{agentsArray.length}
                        </Badge>
                      )}
                    </Link>
                  </Button>
                </TooltipTrigger>
                {!sidebarOpen && (
                  <TooltipContent side="right">{item.name}</TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>

        <Separator className="my-4" />

        {/* Agent List */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1"
            >
              <h3 className="text-xs font-medium text-muted-foreground px-2 mb-2">
                Agents
              </h3>
              {isLoading ? (
                <div className="space-y-2 px-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                agentsArray.map((agent) => (
                  <AgentListItem
                    key={agent.id}
                    agent={agent}
                    isSelected={selectedAgentId === agent.id}
                    isActive={pathname.includes(`/agents/${agent.id}`)}
                    onClick={() => handleAgentClick(agent.id)}
                  />
                ))
              )}

              {/* Conversations for selected agent */}
              <AnimatePresence>
                {selectedAgent && agentConversations.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-4 mt-2 space-y-1"
                  >
                    <h4 className="text-xs text-muted-foreground px-2 mb-1">
                      Recent chats with {selectedAgent.name}
                    </h4>
                    {agentConversations.slice(0, 5).map((conv) => (
                      <Button
                        key={conv.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConversationClick(conv.id)}
                        className="w-full justify-start gap-2 text-xs"
                      >
                        <MessageSquare className="h-3 w-3" />
                        <span className="truncate">{conv.title || "Untitled"}</span>
                      </Button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* Footer */}
      <Separator />
      <div className="p-4 shrink-0">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-muted-foreground text-center"
            >
              <p>AgentLink v0.1.0</p>
              <p className="mt-1">{onlineCount} agents online</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface AgentListItemProps {
  agent: Agent;
  isSelected: boolean;
  isActive: boolean;
  onClick: () => void;
}

function AgentListItem({ agent, isSelected, isActive, onClick }: AgentListItemProps) {
  const getStatusColor = (isActive?: boolean) => {
    if (isActive === undefined) return "bg-muted-foreground";
    return isActive ? "bg-success" : "bg-error";
  };

  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        "w-full justify-start gap-2 px-2 py-1 h-auto",
        "transition-colors duration-200",
        (isSelected || isActive) && "bg-accent/10 text-accent"
      )}
    >
      <div className="relative">
        <Server className="h-4 w-4 shrink-0" />
        <Circle
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2 w-2 fill-current",
            getStatusColor(agent.isActive)
          )}
        />
      </div>
      <span className="truncate text-sm">{agent.name}</span>
    </Button>
  );
}

// Import useRouter
import { useRouter } from "next/navigation";
