'use client';

import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  className?: string;
}

/**
 * Typing Indicator
 * 
 * An animated three-dot typing indicator to show when an agent is
 * generating a response. Uses Framer Motion for smooth animations.
 */
export function TypingIndicator({ className }: TypingIndicatorProps): React.ReactElement {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="h-2 w-2 rounded-full bg-accent"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.2,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Extended Typing Indicator
 * 
 * Shows the typing indicator with an agent name or label.
 */
export function TypingIndicatorWithLabel({ 
  label = 'Agent is typing',
  className 
}: { 
  label?: string;
  className?: string;
}): React.ReactElement {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <TypingIndicator />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * Pulse Indicator
 * 
 * A simple pulsing dot for indicating activity.
 */
export function PulseIndicator({ 
  color = 'bg-accent',
  size = 'h-2 w-2',
  className 
}: { 
  color?: string;
  size?: string;
  className?: string;
}): React.ReactElement {
  return (
    <span className={`relative inline-flex ${className}`}>
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-75`} />
      <span className={`relative inline-flex rounded-full ${color} ${size}`} />
    </span>
  );
}

/**
 * Thinking Indicator
 * 
 * Shows a "thinking" animation with expanding/collapsing circles.
 */
export function ThinkingIndicator({ className }: { className?: string }): React.ReactElement {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="h-3 w-3 rounded-full bg-accent/60"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.15,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Streaming Indicator
 * 
 * Shows when content is actively streaming.
 */
export function StreamingIndicator({ className }: { className?: string }): React.ReactElement {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <motion.div
        className="h-1.5 w-1.5 rounded-full bg-green-400"
        animate={{
          opacity: [1, 0.3, 1],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <span className="text-xs text-muted-foreground">Streaming...</span>
    </div>
  );
}
