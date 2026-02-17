"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquare, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/layout/app-header";
import { PageContainer } from "@/components/layout/page-container";
import { useAgentStore, useChatStore } from "@/stores";
import type { Conversation } from "@/types/schemas";
import { formatDistanceToNow } from "date-fns";

interface AgentChatPageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Agent chat page - list of conversations for an agent
 * 
 * Features:
 * - Display all conversations for the selected agent
 * - Create new conversation
 * - View conversation history with timestamps
 * - Quick navigation to specific conversations
 * - Responsive design with mobile-first approach
 */
export default function AgentChatPage({ params }: AgentChatPageProps): React.JSX.Element {
  const router = useRouter();
  const { id } = use(params);
  const { agents, loadAgents } = useAgentStore();
  const { conversations, setActiveConversation, createConversation, loadConversations } = useChatStore();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadAgents();
    loadConversations(id);
  }, [loadAgents, loadConversations, id]);

  const agent = agents.get(id);

  if (!agent) {
    return (
      <div className="min-h-full flex flex-col">
        <AppHeader title="Agent Not Found" showBack onBack={() => router.push("/agents")} />
        <PageContainer centered>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <h1 className="text-xl font-semibold text-foreground mb-2">
              Agent Not Found
            </h1>
            <Button onClick={() => router.push("/agents")}>Back to Agents</Button>
          </motion.div>
        </PageContainer>
      </div>
    );
  }

  const agentConversations = Array.from(conversations.values())
    .filter((c) => c.agentId === id)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const handleNewConversation = async (): Promise<void> => {
    setIsCreating(true);
    try {
      const conversation = await createConversation(agent.id, `Chat with ${agent.name}`);
      setActiveConversation(conversation.id);
      router.push(`/agents/${agent.id}/chat/${conversation.id}`);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      setIsCreating(false);
    }
  };

  const handleSelectConversation = (conversationId: string): void => {
    setActiveConversation(conversationId);
    router.push(`/agents/${agent.id}/chat/${conversationId}`);
  };

  return (
    <div className="min-h-full flex flex-col">
      <AppHeader
        title={agent.name}
        subtitle={`${agentConversations.length} conversation${agentConversations.length !== 1 ? "s" : ""}`}
        showBack
        onBack={() => router.back()}
        rightContent={
          <Button
            size="sm"
            onClick={handleNewConversation}
            disabled={isCreating}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New</span>
          </Button>
        }
      />

      <PageContainer padBottom className="flex-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-3xl mx-auto w-full"
        >
          {agentConversations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                No conversations yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Start a new conversation with {agent.name} to begin chatting.
              </p>
              <Button onClick={handleNewConversation} disabled={isCreating} className="gap-2">
                <Plus className="h-4 w-4" />
                {isCreating ? "Creating..." : "Start Conversation"}
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {agentConversations.map((conversation, index) => (
                  <ConversationCard
                    key={conversation.id}
                    conversation={conversation}
                    index={index}
                    onClick={() => handleSelectConversation(conversation.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </PageContainer>
    </div>
  );
}

interface ConversationCardProps {
  conversation: Conversation;
  index: number;
  onClick: () => void;
}

function ConversationCard({ conversation, index, onClick }: ConversationCardProps): React.JSX.Element {
  const timeAgo = formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true });
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
    >
      <Card
        className="cursor-pointer hover:border-accent transition-colors group"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate group-hover:text-accent transition-colors">
                {conversation.title || "Untitled Conversation"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {conversation.messageCount} message{conversation.messageCount !== 1 ? "s" : ""} • {timeAgo}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors ml-2" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
