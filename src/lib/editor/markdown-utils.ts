/**
 * Markdown Utilities
 * 
 * A collection of functions for manipulating markdown text,
 * handling selections, and working with cursor positions.
 */

export interface TextSelection {
  start: number;
  end: number;
}

export interface InsertMarkdownResult {
  text: string;
  selection: TextSelection;
}

/**
 * Insert markdown formatting around or at cursor position
 * 
 * @param text - The current text content
 * @param selection - The current selection range
 * @param markdown - The markdown syntax to insert (e.g., '**' for bold)
 * @param wrap - Whether to wrap the selected text or insert at cursor
 * @returns Updated text and new selection position
 * 
 * @example
 * insertMarkdown('hello', { start: 0, end: 5 }, '**', true)
 * // Returns: { text: '**hello**', selection: { start: 7, end: 7 } }
 */
export function insertMarkdown(
  text: string,
  selection: TextSelection,
  markdown: string,
  wrap: boolean = true
): InsertMarkdownResult {
  const { start, end } = selection;
  const selectedText = text.slice(start, end);

  if (wrap && selectedText) {
    // Wrap selected text with markdown
    const before = text.slice(0, start);
    const after = text.slice(end);
    const wrapped = `${markdown}${selectedText}${markdown}`;
    const newText = `${before}${wrapped}${after}`;
    
    return {
      text: newText,
      selection: {
        start: start + markdown.length,
        end: end + markdown.length,
      },
    };
  } else {
    // Insert markdown at cursor (no selection)
    const before = text.slice(0, start);
    const after = text.slice(end);
    const newText = `${before}${markdown}${after}`;
    
    return {
      text: newText,
      selection: {
        start: start + markdown.length,
        end: start + markdown.length,
      },
    };
  }
}

/**
 * Insert a markdown block (like code blocks, tables)
 * 
 * @param text - Current text content
 * @param cursor - Cursor position
 * @param blockMarkdown - The block markdown to insert
 * @returns Updated text and cursor position inside the block
 */
export function insertMarkdownBlock(
  text: string,
  cursor: number,
  blockMarkdown: string
): InsertMarkdownResult {
  const before = text.slice(0, cursor);
  const after = text.slice(cursor);
  
  // Add newlines for clean insertion
  const prefix = before.length > 0 && !before.endsWith('\n') ? '\n\n' : '';
  const suffix = after.length > 0 && !after.startsWith('\n') ? '\n\n' : '';
  
  const newText = `${before}${prefix}${blockMarkdown}${suffix}${after}`;
  
  // Calculate cursor position inside the block
  const placeholderMatch = blockMarkdown.match(/\$\{cursor\}/);
  let newCursor: number;
  
  if (placeholderMatch) {
    // If there's a ${cursor} placeholder, position cursor there
    const placeholderIndex = blockMarkdown.indexOf('${cursor}');
    newCursor = before.length + prefix.length + placeholderIndex;
    // Remove the placeholder from the final text
    const cleanBlock = blockMarkdown.replace('${cursor}', '');
    const cleanText = `${before}${prefix}${cleanBlock}${suffix}${after}`;
    return {
      text: cleanText,
      selection: { start: newCursor, end: newCursor },
    };
  } else {
    // Position at end of block
    newCursor = before.length + prefix.length + blockMarkdown.length;
    return {
      text: newText,
      selection: { start: newCursor, end: newCursor },
    };
  }
}

/**
 * Get the word at the current cursor position
 * 
 * @param text - The text content
 * @param cursor - Cursor position
 * @returns The word at cursor position
 * 
 * @example
 * getWordAtCursor('hello world', 6) // 'world'
 * getWordAtCursor('hello @user mention', 9) // '@user'
 */
export function getWordAtCursor(text: string, cursor: number): string {
  if (!text || cursor < 0 || cursor > text.length) {
    return '';
  }

  // Find word boundaries
  const beforeCursor = text.slice(0, cursor);
  const afterCursor = text.slice(cursor);

  // Match word characters, including @ and # for mentions/tags
  const wordStartRegex = /[\w@#]*$/;
  const wordEndRegex = /^[\w@#]*/;

  const startMatch = beforeCursor.match(wordStartRegex);
  const endMatch = afterCursor.match(wordEndRegex);

  const start = startMatch ? startMatch[0] : '';
  const end = endMatch ? endMatch[0] : '';

  return start + end;
}

/**
 * Get the line at the current cursor position
 * 
 * @param text - The text content
 * @param cursor - Cursor position
 * @returns The current line text
 */
export function getLineAtCursor(text: string, cursor: number): string {
  if (!text) return '';

  const beforeCursor = text.slice(0, cursor);
  const afterCursor = text.slice(cursor);

  const lastNewline = beforeCursor.lastIndexOf('\n');
  const nextNewline = afterCursor.indexOf('\n');

  const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
  const lineEnd = nextNewline === -1 ? text.length : cursor + nextNewline;

  return text.slice(lineStart, lineEnd);
}

/**
 * Check if cursor is inside a code block
 * 
 * @param text - The text content
 * @param cursor - Cursor position
 * @returns Whether cursor is inside a code block
 */
export function isInsideCodeBlock(text: string, cursor: number): boolean {
  const beforeCursor = text.slice(0, cursor);
  
  // Count fenced code block markers (```)
  const codeBlockRegex = /```[\s\S]*?```/g;
  let match: RegExpExecArray | null;
  
  while ((match = codeBlockRegex.exec(beforeCursor)) !== null) {
    // If we found a complete code block before cursor
    if (match.index + match[0].length <= cursor) {
      // Check if there's an opening without closing after cursor
      const afterMatch = text.slice(match.index + match[0].length, cursor);
      const openingMatches = (afterMatch.match(/```/g) || []).length;
      if (openingMatches % 2 === 1) {
        return true;
      }
    }
  }
  
  // Check for unclosed code block
  const allCodeBlocks = beforeCursor.match(/```/g);
  if (allCodeBlocks && allCodeBlocks.length % 2 === 1) {
    return true;
  }
  
  return false;
}

/**
 * Get the current code block language if inside one
 * 
 * @param text - The text content
 * @param cursor - Cursor position
 * @returns The language identifier or null
 */
export function getCodeBlockLanguage(text: string, cursor: number): string | null {
  const beforeCursor = text.slice(0, cursor);
  
  // Find all code block starts
  const codeBlockStartRegex = /```(\w*)/g;
  let match: RegExpExecArray | null;
  let lastLanguage: string | null = null;
  let openBlocks = 0;
  
  while ((match = codeBlockStartRegex.exec(beforeCursor)) !== null) {
    openBlocks++;
    if (openBlocks % 2 === 1) {
      lastLanguage = match[1] || 'text';
    }
  }
  
  // Check if we're inside an open block
  if (openBlocks % 2 === 1) {
    return lastLanguage;
  }
  
  return null;
}

/**
 * Detect if text is a slash command query
 * 
 * @param text - The text content
 * @param cursor - Cursor position
 * @returns The command query (without /) or null
 */
export function getSlashCommandQuery(text: string, cursor: number): string | null {
  const line = getLineAtCursor(text, cursor);
  const beforeCursor = line.slice(0, cursor - (text.slice(0, cursor).lastIndexOf('\n') + 1));
  
  // Match slash command at start of line or after whitespace
  const match = beforeCursor.match(/(?:^|\s)\/(\w*)$/);
  
  return match ? match[1] : null;
}

/**
 * Detect if text is a mention query
 * 
 * @param text - The text content
 * @param cursor - Cursor position
 * @returns The mention query (without @) or null
 */
export function getMentionQuery(text: string, cursor: number): string | null {
  const beforeCursor = text.slice(0, cursor);
  
  // Match @ mention
  const match = beforeCursor.match(/@([\w-]*)$/);
  
  return match ? match[1] : null;
}

/**
 * Replace a word at cursor position with new text
 * 
 * @param text - Current text content
 * @param cursor - Cursor position
 * @param word - The word to replace (should match getWordAtCursor)
 * @param replacement - The replacement text
 * @returns Updated text and new cursor position
 */
export function replaceWordAtCursor(
  text: string,
  cursor: number,
  word: string,
  replacement: string
): InsertMarkdownResult {
  const beforeCursor = text.slice(0, cursor);
  const afterCursor = text.slice(cursor);

  // Find where the word starts
  const wordStart = beforeCursor.length - word.length;
  
  if (wordStart < 0 || beforeCursor.slice(wordStart) !== word) {
    // Word doesn't match, return unchanged
    return { text, selection: { start: cursor, end: cursor } };
  }

  const newText = beforeCursor.slice(0, wordStart) + replacement + afterCursor;
  const newCursor = wordStart + replacement.length;

  return {
    text: newText,
    selection: { start: newCursor, end: newCursor },
  };
}

/**
 * Count lines in text
 * 
 * @param text - Text content
 * @returns Number of lines
 */
export function countLines(text: string): number {
  if (!text) return 1;
  return text.split('\n').length;
}

/**
 * Count characters (excluding whitespace)
 * 
 * @param text - Text content
 * @returns Character count
 */
export function countCharacters(text: string): number {
  return text.replace(/\s/g, '').length;
}

/**
 * Get line and column numbers for cursor position
 * 
 * @param text - Text content
 * @param cursor - Cursor position
 * @returns Line and column numbers (1-indexed)
 */
export function getLineColumn(text: string, cursor: number): { line: number; column: number } {
  const beforeCursor = text.slice(0, cursor);
  const lines = beforeCursor.split('\n');
  
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

/**
 * Check if cursor is at start of a line
 * 
 * @param text - Text content
 * @param cursor - Cursor position
 * @returns Whether cursor is at line start
 */
export function isAtLineStart(text: string, cursor: number): boolean {
  return cursor === 0 || text[cursor - 1] === '\n';
}

/**
 * Check if cursor is at end of a line
 * 
 * @param text - Text content
 * @param cursor - Cursor position
 * @returns Whether cursor is at line end
 */
export function isAtLineEnd(text: string, cursor: number): boolean {
  return cursor === text.length || text[cursor] === '\n';
}

/**
 * Toggle markdown formatting (add if absent, remove if present)
 * 
 * @param text - Current text content
 * @param selection - Current selection
 * @param prefix - Opening markdown syntax
 * @param suffix - Closing markdown syntax (defaults to prefix)
 * @returns Updated text and selection
 */
export function toggleMarkdown(
  text: string,
  selection: TextSelection,
  prefix: string,
  suffix?: string
): InsertMarkdownResult {
  const closeSuffix = suffix ?? prefix;
  const { start, end } = selection;
  const selectedText = text.slice(start, end);

  // Check if already wrapped
  const before = text.slice(Math.max(0, start - prefix.length), start);
  const after = text.slice(end, end + closeSuffix.length);

  if (before === prefix && after === closeSuffix) {
    // Remove formatting
    const newText = 
      text.slice(0, start - prefix.length) + 
      selectedText + 
      text.slice(end + closeSuffix.length);
    
    return {
      text: newText,
      selection: {
        start: start - prefix.length,
        end: end - prefix.length,
      },
    };
  } else {
    // Add formatting
    return insertMarkdown(text, selection, prefix, true);
  }
}

/**
 * Escape markdown special characters
 * 
 * @param text - Text to escape
 * @returns Escaped text
 */
export function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/`/g, '\\`')
    .replace(/#/g, '\\#');
}

/**
 * Unescape markdown special characters
 * 
 * @param text - Text to unescape
 * @returns Unescaped text
 */
export function unescapeMarkdown(text: string): string {
  return text
    .replace(/\\\*/g, '*')
    .replace(/\\_/g, '_')
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\`/g, '`')
    .replace(/\\#/g, '#')
    .replace(/\\\\/g, '\\');
}
