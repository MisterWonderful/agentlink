/**
 * TokenVelocityIndicator Component
 * 
 * Displays streaming performance metrics including tokens per second
 * and total token count. Professional terminal-style display.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Zap, Activity, Gauge } from 'lucide-react';

export interface TokenVelocityIndicatorProps {
  /** Current tokens per second */
  tokensPerSecond: number;
  /** Total tokens rendered */
  totalTokens: number;
  /** Variant style */
  variant?: 'compact' | 'full' | 'minimal';
  /** Whether to show sparkline */
  showSparkline?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format number with commas
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Get color based on token velocity
 */
function getVelocityColor(tps: number): string {
  if (tps >= 100) return 'text-emerald-500';
  if (tps >= 60) return 'text-blue-500';
  if (tps >= 30) return 'text-amber-500';
  return 'text-muted-foreground';
}

/**
 * Get velocity label
 */
function getVelocityLabel(tps: number): string {
  if (tps >= 100) return 'Fast';
  if (tps >= 60) return 'Normal';
  if (tps >= 30) return 'Slow';
  return 'Idle';
}

/**
 * TokenVelocityIndicator - Real-time streaming performance display
 * 
 * Shows:
 * - Tokens per second with velocity indicator
 * - Total token count
 * - Visual sparkline (optional)
 * - Color-coded performance levels
 */
export function TokenVelocityIndicator({
  tokensPerSecond,
  totalTokens,
  variant = 'compact',
  showSparkline = false,
  className,
}: TokenVelocityIndicatorProps) {
  const colorClass = getVelocityColor(tokensPerSecond);
  const label = getVelocityLabel(tokensPerSecond);

  // Sparkline history (keep last 20 points)
  const [history, setHistory] = React.useState<number[]>([]);

  React.useEffect(() => {
    setHistory(prev => {
      const newHistory = [...prev, tokensPerSecond];
      return newHistory.slice(-20);
    });
  }, [tokensPerSecond]);

  if (variant === 'minimal') {
    return (
      <span className={cn('text-xs tabular-nums', colorClass, className)}>
        {tokensPerSecond > 0 ? `${tokensPerSecond} t/s` : '–'}
      </span>
    );
  }

  if (variant === 'full') {
    return (
      <div className={cn('flex items-center gap-3 text-xs', className)}>
        {/* Velocity icon and value */}
        <div className="flex items-center gap-1.5">
          <Activity className={cn('w-3.5 h-3.5', colorClass)} />
          <span className={cn('font-medium tabular-nums', colorClass)}>
            {tokensPerSecond > 0 ? `${tokensPerSecond} tok/s` : '–'}
          </span>
          <span className="text-muted-foreground">{label}</span>
        </div>

        {/* Divider */}
        <span className="text-border">•</span>

        {/* Total tokens */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Gauge className="w-3.5 h-3.5" />
          <span className="tabular-nums">{formatNumber(totalTokens)} tokens</span>
        </div>

        {/* Sparkline */}
        {showSparkline && history.length > 1 && (
          <Sparkline data={history} className="w-16 h-6" colorClass={colorClass} />
        )}
      </div>
    );
  }

  // Compact variant (default)
  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      <Zap className={cn('w-3 h-3', tokensPerSecond > 0 ? colorClass : 'text-muted-foreground')} />
      <span className={cn('tabular-nums', tokensPerSecond > 0 ? 'text-foreground' : 'text-muted-foreground')}>
        {tokensPerSecond > 0 ? `${tokensPerSecond} tok/s` : '0 tok/s'}
      </span>
      <span className="text-muted-foreground">•</span>
      <span className="text-muted-foreground tabular-nums">
        {formatNumber(totalTokens)}
      </span>
    </div>
  );
}

/**
 * Sparkline component for velocity visualization
 */
interface SparklineProps {
  data: number[];
  className?: string;
  colorClass?: string;
}

function Sparkline({ data, className, colorClass = 'text-primary' }: SparklineProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn('overflow-visible', className)}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        className={colorClass}
      />
      {/* Current value dot */}
      <circle
        cx="100"
        cy={100 - ((data[data.length - 1] - min) / range) * 100}
        r="3"
        className={colorClass}
      />
    </svg>
  );
}

/**
 * VelocityBadge - Simple badge showing current speed status
 */
export interface VelocityBadgeProps {
  tokensPerSecond: number;
  className?: string;
}

export function VelocityBadge({ tokensPerSecond, className }: VelocityBadgeProps) {
  const getBadgeStyle = (tps: number): { bg: string; text: string; label: string } => {
    if (tps >= 100) return {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-500',
      label: 'Fast'
    };
    if (tps >= 60) return {
      bg: 'bg-blue-500/10',
      text: 'text-blue-500',
      label: 'Normal'
    };
    if (tps >= 30) return {
      bg: 'bg-amber-500/10',
      text: 'text-amber-500',
      label: 'Slow'
    };
    return {
      bg: 'bg-muted',
      text: 'text-muted-foreground',
      label: 'Idle'
    };
  };

  const style = getBadgeStyle(tokensPerSecond);

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      style.bg,
      style.text,
      className
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
      {style.label}
    </span>
  );
}

/**
 * VelocityMeter - Gauge-style visualization
 */
export interface VelocityMeterProps {
  tokensPerSecond: number;
  max?: number;
  className?: string;
}

export function VelocityMeter({ 
  tokensPerSecond, 
  max = 150, 
  className 
}: VelocityMeterProps) {
  const percentage = Math.min((tokensPerSecond / max) * 100, 100);
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            percentage >= 80 ? 'bg-emerald-500' :
            percentage >= 50 ? 'bg-blue-500' :
            percentage >= 20 ? 'bg-amber-500' :
            'bg-muted-foreground'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-12">
        {Math.round(percentage)}%
      </span>
    </div>
  );
}
