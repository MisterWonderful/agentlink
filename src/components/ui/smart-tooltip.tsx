"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface SmartTooltipProps {
  content: string;
  shortcut?: string;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delay?: number;
  disabled?: boolean;
  className?: string;
}

export function SmartTooltip({
  content,
  shortcut,
  children,
  side = "top",
  align = "center",
  delay = 300,
  disabled = false,
  className,
}: SmartTooltipProps): React.ReactElement {
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={delay}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className={cn(
            "flex items-center gap-2 px-2.5 py-1.5",
            "bg-popover border-border",
            className
          )}
        >
          <span className="text-sm">{content}</span>
          {shortcut && (
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono text-muted-foreground">
              {shortcut}
            </kbd>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export interface KeyboardShortcutProps {
  keys: string[];
  separator?: string;
  className?: string;
}

export function KeyboardShortcut({
  keys,
  separator = "+",
  className,
}: KeyboardShortcutProps): React.ReactElement {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {keys.map((key, index) => (
        <span key={index} className="flex items-center">
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono text-muted-foreground border border-border/50">
            {key}
          </kbd>
          {index < keys.length - 1 && (
            <span className="text-muted-foreground mx-0.5">{separator}</span>
          )}
        </span>
      ))}
    </span>
  );
}

export interface HintBadgeProps {
  text: string;
  variant?: "default" | "subtle" | "accent";
  className?: string;
}

export function HintBadge({
  text,
  variant = "default",
  className,
}: HintBadgeProps): React.ReactElement {
  const variantStyles = {
    default: "bg-muted text-muted-foreground",
    subtle: "bg-muted/50 text-muted-foreground/70",
    accent: "bg-accent/10 text-accent",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {text}
    </span>
  );
}

export interface ContextualHintProps {
  message: string;
  visible: boolean;
  onDismiss?: () => void;
  position?: "top" | "bottom";
  className?: string;
}

export function ContextualHint({
  message,
  visible,
  onDismiss,
  position = "bottom",
  className,
}: ContextualHintProps): React.ReactElement | null {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: position === "top" ? 10 : -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === "top" ? 10 : -10 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "absolute z-50",
            position === "top" ? "bottom-full mb-2" : "top-full mt-2",
            "left-1/2 -translate-x-1/2",
            className
          )}
        >
          <div
            className={cn(
              "px-3 py-2 rounded-lg text-sm",
              "bg-accent text-accent-foreground",
              "shadow-lg whitespace-nowrap"
            )}
          >
            {message}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="ml-2 text-accent-foreground/70 hover:text-accent-foreground"
              >
                ×
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export interface FeatureHighlightProps {
  children: React.ReactNode;
  title: string;
  description: string;
  visible: boolean;
  onComplete?: () => void;
  className?: string;
}

export function FeatureHighlight({
  children,
  title,
  description,
  visible,
  onComplete,
  className,
}: FeatureHighlightProps): React.ReactElement {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    onComplete?.();
  }, [onComplete]);

  if (dismissed || !visible) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative", className)}>
      {children}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute -top-2 -right-2 z-50"
      >
        <div className="bg-accent text-accent-foreground rounded-lg shadow-lg p-3 max-w-[200px]">
          <h4 className="font-medium text-sm mb-1">{title}</h4>
          <p className="text-xs text-accent-foreground/80 mb-2">{description}</p>
          <button
            onClick={handleDismiss}
            className="text-xs bg-accent-foreground/20 hover:bg-accent-foreground/30 px-2 py-1 rounded transition-colors"
          >
            Got it
          </button>
        </div>
      </motion.div>
    </div>
  );
}
