/**
 * AnimatedCodeBlock Component
 * 
 * Code blocks with special line-by-line reveal animation.
 * Progressive syntax highlighting and professional terminal styling.
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, Copy, Terminal, FileCode } from 'lucide-react';

export interface AnimatedCodeBlockProps {
  /** Code content */
  code: string;
  /** Programming language for syntax highlighting */
  language?: string;
  /** Whether code is currently being streamed */
  isStreaming?: boolean;
  /** Whether to animate line-by-line reveal */
  animateLines?: boolean;
  /** Animation speed in ms per line */
  lineDelay?: number;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Whether to show copy button */
  showCopyButton?: boolean;
  /** Whether to show language badge */
  showLanguage?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Maximum height before scrolling */
  maxHeight?: string;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
  /** Custom file name to display */
  fileName?: string;
  /** Whether this is a terminal/command output */
  isTerminal?: boolean;
}

/**
 * AnimatedCodeBlock - Code blocks with line-by-line reveal animation
 * 
 * Features:
 * - Line-by-line slide-in animation
 * - Progressive syntax highlighting
 * - Animated line numbers
 * - Copy button (appears when complete)
 * - Terminal-style or code-style rendering
 */
export function AnimatedCodeBlock({
  code,
  language = '',
  isStreaming = false,
  animateLines = true,
  lineDelay = 30,
  showLineNumbers = true,
  showCopyButton = true,
  showLanguage = true,
  className,
  maxHeight = '400px',
  onAnimationComplete,
  fileName,
  isTerminal = false,
}: AnimatedCodeBlockProps) {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [isComplete, setIsComplete] = useState(!isStreaming);
  const [copied, setCopied] = useState(false);
  const [highlightedLines, setHighlightedLines] = useState<React.ReactNode[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  // Split code into lines
  const lines = code.split('\n');
  const totalLines = lines.length;

  // Simple syntax highlighting (can be replaced with prism/shiki)
  const highlightLine = useCallback((line: string, lang: string): React.ReactNode => {
    // Basic highlighting patterns
    const patterns: { pattern: RegExp; className: string }[] = [
      // Comments
      { pattern: /(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)/g, className: 'text-muted-foreground italic' },
      // Strings
      { pattern: /(".*?"|'.*?'|`[\s\S]*?`)/g, className: 'text-emerald-400' },
      // Keywords
      { pattern: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|type|interface|enum)\b/g, className: 'text-purple-400' },
      // Numbers
      { pattern: /\b\d+\.?\d*\b/g, className: 'text-amber-400' },
      // Functions
      { pattern: /\b([a-zA-Z_]\w*)(?=\()/g, className: 'text-blue-400' },
      // Types
      { pattern: /\b(string|number|boolean|any|void|null|undefined|unknown|never)\b/g, className: 'text-cyan-400' },
    ];

    let highlighted = line;
    const tokens: { text: string; className: string; index: number }[] = [];

    // Find all matches
    for (const { pattern, className } of patterns) {
      let match;
      const localPattern = new RegExp(pattern.source, pattern.flags);
      while ((match = localPattern.exec(line)) !== null) {
        tokens.push({
          text: match[0],
          className,
          index: match.index,
        });
      }
    }

    // Sort by index
    tokens.sort((a, b) => a.index - b.index);

    // Remove overlapping tokens
    const uniqueTokens: typeof tokens = [];
    let lastEnd = -1;
    for (const token of tokens) {
      if (token.index >= lastEnd) {
        uniqueTokens.push(token);
        lastEnd = token.index + token.text.length;
      }
    }

    // Build highlighted line
    if (uniqueTokens.length === 0) {
      return <>{line}</>;
    }

    const result: React.ReactNode[] = [];
    let currentIndex = 0;

    for (const token of uniqueTokens) {
      // Add text before token
      if (token.index > currentIndex) {
        result.push(
          <span key={`text-${currentIndex}`}>
            {line.slice(currentIndex, token.index)}
          </span>
        );
      }

      // Add highlighted token
      result.push(
        <span key={`token-${token.index}`} className={token.className}>
          {token.text}
        </span>
      );

      currentIndex = token.index + token.text.length;
    }

    // Add remaining text
    if (currentIndex < line.length) {
      result.push(
        <span key={`text-${currentIndex}`}>
          {line.slice(currentIndex)}
        </span>
      );
    }

    return <>{result}</>;
  }, []);

  // Animate lines
  useEffect(() => {
    if (!isStreaming || !animateLines) {
      setVisibleLines(totalLines);
      setIsComplete(true);
      return;
    }

    setVisibleLines(0);
    setIsComplete(false);

    const animate = () => {
      setVisibleLines(prev => {
        if (prev >= totalLines) {
          setIsComplete(true);
          onAnimationComplete?.();
          return prev;
        }

        animationRef.current = setTimeout(() => {
          requestAnimationFrame(animate);
        }, lineDelay) as unknown as number;

        return prev + 1;
      });
    };

    // Start animation after a short delay
    const startDelay = setTimeout(() => {
      animate();
    }, 100);

    return () => {
      clearTimeout(startDelay);
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isStreaming, animateLines, totalLines, lineDelay, onAnimationComplete]);

  // Pre-highlight all lines for performance
  useEffect(() => {
    const highlighted = lines.map((line, i) => (
      <span key={i} className="contents">
        {highlightLine(line, language)}
      </span>
    ));
    setHighlightedLines(highlighted);
  }, [code, language, highlightLine, lines]);

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copy failed
    }
  };

  // Calculate line number width
  const lineNumberWidth = Math.max(2, String(totalLines).length) * 0.75;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative rounded-lg overflow-hidden',
        'bg-[#0d1117] border border-border/50',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-border/30">
        <div className="flex items-center gap-2">
          {isTerminal ? (
            <Terminal className="w-4 h-4 text-muted-foreground" />
          ) : (
            <FileCode className="w-4 h-4 text-muted-foreground" />
          )}
          
          {fileName ? (
            <span className="text-sm text-foreground font-medium">{fileName}</span>
          ) : showLanguage && language ? (
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {language}
            </span>
          ) : null}
          
          {isStreaming && !isComplete && (
            <span className="text-xs text-emerald-500 flex items-center gap-1 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              Streaming
            </span>
          )}
        </div>

        {/* Copy button - shows when complete or on hover */}
        {showCopyButton && (
          <button
            onClick={handleCopy}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
              'transition-all duration-200',
              'hover:bg-accent hover:text-accent-foreground',
              isComplete ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              copied && 'text-emerald-500'
            )}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className={cn('hidden sm:inline', !isComplete && 'lg:inline')}>
                  Copy
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Code content */}
      <div
        className={cn(
          'relative overflow-auto',
          'font-mono text-sm leading-6',
          'p-4'
        )}
        style={{ maxHeight }}
      >
        <pre className="m-0">
          <code>
            {lines.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'flex',
                  animateLines && index >= visibleLines && 'opacity-0',
                  animateLines && index < visibleLines && 'animate-line-reveal'
                )}
                style={{
                  animationDelay: animateLines ? `${index * lineDelay}ms` : '0ms',
                }}
              >
                {/* Line number */}
                {showLineNumbers && (
                  <span
                    className={cn(
                      'select-none text-right pr-4 text-muted-foreground/50',
                      'sticky left-0 bg-[#0d1117]',
                      animateLines && index < visibleLines && 'animate-line-number-fade'
                    )}
                    style={{ 
                      minWidth: `${lineNumberWidth}rem`,
                      animationDelay: animateLines ? `${index * lineDelay + 50}ms` : '0ms',
                    }}
                  >
                    {index + 1}
                  </span>
                )}

                {/* Line content */}
                <span className="flex-1 whitespace-pre">
                  {highlightedLines[index] || lines[index]}
                </span>
              </div>
            ))}
          </code>
        </pre>

        {/* Cursor at end if streaming */}
        {isStreaming && !isComplete && (
          <div className="absolute bottom-4 left-4">
            <span className="inline-block w-2 h-5 bg-emerald-500 animate-pulse" />
          </div>
        )}
      </div>

      {/* Progress bar for streaming */}
      {isStreaming && !isComplete && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#161b22]">
          <div
            className="h-full bg-emerald-500 transition-all duration-150"
            style={{ width: `${(visibleLines / totalLines) * 100}%` }}
          />
        </div>
      )}

      {/* Inline styles for animations */}
      <style jsx>{`
        @keyframes line-reveal {
          from {
            opacity: 0;
            transform: translateX(-10px);
            clip-path: inset(0 100% 0 0);
          }
          to {
            opacity: 1;
            transform: translateX(0);
            clip-path: inset(0 0 0 0);
          }
        }

        @keyframes line-number-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-line-reveal {
          animation: line-reveal 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-line-number-fade {
          animation: line-number-fade 150ms ease-out forwards;
        }
      `}</style>
    </div>
  );
}

/**
 * Inline code component with subtle animation
 */
export interface InlineCodeProps {
  children: React.ReactNode;
  className?: string;
  isStreaming?: boolean;
}

export function InlineCode({ children, className, isStreaming }: InlineCodeProps) {
  return (
    <code
      className={cn(
        'px-1.5 py-0.5 rounded',
        'font-mono text-sm',
        'bg-muted text-foreground',
        'transition-all duration-200',
        isStreaming && 'animate-pulse bg-primary/10',
        className
      )}
    >
      {children}
    </code>
  );
}

/**
 * Terminal-style output block
 */
export interface TerminalOutputProps extends Omit<AnimatedCodeBlockProps, 'isTerminal'> {
  prompt?: string;
  command?: string;
}

export function TerminalOutput({
  prompt = '$',
  command,
  ...props
}: TerminalOutputProps) {
  return (
    <div className="rounded-lg overflow-hidden bg-black border border-border/50">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border-b border-border/30">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>
      </div>

      {/* Command */}
      {command && (
        <div className="px-4 py-2 font-mono text-sm text-muted-foreground border-b border-border/20">
          <span className="text-emerald-500 mr-2">{prompt}</span>
          <span className="text-foreground">{command}</span>
        </div>
      )}

      {/* Output */}
      <AnimatedCodeBlock
        {...props}
        isTerminal
        showLanguage={false}
        showLineNumbers={false}
        className={cn('border-0 rounded-none', props.className)}
      />
    </div>
  );
}

/**
 * Code comparison/diff block
 */
export interface CodeDiffProps {
  before: string;
  after: string;
  language?: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export function CodeDiff({
  before,
  after,
  language,
  beforeLabel = 'Before',
  afterLabel = 'After',
  className,
}: CodeDiffProps) {
  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-4', className)}>
      <div>
        <div className="text-xs text-muted-foreground mb-2">{beforeLabel}</div>
        <AnimatedCodeBlock
          code={before}
          language={language}
          animateLines={false}
        />
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-2">{afterLabel}</div>
        <AnimatedCodeBlock
          code={after}
          language={language}
          animateLines={false}
        />
      </div>
    </div>
  );
}
