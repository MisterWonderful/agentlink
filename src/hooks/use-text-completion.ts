/**
 * Text Completion Hook
 * 
 * Provides smart autocomplete suggestions based on context,
 * common phrases, code snippets, and file names.
 */

'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

export interface UseTextCompletionOptions {
  /** Current context (previous messages, file content, etc.) */
  context?: string;
  /** Cursor position in the text */
  cursorPosition: number;
  /** Current text content */
  text: string;
  /** Common phrases to suggest */
  commonPhrases?: string[];
  /** Code snippets */
  codeSnippets?: CodeSnippet[];
  /** Available file names */
  fileNames?: string[];
  /** Maximum number of suggestions */
  maxSuggestions?: number;
  /** Minimum characters before suggesting */
  minChars?: number;
}

export interface CodeSnippet {
  id: string;
  label: string;
  code: string;
  language?: string;
  description?: string;
}

export interface CompletionSuggestion {
  id: string;
  type: 'phrase' | 'snippet' | 'file' | 'context' | 'variable';
  label: string;
  value: string;
  description?: string;
  icon?: string;
  language?: string;
}

export interface UseTextCompletionReturn {
  /** Available suggestions */
  suggestions: CompletionSuggestion[];
  /** Currently selected suggestion index */
  selectedIndex: number;
  /** Accept a suggestion */
  acceptSuggestion: (suggestion: CompletionSuggestion) => { text: string; cursorPosition: number };
  /** Navigate to next suggestion */
  selectNext: () => void;
  /** Navigate to previous suggestion */
  selectPrevious: () => void;
  /** Get currently selected suggestion */
  getSelectedSuggestion: () => CompletionSuggestion | undefined;
  /** Whether suggestions are visible */
  isVisible: boolean;
  /** Current query being completed */
  query: string;
  /** Close suggestions */
  closeSuggestions: () => void;
  /** Refresh suggestions */
  refreshSuggestions: () => void;
}

// Default common phrases for coding/technical conversations
const DEFAULT_COMMON_PHRASES: string[] = [
  'Can you explain',
  'How do I',
  'What is the difference between',
  'Please help me',
  'I need to',
  'Could you show me',
  'Can you write',
  'Help me understand',
  'What are the best practices for',
  'How would you',
  'Thanks!',
  'Thank you',
  'That works!',
  'Perfect!',
  'Great, thanks',
];

// Default code snippets
const DEFAULT_CODE_SNIPPETS: CodeSnippet[] = [
  {
    id: 'console-log',
    label: 'console.log',
    code: 'console.log(${cursor});',
    language: 'javascript',
    description: 'Log to console',
  },
  {
    id: 'function',
    label: 'function',
    code: 'function ${cursor}() {\n  \n}',
    language: 'javascript',
    description: 'Function declaration',
  },
  {
    id: 'arrow-function',
    label: 'arrow function',
    code: 'const ${cursor} = () => {\n  \n};',
    language: 'javascript',
    description: 'Arrow function',
  },
  {
    id: 'if-statement',
    label: 'if statement',
    code: 'if (${cursor}) {\n  \n}',
    language: 'javascript',
    description: 'If conditional',
  },
  {
    id: 'for-loop',
    label: 'for loop',
    code: 'for (let i = 0; i < ${cursor}; i++) {\n  \n}',
    language: 'javascript',
    description: 'For loop',
  },
  {
    id: 'try-catch',
    label: 'try/catch',
    code: 'try {\n  ${cursor}\n} catch (error) {\n  \n}',
    language: 'javascript',
    description: 'Try/catch block',
  },
  {
    id: 'async-function',
    label: 'async function',
    code: 'async function ${cursor}() {\n  \n}',
    language: 'javascript',
    description: 'Async function',
  },
  {
    id: 'import',
    label: 'import',
    code: "import { ${cursor} } from '';",
    language: 'javascript',
    description: 'ES6 import',
  },
  {
    id: 'react-component',
    label: 'React component',
    code: 'function ${cursor}() {\n  return (\n    <div>\n      \n    </div>\n  );\n}',
    language: 'tsx',
    description: 'React functional component',
  },
  {
    id: 'use-state',
    label: 'useState',
    code: 'const [${cursor}, set${cursor}] = useState();',
    language: 'tsx',
    description: 'React useState hook',
  },
  {
    id: 'use-effect',
    label: 'useEffect',
    code: 'useEffect(() => {\n  ${cursor}\n}, []);',
    language: 'tsx',
    description: 'React useEffect hook',
  },
  {
    id: 'python-function',
    label: 'def',
    code: 'def ${cursor}():\n    pass',
    language: 'python',
    description: 'Python function',
  },
  {
    id: 'python-class',
    label: 'class',
    code: 'class ${cursor}:\n    def __init__(self):\n        pass',
    language: 'python',
    description: 'Python class',
  },
  {
    id: 'python-list-comp',
    label: 'list comprehension',
    code: '[${cursor} for x in items]',
    language: 'python',
    description: 'Python list comprehension',
  },
  {
    id: 'sql-select',
    label: 'SELECT',
    code: 'SELECT ${cursor} FROM table_name;',
    language: 'sql',
    description: 'SQL SELECT statement',
  },
];

/**
 * Get the current word being typed at cursor position
 */
function getCurrentWord(text: string, cursorPosition: number): string {
  const beforeCursor = text.slice(0, cursorPosition);
  const match = beforeCursor.match(/(\S+)$/);
  return match ? match[1] : '';
}

/**
 * Get the current line being typed
 */
function getCurrentLine(text: string, cursorPosition: number): string {
  const beforeCursor = text.slice(0, cursorPosition);
  const lines = beforeCursor.split('\n');
  return lines[lines.length - 1] || '';
}

/**
 * Hook for smart text completion
 */
export function useTextCompletion(
  options: UseTextCompletionOptions
): UseTextCompletionReturn {
  const {
    context = '',
    cursorPosition,
    text,
    commonPhrases = DEFAULT_COMMON_PHRASES,
    codeSnippets = DEFAULT_CODE_SNIPPETS,
    fileNames = [],
    maxSuggestions = 5,
    minChars = 2,
  } = options;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [manualClose, setManualClose] = useState(false);
  const lastCursorRef = useRef(cursorPosition);

  // Get current query
  const query = useMemo(() => {
    return getCurrentWord(text, cursorPosition);
  }, [text, cursorPosition]);

  const currentLine = useMemo(() => {
    return getCurrentLine(text, cursorPosition);
  }, [text, cursorPosition]);

  // Generate suggestions based on context
  const suggestions = useMemo<CompletionSuggestion[]>(() => {
    if (manualClose) return [];
    if (query.length < minChars && currentLine.length < minChars) return [];
    
    const searchTerm = query.toLowerCase();
    const results: CompletionSuggestion[] = [];

    // Add common phrase suggestions
    commonPhrases
      .filter(phrase => phrase.toLowerCase().startsWith(searchTerm))
      .slice(0, 3)
      .forEach((phrase, index) => {
        results.push({
          id: `phrase-${index}`,
          type: 'phrase',
          label: phrase,
          value: phrase,
          description: 'Common phrase',
          icon: 'MessageSquare',
        });
      });

    // Add code snippet suggestions
    codeSnippets
      .filter(snippet => 
        snippet.label.toLowerCase().includes(searchTerm) ||
        snippet.description?.toLowerCase().includes(searchTerm)
      )
      .slice(0, 3)
      .forEach(snippet => {
        results.push({
          id: snippet.id,
          type: 'snippet',
          label: snippet.label,
          value: snippet.code,
          description: snippet.description,
          icon: 'Code',
          language: snippet.language,
        });
      });

    // Add file name suggestions
    fileNames
      .filter(file => file.toLowerCase().includes(searchTerm))
      .slice(0, 2)
      .forEach((file, index) => {
        results.push({
          id: `file-${index}`,
          type: 'file',
          label: file,
          value: file,
          description: 'File',
          icon: 'File',
        });
      });

    // Add context-based suggestions
    if (context) {
      const contextWords = context
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3 && word.startsWith(searchTerm))
        .filter((word, i, arr) => arr.indexOf(word) === i) // unique
        .slice(0, 2);

      contextWords.forEach((word, index) => {
        results.push({
          id: `context-${index}`,
          type: 'context',
          label: word,
          value: word,
          description: 'From context',
          icon: 'Text',
        });
      });
    }

    return results.slice(0, maxSuggestions);
  }, [query, currentLine, context, commonPhrases, codeSnippets, fileNames, maxSuggestions, minChars, manualClose]);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
    setIsVisible(suggestions.length > 0);
  }, [suggestions.length]);

  // Close suggestions when cursor moves significantly
  useEffect(() => {
    const cursorDelta = Math.abs(cursorPosition - lastCursorRef.current);
    if (cursorDelta > 1) {
      // Check if we're still on the same word
      const newQuery = getCurrentWord(text, cursorPosition);
      if (!newQuery.includes(query)) {
        setIsVisible(false);
      }
    }
    lastCursorRef.current = cursorPosition;
  }, [cursorPosition, text, query]);

  const acceptSuggestion = useCallback((suggestion: CompletionSuggestion): { text: string; cursorPosition: number } => {
    const beforeCursor = text.slice(0, cursorPosition);
    const afterCursor = text.slice(cursorPosition);

    // Find the start of the current word
    const wordStart = beforeCursor.length - query.length;
    const beforeWord = text.slice(0, wordStart);

    // Replace ${cursor} placeholder if present
    let value = suggestion.value;
    let newCursorPosition: number;

    if (value.includes('${cursor}')) {
      const placeholderIndex = value.indexOf('${cursor}');
      value = value.replace('${cursor}', '');
      newCursorPosition = beforeWord.length + placeholderIndex;
    } else {
      newCursorPosition = beforeWord.length + value.length;
    }

    const newText = beforeWord + value + afterCursor;

    // Close suggestions after accepting
    setIsVisible(false);
    setManualClose(false);

    return {
      text: newText,
      cursorPosition: newCursorPosition,
    };
  }, [text, cursorPosition, query]);

  const selectNext = useCallback(() => {
    setSelectedIndex(prev => 
      prev < suggestions.length - 1 ? prev + 1 : prev
    );
  }, [suggestions.length]);

  const selectPrevious = useCallback(() => {
    setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
  }, []);

  const getSelectedSuggestion = useCallback(() => {
    return suggestions[selectedIndex];
  }, [suggestions, selectedIndex]);

  const closeSuggestions = useCallback(() => {
    setIsVisible(false);
    setManualClose(true);
  }, []);

  const refreshSuggestions = useCallback(() => {
    setManualClose(false);
    setSelectedIndex(0);
  }, []);

  return {
    suggestions,
    selectedIndex,
    acceptSuggestion,
    selectNext,
    selectPrevious,
    getSelectedSuggestion,
    isVisible,
    query,
    closeSuggestions,
    refreshSuggestions,
  };
}

/**
 * Hook for inline ghost text completion (like Copilot)
 */
export interface UseGhostCompletionOptions {
  /** Current text */
  text: string;
  /** Cursor position */
  cursorPosition: number;
  /** Function to get completion from AI */
  getCompletion: (text: string, cursorPosition: number) => Promise<string> | string;
  /** Debounce delay in ms */
  debounceMs?: number;
}

export interface UseGhostCompletionReturn {
  /** The ghost text suggestion */
  ghostText: string | null;
  /** Whether a completion is loading */
  isLoading: boolean;
  /** Accept the ghost completion */
  accept: () => void;
  /** Dismiss the ghost completion */
  dismiss: () => void;
  /** Whether ghost text is visible */
  isVisible: boolean;
}

/**
 * Hook for ghost text inline completion
 */
export function useGhostCompletion(
  options: UseGhostCompletionOptions
): UseGhostCompletionReturn {
  const {
    text,
    cursorPosition,
    getCompletion,
    debounceMs = 300,
  } = options;

  const [ghostText, setGhostText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestRef = useRef(0);

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Don't request if text is empty or cursor is not at end of word
    const currentChar = text[cursorPosition - 1];
    if (!text || (!currentChar || currentChar === ' ' || currentChar === '\n')) {
      setGhostText(null);
      return;
    }

    // Debounce the completion request
    timeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      const requestId = Date.now();
      lastRequestRef.current = requestId;

      try {
        const completion = await getCompletion(text, cursorPosition);
        
        // Only update if this is still the latest request
        if (lastRequestRef.current === requestId) {
          setGhostText(completion);
        }
      } catch {
        setGhostText(null);
      } finally {
        if (lastRequestRef.current === requestId) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, cursorPosition, getCompletion, debounceMs]);

  const accept = useCallback(() => {
    setGhostText(null);
  }, []);

  const dismiss = useCallback(() => {
    setGhostText(null);
  }, []);

  return {
    ghostText,
    isLoading,
    accept,
    dismiss,
    isVisible: ghostText !== null && ghostText.length > 0,
  };
}
