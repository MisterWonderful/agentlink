/**
 * Editor Shortcuts
 * 
 * Keyboard shortcuts configuration and hook for the rich text editor.
 * Provides platform-aware shortcuts (Ctrl vs Cmd) and a hook for handling them.
 */

import { useCallback, useEffect, useRef } from 'react';

/**
 * Shortcut definition
 */
export interface Shortcut {
  key: string;
  modifiers: readonly ('ctrl' | 'cmd' | 'shift' | 'alt')[];
  description?: string;
}

/**
 * Default editor shortcuts
 */
export const editorShortcuts = {
  // Navigation
  submit: { key: 'Enter', modifiers: [], description: 'Send message' },
  newLine: { key: 'Enter', modifiers: ['shift'], description: 'Insert new line' },
  
  // Formatting
  bold: { key: 'b', modifiers: ['ctrl', 'cmd'], description: 'Bold text' },
  italic: { key: 'i', modifiers: ['ctrl', 'cmd'], description: 'Italic text' },
  code: { key: 'e', modifiers: ['ctrl', 'cmd'], description: 'Inline code' },
  codeBlock: { key: 'e', modifiers: ['ctrl', 'cmd', 'shift'], description: 'Code block' },
  quote: { key: 'q', modifiers: ['ctrl', 'cmd'], description: 'Quote' },
  link: { key: 'k', modifiers: ['ctrl', 'cmd'], description: 'Insert link' },
  list: { key: 'l', modifiers: ['ctrl', 'cmd'], description: 'Bullet list' },
  orderedList: { key: 'l', modifiers: ['ctrl', 'cmd', 'shift'], description: 'Numbered list' },
  
  // Editor commands
  clear: { key: 'k', modifiers: ['ctrl', 'cmd', 'shift'], description: 'Clear chat' },
  undo: { key: 'z', modifiers: ['ctrl', 'cmd'], description: 'Undo' },
  redo: { key: 'z', modifiers: ['ctrl', 'cmd', 'shift'], description: 'Redo' },
  selectAll: { key: 'a', modifiers: ['ctrl', 'cmd'], description: 'Select all' },
  
  // History
  historyUp: { key: 'ArrowUp', modifiers: [], description: 'Previous command' },
  historyDown: { key: 'ArrowDown', modifiers: [], description: 'Next command' },
  
  // Autocomplete
  autocomplete: { key: 'Tab', modifiers: [], description: 'Accept suggestion' },
  autocompleteClose: { key: 'Escape', modifiers: [], description: 'Close suggestions' },
  
  // Menus
  slashMenu: { key: '/', modifiers: [], description: 'Open slash menu' },
  mentionMenu: { key: '@', modifiers: [], description: 'Open mention menu' },
  
  // Preview
  togglePreview: { key: 'p', modifiers: ['ctrl', 'cmd', 'shift'], description: 'Toggle preview' },
  
  // Accessibility
  focusEditor: { key: '/', modifiers: ['ctrl', 'cmd'], description: 'Focus editor' },
} as const;

/**
 * Type for shortcut keys
 */
export type ShortcutKey = keyof typeof editorShortcuts;

/**
 * Check if user is on Mac
 */
export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.platform.toLowerCase().includes('mac');
}

/**
 * Get the platform-specific modifier key name
 */
export function getModifierKeyName(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

/**
 * Format a shortcut for display
 */
export function formatShortcut(shortcut: Shortcut): string {
  const parts: string[] = [];
  
  if (shortcut.modifiers.includes('ctrl') || shortcut.modifiers.includes('cmd')) {
    parts.push(getModifierKeyName());
  }
  if (shortcut.modifiers.includes('shift')) {
    parts.push('Shift');
  }
  if (shortcut.modifiers.includes('alt')) {
    parts.push(isMac() ? '⌥' : 'Alt');
  }
  
  // Format the key
  let key = shortcut.key;
  if (key.startsWith('Arrow')) {
    key = key.replace('Arrow', '');
  }
  parts.push(key);
  
  return parts.join(' + ');
}

/**
 * Check if a keyboard event matches a shortcut
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: Shortcut
): boolean {
  const isMacPlatform = isMac();
  const key = event.key;
  
  // Check if key matches
  if (key !== shortcut.key) {
    return false;
  }
  
  // Check modifiers
  const hasCtrlOrCmd = event.ctrlKey || event.metaKey;
  const needsCtrlOrCmd = shortcut.modifiers.includes('ctrl') || shortcut.modifiers.includes('cmd');
  
  if (needsCtrlOrCmd !== hasCtrlOrCmd) {
    return false;
  }
  
  // Check shift
  const needsShift = shortcut.modifiers.includes('shift');
  if (needsShift !== event.shiftKey) {
    return false;
  }
  
  // Check alt
  const needsAlt = shortcut.modifiers.includes('alt');
  if (needsAlt !== event.altKey) {
    return false;
  }
  
  // On Mac, Cmd should be used instead of Ctrl for most shortcuts
  // But we allow both for compatibility
  if (isMacPlatform && shortcut.modifiers.includes('ctrl') && !event.ctrlKey && !event.metaKey) {
    return false;
  }
  
  return true;
}

/**
 * Handler callbacks for shortcuts
 */
export interface ShortcutHandlers {
  onSubmit?: () => void;
  onNewLine?: () => void;
  onBold?: () => void;
  onItalic?: () => void;
  onCode?: () => void;
  onCodeBlock?: () => void;
  onQuote?: () => void;
  onLink?: () => void;
  onList?: () => void;
  onOrderedList?: () => void;
  onClear?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSelectAll?: () => void;
  onHistoryUp?: () => void;
  onHistoryDown?: () => void;
  onAutocomplete?: () => void;
  onAutocompleteClose?: () => void;
  onSlashMenu?: () => void;
  onMentionMenu?: () => void;
  onTogglePreview?: () => void;
  onFocusEditor?: () => void;
}

/**
 * Hook for handling editor keyboard shortcuts
 */
export function useEditorShortcuts(
  handlers: ShortcutHandlers,
  options: {
    enabled?: boolean;
    preventDefault?: boolean;
  } = {}
): void {
  const { enabled = true, preventDefault = true } = options;
  const handlersRef = useRef(handlers);
  
  // Keep handlers ref up to date
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const currentHandlers = handlersRef.current;

    // Check each shortcut
    for (const [name, shortcutDef] of Object.entries(editorShortcuts)) {
      const shortcut = shortcutDef as unknown as Shortcut;
      if (matchesShortcut(event, shortcut)) {
        const handlerName = `on${name.charAt(0).toUpperCase() + name.slice(1)}` as keyof ShortcutHandlers;
        const handler = currentHandlers[handlerName];

        if (handler) {
          if (preventDefault) {
            event.preventDefault();
          }
          handler();
          return;
        }
      }
    }
  }, [enabled, preventDefault]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for handling shortcuts on a specific element
 */
export function useElementShortcuts(
  elementRef: React.RefObject<HTMLElement | null>,
  handlers: ShortcutHandlers,
  options: {
    enabled?: boolean;
    preventDefault?: boolean;
  } = {}
): void {
  const { enabled = true, preventDefault = true } = options;
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const handleKeyDown = useCallback((event: Event) => {
    if (!enabled) return;

    const keyboardEvent = event as KeyboardEvent;
    const currentHandlers = handlersRef.current;

    for (const [name, shortcut] of Object.entries(editorShortcuts)) {
      if (matchesShortcut(keyboardEvent, shortcut as Shortcut)) {
        const handlerName = `on${name.charAt(0).toUpperCase() + name.slice(1)}` as keyof ShortcutHandlers;
        const handler = currentHandlers[handlerName];

        if (handler) {
          if (preventDefault) {
            keyboardEvent.preventDefault();
          }
          handler();
          return;
        }
      }
    }
  }, [enabled, preventDefault]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('keydown', handleKeyDown);
    return () => element.removeEventListener('keydown', handleKeyDown);
  }, [elementRef, handleKeyDown]);
}

/**
 * Create a keyboard shortcut string for display in UI
 */
export function createShortcutLabel(...keys: string[]): string {
  const modifier = getModifierKeyName();
  return keys.map(k => k === 'mod' ? modifier : k).join(' ');
}
