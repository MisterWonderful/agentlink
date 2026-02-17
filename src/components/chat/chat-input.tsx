/**
 * Chat Input
 * 
 * Enhanced chat input component that uses the RichTextEditor
 * with markdown support, slash commands, mentions, and terminal-like features.
 * 
 * This component serves as a wrapper around RichTextEditor, providing
 * a simpler interface for the chat use case while maintaining all features.
 */

'use client';

import { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { RichTextEditor, type RichTextEditorRef } from '@/components/editor';

export interface ChatInputProps {
  /** Current input value */
  input: string;
  /** Callback when input changes */
  setInput: (value: string) => void;
  /** Callback when message is submitted */
  onSubmit: () => void;
  /** Whether loading (sending message) */
  isLoading?: boolean;
  /** Whether streaming response */
  isStreaming?: boolean;
  /** Callback to stop streaming */
  onStop?: () => void;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Maximum number of lines */
  maxLines?: number;
  /** Additional class name */
  className?: string;
  /** Agent ID for context-aware features */
  agentId?: string;
  /** Conversation ID */
  conversationId?: string;
}

/**
 * Chat Input Component
 * 
 * A simplified interface to the RichTextEditor for chat use cases.
 * Supports all markdown formatting, slash commands, and @ mentions.
 * 
 * @example
 * <ChatInput
 *   input={input}
 *   setInput={setInput}
 *   onSubmit={handleSubmit}
 *   isLoading={isLoading}
 *   isStreaming={isStreaming}
 *   onStop={stopStreaming}
 * />
 */
export function ChatInput({
  input,
  setInput,
  onSubmit,
  isLoading = false,
  isStreaming = false,
  onStop,
  disabled = false,
  placeholder = "Message...",
  maxLines = 6,
  className,
  agentId,
  conversationId,
}: ChatInputProps) {
  const editorRef = useRef<RichTextEditorRef>(null);

  // Handle submit with history tracking
  const handleSubmit = useCallback(() => {
    if (input.trim() && !isLoading && !disabled) {
      onSubmit();
    }
  }, [input, isLoading, disabled, onSubmit]);

  return (
    <div className={cn(
      "relative w-full",
      className
    )}>
      <RichTextEditor
        ref={editorRef}
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        placeholder={placeholder}
        disabled={disabled}
        maxHeight={maxLines * 24}
        isLoading={isLoading}
        isStreaming={isStreaming}
        onStop={onStop}
        agentId={agentId}
        conversationId={conversationId}
        // Enable all features
        enableFormatting={true}
        enableSlashCommands={true}
        enableMentions={true}
        enablePreview={true}
        enableHistory={true}
      />
    </div>
  );
}

export default ChatInput;
