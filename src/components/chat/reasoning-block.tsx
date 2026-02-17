"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReasoningBlockProps {
  content: string;
  thinkingTimeMs?: number;
  isStreaming?: boolean;
  className?: string;
}

export function ReasoningBlock({
  content,
  thinkingTimeMs,
  isStreaming = false,
  className,
}: ReasoningBlockProps) {
  // Auto-expand during streaming, collapse when complete
  const [isExpanded, setIsExpanded] = useState(isStreaming);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Update expanded state when streaming state changes
  useEffect(() => {
    if (isStreaming) {
      setIsExpanded(true);
    }
  }, [isStreaming]);

  // Track elapsed time during streaming
  useEffect(() => {
    if (!isStreaming) {
      setElapsedMs(thinkingTimeMs || 0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isStreaming, thinkingTimeMs]);

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    const remainingMs = Math.floor((ms % 1000) / 100);
    return `${seconds}.${remainingMs}s`;
  };

  const toggleExpand = () => {
    if (!isStreaming) {
      setIsExpanded((prev) => !prev);
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 overflow-hidden bg-muted/30",
        className
      )}
    >
      {/* Header */}
      <button
        onClick={toggleExpand}
        disabled={isStreaming}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3",
          "bg-muted/50 hover:bg-muted/70 transition-colors",
          isStreaming && "cursor-default"
        )}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={isStreaming ? { rotate: [0, 360] } : {}}
            transition={
              isStreaming
                ? {
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }
                : {}
            }
          >
            <Sparkles
              className={cn(
                "h-4 w-4",
                isStreaming ? "text-accent" : "text-muted-foreground"
              )}
            />
          </motion.div>
          <span
            className={cn(
              "text-sm font-medium",
              isStreaming ? "text-accent" : "text-muted-foreground"
            )}
          >
            {isStreaming ? "Thinking..." : "Thought Process"}
          </span>
          {isStreaming && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatDuration(elapsedMs)}
            </span>
          )}
          {!isStreaming && thinkingTimeMs && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatDuration(thinkingTimeMs)}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground",
              isStreaming && "opacity-50"
            )}
          />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 border-t border-border/30">
              <div
                className={cn(
                  "text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap",
                  isStreaming && "animate-pulse"
                )}
              >
                {content || (
                  <span className="italic opacity-50">Thinking...</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
