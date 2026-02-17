"use client";

/**
 * Message Bubble Component (Terminal-Enhanced)
 * 
 * Enhanced with:
 * - TokenizedMessage support when streaming
 * - File attachments display
 * - Better code block rendering with AnimatedCodeBlock
 * - Message actions with animations
 */

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, MessagePart } from "@/types/schemas";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CodeBlock } from "./code-block";
import { AnimatedCodeBlock } from "@/components/stream/animated-code-block";
import { ReasoningBlock } from "./reasoning-block";
import { MessageActions } from "./message-actions";
import { TokenizedMessage } from "@/components/stream/tokenized-message";
import { FileAttachmentGrid } from "@/components/files/file-attachment";
import type { FileMetadata } from "@/lib/files/file-types";

export interface MessageBubbleProps {
  message: ChatMessage;
  isUser: boolean;
  agentColor: string;
  isStreaming?: boolean;
  showActions?: boolean;
  agentName?: string;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
  className?: string;
  /** Whether to use tokenized streaming for this message */
  enableTokenizedStream?: boolean;
  /** Whether this is the last message in the conversation */
  isLastMessage?: boolean;
}

interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// Custom components for ReactMarkdown
const MarkdownComponents = {
  code: ({ inline, className, children, ...props }: CodeProps) => {
    const match = /language-(\w+)/.exec(className || "");
    const language = match ? match[1] : "";
    const code = String(children).replace(/\n$/, "");

    if (!inline && code) {
      return <AnimatedCodeBlock code={code} language={language} animateLines={false} />;
    }

    return (
      <code
        className={cn(
          "px-1.5 py-0.5 rounded-md bg-muted text-sm font-mono",
          className
        )}
        {...props}
      >
        {children}
      </code>
    );
  },
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 last:mb-0 list-disc pl-5 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 last:mb-0 list-decimal pl-5 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-lg font-semibold mb-3 mt-4 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-semibold mb-2 mt-3 first:mt-0">{children}</h3>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-accent/50 pl-4 italic text-muted-foreground my-3">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-border/50" />,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent hover:underline"
    >
      {children}
    </a>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-muted/50">{children}</thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-3 py-2 text-left font-medium border-b border-border">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-3 py-2 border-b border-border/50">{children}</td>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
};

export function MessageBubble({
  message,
  isUser,
  agentColor,
  isStreaming = false,
  showActions = true,
  agentName = "Assistant",
  onCopy,
  onRegenerate,
  onDelete,
  className,
  enableTokenizedStream = true,
  isLastMessage = false,
}: MessageBubbleProps) {
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Extract reasoning and text parts
  const { reasoningParts, textParts } = useMemo(() => {
    const reasoning: MessagePart[] = [];
    const text: MessagePart[] = [];

    message.parts?.forEach((part) => {
      if (part.type === "reasoning") {
        reasoning.push(part);
      } else if (part.type === "text") {
        text.push(part);
      }
    });

    // If no parts, treat content as text
    if (reasoning.length === 0 && text.length === 0 && message.content) {
      text.push({ type: "text", content: message.content });
    }

    return { reasoningParts: reasoning, textParts: text };
  }, [message.parts, message.content]);

  const handleCopy = useCallback(() => {
    const textToCopy = textParts.map((p) => p.content).join("\n");
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    onCopy?.();
  }, [textParts, onCopy]);

  // Combine all text content
  const textContent = textParts.map((p) => p.content).join("\n");
  const reasoningContent = reasoningParts.map((p) => p.content).join("\n");
  const hasReasoning = reasoningContent.length > 0;
  const hasContent = textContent.length > 0 || isStreaming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex gap-3 group",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
      onMouseEnter={() => setShowMessageActions(true)}
      onMouseLeave={() => setShowMessageActions(false)}
    >
      {/* Avatar */}
      <Avatar
        className={cn(
          "h-8 w-8 shrink-0 ring-2 ring-background",
          isUser ? "bg-accent" : "bg-muted"
        )}
        style={
          !isUser
            ? { backgroundColor: `${agentColor}20`, borderColor: agentColor }
            : undefined
        }
      >
        <AvatarFallback
          style={!isUser ? { color: agentColor } : undefined}
        >
          {isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col max-w-[85%] sm:max-w-[75%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Sender Name (only for assistant) */}
        {!isUser && (
          <span className="text-xs text-muted-foreground mb-1 px-1">
            {agentName}
          </span>
        )}

        {/* Reasoning Block */}
        {hasReasoning && (
          <div className={cn("w-full mb-2", isUser ? "max-w-md" : "")}>
            <ReasoningBlock
              content={reasoningContent}
              isStreaming={isStreaming}
              thinkingTimeMs={reasoningParts[0]?.thinkingTimeMs}
            />
          </div>
        )}

        {/* Main Message Bubble */}
        {(hasContent || !hasReasoning) && (
          <div
            className={cn(
              "relative",
              isUser
                ? "bg-accent text-accent-foreground rounded-2xl rounded-br-md"
                : "bg-surface border border-border rounded-2xl rounded-bl-md"
            )}
            style={
              isUser
                ? { backgroundColor: agentColor }
                : undefined
            }
          >
            <div className="px-4 py-3">
              {/* Use TokenizedMessage when streaming, otherwise static content */}
              {isStreaming && enableTokenizedStream && isLastMessage && !isUser ? (
                <TokenizedMessage
                  content={textContent}
                  isStreaming={true}
                  enableCursor
                  showVelocity
                  pauseOnHover
                  streamSpeed="normal"
                  className={cn(
                    "prose prose-sm max-w-none",
                    isUser && "prose-invert"
                  )}
                  role={isUser ? "user" : "assistant"}
                />
              ) : textContent ? (
                <div
                  className={cn(
                    "prose prose-sm max-w-none",
                    isUser && "prose-invert"
                  )}
                  style={isUser ? { color: "white" } : undefined}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={MarkdownComponents}
                  >
                    {textContent}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-h-[1.5em]">
                  {isStreaming && (
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="inline-block w-2 h-4 bg-current rounded-sm"
                    />
                  )}
                </div>
              )}

              {/* Streaming cursor for non-tokenized mode */}
              {isStreaming && textContent && (!enableTokenizedStream || isUser) && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: [0.4, 0, 0.2, 1] as const,
                  }}
                  className="inline-block w-0.5 h-4 bg-current ml-0.5 align-middle"
                />
              )}
            </div>
          </div>
        )}

        {/* Message Actions */}
        {showActions && !isUser && (
          <motion.div
            initial={false}
            animate={{
              opacity: showMessageActions || isStreaming ? 1 : 0,
              y: showMessageActions || isStreaming ? 0 : 5,
            }}
            transition={{ duration: 0.15 }}
            className="mt-1.5"
          >
            <MessageActions
              onCopy={handleCopy}
              onRegenerate={onRegenerate}
              onDelete={onDelete}
              showRegenerate={!isStreaming && !!onRegenerate}
            />
          </motion.div>
        )}

        {/* Copy feedback */}
        <AnimatePresence>
          {isCopied && (
            <motion.span
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[10px] text-muted-foreground mt-1"
            >
              Copied!
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/**
 * Compact message bubble for inline use
 */
export function MessageBubbleCompact({
  message,
  isUser,
  agentColor,
  className,
}: Omit<MessageBubbleProps, "agentName" | "onCopy" | "onRegenerate" | "onDelete">) {
  return (
    <div
      className={cn(
        "flex gap-2",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium",
          isUser ? "bg-accent text-accent-foreground" : "bg-muted"
        )}
        style={!isUser ? { backgroundColor: `${agentColor}20`, color: agentColor } : undefined}
      >
        {isUser ? "U" : "A"}
      </div>
      <div
        className={cn(
          "px-3 py-1.5 rounded-xl text-sm max-w-[80%]",
          isUser
            ? "bg-accent text-accent-foreground rounded-br-md"
            : "bg-surface border border-border rounded-bl-md"
        )}
        style={isUser ? { backgroundColor: agentColor } : undefined}
      >
        {message.content}
      </div>
    </div>
  );
}

export default MessageBubble;
