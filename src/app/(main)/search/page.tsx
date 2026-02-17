"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, MessageSquare, ChevronRight, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/layout/app-header";
import { PageContainer } from "@/components/layout/page-container";
import { useAgentStore, useChatStore } from "@/stores";
import type { Conversation, Agent, ChatMessage } from "@/types/schemas";
import { formatDistanceToNow } from "date-fns";

interface SearchResult {
  type: "conversation" | "message";
  id: string;
  title: string;
  subtitle: string;
  agentId: string;
  agentName: string;
  conversationId: string;
  timestamp: Date;
  preview?: string;
}

/**
 * Search page
 * 
 * Features:
 * - Full-text search across all conversations
 * - Search in conversation titles and message content
 * - Real-time search results as you type
 * - Navigate to conversation or specific message
 * - Recent searches (optional)
 * - Empty state with helpful message
 */
export default function SearchPage(): React.ReactElement {
  const router = useRouter();
  const { agents, loadAgents } = useAgentStore();
  const { conversations, messages, loadConversations, loadMessages } = useChatStore();
  
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loadedMessages, setLoadedMessages] = useState<Set<string>>(new Set());

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      await loadAgents();
      // Load all conversations (no agentId)
      await loadConversations();
      setIsLoading(false);
    };
    loadData();

    // Load recent searches from localStorage
    const saved = typeof window !== "undefined" 
      ? localStorage.getItem("agentlink-recent-searches") 
      : null;
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, [loadAgents, loadConversations]);

  // Load messages for all conversations
  useEffect(() => {
    const loadAllMessages = async () => {
      const unloadedConversations = Array.from(conversations.values())
        .filter(c => !loadedMessages.has(c.id) && !messages.has(c.id));
      
      for (const conv of unloadedConversations) {
        await loadMessages(conv.id);
        setLoadedMessages(prev => new Set(prev).add(conv.id));
      }
    };
    
    if (conversations.size > 0) {
      loadAllMessages();
    }
  }, [conversations, loadMessages, loadedMessages, messages]);

  // Save recent searches
  const addRecentSearch = useCallback((term: string) => {
    if (!term.trim()) return;
    setRecentSearches((prev) => {
      const updated = [term, ...prev.filter((s) => s !== term)].slice(0, 5);
      if (typeof window !== "undefined") {
        localStorage.setItem("agentlink-recent-searches", JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  // Perform search
  const searchResults = useMemo<SearchResult[]>(() => {
    if (!query.trim() || query.length < 2) return [];

    const results: SearchResult[] = [];
    const searchTerm = query.toLowerCase();
    const agentsMap = new Map<string, Agent>();
    
    agents.forEach((agent) => agentsMap.set(agent.id, agent));

    // Search conversations
    conversations.forEach((conversation) => {
      const agent = agentsMap.get(conversation.agentId);
      if (!agent) return;

      // Match conversation title
      if (conversation.title?.toLowerCase().includes(searchTerm)) {
        results.push({
          type: "conversation",
          id: conversation.id,
          title: conversation.title || "Untitled Conversation",
          subtitle: `with ${agent.name}`,
          agentId: conversation.agentId,
          agentName: agent.name,
          conversationId: conversation.id,
          timestamp: new Date(conversation.updatedAt),
        });
      }

      // Search messages in this conversation
      const conversationMessages = messages.get(conversation.id) || [];
      conversationMessages.forEach((message) => {
        if (message.content.toLowerCase().includes(searchTerm)) {
          results.push({
            type: "message",
            id: message.id,
            title: message.role === "user" ? "You" : agent.name,
            subtitle: `in ${conversation.title || "Untitled"}`,
            agentId: conversation.agentId,
            agentName: agent.name,
            conversationId: conversation.id,
            timestamp: new Date(message.createdAt),
            preview: getPreviewSnippet(message.content, searchTerm),
          });
        }
      });
    });

    // Sort by timestamp (newest first)
    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [query, conversations, messages, agents]);

  const getPreviewSnippet = (text: string, term: string): string => {
    const index = text.toLowerCase().indexOf(term.toLowerCase());
    if (index === -1) return text.slice(0, 100);
    
    const start = Math.max(0, index - 30);
    const end = Math.min(text.length, index + term.length + 70);
    return (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "");
  };

  const handleSelectResult = (result: SearchResult): void => {
    addRecentSearch(query);
    router.push(`/agents/${result.agentId}/chat/${result.conversationId}`);
  };

  const handleRecentSearchClick = (term: string): void => {
    setQuery(term);
  };

  const clearRecentSearches = (): void => {
    setRecentSearches([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("agentlink-recent-searches");
    }
  };

  return (
    <div className="min-h-full flex flex-col">
      <AppHeader title="Search" />

      <PageContainer padBottom>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-3xl mx-auto w-full"
        >
          {/* Search Input */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search conversations and messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10 h-12 text-base"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Searches
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearRecentSearches}
                  className="text-xs h-auto py-1"
                >
                  Clear
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <Button
                    key={term}
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRecentSearchClick(term)}
                  >
                    {term}
                  </Button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Results */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : query.length >= 2 ? (
            <AnimatePresence mode="wait">
              {searchResults.length > 0 ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <p className="text-sm text-muted-foreground mb-3">
                    {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                  </p>
                  {searchResults.map((result, index) => (
                    <SearchResultCard
                      key={`${result.type}-${result.id}`}
                      result={result}
                      index={index}
                      onClick={() => handleSelectResult(result)}
                      searchTerm={query}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center py-12"
                >
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No results found
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Try a different search term
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          ) : query.length > 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Type at least 2 characters to search</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Search Conversations
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Search across all your conversations and messages to find what you&apos;re looking for.
              </p>
            </motion.div>
          )}
        </motion.div>
      </PageContainer>
    </div>
  );
}

interface SearchResultCardProps {
  result: SearchResult;
  index: number;
  onClick: () => void;
  searchTerm: string;
}

function SearchResultCard({ result, index, onClick }: SearchResultCardProps): React.ReactElement {
  const timeAgo = formatDistanceToNow(result.timestamp, { addSuffix: true });

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
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <MessageSquare className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-foreground group-hover:text-accent transition-colors">
                  {result.title}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {result.agentName}
                </Badge>
                {result.type === "message" && (
                  <Badge variant="outline" className="text-xs">
                    Message
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {result.subtitle} • {timeAgo}
              </p>
              {result.preview && (
                <p className="text-sm text-foreground mt-2 line-clamp-2">
                  {result.preview}
                </p>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
