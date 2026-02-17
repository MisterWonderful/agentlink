"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Pin, Clock, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationCard } from "./conversation-card";

export interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelect: (conversationId: string) => void;
  onNew: () => void;
  onDelete: (conversationId: string) => void;
  onPin?: (conversationId: string, isPinned: boolean) => void;
  onArchive?: (conversationId: string, isArchived: boolean) => void;
  className?: string;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
  onNew,
  onDelete,
  onPin,
  onArchive,
  className,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter and sort conversations
  const { pinned, recent, archived } = useMemo(() => {
    const filtered = searchQuery
      ? conversations.filter(
          (c) =>
            c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.lastMessagePreview?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : conversations;

    const sorted = filtered.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return {
      pinned: sorted.filter((c) => c.isPinned && !c.isArchived),
      recent: sorted.filter((c) => !c.isPinned && !c.isArchived),
      archived: sorted.filter((c) => c.isArchived),
    };
  }, [conversations, searchQuery]);

  const hasConversations =
    pinned.length > 0 || recent.length > 0 || archived.length > 0;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Conversations
          </h2>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              onClick={onNew}
              size="sm"
              className="gap-2 bg-accent hover:bg-accent/90"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Chat</span>
            </Button>
          </motion.div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-border/50"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {!hasConversations && !searchQuery ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <MessageSquareIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                No conversations yet
              </p>
              <p className="text-xs text-muted-foreground/60">
                Start a new chat to begin
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {/* Pinned Section */}
              {pinned.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-1"
                >
                  <div className="flex items-center gap-2 px-2 py-1">
                    <Pin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Pinned
                    </span>
                  </div>
                  {pinned.map((conversation) => (
                    <ConversationCard
                      key={conversation.id}
                      conversation={conversation}
                      isActive={activeConversationId === conversation.id}
                      onClick={() => onSelect(conversation.id)}
                      onDelete={() => onDelete(conversation.id)}
                      onPin={() => onPin?.(conversation.id, !conversation.isPinned)}
                      onArchive={() => onArchive?.(conversation.id, true)}
                    />
                  ))}
                </motion.div>
              )}

              {/* Recent Section */}
              {recent.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-1"
                >
                  {pinned.length > 0 && (
                    <div className="flex items-center gap-2 px-2 py-1 pt-4">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Recent
                      </span>
                    </div>
                  )}
                  {recent.map((conversation) => (
                    <ConversationCard
                      key={conversation.id}
                      conversation={conversation}
                      isActive={activeConversationId === conversation.id}
                      onClick={() => onSelect(conversation.id)}
                      onDelete={() => onDelete(conversation.id)}
                      onPin={() => onPin?.(conversation.id, !conversation.isPinned)}
                      onArchive={() => onArchive?.(conversation.id, true)}
                    />
                  ))}
                </motion.div>
              )}

              {/* Archived Section */}
              {archived.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-1"
                >
                  <div className="flex items-center gap-2 px-2 py-1 pt-4">
                    <Archive className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Archived
                    </span>
                  </div>
                  {archived.map((conversation) => (
                    <ConversationCard
                      key={conversation.id}
                      conversation={conversation}
                      isActive={activeConversationId === conversation.id}
                      onClick={() => onSelect(conversation.id)}
                      onDelete={() => onDelete(conversation.id)}
                      onPin={() => onPin?.(conversation.id, !conversation.isPinned)}
                      onArchive={() => onArchive?.(conversation.id, false)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Simple icon component
function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
