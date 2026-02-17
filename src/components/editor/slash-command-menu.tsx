/**
 * Slash Command Menu
 * 
 * Notion-like slash command menu that appears when typing "/" in the editor.
 * Provides quick access to formatting, actions, and agent commands.
 */

'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code,
  Image,
  Table,
  Trash,
  RotateCcw,
  Thermometer,
  Bot,
  FileText,
  ListOrdered,
  Quote,
  Link,
  Minus,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Sparkles,
  History,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Slash command definition
 */
export interface SlashCommand {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof iconMap;
  shortcut?: string;
  category: 'format' | 'insert' | 'action' | 'agent';
  keywords: string[];
  action: (context: SlashCommandContext) => void;
}

/**
 * Context passed to command actions
 */
export interface SlashCommandContext {
  /** Insert text at cursor */
  insertText: (text: string, options?: { select?: boolean; newline?: boolean }) => void;
  /** Insert markdown block */
  insertBlock: (markdown: string) => void;
  /** Get current editor value */
  getValue: () => string;
  /** Set editor value */
  setValue: (value: string) => void;
  /** Clear the editor */
  clear: () => void;
  /** Focus the editor */
  focus: () => void;
  /** Additional metadata */
  agentId?: string;
  conversationId?: string;
}

// Icon mapping for commands
const iconMap = {
  Code,
  Image,
  Table,
  Trash,
  RotateCcw,
  Thermometer,
  Bot,
  FileText,
  ListOrdered,
  Quote,
  Link,
  Minus,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Sparkles,
  History,
  Settings,
} as const;

/**
 * Default slash commands
 */
export const defaultCommands: SlashCommand[] = [
  // Format commands
  {
    id: 'heading-1',
    title: 'Heading 1',
    description: 'Large section heading',
    icon: 'Heading1',
    shortcut: '# ',
    category: 'format',
    keywords: ['h1', 'heading', 'title'],
    action: (ctx) => ctx.insertText('# ', { newline: true }),
  },
  {
    id: 'heading-2',
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: 'Heading2',
    shortcut: '## ',
    category: 'format',
    keywords: ['h2', 'heading', 'subtitle'],
    action: (ctx) => ctx.insertText('## ', { newline: true }),
  },
  {
    id: 'heading-3',
    title: 'Heading 3',
    description: 'Small section heading',
    icon: 'Heading3',
    shortcut: '### ',
    category: 'format',
    keywords: ['h3', 'heading'],
    action: (ctx) => ctx.insertText('### ', { newline: true }),
  },
  {
    id: 'bullet-list',
    title: 'Bullet List',
    description: 'Create a bulleted list',
    icon: 'ListOrdered',
    shortcut: '- ',
    category: 'format',
    keywords: ['list', 'bullet', 'ul'],
    action: (ctx) => ctx.insertText('- ', { newline: true }),
  },
  {
    id: 'numbered-list',
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: 'ListOrdered',
    shortcut: '1. ',
    category: 'format',
    keywords: ['list', 'number', 'ol', 'ordered'],
    action: (ctx) => ctx.insertText('1. ', { newline: true }),
  },
  {
    id: 'todo-list',
    title: 'To-do List',
    description: 'Create a task list',
    icon: 'CheckSquare',
    shortcut: '- [ ] ',
    category: 'format',
    keywords: ['todo', 'task', 'checkbox'],
    action: (ctx) => ctx.insertText('- [ ] ', { newline: true }),
  },
  {
    id: 'quote',
    title: 'Quote',
    description: 'Add a quote block',
    icon: 'Quote',
    shortcut: '> ',
    category: 'format',
    keywords: ['quote', 'blockquote'],
    action: (ctx) => ctx.insertText('> ', { newline: true }),
  },
  {
    id: 'divider',
    title: 'Divider',
    description: 'Add a horizontal divider',
    icon: 'Minus',
    shortcut: '---',
    category: 'format',
    keywords: ['divider', 'hr', 'line', 'separator'],
    action: (ctx) => ctx.insertBlock('---'),
  },
  
  // Insert commands
  {
    id: 'code',
    title: 'Code Block',
    description: 'Add a formatted code block',
    icon: 'Code',
    shortcut: '```',
    category: 'insert',
    keywords: ['code', 'snippet', 'programming'],
    action: (ctx) => {
      ctx.insertBlock('```typescript\n${cursor}\n```');
    },
  },
  {
    id: 'image',
    title: 'Image',
    description: 'Upload or paste an image',
    icon: 'Image',
    category: 'insert',
    keywords: ['image', 'picture', 'photo', 'upload'],
    action: (ctx) => {
      ctx.insertText('![${cursor}](url)', { select: true });
    },
  },
  {
    id: 'link',
    title: 'Link',
    description: 'Insert a hyperlink',
    icon: 'Link',
    shortcut: '[text](url)',
    category: 'insert',
    keywords: ['link', 'url', 'hyperlink'],
    action: (ctx) => {
      ctx.insertText('[${cursor}](url)', { select: true });
    },
  },
  {
    id: 'table',
    title: 'Table',
    description: 'Insert a markdown table',
    icon: 'Table',
    category: 'insert',
    keywords: ['table', 'grid', 'spreadsheet'],
    action: (ctx) => {
      ctx.insertBlock('| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |');
    },
  },
  
  // Action commands
  {
    id: 'clear',
    title: 'Clear Chat',
    description: 'Clear the current conversation',
    icon: 'Trash',
    category: 'action',
    keywords: ['clear', 'delete', 'reset', 'clean'],
    action: (ctx) => {
      ctx.clear();
      ctx.focus();
    },
  },
  {
    id: 'reset',
    title: 'Reset Context',
    description: 'Reset conversation context',
    icon: 'RotateCcw',
    category: 'action',
    keywords: ['reset', 'context', 'restart'],
    action: (ctx) => {
      // This would be handled by parent component
      ctx.setValue('/reset context');
    },
  },
  {
    id: 'history',
    title: 'View History',
    description: 'Show command history',
    icon: 'History',
    category: 'action',
    keywords: ['history', 'commands', 'previous'],
    action: (ctx) => {
      ctx.setValue('/history');
    },
  },
  
  // Agent commands
  {
    id: 'temperature',
    title: 'Set Temperature',
    description: 'Adjust creativity level (0-2)',
    icon: 'Thermometer',
    category: 'agent',
    keywords: ['temperature', 'creativity', 'randomness', 'settings'],
    action: (ctx) => {
      ctx.insertText('/temperature 0.7', { select: true });
    },
  },
  {
    id: 'system',
    title: 'System Prompt',
    description: 'Set system prompt for this message',
    icon: 'Bot',
    category: 'agent',
    keywords: ['system', 'prompt', 'instruction'],
    action: (ctx) => {
      ctx.insertText('/system ${cursor}', { select: true });
    },
  },
  {
    id: 'model',
    title: 'Switch Model',
    description: 'Change the active model',
    icon: 'Sparkles',
    category: 'agent',
    keywords: ['model', 'switch', 'change'],
    action: (ctx) => {
      ctx.insertText('/model ${cursor}', { select: true });
    },
  },
  {
    id: 'settings',
    title: 'Agent Settings',
    description: 'Open agent configuration',
    icon: 'Settings',
    category: 'agent',
    keywords: ['settings', 'config', 'configuration'],
    action: (ctx) => {
      ctx.setValue('/settings');
    },
  },
];

export interface SlashCommandMenuProps {
  /** Whether the menu is open */
  isOpen: boolean;
  /** Current search query (without the /) */
  query: string;
  /** Callback when a command is selected */
  onSelect: (command: SlashCommand) => void;
  /** Callback when the menu should close */
  onClose: () => void;
  /** Available commands (defaults to defaultCommands) */
  commands?: SlashCommand[];
  /** Position offset from the cursor */
  position?: { top: number; left: number };
}

/**
 * Slash Command Menu Component
 * 
 * Displays a searchable list of slash commands with keyboard navigation.
 */
export function SlashCommandMenu({
  isOpen,
  query,
  onSelect,
  onClose,
  commands = defaultCommands,
  position,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Filter and group commands
  const filteredCommands = useMemo(() => {
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) return commands;
    
    return commands.filter(cmd => 
      cmd.title.toLowerCase().includes(searchTerm) ||
      cmd.description.toLowerCase().includes(searchTerm) ||
      cmd.keywords.some(k => k.includes(searchTerm)) ||
      cmd.id.includes(searchTerm)
    );
  }, [commands, query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, SlashCommand[]> = {
      format: [],
      insert: [],
      action: [],
      agent: [],
    };

    filteredCommands.forEach(cmd => {
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  const categoryLabels: Record<string, string> = {
    format: 'Formatting',
    insert: 'Insert',
    action: 'Actions',
    agent: 'Agent Commands',
  };

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'Tab':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        break;
    }
  }, [isOpen, filteredCommands, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = itemRefs.current[selectedIndex];
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen || filteredCommands.length === 0) {
    return null;
  }

  let globalIndex = 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "absolute z-50 w-72 max-h-80 overflow-hidden",
            "bg-popover border border-border rounded-xl shadow-xl",
            "flex flex-col"
          )}
          style={position ? { top: position.top, left: position.left } : undefined}
        >
          {/* Header with query */}
          {query && (
            <div className="px-3 py-2 border-b border-border/50 bg-muted/50">
              <span className="text-xs text-muted-foreground">
                Searching for &quot;/{query}&quot;
              </span>
            </div>
          )}

          {/* Commands list */}
          <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
            {Object.entries(groupedCommands).map(([category, categoryCommands]) => {
              if (categoryCommands.length === 0) return null;

              return (
                <div key={category} className="mb-2 last:mb-0">
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {categoryLabels[category]}
                  </div>
                  {categoryCommands.map((command) => {
                    const index = globalIndex++;
                    const isSelected = index === selectedIndex;
                    const Icon = iconMap[command.icon];

                    return (
                      <button
                        key={command.id}
                        ref={el => { itemRefs.current[index] = el; }}
                        onClick={() => onSelect(command)}
                        className={cn(
                          "w-full px-3 py-2 flex items-center gap-3 text-left",
                          "hover:bg-accent/50 transition-colors",
                          "focus:outline-none focus:bg-accent",
                          isSelected && "bg-accent"
                        )}
                      >
                        <div className={cn(
                          "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                          "bg-muted border border-border/50"
                        )}>
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {command.title}
                            </span>
                            {command.shortcut && (
                              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border/50 text-muted-foreground">
                                {command.shortcut}
                              </kbd>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {command.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Footer with keyboard hints */}
          <div className="px-3 py-2 border-t border-border/50 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-muted rounded border border-border/50">↑↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-muted rounded border border-border/50">↵</kbd>
                <span>Select</span>
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded border border-border/50">esc</kbd>
              <span>Close</span>
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook for managing slash command menu state
 */
export interface UseSlashCommandMenuOptions {
  onCommandSelect?: (command: SlashCommand) => void;
  commands?: SlashCommand[];
}

export interface UseSlashCommandMenuReturn {
  isOpen: boolean;
  query: string;
  open: () => void;
  close: () => void;
  setQuery: (query: string) => void;
  handleSlashInput: (text: string, cursorPosition: number) => void;
  MenuComponent: React.FC<Omit<SlashCommandMenuProps, 'isOpen' | 'query'>>;
}

/**
 * Hook for slash command menu state management
 */
export function useSlashCommandMenu(
  options: UseSlashCommandMenuOptions = {}
): UseSlashCommandMenuReturn {
  const { onCommandSelect, commands = defaultCommands } = options;
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  const handleSlashInput = useCallback((text: string, cursorPosition: number) => {
    const beforeCursor = text.slice(0, cursorPosition);
    const afterCursor = text.slice(cursorPosition);

    // Check if we're at the start of a slash command
    const match = beforeCursor.match(/(?:^|\s)\/(\w*)$/);

    if (match && !afterCursor.match(/^\w/)) {
      setQuery(match[1]);
      setIsOpen(true);
    } else {
      close();
    }
  }, [close]);

  const MenuComponent = useCallback((props: Omit<SlashCommandMenuProps, 'isOpen' | 'query'>) => (
    <SlashCommandMenu
      isOpen={isOpen}
      query={query}
      commands={commands}
      {...props}
    />
  ), [isOpen, query, commands]);

  return {
    isOpen,
    query,
    open,
    close,
    setQuery,
    handleSlashInput,
    MenuComponent,
  };
}
