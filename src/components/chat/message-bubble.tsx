"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, MessagePart } from "@/types/schemas";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CodeBlock } from "./code-block";
import { ReasoningBlock } from "./reasoning-block";
import { MessageActions } from "./message-actions";

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
    const language = match ? match[1] : "text";
    const code = String(children).replace(/\n$/, "");

    if (!inline && code) {
      return <CodeBlock code={code} language={language} />;
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
}: MessageBubbleProps) {
  const [showMessageActions, setShowMessageActions] = useState(false);

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
              {textContent ? (
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

              {/* Streaming cursor */}
              {isStreaming && textContent && (
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
              showRegenerate={!isStreaming}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
