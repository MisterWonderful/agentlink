"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface GlassCardProps {
  children: React.ReactNode;
  intensity?: "low" | "medium" | "high";
  hover?: boolean;
  className?: string;
}

const intensityStyles = {
  low: {
    background: "bg-background/40",
    backdrop: "backdrop-blur-sm",
    border: "border-border/30",
  },
  medium: {
    background: "bg-background/60",
    backdrop: "backdrop-blur-md",
    border: "border-border/50",
  },
  high: {
    background: "bg-background/80",
    backdrop: "backdrop-blur-xl",
    border: "border-border/70",
  },
};

export function GlassCard({
  children,
  intensity = "medium",
  hover = false,
  className,
}: GlassCardProps): React.ReactElement {
  const styles = intensityStyles[intensity];

  return (
    <motion.div
      whileHover={
        hover
          ? {
              scale: 1.01,
              transition: { duration: 0.2 },
            }
          : undefined
      }
      className={cn(
        "rounded-xl",
        styles.background,
        styles.backdrop,
        "border",
        styles.border,
        "shadow-lg shadow-black/5",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export interface GlassPanelProps {
  children: React.ReactNode;
  direction?: "up" | "down" | "left" | "right";
  intensity?: "low" | "medium" | "high";
  className?: string;
}

export function GlassPanel({
  children,
  direction = "up",
  intensity = "medium",
  className,
}: GlassPanelProps): React.ReactElement {
  const styles = intensityStyles[intensity];

  const gradientDirections = {
    up: "from-background/80 via-background/40 to-transparent",
    down: "from-transparent via-background/40 to-background/80",
    left: "from-background/80 via-background/40 to-transparent",
    right: "from-transparent via-background/40 to-background/80",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        className
      )}
    >
      {/* Glass gradient overlay */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none",
          "bg-gradient-to-t",
          gradientDirections[direction]
        )}
      />
      
      {/* Content */}
      <div
        className={cn(
          "relative z-10",
          styles.background,
          styles.backdrop,
          "border-t",
          styles.border
        )}
      >
        {children}
      </div>
    </div>
  );
}

export interface FrostedCardProps {
  children: React.ReactNode;
  className?: string;
}

export function FrostedCard({ children, className }: FrostedCardProps): React.ReactElement {
  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden",
        "bg-white/5 dark:bg-black/20",
        "backdrop-blur-xl",
        "border border-white/10 dark:border-white/5",
        "shadow-2xl shadow-black/10",
        className
      )}
    >
      {/* Inner gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export interface BlurOverlayProps {
  children: React.ReactNode;
  blur?: "sm" | "md" | "lg" | "xl";
  visible: boolean;
  onClick?: () => void;
  className?: string;
}

export function BlurOverlay({
  children,
  blur = "md",
  visible,
  onClick,
  className,
}: BlurOverlayProps): React.ReactElement | null {
  if (!visible) return null;

  const blurClasses = {
    sm: "backdrop-blur-sm",
    md: "backdrop-blur-md",
    lg: "backdrop-blur-lg",
    xl: "backdrop-blur-xl",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "fixed inset-0 z-40",
        "bg-background/50",
        blurClasses[blur],
        className
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
