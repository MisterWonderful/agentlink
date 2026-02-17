"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Pin, Trash2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/schemas";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ConversationCardProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onPin?: () => void;
  onArchive?: () => void;
  className?: string;
}

export function ConversationCard({
  conversation,
  isActive,
  onClick,
  onDelete,
  onPin,
  onArchive,
  className,
}: ConversationCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    } else {
      onDelete();
    }
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPin?.();
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive?.();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative flex items-start gap-3 p-3 rounded-xl cursor-pointer",
        "transition-all duration-200",
        isActive
          ? "bg-accent/10 border border-accent/30 shadow-sm"
          : "bg-transparent border border-transparent hover:bg-muted/50 hover:border-border/30",
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
          isActive ? "bg-accent/20" : "bg-muted"
        )}
      >
        <MessageSquare
          className={cn(
            "h-5 w-5",
            isActive ? "text-accent" : "text-muted-foreground"
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3
            className={cn(
              "font-medium truncate text-sm",
              isActive ? "text-accent" : "text-foreground"
            )}
          >
            {conversation.title || "New Conversation"}
          </h3>
          {conversation.isPinned && (
            <Pin className="h-3 w-3 text-accent shrink-0 fill-accent" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
          {conversation.lastMessagePreview || "No messages yet"}
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {formatDistanceToNow(new Date(conversation.updatedAt), {
            addSuffix: true,
          })}
        </p>
      </div>

      {/* Actions */}
      <div
        className={cn(
          "flex items-center gap-1 transition-opacity",
          isHovered || isActive ? "opacity-100" : "opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {onPin && (
              <DropdownMenuItem onClick={handlePin}>
                {conversation.isPinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
            )}
            {onArchive && (
              <DropdownMenuItem onClick={handleArchive}>
                {conversation.isArchived ? "Unarchive" : "Archive"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={handleDelete}
              className={cn(
                "text-error focus:text-error",
                showDeleteConfirm && "bg-error/10"
              )}
            >
              {showDeleteConfirm ? "Click to confirm" : "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-r-full"
        />
      )}
    </motion.div>
  );
}
