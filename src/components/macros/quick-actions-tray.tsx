/**
 * Quick Actions Tray Component
 * iMessage/Facebook Messenger-style macro drawer
 */

'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Star,
  History,
  Sparkles,
  GripVertical,
  Settings,
  Command,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Macro, MacroCategory } from '@/types/macros';
import { MACRO_CATEGORIES, MACRO_CATEGORY_LABELS } from '@/types/macros';
import { useMacroStore, useFavoriteMacros, useRecentMacros } from '@/stores/macro-store';
import { useMediaQuery } from '@/hooks/use-media-query';
import { MacroGrid } from './macro-grid';
import { CategoryTabs } from './category-tabs';
import { InlineSearch } from './macro-search';
import { MacroCreator } from './macro-creator';

// ============================================
// Types
// ============================================

export interface QuickActionsTrayProps {
  isOpen: boolean;
  onClose: () => void;
  onMacroSelect: (macro: Macro) => void;
  anchorRef?: React.RefObject<HTMLElement>;
  className?: string;
}

// ============================================
// Animation Variants
// ============================================

const trayVariants = {
  hidden: {
    y: '100%',
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn' as const,
    },
  },
};

const desktopTrayVariants = {
  hidden: {
    scale: 0.95,
    opacity: 0,
    y: 10,
  },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    y: 10,
    transition: {
      duration: 0.15,
    },
  },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

// ============================================
// Component
// ============================================

export function QuickActionsTray({
  isOpen,
  onClose,
  onMacroSelect,
  anchorRef,
  className,
}: QuickActionsTrayProps) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const trayRef = useRef<HTMLDivElement>(null);

  // Store state
  const {
    macros,
    favorites,
    searchQuery,
    activeCategory,
    isCreatorOpen,
    editingMacroId,
    setSearchQuery,
    setActiveCategory,
    toggleFavorite,
    setTrayOpen,
    openCreator,
    closeCreator,
  } = useMacroStore();

  // Computed state
  const favoriteMacros = useFavoriteMacros();
  const recentMacros = useRecentMacros(8);

  // Filter macros based on search and category
  const filteredMacros = useMemo(() => {
    let result = macros;

    // Filter by category
    if (activeCategory !== 'all') {
      result = result.filter((m) => m.category === activeCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [macros, activeCategory, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<MacroCategory | 'all', number> = {
      all: macros.length,
      system: 0,
      context: 0,
      prompts: 0,
      files: 0,
      tools: 0,
      custom: 0,
    };

    macros.forEach((m) => {
      counts[m.category]++;
    });

    return counts;
  }, [macros]);

  // Handle macro click
  const handleMacroClick = useCallback(
    (macro: Macro) => {
      onMacroSelect(macro);
      onClose();
    },
    [onMacroSelect, onClose]
  );

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback(
    (macro: Macro) => {
      toggleFavorite(macro.id);
    },
    [toggleFavorite]
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) {
        // Open tray on Cmd/Ctrl + K
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          setTrayOpen(true);
        }
        return;
      }

      // Close on Escape
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, setTrayOpen]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (trayRef.current && !trayRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const trayContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <h2 className="font-semibold text-foreground">Quick Actions</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => openCreator()}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <InlineSearch
          query={searchQuery}
          onQueryChange={setSearchQuery}
          className="w-full"
        />
      </div>

      {/* Category Tabs */}
      {!searchQuery && (
        <div className="px-4 pb-2">
          <CategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            counts={categoryCounts}
          />
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-6 py-4">
          {/* Favorites Section */}
          {!searchQuery && activeCategory === 'all' && favoriteMacros.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <h3 className="text-sm font-semibold text-foreground/80">
                  Favorites
                </h3>
              </div>
              <MacroGrid
                macros={favoriteMacros}
                onMacroClick={handleMacroClick}
                onMacroFavoriteToggle={handleFavoriteToggle}
                favorites={favorites}
                size="md"
                showLabels={true}
              />
            </section>
          )}

          {/* Recent Section */}
          {!searchQuery && activeCategory === 'all' && recentMacros.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground/80">
                  Recent
                </h3>
              </div>
              <MacroGrid
                macros={recentMacros}
                onMacroClick={handleMacroClick}
                onMacroFavoriteToggle={handleFavoriteToggle}
                favorites={favorites}
                size="sm"
                showLabels={true}
              />
            </section>
          )}

          {/* Separator if we have favorites or recent */}
          {(favoriteMacros.length > 0 || recentMacros.length > 0) &&
            !searchQuery &&
            activeCategory === 'all' && <Separator className="my-4" />}

          {/* All Macros Section */}
          <section>
            {(!searchQuery || activeCategory === 'all') && (
              <div className="flex items-center gap-2 mb-3">
                <Command className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground/80">
                  {searchQuery ? 'Search Results' : 'All Macros'}
                </h3>
              </div>
            )}
            <MacroGrid
              macros={filteredMacros}
              onMacroClick={handleMacroClick}
              onMacroFavoriteToggle={handleFavoriteToggle}
              favorites={favorites}
              size="md"
              showLabels={true}
              emptyMessage={
                searchQuery
                  ? 'No macros match your search'
                  : 'No macros in this category'
              }
            />
          </section>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/50 bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">⌘K</kbd> to open</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => openCreator()}
          >
            <Plus className="w-3 h-3 mr-1" />
            Create Macro
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={onClose}
            />

            {/* Tray */}
            <motion.div
              ref={trayRef}
              className={cn(
                'fixed z-50 bg-background shadow-2xl',
                'flex flex-col overflow-hidden',
                isMobile
                  ? 'inset-x-0 bottom-0 rounded-t-3xl max-h-[80vh]'
                  : 'bottom-20 left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] rounded-2xl max-h-[600px]',
                className
              )}
              variants={isMobile ? trayVariants : desktopTrayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Mobile Handle */}
              {isMobile && (
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>
              )}

              {trayContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Macro Creator Dialog */}
      <MacroCreator
        isOpen={isCreatorOpen}
        onClose={closeCreator}
        initialMacro={
          editingMacroId
            ? macros.find((m) => m.id === editingMacroId)
            : undefined
        }
      />
    </>
  );
}

// ============================================
// Quick Actions Button (for chat input)
// ============================================

export interface QuickActionsButtonProps {
  onClick: () => void;
  isOpen?: boolean;
  className?: string;
}

export function QuickActionsButton({
  onClick,
  isOpen = false,
  className,
}: QuickActionsButtonProps) {
  return (
    <motion.button
      className={cn(
        'relative flex items-center justify-center',
        'w-10 h-10 rounded-full',
        'bg-muted hover:bg-muted/80',
        'text-muted-foreground hover:text-foreground',
        'transition-colors duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        isOpen && 'bg-accent text-white hover:bg-accent/90',
        className
      )}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <Plus className="w-5 h-5" />
      </motion.div>
    </motion.button>
  );
}

// ============================================
// Macro Pills (horizontal scroll for quick access)
// ============================================

export interface MacroPillsProps {
  onMacroSelect: (macro: Macro) => void;
  className?: string;
}

export function MacroPills({ onMacroSelect, className }: MacroPillsProps) {
  const favoriteMacros = useFavoriteMacros();
  const recentMacros = useRecentMacros(4);

  // Combine favorites and recent, removing duplicates
  const pills = useMemo(() => {
    const seen = new Set<string>();
    const result: Macro[] = [];

    [...favoriteMacros, ...recentMacros].forEach((macro) => {
      if (!seen.has(macro.id)) {
        seen.add(macro.id);
        result.push(macro);
      }
    });

    return result.slice(0, 8);
  }, [favoriteMacros, recentMacros]);

  if (pills.length === 0) return null;

  return (
    <motion.div
      className={cn(
        'flex gap-2 overflow-x-auto pb-2 scrollbar-hide',
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {pills.map((macro) => (
        <motion.button
          key={macro.id}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
            'bg-muted/50 hover:bg-muted',
            'text-sm font-medium whitespace-nowrap',
            'transition-colors duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50'
          )}
          onClick={() => onMacroSelect(macro)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span>{macro.icon.charAt(0)}</span>
          <span>{macro.name}</span>
        </motion.button>
      ))}
    </motion.div>
  );
}
