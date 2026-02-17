"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Send, MoreVertical, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppHeader } from "@/components/layout/app-header";
import { useAgentStore, useChatStore, useSettingsStore } from "@/stores";
import { MessageList } from "@/components/chat/message-list";
import type { ChatMessageInput } from "@/types/schemas";
import { cn } from "@/lib/utils";

interface ConversationPageProps {
  params: Promise<{
    id: string;
    conversationId: string;
  }>;
}

/**
 * Conversation page - active chat interface
 * 
 * Features:
 * - Full-screen chat interface on mobile
 * - Message list with scroll-to-bottom
 * - Message input with auto-resize textarea
 * - Send with Enter (configurable), Shift+Enter for new line
 * - Message options (delete conversation)
 * - Responsive design with safe area support
 */
export default function ConversationPage({ params }: ConversationPageProps): React.JSX.Element {
  const router = useRouter();
  const { id, conversationId } = use(params);
  const { agents, loadAgents } = useAgentStore();
  const {
    conversations,
    messages,
    addMessage,
    setActiveConversation,
    loadConversations,
    loadMessages,
    deleteConversation,
  } = useChatStore();
  const { enterToSend, hapticFeedback } = useSettingsStore();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load data on mount
  useEffect(() => {
    loadAgents();
    loadConversations(id);
    loadMessages(conversationId);
    setActiveConversation(conversationId);

    return () => {
      setActiveConversation(null);
    };
  }, [loadAgents, loadConversations, loadMessages, setActiveConversation, id, conversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, conversationId]);

  const agent = agents.get(id);
  const conversation = conversations.get(conversationId);
  const conversationMessages = messages.get(conversationId) || [];

  const handleSend = useCallback(async (): Promise<void> => {
    if (!input.trim() || isLoading || !agent) return;

    const trimmedInput = input.trim();
    setInput("");
    
    // Haptic feedback
    if (hapticFeedback && "vibrate" in navigator) {
      navigator.vibrate(15);
    }

    const messageInput: Omit<ChatMessageInput, "conversationId"> = {
      role: "user",
      content: trimmedInput,
      status: "sending",
      parts: [{ type: "text", content: trimmedInput }],
    };

    await addMessage(conversationId, messageInput);
    setIsLoading(true);

    // TODO: Replace with actual streaming via Vercel AI SDK
    setTimeout(async () => {
      await addMessage(conversationId, {
        role: "assistant",
        content: "This is a placeholder response. The actual chat implementation will use the Vercel AI SDK with streaming support.",
        status: "sent",
        parts: [{ type: "text", content: "This is a placeholder response. The actual chat implementation will use the Vercel AI SDK with streaming support." }],
      });
      setIsLoading(false);
    }, 1000);
  }, [input, isLoading, agent, conversationId, addMessage, hapticFeedback]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === "Enter" && !e.shiftKey && enterToSend) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (confirm("Delete this conversation?")) {
      await deleteConversation(conversationId);
      router.push(`/agents/${id}/chat`);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  if (!agent || !conversation) {
    return (
      <div className="min-h-full flex flex-col">
        <AppHeader
          title="Conversation Not Found"
          showBack
          onBack={() => router.push(`/agents/${id}/chat`)}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground mb-2">
              Conversation Not Found
            </h1>
            <Button onClick={() => router.push(`/agents/${id}/chat`)}>
              Back to Conversations
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface safe-top shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/agents/${id}/chat`)}
          className="shrink-0 -ml-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-foreground truncate">
            {conversation.title || "New Conversation"}
          </h1>
          <p className="text-xs text-muted-foreground truncate">
            {agent.name}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {/* TODO: Rename */}}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-error focus:text-error"
              onClick={handleDelete}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4 scrollbar-dark">
        {conversationMessages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <p className="text-muted-foreground">
              Send a message to start chatting with {agent.name}
            </p>
          </motion.div>
        ) : (
          <MessageList 
            messages={conversationMessages} 
            isStreaming={isLoading}
            agentColor={agent.accentColor}
            agentName={agent.name}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 border-t border-border bg-surface safe-bottom shrink-0"
      >
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agent.name}...`}
            className="min-h-[44px] max-h-[200px] resize-none bg-background"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={cn(
              "shrink-0 transition-all",
              input.trim() && !isLoading && "scale-100"
            )}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {enterToSend ? "Press Enter to send, Shift+Enter for new line" : "Press Ctrl+Enter to send"}
        </p>
      </motion.div>
    </div>
  );
}
