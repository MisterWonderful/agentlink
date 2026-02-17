/**
 * StreamControls Component
 * 
 * Playback controls for streaming content.
 * Features pause/resume, skip, and speed adjustment.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Pause, 
  Play, 
  SkipForward, 
  Gauge,
  Rabbit,
  Turtle,
  Zap,
  Infinity
} from 'lucide-react';

export type StreamSpeed = 'slow' | 'normal' | 'fast' | 'instant';

export interface StreamControlsProps {
  /** Whether stream is currently active */
  isStreaming: boolean;
  /** Whether pause is available */
  canPause: boolean;
  /** Whether skip is available */
  canSkip: boolean;
  /** Current speed preset */
  speed: StreamSpeed;
  /** Callback when pause is clicked */
  onPause: () => void;
  /** Callback when resume is clicked */
  onResume: () => void;
  /** Callback when skip is clicked */
  onSkip: () => void;
  /** Callback when speed changes */
  onSpeedChange: (speed: StreamSpeed) => void;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show labels */
  showLabels?: boolean;
  /** Whether controls are disabled */
  disabled?: boolean;
}

interface SpeedOption {
  value: StreamSpeed;
  label: string;
  icon: React.ReactNode;
  multiplier: string;
}

const SPEED_OPTIONS: SpeedOption[] = [
  { value: 'slow', label: 'Slow', icon: <Turtle className="w-4 h-4" />, multiplier: '0.5x' },
  { value: 'normal', label: 'Normal', icon: <Gauge className="w-4 h-4" />, multiplier: '1x' },
  { value: 'fast', label: 'Fast', icon: <Rabbit className="w-4 h-4" />, multiplier: '2x' },
  { value: 'instant', label: 'Instant', icon: <Zap className="w-4 h-4" />, multiplier: '∞' },
];

/**
 * StreamControls - Playback controls for streaming content
 * 
 * Features:
 * - Pause/Resume toggle
 * - Skip to end
 * - Speed adjustment (0.5x, 1x, 2x, ∞)
 * - Keyboard shortcuts (Space: pause, Esc: skip)
 */
export function StreamControls({
  isStreaming,
  canPause,
  canSkip,
  speed,
  onPause,
  onResume,
  onSkip,
  onSpeedChange,
  className,
  size = 'md',
  showLabels = false,
  disabled = false,
}: StreamControlsProps) {
  const [isPaused, setIsPaused] = React.useState(!canPause);

  // Update internal state when props change
  React.useEffect(() => {
    setIsPaused(!canPause);
  }, [canPause]);

  // Handle pause/resume toggle
  const handleTogglePause = React.useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      onResume();
    } else {
      setIsPaused(true);
      onPause();
    }
  }, [isPaused, onPause, onResume]);

  // Keyboard shortcuts
  React.useEffect(() => {
    if (!isStreaming || disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handleTogglePause();
          break;
        case 'Escape':
          if (canSkip) {
            e.preventDefault();
            onSkip();
          }
          break;
        case '1':
          onSpeedChange('slow');
          break;
        case '2':
          onSpeedChange('normal');
          break;
        case '3':
          onSpeedChange('fast');
          break;
        case '4':
          onSpeedChange('instant');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStreaming, disabled, canSkip, handleTogglePause, onSkip, onSpeedChange]);

  // Size variants
  const sizeClasses = {
    sm: 'h-7 text-xs gap-1',
    md: 'h-9 text-sm gap-1.5',
    lg: 'h-11 text-base gap-2',
  };

  const buttonSizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const iconSizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const currentSpeed = SPEED_OPTIONS.find(s => s.value === speed) || SPEED_OPTIONS[1];

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border bg-background/95 backdrop-blur-sm shadow-sm',
        sizeClasses[size],
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
      role="toolbar"
      aria-label="Stream playback controls"
    >
      {/* Pause/Resume button */}
      <button
        onClick={handleTogglePause}
        disabled={!isStreaming}
        className={cn(
          'flex items-center justify-center rounded-md transition-colors',
          buttonSizeClasses[size],
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          !isPaused && 'text-primary'
        )}
        aria-label={isPaused ? 'Resume streaming' : 'Pause streaming'}
        title={isPaused ? 'Resume (Space)' : 'Pause (Space)'}
      >
        {isPaused ? (
          <Play className={cn(iconSizeClasses[size], 'ml-0.5')} />
        ) : (
          <Pause className={iconSizeClasses[size]} />
        )}
        {showLabels && <span className="ml-1.5">{isPaused ? 'Resume' : 'Pause'}</span>}
      </button>

      {/* Divider */}
      <div className="w-px h-4 bg-border mx-1" />

      {/* Skip button */}
      <button
        onClick={onSkip}
        disabled={!canSkip}
        className={cn(
          'flex items-center justify-center rounded-md transition-colors',
          buttonSizeClasses[size],
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        aria-label="Skip to end"
        title="Skip to end (Esc)"
      >
        <SkipForward className={iconSizeClasses[size]} />
        {showLabels && <span className="ml-1.5">Skip</span>}
      </button>

      {/* Divider */}
      <div className="w-px h-4 bg-border mx-1" />

      {/* Speed selector */}
      <div className="relative group">
        <button
          className={cn(
            'flex items-center justify-center rounded-md transition-colors',
            buttonSizeClasses[size],
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          aria-label="Change speed"
          title="Speed (1-4)"
        >
          {currentSpeed.icon}
          {showLabels && <span className="ml-1.5">{currentSpeed.multiplier}</span>}
        </button>

        {/* Speed dropdown */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col gap-1 p-1 rounded-lg border bg-background shadow-lg">
          {SPEED_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onSpeedChange(option.value)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap',
                speed === option.value 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {option.icon}
              <span>{option.label}</span>
              <span className="text-xs opacity-60 ml-auto">{option.multiplier}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Minimal version for compact spaces
 */
export function StreamControlsMinimal({
  isStreaming,
  canSkip,
  speed,
  onPause,
  onResume,
  onSkip,
  onSpeedChange,
  className,
  disabled,
}: Omit<StreamControlsProps, 'canPause' | 'showLabels'>) {
  const [isPaused, setIsPaused] = React.useState(false);

  const handlePauseResume = React.useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      onResume();
    } else {
      setIsPaused(true);
      onPause();
    }
  }, [isPaused, onPause, onResume]);

  // Keyboard shortcut
  React.useEffect(() => {
    if (!isStreaming || disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        handlePauseResume();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStreaming, disabled, handlePauseResume]);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Pause/Play */}
      <button
        onClick={handlePauseResume}
        disabled={!isStreaming}
        className={cn(
          'p-1.5 rounded-md transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          !isPaused && 'text-primary'
        )}
      >
        {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
      </button>

      {/* Skip */}
      <button
        onClick={onSkip}
        disabled={!canSkip}
        className={cn(
          'p-1.5 rounded-md transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <SkipForward className="w-4 h-4" />
      </button>

      {/* Speed indicator (click to cycle) */}
      <button
        onClick={() => {
          const speeds: StreamSpeed[] = ['slow', 'normal', 'fast', 'instant'];
          const currentIndex = speeds.indexOf(speed);
          const nextIndex = (currentIndex + 1) % speeds.length;
          onSpeedChange(speeds[nextIndex]);
        }}
        className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        {speed === 'instant' ? (
          <Infinity className="w-4 h-4" />
        ) : speed === 'fast' ? (
          <Rabbit className="w-4 h-4" />
        ) : speed === 'slow' ? (
          <Turtle className="w-4 h-4" />
        ) : (
          <Gauge className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

/**
 * Status indicator showing current stream state
 */
export interface StreamStatusProps {
  isStreaming: boolean;
  isPaused: boolean;
  progress: number;
  className?: string;
}

export function StreamStatus({
  isStreaming,
  isPaused,
  progress,
  className,
}: StreamStatusProps) {
  if (!isStreaming) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        Complete
      </span>
    );
  }

  if (isPaused) {
    return (
      <span className={cn('text-xs text-amber-500 flex items-center gap-1', className)}>
        <Pause className="w-3 h-3" />
        Paused
      </span>
    );
  }

  return (
    <span className={cn('text-xs text-emerald-500 flex items-center gap-1', className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      Streaming {progress}%
    </span>
  );
}
