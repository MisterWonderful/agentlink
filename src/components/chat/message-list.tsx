"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/schemas";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./message-bubble";

export interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  agentColor: string;
  agentName?: string;
  showTimestamps?: boolean;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  className?: string;
}

interface GroupedMessage {
  messages: ChatMessage[];
  isUser: boolean;
}

export function MessageList({
  messages,
  isStreaming,
  agentColor,
  agentName = "Assistant",
  showTimestamps = false,
  onRegenerate,
  onDelete,
  className,
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
  const groupedMessages = messages.reduce<GroupedMessage[]>(
    (groups, message) => {
      const isUser = message.role === "user";
      const lastGroup = groups[groups.length - 1];

      if (lastGroup && lastGroup.isUser === isUser) {
        lastGroup.messages.push(message);
      } else {
        groups.push({ messages: [message], isUser });
      }

      return groups;
    },
    []
  );

  // Find the last assistant message for regenerate functionality
  const lastAssistantMessageId = messages
    .filter((m) => m.role === "assistant")
    .pop()?.id;

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
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={cn(
          "h-full overflow-y-auto scrollbar-dark px-4 py-6 space-y-6",
          className
        )}
      >
        <AnimatePresence initial={false}>
          {groupedMessages.map((group, groupIndex) => (
            <motion.div
              key={`group-${groupIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-1"
            >
              {group.messages.map((message, messageIndex) => {
                const isLastInGroup =
                  messageIndex === group.messages.length - 1;
                const isLastAssistantMessage =
                  message.id === lastAssistantMessageId;

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
                      groupIndex === groupedMessages.length - 1
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
                  />
                );
              })}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Bottom spacer for safe area */}
        <div className="h-4" />
      </div>

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
