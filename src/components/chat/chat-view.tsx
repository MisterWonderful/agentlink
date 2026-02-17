"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Wifi,
  WifiOff,
  AlertCircle,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentStore, useChatStore, useSettingsStore } from "@/stores";
import { useAgentChat } from "@/hooks/use-agent-chat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { EmptyChatState } from "./empty-chat-state";
import { ConversationList } from "./conversation-list";

export interface ChatViewProps {
  agentId: string;
  conversationId?: string;
  className?: string;
}

export function ChatView({
  agentId,
  conversationId: initialConversationId,
  className,
}: ChatViewProps) {
  const router = useRouter();
  const [showSidebar, setShowSidebar] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId
  );

  // Get stores
  const agent = useAgentStore((state) => state.agents.get(agentId));
  const { showTimestamp } = useSettingsStore();
  const {
    activeConversationId,
    setActiveConversation,
    deleteConversation,
    createConversation,
    loadConversations,
    loadMessages,
    updateConversation,
    getConversationsByAgent,
  } = useChatStore();

  // Get chat hook
  const {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    isStreaming,
    error,
    stop,
    reload,
    connectionStatus,
    queuedCount,
  } = useAgentChat({
    agentId,
    conversationId,
  });

  // Load conversations on mount
  useEffect(() => {
    void loadConversations(agentId);
  }, [agentId, loadConversations]);

  // Update active conversation
  useEffect(() => {
    if (conversationId) {
      setActiveConversation(conversationId);
      void loadMessages(conversationId);
    }
  }, [conversationId, setActiveConversation, loadMessages]);

  // Handle conversation selection
  const handleSelectConversation = useCallback(
    (id: string) => {
      setConversationId(id);
      setShowSidebar(false);
      router.push(`/agents/${agentId}/chat/${id}`);
    },
    [agentId, router]
  );

  // Handle new conversation
  const handleNewConversation = useCallback(async () => {
    try {
      const newConv = await createConversation(agentId, "New Chat");
      setConversationId(newConv.id);
      setShowSidebar(false);
      router.push(`/agents/${agentId}/chat/${newConv.id}`);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }, [agentId, createConversation, router]);

  // Handle delete conversation
  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      if (conversationId === id) {
        setConversationId(undefined);
        router.push(`/agents/${agentId}/chat`);
      }
    },
    [conversationId, agentId, deleteConversation, router]
  );

  // Handle pin/unpin
  const handlePinConversation = useCallback(
    async (id: string, isPinned: boolean) => {
      await updateConversation(id, { isPinned });
      void loadConversations(agentId);
    },
    [agentId, loadConversations, updateConversation]
  );

  // Handle regenerate
  const handleRegenerate = useCallback(() => {
    reload();
  }, [reload]);

  // Handle submit with conversation check
  const handleSend = useCallback(() => {
    if (!conversationId && input.trim()) {
      // Create conversation first, then send
      void (async () => {
        try {
          const newConv = await createConversation(agentId, input.slice(0, 50));
          setConversationId(newConv.id);
          // Small delay to let the conversation be set
          setTimeout(() => {
            handleSubmit();
          }, 50);
        } catch (err) {
          console.error("Failed to create conversation:", err);
        }
      })();
    } else {
      handleSubmit();
    }
  }, [conversationId, input, agentId, createConversation, handleSubmit]);

  // Loading state
  if (!agent) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const agentConversations = getConversationsByAgent(agentId);
  const hasMessages = messages.length > 0;

  return (
    <div className={cn("flex h-full", className)}>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-background border-r border-border z-50 lg:hidden"
            >
              <ConversationList
                conversations={agentConversations}
                activeConversationId={conversationId}
                onSelect={handleSelectConversation}
                onNew={handleNewConversation}
                onDelete={handleDeleteConversation}
                onPin={handlePinConversation}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-80 flex-col border-r border-border bg-surface/30">
        <ConversationList
          conversations={agentConversations}
          activeConversationId={conversationId}
          onSelect={handleSelectConversation}
          onNew={handleNewConversation}
          onDelete={handleDeleteConversation}
          onPin={handlePinConversation}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Back button (mobile) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(true)}
              className="lg:hidden h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            {/* Agent Info */}
            <div className="flex items-center gap-3">
              <Avatar
                className="h-8 w-8 ring-2 ring-background"
                style={{ backgroundColor: `${agent.accentColor}20` }}
              >
                {agent.avatarUrl && (
                  <AvatarImage src={agent.avatarUrl} alt={agent.name} />
                )}
                <AvatarFallback
                  style={{ color: agent.accentColor, fontSize: "14px" }}
                >
                  {agent.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <h1 className="font-medium text-sm truncate">{agent.name}</h1>
                <p className="text-xs text-muted-foreground truncate">
                  {agent.defaultModel || "Unknown Model"}
                </p>
              </div>
            </div>
          </div>

          {/* Status & Actions */}
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className="flex items-center gap-1.5">
              {connectionStatus === "online" ? (
                <Wifi className="h-4 w-4 text-success" />
              ) : connectionStatus === "offline" ? (
                <WifiOff className="h-4 w-4 text-error" />
              ) : (
                <AlertCircle className="h-4 w-4 text-warning" />
              )}
              {queuedCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {queuedCount} queued
                </Badge>
              )}
            </div>

            {/* More Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleNewConversation}>
                  New Conversation
                </DropdownMenuItem>
                {conversationId && (
                  <DropdownMenuItem
                    onClick={() => handleDeleteConversation(conversationId)}
                    className="text-error"
                  >
                    Delete Conversation
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-error/10 border-b border-error/20 px-4 py-2"
            >
              <p className="text-sm text-error flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error.message}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          {hasMessages ? (
            <MessageList
              messages={messages}
              isStreaming={isStreaming}
              agentColor={agent.accentColor}
              agentName={agent.name}
              showTimestamps={showTimestamp}
              onRegenerate={handleRegenerate}
            />
          ) : (
            <EmptyChatState
              agentName={agent.name}
              agentAvatar={agent.avatarUrl}
              agentColor={agent.accentColor}
              agentDescription={agent.systemPrompt?.slice(0, 100)}
              onSuggestionClick={(suggestion) => {
                setInput(suggestion);
                handleSend();
              }}
            />
          )}
        </div>

        {/* Input Area */}
        <ChatInput
          input={input}
          setInput={setInput}
          onSubmit={handleSend}
          isLoading={isLoading}
          isStreaming={isStreaming}
          onStop={stop}
          disabled={connectionStatus === "offline"}
          placeholder={`Message ${agent.name}...`}
        />
      </div>
    </div>
  );
}
