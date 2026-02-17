/**
 * Preview Pane
 * 
 * Side-by-side markdown preview that renders markdown in real-time
 * with sync scroll between editor and preview.
 */

'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import { X, Split, Eye, Edit3, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface PreviewPaneProps {
  /** Markdown content to preview */
  markdown: string;
  /** Whether the preview is open */
  isOpen: boolean;
  /** Callback to close the preview */
  onClose: () => void;
  /** Editor scroll position (0-1) for sync */
  editorScrollRatio?: number;
  /** Callback when preview scrolls (for sync back to editor) */
  onPreviewScroll?: (ratio: number) => void;
  /** Whether to sync scroll between editor and preview */
  syncScroll?: boolean;
  /** View mode */
  mode?: 'split' | 'preview-only';
  /** Callback to change mode */
  onChangeMode?: (mode: 'split' | 'preview-only') => void;
  /** Additional class name */
  className?: string;
}

/**
 * Preview Pane Component
 * 
 * Renders markdown content with syntax highlighting and sync scrolling.
 */
export function PreviewPane({
  markdown,
  isOpen,
  onClose,
  editorScrollRatio,
  onPreviewScroll,
  syncScroll = true,
  mode = 'split',
  onChangeMode,
  className,
}: PreviewPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync editor scroll to preview
  useEffect(() => {
    if (!syncScroll || !scrollRef.current || !contentRef.current) return;
    if (isScrollingRef.current) return;
    if (editorScrollRatio === undefined) return;

    const scrollArea = scrollRef.current;
    const maxScroll = contentRef.current.scrollHeight - scrollArea.clientHeight;
    
    if (maxScroll > 0) {
      scrollArea.scrollTop = editorScrollRatio * maxScroll;
    }
  }, [editorScrollRatio, syncScroll]);

  // Handle preview scroll to sync back to editor
  const handleScroll = useCallback(() => {
    if (!syncScroll || !scrollRef.current || !contentRef.current) return;
    if (!onPreviewScroll) return;

    isScrollingRef.current = true;

    const scrollArea = scrollRef.current;
    const maxScroll = contentRef.current.scrollHeight - scrollArea.clientHeight;
    
    if (maxScroll > 0) {
      const ratio = scrollArea.scrollTop / maxScroll;
      onPreviewScroll(ratio);
    }

    // Clear scrolling flag after a delay
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 100);
  }, [syncScroll, onPreviewScroll]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ 
            opacity: 1, 
            x: 0,
            width: isExpanded ? '100%' : mode === 'split' ? '50%' : '100%'
          }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "flex flex-col h-full border-l border-border bg-background",
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Preview</span>
            </div>
            <div className="flex items-center gap-1">
              {/* View mode toggle */}
              {onChangeMode && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onChangeMode(mode === 'split' ? 'preview-only' : 'split')}
                  className="h-7 w-7"
                  title={mode === 'split' ? 'Show preview only' : 'Show split view'}
                >
                  {mode === 'split' ? (
                    <Eye className="w-3.5 h-3.5" />
                  ) : (
                    <Split className="w-3.5 h-3.5" />
                  )}
                </Button>
              )}
              
              {/* Expand toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 w-7"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </Button>

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-7 w-7"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Preview content */}
          <ScrollArea 
            className="flex-1"
            onScroll={handleScroll}
          >
            <div 
              ref={contentRef}
              className={cn(
                "p-4 prose prose-sm dark:prose-invert max-w-none",
                "prose-headings:font-semibold prose-headings:text-foreground",
                "prose-p:text-foreground prose-p:leading-relaxed",
                "prose-code:before:content-none prose-code:after:content-none",
                "prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
                "prose-pre:bg-muted prose-pre:border prose-pre:border-border",
                "prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:italic",
                "prose-ul:list-disc prose-ul:pl-5",
                "prose-ol:list-decimal prose-ol:pl-5",
                "prose-li:marker:text-muted-foreground",
                "prose-a:text-accent prose-a:no-underline hover:prose-a:underline",
                "prose-hr:border-border",
                "prose-table:border prose-table:border-border",
                "prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2",
                "prose-td:border prose-td:border-border prose-td:p-2",
                "prose-img:rounded-lg prose-img:border prose-img:border-border",
                "[&_pre_code]:bg-transparent [&_pre_code]:p-0"
              )}
            >
              {markdown ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight, rehypeSanitize]}
                  components={{
                    // Custom code block rendering
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const isInline = !className;
                      
                      if (isInline) {
                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }

                      return (
                        <div className="relative group">
                          {match && (
                            <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                              {match[1]}
                            </div>
                          )}
                          <pre className={className}>
                            <code {...props}>{children}</code>
                          </pre>
                        </div>
                      );
                    },
                    // Enhanced link rendering
                    a({ children, href, ...props }) {
                      return (
                        <a 
                          href={href} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                          {...props}
                        >
                          {children}
                        </a>
                      );
                    },
                  }}
                >
                  {markdown}
                </ReactMarkdown>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground">
                  <Edit3 className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">Start typing to see preview</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer with word/character count */}
          {markdown && (
            <div className="px-3 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
              <span>
                {markdown.split(/\s+/).filter(Boolean).length} words
              </span>
              <span>
                {markdown.length} characters
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Toggle button for preview mode
 */
export interface PreviewToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  mode?: 'split' | 'preview-only';
  className?: string;
}

/**
 * Preview toggle button component
 */
export function PreviewToggle({
  isOpen,
  onToggle,
  mode = 'split',
  className,
}: PreviewToggleProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className={cn(
        "gap-2",
        isOpen && "bg-accent/50",
        className
      )}
    >
      {isOpen ? (
        <>
          <Edit3 className="w-4 h-4" />
          <span className="hidden sm:inline">Edit</span>
        </>
      ) : (
        <>
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">Preview</span>
        </>
      )}
    </Button>
  );
}

/**
 * Hook for managing preview pane state and scroll sync
 */
export interface UsePreviewPaneOptions {
  initialOpen?: boolean;
  onScrollSync?: (ratio: number) => void;
}

export interface UsePreviewPaneReturn {
  isOpen: boolean;
  mode: 'split' | 'preview-only';
  editorScrollRatio: number;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setMode: (mode: 'split' | 'preview-only') => void;
  handleEditorScroll: (ratio: number) => void;
  handlePreviewScroll: (ratio: number) => void;
  PreviewComponent: React.FC<Omit<PreviewPaneProps, 'isOpen' | 'editorScrollRatio' | 'onPreviewScroll'>>;
  PreviewToggleComponent: React.FC<Omit<PreviewToggleProps, 'isOpen' | 'onToggle'>>;
}

/**
 * Hook for managing preview pane state
 */
export function usePreviewPane(
  options: UsePreviewPaneOptions = {}
): UsePreviewPaneReturn {
  const { initialOpen = false, onScrollSync } = options;
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [mode, setMode] = useState<'split' | 'preview-only'>('split');
  const [editorScrollRatio, setEditorScrollRatio] = useState(0);
  const [previewScrollRatio, setPreviewScrollRatio] = useState(0);
  const isSyncingRef = useRef(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  const handleEditorScroll = useCallback((ratio: number) => {
    if (isSyncingRef.current) return;
    setEditorScrollRatio(ratio);
  }, []);

  const handlePreviewScroll = useCallback((ratio: number) => {
    isSyncingRef.current = true;
    setPreviewScrollRatio(ratio);
    onScrollSync?.(ratio);
    
    // Reset syncing flag after a delay
    setTimeout(() => {
      isSyncingRef.current = false;
    }, 100);
  }, [onScrollSync]);

  const PreviewComponent = useCallback((props: Omit<PreviewPaneProps, 'isOpen' | 'editorScrollRatio' | 'onPreviewScroll'>) => (
    <PreviewPane
      isOpen={isOpen}
      editorScrollRatio={editorScrollRatio}
      onPreviewScroll={handlePreviewScroll}
      mode={mode}
      onChangeMode={setMode}
      {...props}
    />
  ), [isOpen, editorScrollRatio, handlePreviewScroll, mode]);

  const PreviewToggleComponent = useCallback((props: Omit<PreviewToggleProps, 'isOpen' | 'onToggle'>) => (
    <PreviewToggle
      isOpen={isOpen}
      onToggle={toggle}
      mode={mode}
      {...props}
    />
  ), [isOpen, toggle, mode]);

  return {
    isOpen,
    mode,
    editorScrollRatio,
    open,
    close,
    toggle,
    setMode,
    handleEditorScroll,
    handlePreviewScroll,
    PreviewComponent,
    PreviewToggleComponent,
  };
}

export default PreviewPane;
