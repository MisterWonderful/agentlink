"use client";

import * as React from "react";
import { useState, useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Settings, Trash2, ChevronRight } from "lucide-react";
import { AgentAvatar } from "./agent-avatar";
import { AgentStatusBadge } from "./agent-status-badge";
import { cn } from "@/lib/utils";
import type { Agent } from "@/types/schemas";
import type { ConnectionStatus } from "@/stores/types";
import { formatDistanceToNow } from "date-fns";

export interface AgentCardProps {
  agent: Agent;
  status: ConnectionStatus;
  latency?: number;
  lastMessage?: { preview: string; timestamp: Date };
  onClick: () => void;
  onLongPress?: () => void;
  onConfigure?: () => void;
  onDelete?: () => void;
}

export function AgentCard({
  agent,
  status,
  latency,
  lastMessage,
  onClick,
  onLongPress,
  onConfigure,
  onDelete,
}: AgentCardProps): React.ReactElement {
  const [isPressed, setIsPressed] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5]);
  const deleteOpacity = useTransform(x, [-100, -50], [1, 0]);
  const configureOpacity = useTransform(x, [50, 100], [0, 1]);

  const handlePointerDown = useCallback(() => {
    setIsPressed(true);
    longPressTimer.current = setTimeout(() => {
      onLongPress?.();
      setIsPressed(false);
    }, 600);
  }, [onLongPress]);

  const handlePointerUp = useCallback(() => {
    setIsPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -80 && onDelete) {
      onDelete();
    } else if (info.offset.x > 80 && onConfigure) {
      onConfigure();
    }
  };

  const avatar = agent.avatarUrl || "🤖";
  const displayName = agent.name || "Unnamed Agent";

  return (
    <div className="relative overflow-hidden">
      {/* Swipe Actions Background */}
      <div className="absolute inset-0 flex items-center justify-between px-4">
        {/* Delete Action (swipe left) */}
        <motion.div
          className="flex items-center gap-2 text-red-500"
          style={{ opacity: deleteOpacity }}
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-sm font-medium">Delete</span>
        </motion.div>
        
        {/* Configure Action (swipe right) */}
        <motion.div
          className="flex items-center gap-2 text-accent"
          style={{ opacity: configureOpacity }}
        >
          <span className="text-sm font-medium">Configure</span>
          <Settings className="h-5 w-5" />
        </motion.div>
      </div>

      {/* Card */}
      <motion.div
        ref={cardRef}
        style={{ x, opacity }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDragEnd={handleDragEnd}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={onClick}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative bg-card rounded-2xl p-4 cursor-pointer select-none",
          "border border-transparent hover:border-border/50",
          "transition-colors duration-200",
          isPressed && "bg-surface-hover"
        )}
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <AgentAvatar
            avatar={avatar}
            name={displayName}
            color={agent.accentColor}
            size="lg"
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {displayName}
              </h3>
              {lastMessage && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDistanceToNow(lastMessage.timestamp, { addSuffix: false })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-1">
              <AgentStatusBadge status={status} latency={latency} size="sm" />
            </div>

            <p className="text-sm text-muted-foreground truncate">
              {lastMessage?.preview || agent.systemPrompt || "No messages yet"}
            </p>
          </div>

          {/* Chevron */}
          <ChevronRight className="h-5 w-5 text-muted-foreground/50 shrink-0" />
        </div>
      </motion.div>
    </div>
  );
}
