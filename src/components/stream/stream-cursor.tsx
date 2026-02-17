/**
 * StreamCursor Component
 * 
 * Professional terminal-style cursor that follows the stream position.
 * Features blinking animation, smooth follow, and glow effects.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface StreamCursorProps {
  /** Whether the cursor is active (streaming) */
  isActive: boolean;
  /** Cursor color - CSS color value */
  color?: string;
  /** Cursor style - block, line, or underline */
  style?: 'block' | 'line' | 'underline';
  /** Whether cursor should blink */
  blink?: boolean;
  /** Animation duration in seconds */
  blinkDuration?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * StreamCursor - Terminal-style blinking cursor
 * 
 * Features:
 * - Blinking block cursor (terminal style)
 * - Smooth position animation
 * - Glow effect for visibility
 * - Multiple cursor styles
 */
export function StreamCursor({
  isActive,
  color = 'var(--foreground)',
  style = 'block',
  blink = true,
  blinkDuration = 1,
  className,
}: StreamCursorProps) {
  return (
    <span
      className={cn(
        'inline-block pointer-events-none',
        'transition-opacity duration-150',
        !isActive && 'opacity-50',
        className
      )}
      style={{
        color,
      }}
      aria-hidden="true"
    >
      <span
        className={cn(
          'inline-block',
          blink && 'animate-cursor-blink',
          style === 'block' && 'w-2.5 h-5 rounded-sm',
          style === 'line' && 'w-0.5 h-5',
          style === 'underline' && 'w-2.5 h-0.5 translate-y-1'
        )}
        style={{
          backgroundColor: color,
          boxShadow: isActive ? `0 0 8px ${color}, 0 0 16px ${color}40` : 'none',
          animationDuration: `${blinkDuration}s`,
        }}
      />
    </span>
  );
}

/**
 * SmoothCursor - Cursor with smooth position following
 * 
 * Use this when you want the cursor to smoothly animate between positions
 * rather than jumping instantly.
 */
export interface SmoothCursorProps extends StreamCursorProps {
  /** Target position (x, y) in pixels */
  targetPosition: { x: number; y: number };
  /** Animation spring stiffness */
  stiffness?: number;
  /** Animation damping */
  damping?: number;
}

export function SmoothCursor({
  targetPosition,
  stiffness = 0.3,
  damping = 0.7,
  ...cursorProps
}: SmoothCursorProps) {
  const [position, setPosition] = React.useState(targetPosition);
  const velocityRef = React.useRef({ x: 0, y: 0 });
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const animate = () => {
      const dx = targetPosition.x - position.x;
      const dy = targetPosition.y - position.y;
      
      // Spring physics
      const ax = dx * stiffness;
      const ay = dy * stiffness;
      
      velocityRef.current.x = (velocityRef.current.x + ax) * damping;
      velocityRef.current.y = (velocityRef.current.y + ay) * damping;
      
      const newX = position.x + velocityRef.current.x;
      const newY = position.y + velocityRef.current.y;
      
      // Stop if close enough
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && 
          Math.abs(velocityRef.current.x) < 0.1 && Math.abs(velocityRef.current.y) < 0.1) {
        setPosition(targetPosition);
        return;
      }
      
      setPosition({ x: newX, y: newY });
      rafRef.current = requestAnimationFrame(animate);
    };
    
    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [targetPosition, stiffness, damping, position.x, position.y]);

  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-100%, 0)',
      }}
    >
      <StreamCursor {...cursorProps} />
    </div>
  );
}

/**
 * CursorTrack - Container that tracks cursor position within content
 */
export interface CursorTrackProps {
  children: React.ReactNode;
  /** Whether to show cursor */
  showCursor: boolean;
  /** Cursor props */
  cursorProps?: Omit<StreamCursorProps, 'isActive'>;
  /** Class name for container */
  className?: string;
}

export function CursorTrack({
  children,
  showCursor,
  cursorProps,
  className,
}: CursorTrackProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [cursorPosition, setCursorPosition] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    if (!showCursor || !containerRef.current) return;

    const updatePosition = () => {
      const container = containerRef.current;
      if (!container) return;

      // Find the last text node
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null
      );

      let lastTextNode: Text | null = null;
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (node.textContent && node.textContent.length > 0) {
          lastTextNode = node as Text;
        }
      }

      if (lastTextNode) {
        const range = document.createRange();
        range.setStart(lastTextNode, lastTextNode.length);
        range.setEnd(lastTextNode, lastTextNode.length);
        const rect = range.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        setCursorPosition({
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top,
        });
      }
    };

    const observer = new MutationObserver(updatePosition);
    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    updatePosition();

    return () => observer.disconnect();
  }, [showCursor]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {children}
      {showCursor && (
        <SmoothCursor
          isActive={true}
          targetPosition={cursorPosition}
          {...cursorProps}
        />
      )}
    </div>
  );
}

/**
 * Global styles injection component
 * Add this to your app layout to enable cursor animations
 */
export function StreamCursorStyles() {
  return (
    <style jsx global>{`
      @keyframes cursor-blink {
        0%, 50% {
          opacity: 1;
        }
        51%, 100% {
          opacity: 0;
        }
      }
      
      .animate-cursor-blink {
        animation: cursor-blink 1s steps(1) infinite;
      }
      
      /* Alternative smoother blink */
      @keyframes cursor-blink-smooth {
        0%, 45% {
          opacity: 1;
        }
        55%, 100% {
          opacity: 0.3;
        }
      }
      
      .animate-cursor-blink-smooth {
        animation: cursor-blink-smooth 1.2s ease-in-out infinite;
      }
    `}</style>
  );
}
