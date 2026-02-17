"use client";

/**
 * Chat View Component (Terminal-Enhanced)
 * 
 * Main chat interface integrating:
 * - TokenizedMessage for streaming messages
 * - RichTextEditor for input
 * - FileDropZone wrapper for drag & drop
 * - QuickActionsTray integration
 * - Stream controls when streaming
 * - Token velocity indicator
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi,
  WifiOff,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentStore, useChatStore, useSettingsStore, useConnectionStore } from "@/stores";
import { useMacroStore } from "@/stores/macro-store";
import { useAgentChat } from "@/hooks/use-agent-chat";

// Terminal Components
import { TerminalHeader } from "@/components/terminal/terminal-header";
import { FileDropZone } from "@/components/files/file-drop-zone";
import { QuickActionsTray, QuickActionsButton } from "@/components/macros/quick-actions-tray";
import { StreamControls } from "@/components/stream/stream-controls";
import { TokenVelocityIndicator } from "@/components/stream/token-velocity-indicator";

// Chat Components
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { EmptyChatState } from "./empty-chat-state";
import { ConversationList } from "./conversation-list";
import { FileAttachmentList } from "@/components/files/file-attachment";

// File handling
import { storeFile, type StoredFile } from "@/lib/files/file-store";
import { createFileMetadata } from "@/lib/files/file-types";

// Types
import type { Macro } from "@/types/macros";
import { toast } from "sonner";

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
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<StoredFile[]>([]);

  // Get stores
  const agent = useAgentStore((state) => state.agents.get(agentId));
  const { showTimestamp } = useSettingsStore();
  const connectionStatus = useConnectionStore((state) => state.getStatus(agentId));
  const averageLatency = useConnectionStore((state) => state.getAverageLatency(agentId));
  
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

  // Get macro store
  const recordMacroUsage = useMacroStore((state) => state.recordUsage);

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
    tokensPerSecond,
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
      toast.error("Failed to create conversation");
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
            setAttachedFiles([]);
          }, 50);
        } catch (err) {
          console.error("Failed to create conversation:", err);
          toast.error("Failed to create conversation");
        }
      })();
    } else {
      handleSubmit();
      setAttachedFiles([]);
    }
  }, [conversationId, input, agentId, createConversation, handleSubmit]);

  // Handle file drop
  const handleFileDrop = useCallback(async (files: File[]) => {
    if (!conversationId) {
      toast.error("Please start a conversation first");
      return;
    }

    const newFiles: StoredFile[] = [];
    
    for (const file of files) {
      try {
        const storedFile = await storeFile(file, conversationId);
        newFiles.push(storedFile);
        toast.success(`Attached ${file.name}`);
      } catch (err) {
        console.error("Failed to store file:", err);
        toast.error(`Failed to attach ${file.name}`);
      }
    }

    setAttachedFiles((prev) => [...prev, ...newFiles]);
  }, [conversationId]);

  // Handle file removal
  const handleRemoveFile = useCallback((fileId: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  // Handle macro selection
  const handleMacroSelect = useCallback((macro: Macro) => {
    recordMacroUsage(macro.id);
    
    // Handle different macro types based on action type
    switch (macro.action.type) {
      case 'insert_text':
        const payload = macro.action.payload as { text?: string; position?: string };
        if (payload.text) {
          setInput(input + payload.text);
        }
        break;
      case 'run_command':
        toast.info(`Command: ${macro.name}`);
        break;
      case 'upload_file':
        toast.info(`File upload: ${macro.name}`);
        break;
      default:
        toast.info(`Macro: ${macro.name}`);
        break;
    }
    
    setIsTrayOpen(false);
  }, [recordMacroUsage, setInput]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K - Open quick actions
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsTrayOpen(true);
      }
      
      // Cmd/Ctrl + / - Toggle quick actions
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setIsTrayOpen((prev) => !prev);
      }
      
      // Escape - Close menus
      if (e.key === "Escape") {
        setIsTrayOpen(false);
        setShowSidebar(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

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
  const currentConversation = agentConversations.find((c) => c.id === conversationId);

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
      <FileDropZone
        onFilesDrop={handleFileDrop}
        accept={["image/*", ".pdf", ".py", ".js", ".ts", ".tsx", ".jsx", ".json", ".md"]}
        disabled={!conversationId}
        className="flex-1 flex flex-col min-w-0"
      >
        {/* Terminal Header */}
        <TerminalHeader
          agent={agent}
          connectionStatus={connectionStatus}
          latency={averageLatency}
          tokensPerSecond={tokensPerSecond || 0}
          isStreaming={isStreaming}
          conversationTitle={currentConversation?.title}
          onSettingsClick={() => router.push(`/agents/${agentId}/settings`)}
          onNewConversation={handleNewConversation}
          onBack={() => setShowSidebar(true)}
          onDelete={conversationId ? () => handleDeleteConversation(conversationId) : undefined}
          showBack={true}
        />

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
        <div className="border-t border-border/50 bg-surface/30 safe-bottom">
          {/* Attached Files */}
          {attachedFiles.length > 0 && (
            <div className="px-4 py-2 border-b border-border/30">
              <FileAttachmentList
                files={attachedFiles.map((f) => ({
                  ...createFileMetadata(new File([], f.name), conversationId || ""),
                  ...f,
                }))}
                onRemove={handleRemoveFile}
                compact
                maxVisible={4}
              />
            </div>
          )}

          {/* Stream Controls (when streaming) */}
          <AnimatePresence>
            {isStreaming && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 py-2 border-b border-border/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-xs text-muted-foreground">Generating...</span>
                </div>
                <div className="flex items-center gap-3">
                  {tokensPerSecond !== undefined && tokensPerSecond > 0 && (
                    <TokenVelocityIndicator
                      tokensPerSecond={tokensPerSecond}
                      totalTokens={0}
                      variant="compact"
                    />
                  )}
                  <StreamControls
                    isStreaming={isStreaming}
                    canPause={true}
                    canSkip={true}
                    speed="normal"
                    onPause={stop}
                    onResume={() => {}}
                    onSkip={stop}
                    onSpeedChange={() => {}}
                    size="sm"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input with Quick Actions */}
          <div className="p-4">
            <div className="relative flex items-end gap-2 max-w-4xl mx-auto">
              {/* Quick Actions Button */}
              <QuickActionsButton
                onClick={() => setIsTrayOpen(true)}
                isOpen={isTrayOpen}
              />

              {/* Chat Input */}
              <div className="flex-1">
                <ChatInput
                  input={input}
                  setInput={setInput}
                  onSubmit={handleSend}
                  isLoading={isLoading}
                  isStreaming={isStreaming}
                  onStop={stop}
                  disabled={connectionStatus === "offline"}
                  placeholder={`Message ${agent.name}...`}
                  agentId={agentId}
                  conversationId={conversationId}
                />
              </div>
            </div>

            {/* Keyboard hint */}
            <div className="mt-2 text-center">
              <p className="text-[10px] text-muted-foreground">
                Press <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">⌘K</kbd>
                {" for quick actions · "}
                Press <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">?</kbd>
                {" for help"}
              </p>
            </div>
          </div>
        </div>
      </FileDropZone>

      {/* Quick Actions Tray */}
      <QuickActionsTray
        isOpen={isTrayOpen}
        onClose={() => setIsTrayOpen(false)}
        onMacroSelect={handleMacroSelect}
      />
    </div>
  );
}
