"use client";

/**
 * Message List Component (Enhanced)
 * 
 * Enhanced with:
 * - New animation variants
 * - Scroll-to-bottom with smooth animation
 * - Better consecutive message grouping
 * - Date separators
 */

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/schemas";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./message-bubble";
import { formatDate, isSameDay, formatRelativeDate } from "@/lib/utils/format";

export interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  agentColor: string;
  agentName?: string;
  showTimestamps?: boolean;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  className?: string;
  /** Whether to use tokenized streaming for the last message */
  enableTokenizedStream?: boolean;
}

interface GroupedMessage {
  messages: ChatMessage[];
  isUser: boolean;
  date: Date;
}

/**
 * Animation variants for message groups
 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const groupVariants: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

const dateSeparatorVariants: import("framer-motion").Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * Date Separator Component
 */
function DateSeparator({ date }: { date: Date }) {
  const formatted = formatRelativeDate(date);
  
  return (
    <motion.div
      variants={dateSeparatorVariants}
      className="flex items-center justify-center my-6"
    >
      <div className="h-px flex-1 bg-border/50" />
      <span className="mx-4 text-xs text-muted-foreground font-medium px-3 py-1 bg-muted/50 rounded-full">
        {formatted}
      </span>
      <div className="h-px flex-1 bg-border/50" />
    </motion.div>
  );
}

/**
 * Enhanced Message List Component
 */
export function MessageList({
  messages,
  isStreaming,
  agentColor,
  agentName = "Assistant",
  showTimestamps = false,
  onRegenerate,
  onDelete,
  className,
  enableTokenizedStream = true,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user is near bottom
  const checkScrollPosition = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const threshold = 100; // pixels from bottom
    const nearBottom = scrollHeight - scrollTop - clientHeight < threshold;

    setIsNearBottom(nearBottom);
    setShowScrollButton(!nearBottom);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!containerRef.current) return;

    if (isNearBottom || isStreaming) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: isStreaming ? "auto" : "smooth",
      });
    }
  }, [messages, isStreaming, isNearBottom]);

  // Scroll handler with debounce
  const handleScroll = useCallback(() => {
    checkScrollPosition();

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      checkScrollPosition();
    }, 150);
  }, [checkScrollPosition]);

  // Scroll to bottom handler
  const scrollToBottom = useCallback(() => {
    if (!containerRef.current) return;

    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
    setIsNearBottom(true);
    setShowScrollButton(false);
  }, []);

  // Group consecutive messages from the same sender
  const groupedMessages = useMemo(() => {
    const groups: GroupedMessage[] = [];
    let currentGroup: GroupedMessage | null = null;

    messages.forEach((message, index) => {
      const isUser = message.role === "user";
      const messageDate = new Date(message.createdAt);

      // Check if we should start a new group
      const shouldStartNewGroup = 
        !currentGroup ||
        currentGroup.isUser !== isUser ||
        !isSameDay(currentGroup.date, messageDate);

      if (shouldStartNewGroup) {
        // Check if date changed (for date separator)
        const isNewDay = !currentGroup || !isSameDay(currentGroup.date, messageDate);
        
        currentGroup = {
          messages: [message],
          isUser,
          date: messageDate,
        };
        groups.push(currentGroup);
      } else if (currentGroup) {
        currentGroup.messages.push(message);
      }
    });

    return groups;
  }, [messages]);

  // Find the last assistant message for regenerate functionality
  const lastAssistantMessageId = messages
    .filter((m) => m.role === "assistant")
    .pop()?.id;

  // Track dates we've shown separators for
  const shownDates = useMemo(() => new Set<string>(), []);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">No messages yet. Start a conversation!</p>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Message List */}
      <motion.div
        ref={containerRef}
        onScroll={handleScroll}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          "h-full overflow-y-auto scrollbar-dark px-4 py-6 space-y-6",
          className
        )}
      >
        {groupedMessages.map((group, groupIndex) => {
          const dateKey = formatDate(group.date, "yyyy-MM-dd");
          const showDateSeparator = !shownDates.has(dateKey);
          if (showDateSeparator) {
            shownDates.add(dateKey);
          }

          return (
            <div key={`group-${groupIndex}`}>
              {/* Date Separator */}
              {showDateSeparator && <DateSeparator date={group.date} />}

              {/* Message Group */}
              <motion.div
                variants={groupVariants}
                className="space-y-1"
              >
                {group.messages.map((message, messageIndex) => {
                  const isLastInGroup =
                    messageIndex === group.messages.length - 1;
                  const isLastAssistantMessage =
                    message.id === lastAssistantMessageId;
                  const isLastMessageOverall =
                    groupIndex === groupedMessages.length - 1 && isLastInGroup;

                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isUser={group.isUser}
                      agentColor={agentColor}
                      agentName={agentName}
                      isStreaming={
                        isStreaming &&
                        !group.isUser &&
                        isLastInGroup &&
                        isLastMessageOverall
                      }
                      showActions={isLastInGroup}
                      onRegenerate={
                        isLastAssistantMessage && onRegenerate
                          ? () => onRegenerate(message.id)
                          : undefined
                      }
                      onDelete={
                        onDelete ? () => onDelete(message.id) : undefined
                      }
                      className={messageIndex > 0 ? "mt-1" : ""}
                      enableTokenizedStream={enableTokenizedStream}
                      isLastMessage={isLastMessageOverall}
                    />
                  );
                })}
              </motion.div>
            </div>
          );
        })}

        {/* Bottom spacer for safe area */}
        <div className="h-4" />
      </motion.div>

      {/* Scroll to Bottom Button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={scrollToBottom}
              className="h-8 px-3 rounded-full shadow-lg bg-surface/90 backdrop-blur-sm border border-border/50"
            >
              <ChevronDown className="h-4 w-4 mr-1" />
              <span className="text-xs">New messages</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MessageList;
