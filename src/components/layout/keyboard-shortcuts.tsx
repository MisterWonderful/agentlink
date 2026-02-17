'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X, Command, CornerDownLeft, ArrowUp, ArrowDown, Slash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocalStorage } from '@/hooks/use-local-storage';

interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: 'navigation' | 'chat' | 'general';
}

/**
 * Keyboard shortcuts configuration
 */
const SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  { keys: ['g', 'a'], description: 'Go to Agents list', category: 'navigation' },
  { keys: ['g', 's'], description: 'Go to Settings', category: 'navigation' },
  { keys: ['g', 'h'], description: 'Go to Home', category: 'navigation' },
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'navigation' },
  
  // Chat
  { keys: ['Ctrl', 'Enter'], description: 'Send message', category: 'chat' },
  { keys: ['↑'], description: 'Edit last message', category: 'chat' },
  { keys: ['Esc'], description: 'Cancel / Close', category: 'chat' },
  { keys: ['Ctrl', '/'], description: 'Focus search', category: 'chat' },
  
  // General
  { keys: ['Ctrl', 'k'], description: 'Command palette', category: 'general' },
  { keys: ['Ctrl', 'Shift', 'p'], description: 'Toggle sidebar', category: 'general' },
  { keys: ['Ctrl', 'd'], description: 'Toggle dark mode', category: 'general' },
];

/**
 * Keyboard Shortcuts Component
 * 
 * Displays a help modal with all available keyboard shortcuts.
 * Can be triggered by pressing '?' or through the UI.
 */
export function KeyboardShortcuts(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [showHints, setShowHints] = useLocalStorage('agentlink-shortcut-hints', true);

  // Handle keyboard shortcut to open shortcuts modal
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger if user is typing in an input
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    // '?' opens shortcuts modal
    if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      setIsOpen(true);
    }

    // 'Escape' closes the modal
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const shortcutsByCategory = SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    chat: 'Chat',
    general: 'General',
  };

  return (
    <>
      {/* Keyboard Shortcut Hint Toast */}
      <AnimatePresence>
        {showHints && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 z-40 hidden md:block"
          >
            <div className="bg-surface border rounded-lg shadow-lg p-3 flex items-center gap-3">
              <Keyboard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">?</kbd> for shortcuts
              </span>
              <button
                onClick={() => setShowHints(false)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shortcuts Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {Object.entries(shortcutsByCategory).map(([category, shortcuts]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                  {categoryLabels[category]}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex} className="flex items-center">
                            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono min-w-[1.5rem] text-center">
                              {renderKey(key)}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="mx-1 text-muted-foreground">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowHints(!showHints);
              }}
            >
              {showHints ? 'Hide shortcut hints' : 'Show shortcut hints'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Render a key with icon if applicable
 */
function renderKey(key: string): React.ReactNode {
  switch (key) {
    case 'Ctrl':
      return (
        <span className="flex items-center gap-1">
          <Command className="h-3 w-3" />
          <span className="hidden sm:inline">Ctrl</span>
        </span>
      );
    case 'Enter':
      return (
        <span className="flex items-center">
          <CornerDownLeft className="h-3 w-3" />
        </span>
      );
    case '↑':
      return <ArrowUp className="h-3 w-3" />;
    case '↓':
      return <ArrowDown className="h-3 w-3" />;
    case '/':
      return <Slash className="h-3 w-3" />;
    default:
      return key;
  }
}

/**
 * Keyboard shortcut badge for inline display
 */
export function ShortcutBadge({ keys }: { keys: string[] }): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-0.5">
      {keys.map((key, index) => (
        <span key={index} className="flex items-center">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
            {key}
          </kbd>
          {index < keys.length - 1 && (
            <span className="mx-0.5 text-muted-foreground">+</span>
          )}
        </span>
      ))}
    </span>
  );
}

/**
 * Hook to register custom keyboard shortcuts
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean }
): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== key) return;

      if (modifiers?.ctrl && !event.ctrlKey && !event.metaKey) return;
      if (modifiers?.shift && !event.shiftKey) return;
      if (modifiers?.alt && !event.altKey) return;

      // Don't trigger if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      event.preventDefault();
      callback();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, modifiers]);
}
