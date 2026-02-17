"use client";

/**
 * Conversation Page - Terminal-Enhanced
 * 
 * Main chat page with all terminal integrations:
 * - Terminal header
 * - Enhanced chat view with TokenizedMessage
 * - File drop zone
 * - Quick actions tray
 * - Stream controls
 */

import { use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TerminalContainer } from "@/components/terminal/terminal-container";
import { useAgentStore, useChatStore } from "@/stores";
import { toast } from "sonner";

interface ConversationPageProps {
  params: Promise<{
    id: string;
    conversationId: string;
  }>;
}

/**
 * Conversation page - active chat interface with terminal enhancements
 */
export default function ConversationPage({ params }: ConversationPageProps) {
  const router = useRouter();
  const { id, conversationId } = use(params);
  
  // Get store actions for conversation management
  const { deleteConversation } = useChatStore();
  const agent = useAgentStore((state) => state.agents.get(id));

  // Handle conversation deletion with confirmation
  const handleDeleteConversation = useCallback(async () => {
    if (!confirm("Delete this conversation? This cannot be undone.")) {
      return;
    }

    try {
      await deleteConversation(conversationId);
      toast.success("Conversation deleted");
      router.push(`/agents/${id}/chat`);
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      toast.error("Failed to delete conversation");
    }
  }, [conversationId, deleteConversation, id, router]);

  // If agent doesn't exist, show error state
  if (!agent) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Agent Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The agent you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <TerminalContainer
        agentId={id}
        conversationId={conversationId}
        className="flex-1"
      />
    </div>
  );
}
