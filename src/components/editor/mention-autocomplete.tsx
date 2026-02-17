/**
 * Mention Autocomplete
 * 
 * Discord-like @ mention system for referencing agents, files, context,
 * and variables in the editor.
 */

'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  FileText,
  MessageSquare,
  Variable,
  Hash,
  Clock,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Mention suggestion types
 */
export type MentionType = 'agent' | 'file' | 'context' | 'variable' | 'channel';

/**
 * Mention suggestion item
 */
export interface MentionSuggestion {
  id: string;
  type: MentionType;
  name: string;
  description?: string;
  icon?: string;
  avatar?: string;
  metadata?: Record<string, unknown>;
}

// Icon mapping for mention types
const typeIconMap: Record<MentionType, LucideIcon> = {
  agent: Bot,
  file: FileText,
  context: MessageSquare,
  variable: Variable,
  channel: Hash,
};

// Default color schemes for types
const typeColors: Record<MentionType, { bg: string; text: string; border: string }> = {
  agent: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
  file: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
  context: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
  variable: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20' },
  channel: { bg: 'bg-pink-500/10', text: 'text-pink-500', border: 'border-pink-500/20' },
};

// Default mention suggestions
export const defaultMentionSuggestions: MentionSuggestion[] = [
  // Special context references
  {
    id: 'last',
    type: 'context',
    name: 'last',
    description: 'Reference the last message',
    icon: 'Clock',
  },
  {
    id: 'all',
    type: 'context',
    name: 'all',
    description: 'Reference all previous context',
    icon: 'MessageSquare',
  },
  {
    id: 'system',
    type: 'context',
    name: 'system',
    description: 'Reference system instructions',
    icon: 'Variable',
  },
  
  // Variables
  {
    id: 'date',
    type: 'variable',
    name: 'date',
    description: 'Current date',
  },
  {
    id: 'time',
    type: 'variable',
    name: 'time',
    description: 'Current time',
  },
  {
    id: 'datetime',
    type: 'variable',
    name: 'datetime',
    description: 'Current date and time',
  },
];

export interface MentionAutocompleteProps {
  /** Whether the menu is open */
  isOpen: boolean;
  /** Current search query (without the @) */
  query: string;
  /** Callback when a mention is selected */
  onSelect: (suggestion: MentionSuggestion) => void;
  /** Callback when the menu should close */
  onClose: () => void;
  /** Available suggestions */
  suggestions?: MentionSuggestion[];
  /** Loading state */
  isLoading?: boolean;
  /** Position offset */
  position?: { top: number; left: number };
}

/**
 * Mention Autocomplete Component
 * 
 * Displays a searchable list of @ mentions with keyboard navigation.
 */
export function MentionAutocomplete({
  isOpen,
  query,
  onSelect,
  onClose,
  suggestions = [],
  isLoading = false,
  position,
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Combine default and custom suggestions
  const allSuggestions = useMemo(() => {
    return [...defaultMentionSuggestions, ...suggestions];
  }, [suggestions]);

  // Filter suggestions based on query
  const filteredSuggestions = useMemo(() => {
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) return allSuggestions;
    
    return allSuggestions.filter(suggestion =>
      suggestion.name.toLowerCase().includes(searchTerm) ||
      suggestion.description?.toLowerCase().includes(searchTerm) ||
      suggestion.type.toLowerCase().includes(searchTerm)
    );
  }, [allSuggestions, query]);

  // Group suggestions by type
  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, MentionSuggestion[]> = {
      agent: [],
      file: [],
      context: [],
      variable: [],
      channel: [],
    };

    filteredSuggestions.forEach(suggestion => {
      groups[suggestion.type].push(suggestion);
    });

    return groups;
  }, [filteredSuggestions]);

  const typeLabels: Record<string, string> = {
    agent: 'Agents',
    file: 'Files',
    context: 'Context',
    variable: 'Variables',
    channel: 'Channels',
  };

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (filteredSuggestions[selectedIndex]) {
          onSelect(filteredSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [isOpen, filteredSuggestions, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = itemRefs.current[selectedIndex];
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let globalIndex = 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "absolute z-50 w-72 max-h-80 overflow-hidden",
            "bg-popover border border-border rounded-xl shadow-xl",
            "flex flex-col"
          )}
          style={position ? { top: position.top, left: position.left } : undefined}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-border/50 bg-muted/30 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {query ? `Mentions matching "@${query}"` : 'Mention someone or something'}
            </span>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="p-4 text-center">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs text-muted-foreground">Loading mentions...</span>
            </div>
          )}

          {/* Suggestions list */}
          {!isLoading && filteredSuggestions.length > 0 && (
            <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
              {Object.entries(groupedSuggestions).map(([type, typeSuggestions]) => {
                if (typeSuggestions.length === 0) return null;

                return (
                  <div key={type} className="mb-2 last:mb-0">
                    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      {(() => {
                        const Icon = typeIconMap[type as MentionType];
                        return <Icon className="w-3 h-3" />;
                      })()}
                      {typeLabels[type]}
                    </div>
                    {typeSuggestions.map((suggestion) => {
                      const index = globalIndex++;
                      const isSelected = index === selectedIndex;
                      const colors = typeColors[suggestion.type];
                      const Icon = typeIconMap[suggestion.type];

                      return (
                        <button
                          key={`${suggestion.type}-${suggestion.id}`}
                          ref={el => { itemRefs.current[index] = el; }}
                          onClick={() => onSelect(suggestion)}
                          className={cn(
                            "w-full px-3 py-2 flex items-center gap-3 text-left",
                            "hover:bg-accent/50 transition-colors",
                            "focus:outline-none focus:bg-accent",
                            isSelected && "bg-accent"
                          )}
                        >
                          {/* Icon/Avatar */}
                          <div className={cn(
                            "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                            colors.bg, colors.border, "border"
                          )}>
                            {suggestion.avatar ? (
                              <img 
                                src={suggestion.avatar} 
                                alt={suggestion.name}
                                className="w-6 h-6 rounded"
                              />
                            ) : (
                              <Icon className={cn("w-4 h-4", colors.text)} />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                @{suggestion.name}
                              </span>
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-medium",
                                colors.bg, colors.text
                              )}>
                                {suggestion.type}
                              </span>
                            </div>
                            {suggestion.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {suggestion.description}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && filteredSuggestions.length === 0 && (
            <div className="p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Search className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No mentions found for &quot;@{query}&quot;
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Try a different search term
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="px-3 py-2 border-t border-border/50 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-muted rounded border border-border/50">↑↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-muted rounded border border-border/50">↵</kbd>
                <span>Select</span>
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded border border-border/50">esc</kbd>
              <span>Close</span>
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Parse mention text and extract mention references
 */
export function parseMentions(text: string): Array<{ type: MentionType; id: string; name: string }> {
  const mentions: Array<{ type: MentionType; id: string; name: string }> = [];
  const mentionRegex = /@(agent|file|context|variable|channel):([^\s]+)/g;
  
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      type: match[1] as MentionType,
      id: match[2],
      name: match[2],
    });
  }

  // Also match simple @name mentions
  const simpleMentionRegex = /@([a-zA-Z][a-zA-Z0-9_-]*)/g;
  while ((match = simpleMentionRegex.exec(text)) !== null) {
    // Skip if already matched by the typed version
    if (!mentions.some(m => m.name === match![1])) {
      mentions.push({
        type: 'context',
        id: match[1],
        name: match[1],
      });
    }
  }

  return mentions;
}

/**
 * Format a mention for display
 */
export function formatMention(suggestion: MentionSuggestion): string {
  return `@${suggestion.type}:${suggestion.name}`;
}

/**
 * Hook for mention autocomplete state management
 */
export interface UseMentionAutocompleteOptions {
  onMentionSelect?: (suggestion: MentionSuggestion) => void;
  suggestions?: MentionSuggestion[];
  fetchSuggestions?: (query: string) => Promise<MentionSuggestion[]>;
}

export interface UseMentionAutocompleteReturn {
  isOpen: boolean;
  query: string;
  suggestions: MentionSuggestion[];
  isLoading: boolean;
  open: () => void;
  close: () => void;
  setQuery: (query: string) => void;
  handleMentionInput: (text: string, cursorPosition: number) => void;
  refreshSuggestions: (query: string) => Promise<void>;
  MenuComponent: React.FC<Omit<MentionAutocompleteProps, 'isOpen' | 'query' | 'suggestions' | 'isLoading'>>;
}

/**
 * Hook for mention autocomplete state management
 */
export function useMentionAutocomplete(
  options: UseMentionAutocompleteOptions = {}
): UseMentionAutocompleteReturn {
  const { 
    onMentionSelect, 
    suggestions: staticSuggestions = [],
    fetchSuggestions 
  } = options;
  
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dynamicSuggestions, setDynamicSuggestions] = useState<MentionSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const allSuggestions = useMemo(() => {
    return [...staticSuggestions, ...dynamicSuggestions];
  }, [staticSuggestions, dynamicSuggestions]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setDynamicSuggestions([]);
  }, []);

  const refreshSuggestions = useCallback(async (searchQuery: string) => {
    if (!fetchSuggestions) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    try {
      const results = await fetchSuggestions(searchQuery);
      if (!controller.signal.aborted) {
        setDynamicSuggestions(results);
      }
    } catch {
      if (!controller.signal.aborted) {
        setDynamicSuggestions([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [fetchSuggestions]);

  const handleMentionInput = useCallback((text: string, cursorPosition: number) => {
    const beforeCursor = text.slice(0, cursorPosition);

    // Check if we're typing a mention
    const match = beforeCursor.match(/@([\w-]*)$/);

    if (match) {
      const newQuery = match[1];
      setQuery(newQuery);
      setIsOpen(true);
      
      // Fetch dynamic suggestions if available
      if (fetchSuggestions) {
        void refreshSuggestions(newQuery);
      }
    } else {
      close();
    }
  }, [close, fetchSuggestions, refreshSuggestions]);

  const MenuComponent = useCallback((props: Omit<MentionAutocompleteProps, 'isOpen' | 'query' | 'suggestions' | 'isLoading'>) => (
    <MentionAutocomplete
      isOpen={isOpen}
      query={query}
      suggestions={allSuggestions}
      isLoading={isLoading}
      {...props}
    />
  ), [isOpen, query, allSuggestions, isLoading]);

  return {
    isOpen,
    query,
    suggestions: allSuggestions,
    isLoading,
    open,
    close,
    setQuery,
    handleMentionInput,
    refreshSuggestions,
    MenuComponent,
  };
}
