/**
 * Editor Commands Hook
 * 
 * Provides command history navigation (like terminal up/down arrows)
 * and command management for the rich text editor.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// Storage key for persisting command history
const COMMAND_HISTORY_KEY = 'agentlink:command-history';
const MAX_HISTORY_SIZE = 100;

export interface UseEditorCommandsOptions {
  /** Maximum number of commands to store in history */
  maxHistorySize?: number;
  /** Whether to persist history to localStorage */
  persistHistory?: boolean;
  /** Storage key for localStorage */
  storageKey?: string;
}

export interface UseEditorCommandsReturn {
  /** Array of command history (oldest first) */
  history: string[];
  /** Current position in history (-1 means not navigating history) */
  historyIndex: number;
  /** Add a command to history */
  addToHistory: (command: string) => void;
  /** Navigate history (up or down) */
  navigateHistory: (direction: 'up' | 'down') => string | undefined;
  /** Set the current draft text (for when user starts typing) */
  setDraft: (text: string) => void;
  /** Get the current draft text */
  draft: string;
  /** Reset history navigation */
  resetNavigation: () => void;
  /** Clear all history */
  clearHistory: () => void;
  /** Whether we can navigate up */
  canNavigateUp: boolean;
  /** Whether we can navigate down */
  canNavigateDown: boolean;
}

/**
 * Hook for managing editor command history
 * 
 * @example
 * const {
 *   history,
 *   navigateHistory,
 *   addToHistory,
 *   resetNavigation,
 * } = useEditorCommands({ persistHistory: true });
 * 
 * // On submit
 * addToHistory(inputValue);
 * 
 * // On key up
 * const previous = navigateHistory('up');
 * if (previous) setInput(previous);
 */
export function useEditorCommands(
  options: UseEditorCommandsOptions = {}
): UseEditorCommandsReturn {
  const {
    maxHistorySize = MAX_HISTORY_SIZE,
    persistHistory = true,
    storageKey = COMMAND_HISTORY_KEY,
  } = options;

  // History state
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [draft, setDraft] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Ref for tracking if we need to save draft
  const draftRef = useRef('');

  // Load persisted history on mount
  useEffect(() => {
    if (!persistHistory) {
      setIsInitialized(true);
      return;
    }

    if (typeof window === 'undefined') return;

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        // Validate it's an array of strings
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
          setHistory(parsed.slice(-maxHistorySize));
        }
      }
    } catch (error) {
      console.warn('Failed to load command history:', error);
    }

    setIsInitialized(true);
  }, [persistHistory, storageKey, maxHistorySize]);

  // Persist history when it changes
  useEffect(() => {
    if (!isInitialized || !persistHistory) return;
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(history));
    } catch (error) {
      console.warn('Failed to save command history:', error);
    }
  }, [history, isInitialized, persistHistory, storageKey]);

  /**
   * Add a command to history
   */
  const addToHistory = useCallback((command: string) => {
    const trimmed = command.trim();
    if (!trimmed) return;

    setHistory(prev => {
      // Don't add duplicate of the last command
      if (prev.length > 0 && prev[prev.length - 1] === trimmed) {
        return prev;
      }

      const newHistory = [...prev, trimmed];
      
      // Keep only the last N commands
      if (newHistory.length > maxHistorySize) {
        return newHistory.slice(-maxHistorySize);
      }

      return newHistory;
    });

    // Reset navigation when adding new command
    setHistoryIndex(-1);
    setDraft('');
    draftRef.current = '';
  }, [maxHistorySize]);

  /**
   * Navigate through command history
   * Returns the command at the new position, or undefined if at boundary
   */
  const navigateHistory = useCallback((direction: 'up' | 'down'): string | undefined => {
    if (history.length === 0) return undefined;

    let result: string | undefined;

    setHistoryIndex(prevIndex => {
      let newIndex: number;

      if (direction === 'up') {
        // Save current draft if starting navigation
        if (prevIndex === -1) {
          draftRef.current = draft;
        }
        newIndex = prevIndex === -1 ? history.length - 1 : Math.max(0, prevIndex - 1);
      } else {
        newIndex = prevIndex === -1 ? -1 : Math.min(history.length - 1, prevIndex + 1);
        
        // If we go past the end, return to draft
        if (newIndex === prevIndex && prevIndex === history.length - 1) {
          newIndex = -1; // Reset to draft mode
        }
      }

      // Calculate result
      if (newIndex === -1) {
        result = draftRef.current;
      } else {
        result = history[newIndex];
      }

      return newIndex;
    });

    return result;
  }, [history, draft]);

  /**
   * Set the current draft text
   */
  const setDraftValue = useCallback((text: string) => {
    setDraft(text);
    draftRef.current = text;
    
    // Reset history navigation when user types
    if (historyIndex !== -1) {
      setHistoryIndex(-1);
    }
  }, [historyIndex]);

  /**
   * Reset history navigation to start
   */
  const resetNavigation = useCallback(() => {
    setHistoryIndex(-1);
  }, []);

  /**
   * Clear all command history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
    setDraft('');
    draftRef.current = '';

    if (persistHistory && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(storageKey);
      } catch (error) {
        console.warn('Failed to clear command history:', error);
      }
    }
  }, [persistHistory, storageKey]);

  // Computed navigation states
  const canNavigateUp = history.length > 0 && (historyIndex === -1 || historyIndex > 0);
  const canNavigateDown = historyIndex !== -1;

  return {
    history,
    historyIndex,
    addToHistory,
    navigateHistory,
    setDraft: setDraftValue,
    draft,
    resetNavigation,
    clearHistory,
    canNavigateUp,
    canNavigateDown,
  };
}

/**
 * Hook for command suggestions/autocomplete
 * 
 * Provides filtered suggestions based on current input
 */
export interface UseCommandSuggestionsOptions {
  /** Available commands/suggestions */
  suggestions: string[];
  /** Current input value */
  input: string;
  /** Minimum characters before showing suggestions */
  minChars?: number;
  /** Maximum number of suggestions to show */
  maxSuggestions?: number;
}

export interface UseCommandSuggestionsReturn {
  /** Filtered suggestions matching current input */
  filteredSuggestions: string[];
  /** Currently selected suggestion index */
  selectedIndex: number;
  /** Select the next suggestion */
  selectNext: () => void;
  /** Select the previous suggestion */
  selectPrevious: () => void;
  /** Get the currently selected suggestion */
  getSelectedSuggestion: () => string | undefined;
  /** Reset selection */
  resetSelection: () => void;
  /** Whether suggestions should be visible */
  isVisible: boolean;
}

/**
 * Hook for command suggestions with keyboard navigation
 */
export function useCommandSuggestions(
  options: UseCommandSuggestionsOptions
): UseCommandSuggestionsReturn {
  const {
    suggestions,
    input,
    minChars = 1,
    maxSuggestions = 10,
  } = options;

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter suggestions based on input
  const filteredSuggestions = suggestions
    .filter(suggestion => {
      if (input.length < minChars) return false;
      return suggestion.toLowerCase().startsWith(input.toLowerCase());
    })
    .slice(0, maxSuggestions);

  // Reset selection when filtered suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [input]);

  const selectNext = useCallback(() => {
    setSelectedIndex(prev => 
      prev < filteredSuggestions.length - 1 ? prev + 1 : prev
    );
  }, [filteredSuggestions.length]);

  const selectPrevious = useCallback(() => {
    setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
  }, []);

  const getSelectedSuggestion = useCallback(() => {
    return filteredSuggestions[selectedIndex];
  }, [filteredSuggestions, selectedIndex]);

  const resetSelection = useCallback(() => {
    setSelectedIndex(0);
  }, []);

  const isVisible = filteredSuggestions.length > 0 && input.length >= minChars;

  return {
    filteredSuggestions,
    selectedIndex,
    selectNext,
    selectPrevious,
    getSelectedSuggestion,
    resetSelection,
    isVisible,
  };
}
