"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/stores/types";

export interface AgentStatusBadgeProps {
  status: ConnectionStatus;
  latency?: number;
  showLatency?: boolean;
  size?: "sm" | "md" | "lg";
}

const statusConfig = {
  online: {
    color: "bg-green-500",
    text: "text-green-500",
    label: "Online",
    pulse: true,
  },
  slow: {
    color: "bg-yellow-500",
    text: "text-yellow-500",
    label: "Slow",
    pulse: true,
  },
  offline: {
    color: "bg-red-500",
    text: "text-red-500",
    label: "Offline",
    pulse: false,
  },
  unknown: {
    color: "bg-muted-foreground",
    text: "text-muted-foreground",
    label: "Unknown",
    pulse: false,
  },
};

const sizeClasses = {
  sm: {
    dot: "h-1.5 w-1.5",
    text: "text-xs",
  },
  md: {
    dot: "h-2 w-2",
    text: "text-sm",
  },
  lg: {
    dot: "h-2.5 w-2.5",
    text: "text-sm",
  },
};

export function AgentStatusBadge({
  status,
  latency,
  showLatency = false,
  size = "md",
}: AgentStatusBadgeProps): React.ReactElement {
  const config = statusConfig[status];
  const sizeClass = sizeClasses[size];

  const formatLatency = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={cn("rounded-full", sizeClass.dot, config.color)} />
        {config.pulse && (
          <motion.div
            className={cn("absolute inset-0 rounded-full", config.color)}
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        )}
      </div>
      {showLatency && latency !== undefined ? (
        <span className={cn(sizeClass.text, "font-medium tabular-nums", config.text)}>
          {formatLatency(latency)}
        </span>
      ) : (
        <span className={cn(sizeClass.text, "text-muted-foreground")}>
          {config.label}
        </span>
      )}
    </div>
  );
}
