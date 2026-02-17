"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/stores/types";

export interface StatusPulseProps {
  status: ConnectionStatus;
  size?: "sm" | "md" | "lg";
  showGlow?: boolean;
  className?: string;
}

const statusColors: Record<ConnectionStatus, string> = {
  online: "hsl(142, 76%, 36%)", // success green
  slow: "hsl(38, 92%, 50%)", // warning yellow
  offline: "hsl(0, 84%, 60%)", // error red
  unknown: "hsl(0, 0%, 45%)", // muted gray
};

const statusGlowColors: Record<ConnectionStatus, string> = {
  online: "hsla(142, 76%, 36%, 0.4)",
  slow: "hsla(38, 92%, 50%, 0.4)",
  offline: "hsla(0, 84%, 60%, 0.4)",
  unknown: "hsla(0, 0%, 45%, 0.4)",
};

const sizeClasses = {
  sm: "h-2 w-2",
  md: "h-3 w-3",
  lg: "h-4 w-4",
};

export function StatusPulse({
  status,
  size = "md",
  showGlow = true,
  className,
}: StatusPulseProps): React.ReactElement {
  const color = statusColors[status];
  const glowColor = statusGlowColors[status];
  const isOnline = status === "online";

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {/* Animated glow ring */}
      {showGlow && isOnline && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: glowColor }}
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{
            scale: [1, 2, 1],
            opacity: [0.6, 0, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Secondary glow ring for online status */}
      {showGlow && isOnline && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: glowColor }}
          initial={{ scale: 1, opacity: 0.4 }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.4, 0, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3,
          }}
        />
      )}

      {/* Main status dot */}
      <motion.span
        className={cn("relative rounded-full", sizeClasses[size])}
        style={{ backgroundColor: color }}
        initial={false}
        animate={{
          scale: status === "slow" ? [1, 1.1, 1] : 1,
        }}
        transition={{
          duration: 1.5,
          repeat: status === "slow" ? Infinity : 0,
          ease: "easeInOut",
        }}
      />

      {/* Offline warning indicator */}
      {status === "offline" && (
        <motion.span
          className="absolute -top-0.5 -right-0.5 flex h-2 w-2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-error" />
        </motion.span>
      )}
    </div>
  );
}

export interface StatusLabelProps {
  status: ConnectionStatus;
  latency?: number;
  className?: string;
}

export function StatusLabel({ status, latency, className }: StatusLabelProps): React.ReactElement {
  const labels: Record<ConnectionStatus, string> = {
    online: "Connected",
    slow: "Slow Connection",
    offline: "Disconnected",
    unknown: "Connecting...",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <StatusPulse status={status} size="sm" />
      <span className="text-sm text-muted-foreground">
        {labels[status]}
        {latency !== undefined && status === "online" && (
          <span className="text-xs ml-1">({latency}ms)</span>
        )}
      </span>
    </div>
  );
}
