"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Zap, BarChart3, Hash, Wifi, WifiOff, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TerminalMetricsProps {
  latency: number;
  tokensPerSecond?: number;
  totalTokens?: number;
  isStreaming: boolean;
  className?: string;
  compact?: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

function formatLatency(latency: number): string {
  if (latency < 1000) {
    return `${Math.round(latency)}ms`;
  }
  return `${(latency / 1000).toFixed(1)}s`;
}

export function TerminalMetrics({
  latency,
  tokensPerSecond,
  totalTokens,
  isStreaming,
  className,
  compact = false,
}: TerminalMetricsProps): React.ReactElement {
  const getLatencyColor = (ms: number): string => {
    if (ms < 200) return "text-success";
    if (ms < 500) return "text-warning";
    return "text-error";
  };

  const getLatencyIcon = (ms: number) => {
    if (ms < 200) return Wifi;
    if (ms < 500) return Activity;
    return WifiOff;
  };

  const LatencyIcon = getLatencyIcon(latency);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 text-xs", className)}>
        <div className="flex items-center gap-1.5">
          <LatencyIcon className={cn("h-3 w-3", getLatencyColor(latency))} />
          <span className={cn("font-mono", getLatencyColor(latency))}>
            {formatLatency(latency)}
          </span>
        </div>
        {isStreaming && tokensPerSecond !== undefined && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 text-accent"
          >
            <BarChart3 className="h-3 w-3" />
            <span className="font-mono">{tokensPerSecond} tok/s</span>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-3 py-2 rounded-lg",
        "bg-surface/50 border border-border/50",
        className
      )}
    >
      {/* Latency */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-6 w-6 rounded-md flex items-center justify-center",
            "bg-muted/50"
          )}
        >
          <LatencyIcon className={cn("h-3.5 w-3.5", getLatencyColor(latency))} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Latency
          </span>
          <span className={cn("text-sm font-mono font-medium", getLatencyColor(latency))}>
            {formatLatency(latency)}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-border/50" />

      {/* Tokens Per Second */}
      <AnimatePresence mode="wait">
        {isStreaming && tokensPerSecond !== undefined ? (
          <motion.div
            key="streaming"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-2"
          >
            <div
              className={cn(
                "h-6 w-6 rounded-md flex items-center justify-center",
                "bg-accent/10"
              )}
            >
              <Zap className="h-3.5 w-3.5 text-accent" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Speed
              </span>
              <span className="text-sm font-mono font-medium text-accent">
                {tokensPerSecond} tok/s
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-2"
          >
            <div
              className={cn(
                "h-6 w-6 rounded-md flex items-center justify-center",
                "bg-muted/50"
              )}
            >
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Speed
              </span>
              <span className="text-sm font-mono font-medium text-muted-foreground">
                --
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Divider */}
      <div className="w-px h-8 bg-border/50" />

      {/* Total Tokens */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-6 w-6 rounded-md flex items-center justify-center",
            "bg-muted/50"
          )}
        >
          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Tokens
          </span>
          <span className="text-sm font-mono font-medium">
            {totalTokens !== undefined ? formatNumber(totalTokens) : "--"}
          </span>
        </div>
      </div>
    </div>
  );
}

export interface TerminalMetricsBarProps {
  metrics: {
    latency: number;
    tokensPerSecond?: number;
    totalTokens?: number;
  };
  isStreaming: boolean;
  className?: string;
}

export function TerminalMetricsBar({
  metrics,
  isStreaming,
  className,
}: TerminalMetricsBarProps): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center justify-between px-4 py-2",
        "bg-background/80 backdrop-blur-sm border-b border-border/50",
        className
      )}
    >
      <TerminalMetrics
        latency={metrics.latency}
        tokensPerSecond={metrics.tokensPerSecond}
        totalTokens={metrics.totalTokens}
        isStreaming={isStreaming}
        compact
      />

      {/* Streaming indicator */}
      <AnimatePresence>
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            <span className="text-xs text-muted-foreground">Streaming...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
