"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TerminalSkeletonProps {
  className?: string;
}

export function TerminalSkeleton({ className }: TerminalSkeletonProps): React.ReactElement {
  return (
    <div className={cn("flex flex-col gap-4 p-4", className)}>
      {/* Header skeleton */}
      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
        <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
        </div>
      </div>

      {/* Messages skeleton */}
      <div className="space-y-4 flex-1">
        <MessageSkeleton isUser />
        <MessageSkeleton />
        <MessageSkeleton isUser />
        <MessageSkeleton />
      </div>

      {/* Input skeleton */}
      <div className="flex items-center gap-2 pt-4">
        <div className="flex-1 h-12 bg-muted rounded-lg animate-pulse" />
        <div className="h-10 w-10 bg-muted rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

export interface MessageSkeletonProps {
  isUser?: boolean;
  className?: string;
}

export function MessageSkeleton({ isUser, className }: MessageSkeletonProps): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "h-8 w-8 rounded-full shrink-0 animate-pulse",
          isUser ? "bg-accent/50" : "bg-muted"
        )}
      />

      {/* Content */}
      <div
        className={cn(
          "flex flex-col gap-2 max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3 space-y-2",
            isUser ? "bg-accent/20 rounded-br-md" : "bg-muted rounded-bl-md"
          )}
        >
          <div className="h-3 w-48 bg-muted-foreground/20 rounded animate-pulse" />
          <div className="h-3 w-32 bg-muted-foreground/20 rounded animate-pulse" />
          <div className="h-3 w-40 bg-muted-foreground/20 rounded animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}

export interface CodeBlockSkeletonProps {
  className?: string;
}

export function CodeBlockSkeleton({ className }: CodeBlockSkeletonProps): React.ReactElement {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/50 overflow-hidden",
        "bg-muted/30",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border/50">
        <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        <div className="h-6 w-16 bg-muted rounded animate-pulse" />
      </div>

      {/* Code lines */}
      <div className="p-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3"
            style={{ opacity: 1 - i * 0.1 }}
          >
            <div className="h-3 w-6 bg-muted rounded animate-pulse" />
            <div
              className="h-3 bg-muted rounded animate-pulse"
              style={{ width: `${60 + Math.random() * 30}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export interface ConversationListSkeletonProps {
  count?: number;
  className?: string;
}

export function ConversationListSkeleton({
  count = 5,
  className,
}: ConversationListSkeletonProps): React.ReactElement {
  return (
    <div className={cn("space-y-2 p-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3 p-3 rounded-lg"
        >
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-2 w-1/2 bg-muted rounded animate-pulse" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export interface AgentCardSkeletonProps {
  className?: string;
}

export function AgentCardSkeleton({ className }: AgentCardSkeletonProps): React.ReactElement {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 p-4 space-y-3",
        "bg-card",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-6 w-14 bg-muted rounded-full animate-pulse" />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <div className="h-3 w-full bg-muted rounded animate-pulse" />
        <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <div className="h-3 w-20 bg-muted rounded animate-pulse" />
        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

export interface ShimmerProps {
  className?: string;
  children?: React.ReactNode;
}

export function Shimmer({ className, children }: ShimmerProps): React.ReactElement {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {children}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatDelay: 0.5,
          ease: "linear",
        }}
      />
    </div>
  );
}

export interface StreamingSkeletonProps {
  className?: string;
}

export function StreamingSkeleton({ className }: StreamingSkeletonProps): React.ReactElement {
  return (
    <div className={cn("flex items-center gap-2 py-2", className)}>
      <motion.div
        className="h-2 w-2 rounded-full bg-accent"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          delay: 0,
        }}
      />
      <motion.div
        className="h-2 w-2 rounded-full bg-accent"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          delay: 0.2,
        }}
      />
      <motion.div
        className="h-2 w-2 rounded-full bg-accent"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          delay: 0.4,
        }}
      />
    </div>
  );
}
