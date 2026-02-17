/**
 * Rich Text Editor
 * 
 * Main editor component that combines:
 * - Contenteditable with proper cursor management
 * - Auto-growing textarea behavior
 * - Syntax highlighting in code blocks
 * - Markdown preview toggle (split view)
 * - Character/line count
 * - Slash commands, @ mentions, and terminal-like features
 */

'use client';

import { useRef, useState, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Square,
  Paperclip,
  Mic,
  Loader2,
  Eye,
  EyeOff,
  Command,
  AtSign,
  Sparkles,
  Type,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Editor utilities
import {
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
  type TextSelection,
} from '@/lib/editor/markdown-utils';

// Hooks
import { useEditorShortcuts, type ShortcutHandlers } from '@/lib/editor/shortcuts';
import { useEditorCommands } from '@/hooks/use-editor-commands';
import { useTextCompletion, type CompletionSuggestion } from '@/hooks/use-text-completion';

// Components
import { SlashCommandMenu, defaultCommands, type SlashCommandContext } from './slash-command-menu';
import { MentionAutocomplete, type MentionSuggestion } from './mention-autocomplete';
import { MarkdownToolbar } from './markdown-toolbar';
import { PreviewPane, usePreviewPane } from './preview-pane';

export interface RichTextEditorProps {
  /** Current editor value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Callback when message is submitted */
  onSubmit: () => void;
  /** Additional keyboard handler */
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether editor is disabled */
  disabled?: boolean;
  /** Minimum editor height in pixels */
  minHeight?: number;
  /** Maximum editor height in pixels */
  maxHeight?: number;
  /** Whether to enable formatting toolbar */
  enableFormatting?: boolean;
  /** Whether to enable slash commands */
  enableSlashCommands?: boolean;
  /** Whether to enable @ mentions */
  enableMentions?: boolean;
  /** Whether to enable preview mode */
  enablePreview?: boolean;
  /** Whether to enable command history */
  enableHistory?: boolean;
  /** Whether loading/streaming */
  isLoading?: boolean;
  isStreaming?: boolean;
  /** Callback to stop streaming */
  onStop?: () => void;
  /** Custom mention suggestions */
  mentionSuggestions?: MentionSuggestion[];
  /** Agent ID for context */
  agentId?: string;
  /** Conversation ID */
  conversationId?: string;
  /** Additional class name */
  className?: string;
}

/**
 * Editor ref interface for imperative operations
 */
export interface RichTextEditorRef {
  /** Focus the editor */
  focus: () => void;
  /** Blur the editor */
  blur: () => void;
  /** Get current selection */
  getSelection: () => TextSelection;
  /** Set selection */
  setSelection: (selection: TextSelection) => void;
  /** Insert text at cursor */
  insertText: (text: string, options?: { select?: boolean; newline?: boolean }) => void;
  /** Insert markdown block */
  insertBlock: (markdown: string) => void;
  /** Get current value */
  getValue: () => string;
  /** Set value */
  setValue: (value: string) => void;
  /** Clear the editor */
  clear: () => void;
}

/**
 * Rich Text Editor Component
 * 
 * A powerful markdown editor with slash commands, mentions, and terminal-like features.
 */
export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  function RichTextEditor(props, ref) {
    const {
      value,
      onChange,
      onSubmit,
      onKeyDown,
      placeholder = "Message...",
      disabled = false,
      minHeight = 44,
      maxHeight = 240,
      enableFormatting = true,
      enableSlashCommands = true,
      enableMentions = true,
      enablePreview = true,
      enableHistory = true,
      isLoading = false,
      isStreaming = false,
      onStop,
      mentionSuggestions = [],
      agentId,
      conversationId,
      className,
    } = props;

    // Refs
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // State
    const [isRecording, setIsRecording] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [selection, setSelection] = useState<TextSelection>({ start: 0, end: 0 });
    const [isToolbarVisible, setIsToolbarVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Slash command menu state
    const [slashMenuOpen, setSlashMenuOpen] = useState(false);
    const [slashQuery, setSlashQuery] = useState('');
    const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });

    // Mention autocomplete state
    const [mentionMenuOpen, setMentionMenuOpen] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionMenuPosition, setMentionMenuPosition] = useState({ top: 0, left: 0 });

    // Preview pane
    const preview = usePreviewPane();

    // Command history
    const commands = useEditorCommands({ persistHistory: enableHistory });

    // Text completion (ghost text)
    const completion = useTextCompletion({
      text: value,
      cursorPosition,
      context: '', // Would come from conversation context
    });

    // Expose imperative API
    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      blur: () => textareaRef.current?.blur(),
      getSelection: () => ({
        start: textareaRef.current?.selectionStart || 0,
        end: textareaRef.current?.selectionEnd || 0,
      }),
      setSelection: (sel) => {
        textareaRef.current?.setSelectionRange(sel.start, sel.end);
      },
      insertText: (text, options = {}) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = value.slice(0, start);
        const after = value.slice(end);

        let newText = text;
        let newCursorPos = start + text.length;

        // Handle ${cursor} placeholder
        if (text.includes('${cursor}')) {
          const placeholderIndex = text.indexOf('${cursor}');
          newText = text.replace('${cursor}', '');
          newCursorPos = start + placeholderIndex;
        }

        // Add newlines if requested
        if (options.newline) {
          const needsPrefix = before.length > 0 && !before.endsWith('\n');
          const needsSuffix = after.length > 0 && !after.startsWith('\n');
          newText = `${needsPrefix ? '\n' : ''}${newText}${needsSuffix ? '\n' : ''}`;
          newCursorPos += needsPrefix ? 1 : 0;
        }

        const finalValue = before + newText + after;
        onChange(finalValue);

        // Set cursor position after next render
        requestAnimationFrame(() => {
          const pos = options.select ? start : newCursorPos;
          const endPos = options.select ? start + newText.length : newCursorPos;
          textarea.setSelectionRange(pos, endPos);
          textarea.focus();
        });
      },
      insertBlock: (markdown) => {
        const result = insertMarkdownBlock(value, cursorPosition, markdown);
        onChange(result.text);
        requestAnimationFrame(() => {
          textareaRef.current?.setSelectionRange(result.selection.start, result.selection.end);
          textareaRef.current?.focus();
        });
      },
      getValue: () => value,
      setValue: (newValue) => onChange(newValue),
      clear: () => {
        onChange('');
        commands.resetNavigation();
      },
    }), [value, cursorPosition, onChange, commands]);

    // Auto-resize textarea
    const adjustTextareaHeight = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      textarea.style.height = 'auto';
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
    }, [minHeight, maxHeight]);

    useEffect(() => {
      adjustTextareaHeight();
    }, [value, adjustTextareaHeight]);

    // Handle input changes
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const newCursorPos = e.target.selectionStart;

      onChange(newValue);
      setCursorPosition(newCursorPos);
      setSelection({
        start: e.target.selectionStart,
        end: e.target.selectionEnd,
      });
      commands.setDraft(newValue);

      // Check for slash commands
      if (enableSlashCommands) {
        const slashMatch = newValue.slice(0, newCursorPos).match(/(?:^|\s)\/(\w*)$/);
        if (slashMatch && !newValue.slice(newCursorPos).match(/^\w/)) {
          setSlashQuery(slashMatch[1]);
          setSlashMenuOpen(true);
          
          // Calculate position for menu
          const textarea = textareaRef.current;
          if (textarea) {
            const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
            const lines = newValue.slice(0, newCursorPos).split('\n');
            const currentLineIndex = lines.length - 1;
            setSlashMenuPosition({
              top: (currentLineIndex + 1) * lineHeight + 8,
              left: 16,
            });
          }
        } else {
          setSlashMenuOpen(false);
        }
      }

      // Check for mentions
      if (enableMentions) {
        const mentionMatch = newValue.slice(0, newCursorPos).match(/@([\w-]*)$/);
        if (mentionMatch) {
          setMentionQuery(mentionMatch[1]);
          setMentionMenuOpen(true);
          
          // Calculate position
          const textarea = textareaRef.current;
          if (textarea) {
            const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
            const lines = newValue.slice(0, newCursorPos).split('\n');
            const currentLineIndex = lines.length - 1;
            setMentionMenuPosition({
              top: (currentLineIndex + 1) * lineHeight + 8,
              left: 16,
            });
          }
        } else {
          setMentionMenuOpen(false);
        }
      }
    }, [onChange, enableSlashCommands, enableMentions, commands]);

    // Handle keydown
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Don't intercept if menus are open
      if (slashMenuOpen || mentionMenuOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setSlashMenuOpen(false);
          setMentionMenuOpen(false);
        }
        return;
      }

      // Submit on Enter (without shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (value.trim() && !isLoading && !disabled) {
          commands.addToHistory(value);
          onSubmit();
        }
        return;
      }

      // Command history navigation
      if (enableHistory && !value && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const direction = e.key === 'ArrowUp' ? 'up' : 'down';
        const historyValue = commands.navigateHistory(direction);
        if (historyValue !== undefined) {
          onChange(historyValue);
        }
        return;
      }

      // Handle completion acceptance
      if (e.key === 'Tab' && completion.isVisible) {
        e.preventDefault();
        const suggestion = completion.getSelectedSuggestion();
        if (suggestion) {
          const result = completion.acceptSuggestion(suggestion);
          onChange(result.text);
          requestAnimationFrame(() => {
            textareaRef.current?.setSelectionRange(result.cursorPosition, result.cursorPosition);
          });
        }
        return;
      }

      // Formatting shortcuts
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            handleBold();
            return;
          case 'i':
            e.preventDefault();
            handleItalic();
            return;
          case 'e':
            e.preventDefault();
            if (e.shiftKey) {
              handleCodeBlock();
            } else {
              handleCode();
            }
            return;
          case 'k':
            e.preventDefault();
            if (e.shiftKey) {
              // Clear
              onChange('');
            } else {
              handleLink();
            }
            return;
        }
      }

      onKeyDown?.(e);
    }, [
      slashMenuOpen, mentionMenuOpen, value, isLoading, disabled, enableHistory,
      completion, onChange, onSubmit, onKeyDown, commands
    ]);

    // Handle slash command selection
    const handleSlashCommandSelect = useCallback((command: import('./slash-command-menu').SlashCommand) => {
      const context: SlashCommandContext = {
        insertText: (text, options) => {
          ref && 'current' in ref && ref.current?.insertText(text, options);
        },
        insertBlock: (markdown) => {
          ref && 'current' in ref && ref.current?.insertBlock(markdown);
        },
        getValue: () => value,
        setValue: onChange,
        clear: () => onChange(''),
        focus: () => textareaRef.current?.focus(),
        agentId,
        conversationId,
      };

      command.action(context);
      setSlashMenuOpen(false);
    }, [value, onChange, agentId, conversationId, ref]);

    // Handle mention selection
    const handleMentionSelect = useCallback((suggestion: MentionSuggestion) => {
      const result = replaceWordAtCursor(value, cursorPosition, `@${mentionQuery}`, `@${suggestion.name}`);
      onChange(result.text);
      setMentionMenuOpen(false);
      
      requestAnimationFrame(() => {
        textareaRef.current?.setSelectionRange(result.selection.start, result.selection.end);
        textareaRef.current?.focus();
      });
    }, [value, cursorPosition, mentionQuery, onChange]);

    // Formatting handlers
    const handleBold = useCallback(() => {
      const result = insertMarkdown(value, selection, '**', true);
      onChange(result.text);
      requestAnimationFrame(() => {
        textareaRef.current?.setSelectionRange(result.selection.start, result.selection.end);
      });
    }, [value, selection, onChange]);

    const handleItalic = useCallback(() => {
      const result = insertMarkdown(value, selection, '*', true);
      onChange(result.text);
      requestAnimationFrame(() => {
        textareaRef.current?.setSelectionRange(result.selection.start, result.selection.end);
      });
    }, [value, selection, onChange]);

    const handleCode = useCallback(() => {
      const result = insertMarkdown(value, selection, '`', true);
      onChange(result.text);
      requestAnimationFrame(() => {
        textareaRef.current?.setSelectionRange(result.selection.start, result.selection.end);
      });
    }, [value, selection, onChange]);

    const handleCodeBlock = useCallback(() => {
      const result = insertMarkdownBlock(value, cursorPosition, '```typescript\n${cursor}\n```');
      onChange(result.text);
      requestAnimationFrame(() => {
        textareaRef.current?.setSelectionRange(result.selection.start, result.selection.end);
      });
    }, [value, cursorPosition, onChange]);

    const handleLink = useCallback(() => {
      const result = insertMarkdown(value, selection, '[', false);
      const linkText = value.slice(selection.start, selection.end) || 'text';
      const linkMarkdown = `[${linkText}](url)`;
      const finalResult = {
        text: result.text.slice(0, result.selection.start) + linkMarkdown + result.text.slice(result.selection.end),
        selection: {
          start: result.selection.start + linkText.length + 3,
          end: result.selection.start + linkText.length + 6,
        },
      };
      onChange(finalResult.text);
      requestAnimationFrame(() => {
        textareaRef.current?.setSelectionRange(finalResult.selection.start, finalResult.selection.end);
      });
    }, [value, selection, onChange]);

    const handleQuote = useCallback(() => {
      ref && 'current' in ref && ref.current?.insertText('> ', { newline: true });
    }, [ref]);

    const handleList = useCallback(() => {
      ref && 'current' in ref && ref.current?.insertText('- ', { newline: true });
    }, [ref]);

    const handleOrderedList = useCallback(() => {
      ref && 'current' in ref && ref.current?.insertText('1. ', { newline: true });
    }, [ref]);

    // File attachment
    const handleAttachment = useCallback(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          // Insert file reference
          ref && 'current' in ref && ref.current?.insertText(`[${file.name}](file://${file.name})`);
        }
      };
      input.click();
    }, [ref]);

    // Voice input (placeholder)
    const handleVoiceInput = useCallback(() => {
      setIsRecording(prev => !prev);
    }, []);

    // Calculate stats
    const lineCount = countLines(value);
    const charCount = countCharacters(value);
    const isEmpty = value.trim().length === 0;
    const isSubmitDisabled = isEmpty || isLoading || disabled;

    return (
      <div
        ref={containerRef}
        className={cn(
          "relative flex flex-col",
          preview.isOpen && "flex-row",
          className
        )}
      >
        {/* Main editor area */}
        <div className={cn(
          "flex flex-col",
          preview.isOpen && preview.mode === 'split' && "w-1/2",
          preview.isOpen && preview.mode === 'preview-only' && "hidden"
        )}>
          {/* Toolbar */}
          <AnimatePresence>
            {enableFormatting && isToolbarVisible && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="px-3 py-2 border-b border-border bg-muted/30"
              >
                <MarkdownToolbar
                  onBold={handleBold}
                  onItalic={handleItalic}
                  onCode={handleCode}
                  onCodeBlock={handleCodeBlock}
                  onLink={handleLink}
                  onList={handleList}
                  onOrderedList={handleOrderedList}
                  onQuote={handleQuote}
                  isVisible={true}
                  position="inline"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input area */}
          <div className={cn(
            "relative flex items-end gap-2 p-3",
            "bg-surface/50 backdrop-blur-sm border-t border-border/50",
            isExpanded && "fixed inset-0 z-50 bg-background"
          )}>
            {/* Expand/collapse button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="shrink-0 h-10 w-10 rounded-full"
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>

            {/* Attachment Button */}
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleAttachment}
                disabled={isStreaming}
                className="shrink-0 h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </motion.div>

            {/* Input Container */}
            <div className="flex-1 relative">
              {/* Ghost text completion */}
              {completion.isVisible && completion.suggestions.length > 0 && (
                <div className="absolute left-0 top-0 pointer-events-none opacity-50 text-muted-foreground">
                  {value}
                  <span className="text-accent">{completion.suggestions[0].value.slice(value.length)}</span>
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onSelect={(e) => {
                  setCursorPosition(e.currentTarget.selectionStart);
                  setSelection({
                    start: e.currentTarget.selectionStart,
                    end: e.currentTarget.selectionEnd,
                  });
                }}
                placeholder={placeholder}
                disabled={disabled || isStreaming}
                rows={1}
                className={cn(
                  "w-full resize-none bg-background border border-border rounded-2xl px-4 py-2.5",
                  "text-sm text-foreground placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "scrollbar-dark",
                  lineCount > 1 ? "pr-10" : ""
                )}
                style={{
                  minHeight: `${minHeight}px`,
                  maxHeight: `${maxHeight}px`,
                }}
              />

              {/* Character count */}
              {charCount > 0 && (
                <div className="absolute bottom-1 right-3 text-[10px] text-muted-foreground">
                  {charCount}
                </div>
              )}
            </div>

            {/* Formatting toggle */}
            {enableFormatting && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsToolbarVisible(!isToolbarVisible)}
                className={cn(
                  "shrink-0 h-10 w-10 rounded-full",
                  isToolbarVisible && "bg-accent/20 text-accent"
                )}
              >
                <Type className="h-4 w-4" />
              </Button>
            )}

            {/* Preview toggle */}
            {enablePreview && (
              <Button
                variant="ghost"
                size="icon"
                onClick={preview.toggle}
                className={cn(
                  "shrink-0 h-10 w-10 rounded-full",
                  preview.isOpen && "bg-accent/20 text-accent"
                )}
              >
                {preview.isOpen ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Voice/Send/Stop buttons */}
            <AnimatePresence mode="wait">
              {isEmpty && !isStreaming && (
                <motion.div
                  key="voice"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleVoiceInput}
                    className={cn(
                      "shrink-0 h-10 w-10 rounded-full",
                      isRecording
                        ? "bg-error/20 text-error animate-pulse"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                </motion.div>
              )}

              {isStreaming && onStop && (
                <motion.div
                  key="stop"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={onStop}
                    className="shrink-0 h-10 w-10 rounded-full shadow-lg"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </Button>
                </motion.div>
              )}

              {!isEmpty && !isStreaming && (
                <motion.div
                  key="send"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button
                    onClick={onSubmit}
                    disabled={isSubmitDisabled}
                    className={cn(
                      "shrink-0 h-10 w-10 rounded-full p-0",
                      "bg-accent hover:bg-accent/90 text-white",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "shadow-lg"
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Status bar */}
          <div className="px-4 py-1.5 bg-muted/30 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>{lineCount} lines</span>
              <span>{charCount} chars</span>
              {isInsideCodeBlock(value, cursorPosition) && (
                <span className="text-accent">
                  {getCodeBlockLanguage(value, cursorPosition) || 'code'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Command className="w-3 h-3" />
                <span>/ for commands</span>
              </span>
              <span className="flex items-center gap-1">
                <AtSign className="w-3 h-3" />
                <span>@ for mentions</span>
              </span>
            </div>
          </div>
        </div>

        {/* Preview pane */}
        {enablePreview && preview.isOpen && (
          <preview.PreviewComponent
            markdown={value}
            onClose={preview.close}
          />
        )}

        {/* Slash command menu */}
        {enableSlashCommands && (
          <SlashCommandMenu
            isOpen={slashMenuOpen}
            query={slashQuery}
            onSelect={handleSlashCommandSelect}
            onClose={() => setSlashMenuOpen(false)}
            position={slashMenuPosition}
          />
        )}

        {/* Mention autocomplete */}
        {enableMentions && (
          <MentionAutocomplete
            isOpen={mentionMenuOpen}
            query={mentionQuery}
            onSelect={handleMentionSelect}
            onClose={() => setMentionMenuOpen(false)}
            suggestions={mentionSuggestions}
            position={mentionMenuPosition}
          />
        )}
      </div>
    );
  }
);

export default RichTextEditor;
