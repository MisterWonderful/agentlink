"use client";

/**
 * Terminal Header Component
 * 
 * Professional terminal header showing agent info, connection status,
 * latency, and token velocity. Includes actions for settings and new conversation.
 */

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi,
  WifiOff,
  AlertCircle,
  Settings,
  Plus,
  Activity,
  Zap,
  ChevronLeft,
  MoreVertical,
  Trash2,
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Agent } from "@/types/schemas";
import type { ConnectionStatus } from "@/stores/types";
import { TokenVelocityIndicator } from "@/components/stream/token-velocity-indicator";

export interface TerminalHeaderProps {
  /** Agent being chatted with */
  agent: Agent;
  /** Connection status */
  connectionStatus: ConnectionStatus;
  /** Latency in milliseconds */
  latency?: number;
  /** Tokens per second (streaming speed) */
  tokensPerSecond?: number;
  /** Whether currently streaming */
  isStreaming?: boolean;
  /** Callback when settings is clicked */
  onSettingsClick: () => void;
  /** Callback for new conversation */
  onNewConversation: () => void;
  /** Callback for back button (mobile) */
  onBack?: () => void;
  /** Callback to rename conversation */
  onRename?: () => void;
  /** Callback to delete conversation */
  onDelete?: () => void;
  /** Conversation title */
  conversationTitle?: string;
  /** Whether to show back button */
  showBack?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Get status icon and color based on connection status
 */
function getStatusConfig(status: ConnectionStatus): {
  icon: React.ReactNode;
  color: string;
  label: string;
} {
  switch (status) {
    case "online":
      return {
        icon: <Wifi className="h-3.5 w-3.5" />,
        color: "text-success bg-success/10",
        label: "Online",
      };
    case "slow":
      return {
        icon: <Activity className="h-3.5 w-3.5" />,
        color: "text-warning bg-warning/10",
        label: "Slow",
      };
    case "offline":
      return {
        icon: <WifiOff className="h-3.5 w-3.5" />,
        color: "text-error bg-error/10",
        label: "Offline",
      };
    default:
      return {
        icon: <AlertCircle className="h-3.5 w-3.5" />,
        color: "text-muted-foreground bg-muted",
        label: "Unknown",
      };
  }
}

/**
 * Terminal Header Component
 */
export function TerminalHeader({
  agent,
  connectionStatus,
  latency,
  tokensPerSecond,
  isStreaming = false,
  onSettingsClick,
  onNewConversation,
  onBack,
  onRename,
  onDelete,
  conversationTitle,
  showBack = false,
  className,
}: TerminalHeaderProps) {
  const statusConfig = getStatusConfig(connectionStatus);
  const hasLatency = latency !== undefined && latency > 0;
  const hasTokensPerSecond = tokensPerSecond !== undefined && tokensPerSecond > 0;

  const handleDelete = useCallback(() => {
    if (onDelete && confirm("Delete this conversation? This cannot be undone.")) {
      onDelete();
    }
  }, [onDelete]);

  return (
    <TooltipProvider delayDuration={300}>
      <header
        className={cn(
          "flex items-center gap-3 px-4 py-3",
          "border-b border-border/50 bg-background/80 backdrop-blur-sm",
          "safe-top shrink-0",
          className
        )}
      >
        {/* Back button (mobile) */}
        {showBack && onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="shrink-0 -ml-2 h-9 w-9"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}

        {/* Agent Avatar */}
        <Avatar
          className="h-9 w-9 shrink-0 ring-2 ring-background"
          style={{ backgroundColor: `${agent.accentColor}20` }}
        >
          {agent.avatarUrl && (
            <AvatarImage src={agent.avatarUrl} alt={agent.name} />
          )}
          <AvatarFallback
            style={{ color: agent.accentColor, fontSize: "14px" }}
          >
            {agent.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Agent Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-sm truncate text-foreground">
              {conversationTitle || agent.name}
            </h1>
            {/* Status Badge */}
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] px-1.5 py-0 h-4 font-medium hidden sm:inline-flex",
                statusConfig.color
              )}
            >
              <span className="flex items-center gap-1">
                {statusConfig.icon}
                <span>{statusConfig.label}</span>
              </span>
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{agent.defaultModel || "Unknown Model"}</span>
            
            {/* Latency indicator */}
            {hasLatency && (
              <>
                <span className="text-border">|</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {latency}ms
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Response latency</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Token Velocity Indicator (only when streaming) */}
          <AnimatePresence>
            {isStreaming && hasTokensPerSecond && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="hidden sm:flex items-center"
              >
                <TokenVelocityIndicator
                  tokensPerSecond={tokensPerSecond}
                  totalTokens={0}
                  variant="compact"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* New Conversation Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNewConversation}
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>New conversation</p>
            </TooltipContent>
          </Tooltip>

          {/* Settings Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSettingsClick}
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Agent settings</p>
            </TooltipContent>
          </Tooltip>

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onRename && (
                <DropdownMenuItem onClick={onRename}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onNewConversation}>
                <Plus className="h-4 w-4 mr-2" />
                New Conversation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-error focus:text-error"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Conversation
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  );
}

/**
 * Compact header variant for embedded use
 */
export function TerminalHeaderCompact({
  agent,
  connectionStatus,
  onSettingsClick,
  onNewConversation,
  className,
}: Omit<TerminalHeaderProps, "latency" | "tokensPerSecond" | "isStreaming">) {
  const statusConfig = getStatusConfig(connectionStatus);

  return (
    <header
      className={cn(
        "flex items-center gap-2 px-3 py-2",
        "border-b border-border/50 bg-surface/50",
        className
      )}
    >
      <Avatar
        className="h-7 w-7 shrink-0"
        style={{ backgroundColor: `${agent.accentColor}20` }}
      >
        <AvatarFallback
          style={{ color: agent.accentColor, fontSize: "10px" }}
        >
          {agent.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <h1 className="font-medium text-xs truncate">{agent.name}</h1>
        <p className="text-[10px] text-muted-foreground truncate">
          {agent.defaultModel}
        </p>
      </div>

      <div className={cn("px-1.5 py-0.5 rounded text-[10px]", statusConfig.color)}>
        {statusConfig.label}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onNewConversation}
        className="h-7 w-7"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </header>
  );
}
