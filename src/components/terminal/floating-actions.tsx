"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, Plus, Settings, MessageSquarePlus, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface FloatingActionsProps {
  onScrollToBottom?: () => void;
  onNewChat?: () => void;
  onQuickSettings?: () => void;
  showScrollButton?: boolean;
  className?: string;
}

export function FloatingActions({
  onScrollToBottom,
  onNewChat,
  onQuickSettings,
  showScrollButton = true,
  className,
}: FloatingActionsProps): React.ReactElement {
  const [showActions, setShowActions] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setScrolled(scrollTop > 200);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollToBottom = useCallback(() => {
    onScrollToBottom?.();
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }, [onScrollToBottom]);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2",
          "md:bottom-6 md:right-6",
          className
        )}
      >
        <AnimatePresence>
          {/* Expanded Actions */}
          {showActions && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-2 mb-2"
            >
              {onNewChat && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => {
                        onNewChat();
                        setShowActions(false);
                      }}
                      className="h-10 w-10 rounded-full shadow-lg"
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>New conversation</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {onQuickSettings && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => {
                        onQuickSettings();
                        setShowActions(false);
                      }}
                      className="h-10 w-10 rounded-full shadow-lg"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Quick settings</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </motion.div>
          )}

          {/* Scroll to Bottom Button */}
          {showScrollButton && scrolled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={handleScrollToBottom}
                    className="h-10 w-10 rounded-full shadow-lg mb-2"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Scroll to bottom</p>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Toggle Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="icon"
              onClick={() => setShowActions(!showActions)}
              className={cn(
                "h-12 w-12 rounded-full shadow-lg transition-transform duration-200",
                showActions && "rotate-45"
              )}
            >
              {showActions ? (
                <Plus className="h-5 w-5 rotate-45" />
              ) : (
                <ChevronUp className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{showActions ? "Close" : "Quick actions"}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export interface ScrollToBottomButtonProps {
  onClick: () => void;
  visible: boolean;
  unreadCount?: number;
  className?: string;
}

export function ScrollToBottomButton({
  onClick,
  visible,
  unreadCount,
  className,
}: ScrollToBottomButtonProps): React.ReactElement | null {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={cn("relative", className)}
    >
      <Button
        variant="secondary"
        size="sm"
        onClick={onClick}
        className="rounded-full shadow-lg px-4 h-9 gap-2"
      >
        <ArrowDown className="h-4 w-4" />
        <span className="text-xs">New messages</span>
      </Button>

      {unreadCount !== undefined && unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-accent-foreground text-xs font-medium flex items-center justify-center"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </motion.span>
      )}
    </motion.div>
  );
}
