"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface GlowEffectProps {
  color: string;
  intensity?: "low" | "medium" | "high";
  children: React.ReactNode;
  animated?: boolean;
  className?: string;
}

const intensityConfig = {
  low: {
    blur: "blur-xl",
    opacity: 0.15,
    scale: 1.1,
  },
  medium: {
    blur: "blur-2xl",
    opacity: 0.25,
    scale: 1.2,
  },
  high: {
    blur: "blur-3xl",
    opacity: 0.4,
    scale: 1.3,
  },
};

export function GlowEffect({
  color,
  intensity = "medium",
  children,
  animated = true,
  className,
}: GlowEffectProps): React.ReactElement {
  const config = intensityConfig[intensity];

  return (
    <div className={cn("relative inline-block", className)}>
      {/* Glow layer */}
      <motion.div
        className={cn("absolute inset-0 -z-10", config.blur)}
        style={{
          backgroundColor: color,
          opacity: config.opacity,
          transform: `scale(${config.scale})`,
        }}
        animate={
          animated
            ? {
                opacity: [config.opacity, config.opacity * 1.3, config.opacity],
                scale: [config.scale, config.scale * 1.05, config.scale],
              }
            : undefined
        }
        transition={
          animated
            ? {
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : undefined
        }
      />

      {/* Secondary glow for higher intensity */}
      {intensity === "high" && (
        <motion.div
          className={cn("absolute inset-0 -z-20 blur-3xl")}
          style={{
            backgroundColor: color,
            opacity: config.opacity * 0.5,
            transform: `scale(${config.scale * 1.2})`,
          }}
          animate={
            animated
              ? {
                  opacity: [
                    config.opacity * 0.5,
                    config.opacity * 0.8,
                    config.opacity * 0.5,
                  ],
                }
              : undefined
          }
          transition={
            animated
              ? {
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }
              : undefined
          }
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

import type { HTMLMotionProps } from "framer-motion";

export interface GlowButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  glowColor?: string;
  glowIntensity?: "low" | "medium" | "high";
  variant?: "default" | "outline" | "ghost";
  children: React.ReactNode;
}

export function GlowButton({
  glowColor = "hsl(217, 91%, 60%)",
  glowIntensity = "medium",
  variant = "default",
  className,
  children,
  ...props
}: GlowButtonProps): React.ReactElement {
  const config = intensityConfig[glowIntensity];

  const variantStyles = {
    default: "bg-accent text-accent-foreground",
    outline: "border-2 border-accent text-accent bg-transparent",
    ghost: "text-accent hover:bg-accent/10",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn("relative group", className)}
      {...props}
    >
      {/* Glow effect */}
      <motion.div
        className={cn(
          "absolute inset-0 -z-10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity",
          config.blur
        )}
        style={{
          backgroundColor: glowColor,
          opacity: 0,
        }}
        whileHover={{
          opacity: config.opacity,
        }}
      />

      {/* Button content */}
      <div
        className={cn(
          "relative px-4 py-2 rounded-lg font-medium transition-colors",
          variantStyles[variant]
        )}
      >
        {children}
      </div>
    </motion.button>
  );
}

export interface GlowCardProps {
  glowColor?: string;
  glowIntensity?: "low" | "medium" | "high";
  hoverGlow?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function GlowCard({
  glowColor = "hsl(217, 91%, 60%)",
  glowIntensity = "low",
  hoverGlow = true,
  children,
  className,
}: GlowCardProps): React.ReactElement {
  const config = intensityConfig[glowIntensity];

  return (
    <motion.div
      whileHover={
        hoverGlow
          ? {
              boxShadow: `0 0 40px ${glowColor}40`,
            }
          : undefined
      }
      transition={{ duration: 0.3 }}
      className={cn(
        "relative rounded-xl overflow-hidden",
        "bg-card border border-border",
        className
      )}
    >
      {/* Subtle glow border on hover */}
      <div
        className={cn(
          "absolute inset-0 -z-10 opacity-0 hover:opacity-100 transition-opacity",
          config.blur
        )}
        style={{
          background: `linear-gradient(135deg, ${glowColor}20, transparent)`,
        }}
      />

      {children}
    </motion.div>
  );
}

export interface AnimatedGlowProps {
  color: string;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}

export function AnimatedGlow({
  color,
  size = "md",
  children,
  className,
}: AnimatedGlowProps): React.ReactElement {
  const sizeConfig = {
    sm: { padding: "p-4", glow: 20 },
    md: { padding: "p-6", glow: 40 },
    lg: { padding: "p-8", glow: 60 },
  };

  const config = sizeConfig[size];

  return (
    <div className={cn("relative", className)}>
      {/* Animated ring */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{
          border: `2px solid ${color}`,
          opacity: 0.3,
        }}
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Content */}
      <div className={cn("relative z-10", config.padding)}>{children}</div>
    </div>
  );
}
