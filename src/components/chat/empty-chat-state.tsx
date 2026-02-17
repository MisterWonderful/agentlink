"use client";

import { motion } from "framer-motion";
import { Sparkles, MessageSquare, Zap, Code, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export interface EmptyChatStateProps {
  agentName: string;
  agentAvatar?: string;
  agentColor?: string;
  agentDescription?: string;
  onSuggestionClick?: (suggestion: string) => void;
  className?: string;
}

const defaultSuggestions = [
  {
    icon: MessageSquare,
    text: "Hello! How can you help me today?",
  },
  {
    icon: Code,
    text: "Can you write a function to parse JSON in TypeScript?",
  },
  {
    icon: Lightbulb,
    text: "Explain the difference between async/await and promises",
  },
  {
    icon: Zap,
    text: "Help me brainstorm ideas for a mobile app",
  },
];

export function EmptyChatState({
  agentName,
  agentAvatar,
  agentColor = "#3b82f6",
  agentDescription = "Your AI assistant ready to help",
  onSuggestionClick,
  className,
}: EmptyChatStateProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const,
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
        className
      )}
    >
      {/* Agent Avatar */}
      <motion.div variants={itemVariants} className="relative mb-6">
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-30"
          style={{ backgroundColor: agentColor }}
        />
        <Avatar
          className="h-20 w-20 ring-4 ring-background relative"
          style={{
            backgroundColor: `${agentColor}20`,
            borderColor: agentColor,
          }}
        >
          {agentAvatar && <AvatarImage src={agentAvatar} alt={agentName} />}
          <AvatarFallback
            className="text-2xl"
            style={{ color: agentColor }}
          >
            <Sparkles className="h-8 w-8" />
          </AvatarFallback>
        </Avatar>
        <motion.div
          className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 500 }}
        >
          <div
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: agentColor }}
          />
        </motion.div>
      </motion.div>

      {/* Welcome Text */}
      <motion.div variants={itemVariants} className="text-center mb-2">
        <h1 className="text-2xl font-semibold text-foreground">
          {agentName}
        </h1>
      </motion.div>

      <motion.p
        variants={itemVariants}
        className="text-muted-foreground text-center mb-8 max-w-xs"
      >
        {agentDescription}
      </motion.p>

      {/* Suggestions */}
      <motion.div
        variants={itemVariants}
        className="w-full max-w-md space-y-3"
      >
        <p className="text-xs font-medium text-muted-foreground text-center uppercase tracking-wide mb-4">
          Suggested starters
        </p>
        {defaultSuggestions.map((suggestion, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant="outline"
              onClick={() => onSuggestionClick?.(suggestion.text)}
              className={cn(
                "w-full justify-start gap-3 h-auto py-3 px-4",
                "text-left text-sm text-foreground",
                "bg-surface/50 hover:bg-surface border-border/50",
                "hover:border-accent/30 transition-all duration-200"
              )}
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${agentColor}15` }}
              >
                <suggestion.icon
                  className="h-4 w-4"
                  style={{ color: agentColor }}
                />
              </div>
              <span className="line-clamp-2">{suggestion.text}</span>
            </Button>
          </motion.div>
        ))}
      </motion.div>

      {/* Footer hint */}
      <motion.p
        variants={itemVariants}
        className="text-xs text-muted-foreground mt-8 text-center"
      >
        Press{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
          Enter
        </kbd>{" "}
        to send,{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
          Shift + Enter
        </kbd>{" "}
        for new line
      </motion.p>
    </motion.div>
  );
}
