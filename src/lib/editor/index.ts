/**
 * Editor Utilities
 * 
 * Markdown manipulation, shortcuts, and editor helpers.
 */

// Markdown utilities
export {
  insertMarkdown,
  insertMarkdownBlock,
  getWordAtCursor,
  getLineAtCursor,
  isInsideCodeBlock,
  getCodeBlockLanguage,
  getSlashCommandQuery,
  getMentionQuery,
  replaceWordAtCursor,
  countLines,
  countCharacters,
  getLineColumn,
  isAtLineStart,
  isAtLineEnd,
  toggleMarkdown,
  escapeMarkdown,
  unescapeMarkdown,
} from './markdown-utils';
export type {
  TextSelection,
  InsertMarkdownResult,
} from './markdown-utils';

// Keyboard shortcuts
export {
  editorShortcuts,
  isMac,
  getModifierKeyName,
  formatShortcut,
  matchesShortcut,
  useEditorShortcuts,
  useElementShortcuts,
  createShortcutLabel,
} from './shortcuts';
export type {
  Shortcut,
  ShortcutKey,
  ShortcutHandlers,
} from './shortcuts';
