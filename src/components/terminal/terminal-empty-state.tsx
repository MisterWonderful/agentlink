"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  MessageSquare,
  Zap,
  Code,
  Lightbulb,
  Terminal,
  Cpu,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GlowEffect } from "@/components/ui/glow-effect";

export interface TerminalEmptyStateProps {
  agentName: string;
  agentAvatar?: string;
  agentColor?: string;
  agentDescription?: string;
  onSuggestionClick?: (suggestion: string) => void;
  className?: string;
}

interface Suggestion {
  icon: typeof MessageSquare;
  text: string;
  category: "general" | "code" | "creative" | "technical";
}

const defaultSuggestions: Suggestion[] = [
  {
    icon: MessageSquare,
    text: "Hello! How can you help me today?",
    category: "general",
  },
  {
    icon: Code,
    text: "Can you write a function to parse JSON in TypeScript?",
    category: "code",
  },
  {
    icon: Lightbulb,
    text: "Explain the difference between async/await and promises",
    category: "technical",
  },
  {
    icon: Zap,
    text: "Help me brainstorm ideas for a mobile app",
    category: "creative",
  },
];

const categoryIcons: Record<Suggestion["category"], typeof MessageSquare> = {
  general: MessageSquare,
  code: Terminal,
  creative: Lightbulb,
  technical: Cpu,
};

const categoryLabels: Record<Suggestion["category"], string> = {
  general: "General",
  code: "Code",
  creative: "Creative",
  technical: "Technical",
};

export function TerminalEmptyState({
  agentName,
  agentAvatar,
  agentColor = "#3b82f6",
  agentDescription = "Your AI assistant ready to help",
  onSuggestionClick,
  className,
}: TerminalEmptyStateProps): React.ReactElement {
  const containerVariants: import("framer-motion").Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: import("framer-motion").Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "flex flex-col items-center justify-center h-full px-6 py-12",
        "min-h-[400px]",
        className
      )}
    >
      {/* Agent Avatar with Glow */}
      <motion.div variants={itemVariants} className="relative mb-8">
        <GlowEffect color={agentColor} intensity="medium">
          <Avatar
            className="h-24 w-24 ring-4 ring-background relative z-10"
            style={{
              backgroundColor: `${agentColor}20`,
              borderColor: agentColor,
            }}
          >
            {agentAvatar && <AvatarImage src={agentAvatar} alt={agentName} />}
            <AvatarFallback
              className="text-3xl"
              style={{ color: agentColor }}
            >
              <Sparkles className="h-10 w-10" />
            </AvatarFallback>
          </Avatar>
        </GlowEffect>

        {/* Status indicator */}
        <motion.div
          className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-background flex items-center justify-center z-20"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 500 }}
        >
          <motion.div
            className="h-5 w-5 rounded-full"
            style={{ backgroundColor: agentColor }}
            animate={{
              boxShadow: [
                `0 0 0 0 ${agentColor}40`,
                `0 0 0 8px ${agentColor}00`,
                `0 0 0 0 ${agentColor}40`,
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      </motion.div>

      {/* Welcome Text */}
      <motion.div variants={itemVariants} className="text-center mb-2">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          {agentName}
        </h1>
      </motion.div>

      <motion.p
        variants={itemVariants}
        className="text-muted-foreground text-center mb-8 max-w-sm"
      >
        {agentDescription}
      </motion.p>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="w-full max-w-md space-y-3">
        <p className="text-xs font-medium text-muted-foreground text-center uppercase tracking-wide mb-4">
          Suggested starters
        </p>

        <div className="grid gap-2">
          {defaultSuggestions.map((suggestion, index) => {
            const CategoryIcon = categoryIcons[suggestion.category];
            return (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  variant="outline"
                  onClick={() => onSuggestionClick?.(suggestion.text)}
                  className={cn(
                    "w-full justify-start gap-3 h-auto py-3.5 px-4",
                    "text-left text-sm text-foreground",
                    "bg-surface/50 hover:bg-surface border-border/50",
                    "hover:border-accent/30 transition-all duration-200",
                    "group"
                  )}
                >
                  <div
                    className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                      "transition-colors duration-200",
                      "bg-muted group-hover:bg-accent/10"
                    )}
                  >
                    <suggestion.icon
                      className="h-4 w-4 transition-colors duration-200"
                      style={{ color: agentColor }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="line-clamp-2 block">{suggestion.text}</span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium",
                      "bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <CategoryIcon className="h-3 w-3" />
                    {categoryLabels[suggestion.category]}
                  </div>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Keyboard hints */}
      <motion.div
        variants={itemVariants}
        className="mt-8 text-center space-y-2"
      >
        <p className="text-xs text-muted-foreground">
          Press{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
            Enter
          </kbd>{" "}
          to send,{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
            Shift + Enter
          </kbd>{" "}
          for new line
        </p>
        <p className="text-xs text-muted-foreground/60">
          Use{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
            @
          </kbd>{" "}
          to mention files,{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
            /
          </kbd>{" "}
          for commands
        </p>
      </motion.div>

      {/* Additional help */}
      <motion.div
        variants={itemVariants}
        className="mt-6 flex items-center gap-4 text-xs text-muted-foreground/60"
      >
        <div className="flex items-center gap-1.5">
          <Wrench className="h-3 w-3" />
          <span>Model: GPT-4</span>
        </div>
        <div className="w-px h-3 bg-border" />
        <div className="flex items-center gap-1.5">
          <Terminal className="h-3 w-3" />
          <span>Direct connection</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export interface QuickStartCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick?: () => void;
  className?: string;
}

export function QuickStartCard({
  title,
  description,
  icon: Icon,
  onClick,
  className,
}: QuickStartCardProps): React.ReactElement {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl",
        "bg-surface/50 border border-border/50",
        "hover:border-accent/30 hover:bg-surface",
        "transition-colors duration-200",
        "text-left w-full",
        className
      )}
    >
      <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm text-foreground mb-0.5">{title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {description}
        </p>
      </div>
    </motion.button>
  );
}
