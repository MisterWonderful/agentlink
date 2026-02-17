/**
 * TokenizedMessage Component
 * 
 * A message component that renders content token-by-token with smooth animations.
 * Features cursor tracking, pause on hover, and velocity display.
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useStreamAnimation } from '@/hooks/use-stream-animation';
import { StreamSpeed } from '@/lib/stream/stream-renderer';
import { StreamCursor } from './stream-cursor';
import { TokenVelocityIndicator } from './token-velocity-indicator';
import { StreamControls } from './stream-controls';

export interface TokenizedMessageProps {
  /** Message content to stream */
  content: string;
  /** Whether content is currently streaming */
  isStreaming: boolean;
  /** Stream speed preset */
  streamSpeed?: StreamSpeed;
  /** Callback when stream completes */
  onComplete?: () => void;
  /** Whether to show the cursor */
  enableCursor?: boolean;
  /** Whether to show velocity indicator */
  showVelocity?: boolean;
  /** Whether to show playback controls */
  showControls?: boolean;
  /** Whether to pause on hover */
  pauseOnHover?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Message role for styling */
  role?: 'user' | 'assistant' | 'system';
  /** Callback when user clicks to copy */
  onCopy?: (content: string) => void;
  /** Whether to enable typing sound */
  enableTypingSound?: boolean;
  /** Custom renderer for completed content */
  renderComplete?: (content: string) => React.ReactNode;
}

/**
 * TokenizedMessage - High-performance streaming message component
 * 
 * Features:
 * - Token-by-token rendering with smooth animations
 * - Blinking cursor that follows the stream
 * - Real-time token velocity display
 * - Pause on hover
 * - Click to copy
 * - Responsive design
 */
export function TokenizedMessage({
  content,
  isStreaming,
  streamSpeed = 'normal',
  onComplete,
  enableCursor = true,
  showVelocity = true,
  showControls = true,
  pauseOnHover = true,
  className,
  role = 'assistant',
  onCopy,
  enableTypingSound = false,
  renderComplete,
}: TokenizedMessageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [showCopied, setShowCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const {
    displayedContent,
    isComplete,
    isPaused,
    progress,
    tokensPerSecond,
    pause,
    resume,
    skip,
    setSpeed,
    containerRef: streamContainerRef,
  } = useStreamAnimation({
    content,
    isActive: isStreaming,
    speed: streamSpeed,
    onComplete,
    enableTypingSound,
    adaptiveSpeed: true,
  });

  // Handle pause on hover
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (pauseOnHover && isStreaming && !isComplete) {
      pause();
    }
  }, [pauseOnHover, isStreaming, isComplete, pause]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (pauseOnHover && isStreaming && !isComplete && isPaused) {
      resume();
    }
  }, [pauseOnHover, isStreaming, isComplete, isPaused, resume]);

  // Handle click to copy
  const handleClick = useCallback(async () => {
    if (onCopy) {
      onCopy(content);
    } else {
      try {
        await navigator.clipboard.writeText(content);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      } catch {
        // Copy failed, ignore
      }
    }
  }, [content, onCopy]);

  // Update cursor position
  useEffect(() => {
    if (!enableCursor || !containerRef.current || isComplete) return;

    const updateCursorPosition = () => {
      if (!containerRef.current || !cursorRef.current) return;
      
      // Find the last rendered token
      const tokens = containerRef.current.querySelectorAll('.stream-token');
      if (tokens.length === 0) return;
      
      const lastToken = tokens[tokens.length - 1] as HTMLElement;
      const containerRect = containerRef.current.getBoundingClientRect();
      const tokenRect = lastToken.getBoundingClientRect();
      
      // Position cursor after the last token
      cursorRef.current.style.left = `${tokenRect.right - containerRect.left}px`;
      cursorRef.current.style.top = `${tokenRect.top - containerRect.top}px`;
    };

    // Update position on animation frame
    const interval = setInterval(updateCursorPosition, 50);
    return () => clearInterval(interval);
  }, [enableCursor, isComplete, displayedContent]);

  // Calculate if controls should be shown
  const shouldShowControls = showControls && isStreaming && !isComplete;
  const shouldShowVelocity = showVelocity && isStreaming && tokensPerSecond > 0;

  return (
    <div
      className={cn(
        'relative group',
        'p-4 rounded-lg transition-colors duration-200',
        role === 'user' 
          ? 'bg-primary/10 ml-auto' 
          : 'bg-muted/50',
        isHovered && !isComplete && 'bg-muted',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Streaming content container */}
      <div
        ref={(el) => {
          // Merge refs
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          (streamContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }}
        className={cn(
          'relative min-h-[1.5em] font-mono text-sm leading-relaxed',
          'whitespace-pre-wrap break-words',
          isStreaming && 'cursor-pointer'
        )}
      >
        {/* Content renders here via StreamRenderer */}
      </div>

      {/* Blinking cursor */}
      {enableCursor && isStreaming && !isComplete && (
        <div
          ref={cursorRef}
          className="absolute pointer-events-none transition-all duration-75"
          style={{ left: 0, top: 0 }}
        >
          <StreamCursor 
            isActive={true} 
            color={role === 'user' ? 'var(--primary)' : 'var(--foreground)'} 
          />
        </div>
      )}

      {/* Controls overlay */}
      {shouldShowControls && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <StreamControls
            isStreaming={isStreaming}
            canPause={!isPaused}
            canSkip={!isComplete}
            speed={streamSpeed}
            onPause={pause}
            onResume={resume}
            onSkip={skip}
            onSpeedChange={(speed) => setSpeed(speed as StreamSpeed)}
          />
        </div>
      )}

      {/* Velocity indicator */}
      {shouldShowVelocity && (
        <div className="absolute bottom-2 right-2">
          <TokenVelocityIndicator
            tokensPerSecond={tokensPerSecond}
            totalTokens={content.length}
          />
        </div>
      )}

      {/* Copied notification */}
      {showCopied && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-primary text-primary-foreground text-xs rounded animate-in fade-in duration-200">
          Copied!
        </div>
      )}

      {/* Click hint */}
      {isStreaming && !isComplete && (
        <div className={cn(
          'absolute bottom-2 left-2 text-xs text-muted-foreground',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
        )}>
          Click to copy • Hover to pause
        </div>
      )}

      {/* Progress bar */}
      {isStreaming && !isComplete && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted overflow-hidden rounded-b-lg">
          <div
            className="h-full bg-primary transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Completed content renderer (optional) */}
      {isComplete && renderComplete && (
        <div className="mt-2 pt-2 border-t border-border/50">
          {renderComplete(content)}
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for inline use
 */
export function TokenizedMessageInline({
  content,
  isStreaming,
  className,
  speed = 'fast',
}: Omit<TokenizedMessageProps, 'streamSpeed'> & { speed?: StreamSpeed }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(content);
      setIsComplete(true);
      return;
    }

    setDisplayedText('');
    setIsComplete(false);
    indexRef.current = 0;

    const tokens = content.split('');
    const delay = speed === 'instant' ? 0 : speed === 'fast' ? 8 : 16;

    if (delay === 0) {
      setDisplayedText(content);
      setIsComplete(true);
      return;
    }

    const animate = () => {
      if (indexRef.current >= tokens.length) {
        setIsComplete(true);
        return;
      }

      const batchSize = speed === 'fast' ? 3 : 1;
      const nextIndex = Math.min(indexRef.current + batchSize, tokens.length);
      const newText = tokens.slice(0, nextIndex).join('');
      
      setDisplayedText(newText);
      indexRef.current = nextIndex;

      animationRef.current = setTimeout(() => {
        requestAnimationFrame(animate);
      }, delay);
    };

    animate();

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [content, isStreaming, speed]);

  return (
    <span ref={containerRef} className={cn('font-mono', className)}>
      {displayedText}
      {!isComplete && isStreaming && (
        <span className="inline-block w-2 h-4 bg-current ml-0.5 animate-pulse" />
      )}
    </span>
  );
}

/**
 * Skeleton loader for message placeholder
 */
export function TokenizedMessageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 rounded-lg bg-muted/50 space-y-2', className)}>
      <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
      <div className="h-4 bg-muted rounded w-1/2 animate-pulse delay-75" />
      <div className="h-4 bg-muted rounded w-5/6 animate-pulse delay-150" />
    </div>
  );
}
