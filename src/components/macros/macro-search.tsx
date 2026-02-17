/**
 * Macro Search Component
 * Search and filter macros with keyboard navigation
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Sparkles, Command } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type { Macro } from '@/types/macros';
import { MACRO_CATEGORY_LABELS } from '@/types/macros';

// ============================================
// Types
// ============================================

export interface MacroSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  results: Macro[];
  onResultSelect: (macro: Macro) => void;
  onClose?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  showResults?: boolean;
}

// ============================================
// Component
// ============================================

export function MacroSearch({
  query,
  onQueryChange,
  results,
  onResultSelect,
  onClose,
  placeholder = 'Search macros...',
  className,
  autoFocus = true,
  showResults = true,
}: MacroSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, results.length]);

  // Auto-focus input
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [autoFocus]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!results.length) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % results.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            onResultSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (query) {
            onQueryChange('');
          } else {
            onClose?.();
          }
          break;
      }
    },
    [results, selectedIndex, query, onQueryChange, onResultSelect, onClose]
  );

  const clearSearch = () => {
    onQueryChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5',
            'text-muted-foreground transition-colors',
            isFocused && 'text-accent'
          )}
        />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={cn(
            'pl-10 pr-10 py-3 h-12',
            'bg-muted/50 border-transparent',
            'focus:bg-background focus:border-accent/50',
            'text-base placeholder:text-muted-foreground/60',
            'transition-all duration-200'
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query ? (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={clearSearch}
              className={cn(
                'p-1 rounded-full',
                'text-muted-foreground hover:text-foreground',
                'hover:bg-muted transition-colors'
              )}
            >
              <X className="w-4 h-4" />
            </motion.button>
          ) : (
            <kbd
              className={cn(
                'hidden sm:flex items-center gap-0.5',
                'px-1.5 py-0.5 rounded text-[10px]',
                'bg-muted text-muted-foreground font-mono'
              )}
            >
              <Command className="w-3 h-3" />
              <span>K</span>
            </kbd>
          )}
        </div>
      </div>

      {/* Search Results */}
      <AnimatePresence>
        {showResults && query && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'absolute top-full left-0 right-0 mt-2 z-50',
              'bg-popover border border-border rounded-xl',
              'shadow-lg overflow-hidden'
            )}
          >
            {results.length > 0 ? (
              <div className="max-h-[300px] overflow-y-auto py-2">
                {results.map((macro, index) => (
                  <SearchResultItem
                    key={macro.id}
                    macro={macro}
                    query={query}
                    isSelected={index === selectedIndex}
                    onClick={() => onResultSelect(macro)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <Sparkles className="w-8 h-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No macros found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Try a different search term
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Search Result Item
// ============================================

interface SearchResultItemProps {
  macro: Macro;
  query: string;
  isSelected: boolean;
  onClick: () => void;
}

function SearchResultItem({
  macro,
  query,
  isSelected,
  onClick,
}: SearchResultItemProps) {
  // Highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={i}
          className="bg-accent/30 text-accent-foreground rounded px-0.5"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <motion.button
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3',
        'text-left transition-colors',
        'hover:bg-accent/5',
        isSelected && 'bg-accent/10'
      )}
      onClick={onClick}
      whileHover={{ x: 2 }}
    >
      {/* Icon placeholder */}
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center',
          'bg-muted text-foreground'
        )}
      >
        <span className="text-lg">
          {macro.icon.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {highlightMatch(macro.name, query)}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {macro.description}
        </p>
      </div>

      {/* Category Badge */}
      <span
        className={cn(
          'text-[10px] px-2 py-0.5 rounded-full',
          'bg-muted text-muted-foreground uppercase tracking-wider'
        )}
      >
        {MACRO_CATEGORY_LABELS[macro.category]}
      </span>

      {/* Shortcut */}
      {macro.shortcut && (
        <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground font-mono">
          {macro.shortcut}
        </kbd>
      )}
    </motion.button>
  );
}

// ============================================
// Inline Search (compact version for trays)
// ============================================

export interface InlineSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  className?: string;
}

export function InlineSearch({ query, onQueryChange, className }: InlineSearchProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search..."
        className={cn(
          'pl-9 pr-8 py-2 h-10',
          'bg-muted/50 border-0',
          'focus-visible:ring-1 focus-visible:ring-accent/50',
          'text-sm'
        )}
      />
      {query && (
        <button
          onClick={() => onQueryChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ============================================
// Search Highlight Component
// ============================================

export interface HighlightProps {
  text: string;
  query: string;
  className?: string;
}

export function Highlight({ text, query, className }: HighlightProps) {
  if (!query) return <span className={className}>{text}</span>;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="bg-accent/30 text-accent-foreground rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}
