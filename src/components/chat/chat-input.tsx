"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Square,
  Paperclip,
  Mic,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isStreaming: boolean;
  onStop: () => void;
  disabled?: boolean;
  placeholder?: string;
  maxLines?: number;
  className?: string;
}

export function ChatInput({
  input,
  setInput,
  onSubmit,
  isLoading,
  isStreaming,
  onStop,
  disabled = false,
  placeholder = "Message...",
  maxLines = 6,
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [lineCount, setLineCount] = useState(1);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";

    // Calculate line height
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
    const maxHeight = lineHeight * maxLines;

    // Set new height (capped at maxLines)
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;

    // Update line count for styling
    const lines = input.split("\n").length;
    setLineCount(Math.min(lines, maxLines));
  }, [input, maxLines]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading && !disabled) {
        onSubmit();
      }
    }
  };

  // Handle file attachment click
  const handleAttachment = () => {
    // TODO: Implement file upload
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Handle file upload
        console.log("File selected:", file.name);
      }
    };
    input.click();
  };

  // Handle voice input
  const handleVoiceInput = () => {
    setIsRecording(!isRecording);
    // TODO: Implement voice recording
    if (!isRecording) {
      console.log("Started recording...");
    } else {
      console.log("Stopped recording");
    }
  };

  const isEmpty = input.trim().length === 0;
  const isSubmitDisabled = isEmpty || isLoading || disabled;

  return (
    <div
      className={cn(
        "relative flex items-end gap-2 p-3 bg-surface/50 backdrop-blur-sm border-t border-border/50",
        className
      )}
    >
      {/* Attachment Button */}
      <motion.div whileTap={{ scale: 0.9 }}>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAttachment}
          disabled={isStreaming}
          className="shrink-0 h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
      </motion.div>

      {/* Input Container */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isStreaming}
          rows={1}
          className={cn(
            "w-full resize-none bg-background border border-border rounded-2xl px-4 py-2.5",
            "text-sm text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "scrollbar-dark",
            lineCount > 1 ? "pr-10" : ""
          )}
          style={{
            minHeight: "44px",
            maxHeight: `${maxLines * 24}px`,
          }}
        />
      </div>

      {/* Voice Button (shown when empty) */}
      <AnimatePresence mode="wait">
        {isEmpty && !isStreaming && (
          <motion.div
            key="voice"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={handleVoiceInput}
              className={cn(
                "shrink-0 h-10 w-10 rounded-full",
                isRecording
                  ? "bg-error/20 text-error animate-pulse"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Mic className="h-5 w-5" />
            </Button>
          </motion.div>
        )}

        {/* Stop Button (shown during streaming) */}
        {isStreaming && (
          <motion.div
            key="stop"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              variant="destructive"
              size="icon"
              onClick={onStop}
              className="shrink-0 h-10 w-10 rounded-full shadow-lg"
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          </motion.div>
        )}

        {/* Send Button (shown when has content) */}
        {!isEmpty && !isStreaming && (
          <motion.div
            key="send"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              onClick={onSubmit}
              disabled={isSubmitDisabled}
              className={cn(
                "shrink-0 h-10 w-10 rounded-full p-0",
                "bg-accent hover:bg-accent/90 text-white",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "shadow-lg"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
