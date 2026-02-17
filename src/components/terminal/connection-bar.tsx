"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, AlertCircle, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ConnectionStatus } from "@/stores/types";
import { StatusPulse } from "@/components/animations/status-pulse";

export interface ConnectionBarProps {
  status: ConnectionStatus;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const statusConfig: Record<
  ConnectionStatus,
  {
    icon: typeof Wifi;
    title: string;
    description: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
  }
> = {
  online: {
    icon: Wifi,
    title: "Connected",
    description: "Agent connection is stable",
    bgColor: "bg-success/10",
    textColor: "text-success",
    borderColor: "border-success/20",
  },
  slow: {
    icon: AlertCircle,
    title: "Slow Connection",
    description: "Experiencing high latency",
    bgColor: "bg-warning/10",
    textColor: "text-warning",
    borderColor: "border-warning/20",
  },
  offline: {
    icon: WifiOff,
    title: "Disconnected",
    description: "Unable to reach agent",
    bgColor: "bg-error/10",
    textColor: "text-error",
    borderColor: "border-error/20",
  },
  unknown: {
    icon: AlertCircle,
    title: "Connecting...",
    description: "Checking agent status",
    bgColor: "bg-muted/50",
    textColor: "text-muted-foreground",
    borderColor: "border-border",
  },
};

export function ConnectionBar({
  status,
  message,
  onRetry,
  onDismiss,
  className,
}: ConnectionBarProps): React.ReactElement | null {
  const config = statusConfig[status];
  const Icon = config.icon;

  // Don't show bar for online status unless there's a custom message
  if (status === "online" && !message) {
    return null;
  }

  return (
    <AnimatePresence>
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "sticky top-0 z-30 overflow-hidden",
        config.bgColor,
        config.borderColor,
        "border-b",
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-3">
          <StatusPulse status={status} size="sm" showGlow={false} />
          <Icon className={cn("h-4 w-4", config.textColor)} />
          <div className="flex items-baseline gap-2">
            <span className={cn("text-sm font-medium", config.textColor)}>
              {config.title}
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {message || config.description}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === "offline" && onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className={cn(
                "h-7 px-2 text-xs",
                "hover:bg-background/50",
                config.textColor
              )}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDismiss}
              className="h-7 w-7 hover:bg-background/50"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
    </AnimatePresence>
  );
}

export interface OfflineModeIndicatorProps {
  queuedCount: number;
  className?: string;
}

export function OfflineModeIndicator({
  queuedCount,
  className,
}: OfflineModeIndicatorProps): React.ReactElement | null {
  if (queuedCount === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-warning/10 border border-warning/20",
        className
      )}
    >
      <WifiOff className="h-3.5 w-3.5 text-warning" />
      <span className="text-xs text-warning font-medium">
        {queuedCount} message{queuedCount > 1 ? "s" : ""} queued
      </span>
    </motion.div>
  );
}
