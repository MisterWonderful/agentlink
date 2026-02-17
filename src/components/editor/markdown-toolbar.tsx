/**
 * Markdown Toolbar
 * 
 * Collapsible formatting toolbar with markdown formatting buttons.
 * Appears on text selection or keyboard shortcut.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bold,
  Italic,
  Code,
  Quote,
  Link,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Strikethrough,
  Image,
  Table,
  CheckSquare,
  Minus,
  Type,
  X,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Toolbar action definition
 */
export interface ToolbarAction {
  id: string;
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  action: () => void;
  isActive?: boolean;
}

export interface MarkdownToolbarProps {
  /** Callback when bold is clicked */
  onBold: () => void;
  /** Callback when italic is clicked */
  onItalic: () => void;
  /** Callback when code is clicked */
  onCode: () => void;
  /** Callback when code block is clicked */
  onCodeBlock: () => void;
  /** Callback when link is clicked */
  onLink: () => void;
  /** Callback when bullet list is clicked */
  onList: () => void;
  /** Callback when ordered list is clicked */
  onOrderedList: () => void;
  /** Callback when quote is clicked */
  onQuote: () => void;
  /** Callback when heading is clicked */
  onHeading?: (level: 1 | 2 | 3) => void;
  /** Callback when strikethrough is clicked */
  onStrikethrough?: () => void;
  /** Callback when image is clicked */
  onImage?: () => void;
  /** Callback when table is clicked */
  onTable?: () => void;
  /** Callback when task list is clicked */
  onTaskList?: () => void;
  /** Callback when divider is clicked */
  onDivider?: () => void;
  /** Whether toolbar is visible */
  isVisible?: boolean;
  /** Callback to close/hide toolbar */
  onClose?: () => void;
  /** Current selection state */
  hasSelection?: boolean;
  /** Active formats (for highlighting buttons) */
  activeFormats?: string[];
  /** Additional class name */
  className?: string;
  /** Position mode */
  position?: 'floating' | 'fixed' | 'inline';
}

/**
 * Markdown Toolbar Component
 * 
 * Provides formatting buttons for markdown syntax.
 */
export function MarkdownToolbar({
  onBold,
  onItalic,
  onCode,
  onCodeBlock,
  onLink,
  onList,
  onOrderedList,
  onQuote,
  onHeading,
  onStrikethrough,
  onImage,
  onTable,
  onTaskList,
  onDivider,
  isVisible = true,
  onClose,
  hasSelection = false,
  activeFormats = [],
  className,
  position = 'inline',
}: MarkdownToolbarProps) {
  const [showMore, setShowMore] = useState(false);
  const [headingMenuOpen, setHeadingMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowMore(false);
        setHeadingMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (format: string) => activeFormats.includes(format);

  const mainActions: ToolbarAction[] = [
    {
      id: 'bold',
      icon: Bold,
      label: 'Bold',
      shortcut: 'Ctrl+B',
      action: onBold,
      isActive: isActive('bold'),
    },
    {
      id: 'italic',
      icon: Italic,
      label: 'Italic',
      shortcut: 'Ctrl+I',
      action: onItalic,
      isActive: isActive('italic'),
    },
    {
      id: 'code',
      icon: Code,
      label: 'Code',
      shortcut: 'Ctrl+E',
      action: onCode,
      isActive: isActive('code'),
    },
    {
      id: 'link',
      icon: Link,
      label: 'Link',
      shortcut: 'Ctrl+K',
      action: onLink,
      isActive: isActive('link'),
    },
    {
      id: 'list',
      icon: List,
      label: 'Bullet List',
      action: onList,
      isActive: isActive('list'),
    },
  ];

  const moreActions: ToolbarAction[] = [
    ...(onHeading ? [
      {
        id: 'heading',
        icon: Type,
        label: 'Heading',
        action: () => setHeadingMenuOpen(!headingMenuOpen),
        isActive: isActive('heading'),
      },
    ] : []),
    {
      id: 'quote',
      icon: Quote,
      label: 'Quote',
      shortcut: 'Ctrl+Q',
      action: onQuote,
      isActive: isActive('quote'),
    },
    {
      id: 'ordered-list',
      icon: ListOrdered,
      label: 'Numbered List',
      action: onOrderedList,
      isActive: isActive('ordered-list'),
    },
    ...(onTaskList ? [{
      id: 'task-list',
      icon: CheckSquare,
      label: 'Task List',
      action: onTaskList,
      isActive: isActive('task-list'),
    }] : []),
    ...(onStrikethrough ? [{
      id: 'strikethrough',
      icon: Strikethrough,
      label: 'Strikethrough',
      action: onStrikethrough,
      isActive: isActive('strikethrough'),
    }] : []),
    {
      id: 'code-block',
      icon: Code,
      label: 'Code Block',
      shortcut: 'Ctrl+Shift+E',
      action: onCodeBlock,
      isActive: isActive('code-block'),
    },
    ...(onImage ? [{
      id: 'image',
      icon: Image,
      label: 'Image',
      action: onImage,
      isActive: isActive('image'),
    }] : []),
    ...(onTable ? [{
      id: 'table',
      icon: Table,
      label: 'Table',
      action: onTable,
      isActive: isActive('table'),
    }] : []),
    ...(onDivider ? [{
      id: 'divider',
      icon: Minus,
      label: 'Divider',
      action: onDivider,
    }] : []),
  ];

  const handleHeadingSelect = useCallback((level: 1 | 2 | 3) => {
    onHeading?.(level);
    setHeadingMenuOpen(false);
    setShowMore(false);
  }, [onHeading]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "flex items-center gap-1 p-1.5 rounded-lg border bg-popover shadow-lg",
            position === 'floating' && "absolute z-50",
            position === 'fixed' && "fixed z-50",
            className
          )}
        >
          {/* Main actions */}
          <div className="flex items-center gap-0.5">
            {mainActions.map((action) => (
              <ToolbarButton key={action.id} action={action} />
            ))}
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* More actions */}
          <div className="flex items-center gap-0.5">
            {moreActions.slice(0, 3).map((action) => (
              <ToolbarButton key={action.id} action={action} />
            ))}
            
            {/* More menu */}
            {moreActions.length > 3 && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMore(!showMore)}
                  className={cn(
                    "h-8 w-8 rounded",
                    showMore && "bg-accent"
                  )}
                >
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    showMore && "rotate-180"
                  )} />
                </Button>

                <AnimatePresence>
                  {showMore && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className={cn(
                        "absolute top-full left-0 mt-2 p-1.5 rounded-lg border bg-popover shadow-lg",
                        "flex flex-col gap-0.5 min-w-[160px]"
                      )}
                    >
                      {moreActions.slice(3).map((action) => (
                        <ToolbarMenuItem key={action.id} action={action} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Close button */}
          {onClose && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}

          {/* Heading submenu */}
          <AnimatePresence>
            {headingMenuOpen && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className={cn(
                  "absolute left-0 top-full mt-2 p-1.5 rounded-lg border bg-popover shadow-lg",
                  "flex flex-col gap-0.5"
                )}
              >
                {[1, 2, 3].map((level) => (
                  <button
                    key={level}
                    onClick={() => handleHeadingSelect(level as 1 | 2 | 3)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                      "hover:bg-accent transition-colors",
                      "focus:outline-none focus:bg-accent"
                    )}
                  >
                    {level === 1 && <Heading1 className="w-4 h-4" />}
                    {level === 2 && <Heading2 className="w-4 h-4" />}
                    {level === 3 && <Type className="w-4 h-4" />}
                    <span>Heading {level}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Individual toolbar button
 */
interface ToolbarButtonProps {
  action: ToolbarAction;
}

function ToolbarButton({ action }: ToolbarButtonProps) {
  const Icon = action.icon;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={action.action}
      className={cn(
        "h-8 w-8 rounded relative",
        action.isActive && "bg-accent text-accent-foreground"
      )}
      title={`${action.label}${action.shortcut ? ` (${action.shortcut})` : ''}`}
    >
      <Icon className="w-4 h-4" />
    </Button>
  );
}

/**
 * Toolbar menu item for dropdown
 */
interface ToolbarMenuItemProps {
  action: ToolbarAction;
}

function ToolbarMenuItem({ action }: ToolbarMenuItemProps) {
  const Icon = action.icon;

  return (
    <button
      onClick={action.action}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm w-full",
        "hover:bg-accent transition-colors",
        "focus:outline-none focus:bg-accent",
        action.isActive && "bg-accent/50"
      )}
    >
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="flex-1 text-left">{action.label}</span>
      {action.shortcut && (
        <kbd className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
          {action.shortcut}
        </kbd>
      )}
    </button>
  );
}

/**
 * Hook for showing toolbar on text selection
 */
export interface UseFloatingToolbarOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  onFormat: (format: string) => void;
}

export interface UseFloatingToolbarReturn {
  isVisible: boolean;
  selectionRect: DOMRect | null;
  hasSelection: boolean;
  selectedText: string;
  hide: () => void;
}

/**
 * Hook for managing floating toolbar visibility based on selection
 */
export function useFloatingToolbar(
  options: UseFloatingToolbarOptions
): UseFloatingToolbarReturn {
  const { containerRef } = options;
  const [isVisible, setIsVisible] = useState(false);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      
      if (!selection || selection.isCollapsed || !containerRef.current) {
        setIsVisible(false);
        setSelectionRect(null);
        setSelectedText('');
        return;
      }

      // Check if selection is within our container
      const range = selection.getRangeAt(0);
      if (!containerRef.current.contains(range.commonAncestorContainer)) {
        setIsVisible(false);
        return;
      }

      const text = selection.toString();
      if (text.trim()) {
        setSelectedText(text);
        const rect = range.getBoundingClientRect();
        setSelectionRect(rect);
        setIsVisible(true);
      }
    };

    const handleMouseUp = () => {
      // Small delay to let selection finalize
      setTimeout(handleSelectionChange, 10);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [containerRef]);

  const hide = useCallback(() => {
    setIsVisible(false);
    // Clear any text selection
    window.getSelection()?.removeAllRanges();
  }, []);

  return {
    isVisible,
    selectionRect,
    hasSelection: selectedText.length > 0,
    selectedText,
    hide,
  };
}

export default MarkdownToolbar;
