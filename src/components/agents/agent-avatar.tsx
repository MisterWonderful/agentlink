"use client";

import * as React from "react";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AgentAvatarProps {
  avatar?: string;
  name: string;
  color: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-14 w-14 text-xl",
  xl: "h-20 w-20 text-3xl",
};

export function AgentAvatar({ avatar, name, color, size = "md" }: AgentAvatarProps): React.ReactElement {
  const isEmoji = avatar && !avatar.startsWith("http");
  
  if (isEmoji) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl font-medium shrink-0",
          sizeClasses[size]
        )}
        style={{ backgroundColor: `${color}20` }}
      >
        <span className="leading-none">{avatar}</span>
      </div>
    );
  }

  if (avatar?.startsWith("http")) {
    return (
      <img
        src={avatar}
        alt={name}
        className={cn(
          "rounded-xl object-cover shrink-0",
          sizeClasses[size]
        )}
      />
    );
  }

  // Default icon avatar
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl shrink-0",
        sizeClasses[size]
      )}
      style={{ backgroundColor: `${color}20`, color }}
    >
      <Bot className={cn("shrink-0", size === "sm" ? "h-4 w-4" : size === "md" ? "h-5 w-5" : size === "lg" ? "h-7 w-7" : "h-10 w-10")} />
    </div>
  );
}
