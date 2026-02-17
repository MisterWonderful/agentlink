/**
 * Macro Button Component
 * Individual macro button with animations and interactions
 */

'use client';

import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Macro, MacroCategory } from '@/types/macros';
import { MACRO_CATEGORY_COLORS } from '@/types/macros';
import * as LucideIcons from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================
// Types
// ============================================

export interface MacroButtonProps {
  macro: Macro;
  isFavorite?: boolean;
  onClick: () => void;
  onLongPress?: () => void;
  onFavoriteToggle?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

// ============================================
// Animation Variants
// ============================================

const buttonVariants = {
  idle: { scale: 1 },
  pressed: { scale: 0.92 },
  hover: { scale: 1.05 },
};

const favoriteVariants = {
  idle: { scale: 1, rotate: 0 },
  active: { scale: 1.2, rotate: 15 },
};

// ============================================
// Icon Resolver
// ============================================

function getIconComponent(iconName: string): LucideIcon {
  // Try to get the icon from lucide-react
  const icon = (LucideIcons as unknown as Record<string, LucideIcon>)[iconName];
  return icon || LucideIcons.Circle;
}

// ============================================
// Component
// ============================================

export function MacroButton({
  macro,
  isFavorite = false,
  onClick,
  onLongPress,
  onFavoriteToggle,
  size = 'md',
  showLabel = true,
  className,
}: MacroButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const Icon = getIconComponent(macro.icon);

  // Get color based on category or override
  const categoryColor = MACRO_CATEGORY_COLORS[macro.category];
  const color = macro.color || categoryColor;

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-14 h-14',
      icon: 'w-5 h-5',
      label: 'text-[10px]',
      favorite: 'w-4 h-4 -top-0.5 -right-0.5',
    },
    md: {
      container: 'w-16 h-16',
      icon: 'w-6 h-6',
      label: 'text-xs',
      favorite: 'w-4 h-4 -top-1 -right-1',
    },
    lg: {
      container: 'w-20 h-20',
      icon: 'w-7 h-7',
      label: 'text-sm',
      favorite: 'w-5 h-5 -top-1 -right-1',
    },
  };

  const config = sizeConfig[size];

  // Handle long press
  const handlePointerDown = useCallback(() => {
    setIsPressed(true);

    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        onLongPress();
        setIsPressed(false);
      }, 500);
    }
  }, [onLongPress]);

  const handlePointerUp = useCallback(() => {
    setIsPressed(false);

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    setIsPressed(false);

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Prevent click if we were long-pressing
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      onClick();
    },
    [onClick]
  );

  const handleFavoriteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onFavoriteToggle?.();
    },
    [onFavoriteToggle]
  );

  const button = (
    <motion.button
      className={cn(
        'relative flex flex-col items-center justify-center gap-1.5',
        'rounded-2xl transition-colors duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        className
      )}

      variants={buttonVariants}
      initial="idle"
      animate={isPressed ? 'pressed' : 'idle'}
      whileHover="hover"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      whileTap={{ scale: 0.92 }}
    >
      {/* Icon Container */}
      <div
        className={cn(
          config.container,
          'relative flex items-center justify-center rounded-2xl',
          'bg-gradient-to-br shadow-sm',
          'transition-shadow duration-200',
          'hover:shadow-md'
        )}
        style={{
          background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
          border: `1px solid ${color}30`,
        }}
      >
        <Icon
          className={cn(config.icon, 'transition-colors duration-200')}
          style={{ color }}
        />

        {/* Favorite Indicator */}
        {isFavorite && (
          <motion.div
            className={cn(
              'absolute flex items-center justify-center',
              'bg-background rounded-full shadow-sm',
              config.favorite
            )}
            variants={favoriteVariants}
            initial="idle"
            animate="active"
            onClick={handleFavoriteClick}
          >
            <Star
              className="w-full h-full text-amber-400 fill-amber-400"
              strokeWidth={2}
            />
          </motion.div>
        )}
      </div>

      {/* Label */}
      {showLabel && (
        <span
          className={cn(
            config.label,
            'font-medium text-center',
            'text-foreground/80 leading-tight',
            'max-w-full truncate px-1'
          )}
        >
          {macro.name}
        </span>
      )}
    </motion.button>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[200px] text-center"
        >
          <p className="font-medium">{macro.name}</p>
          <p className="text-xs text-muted-foreground">{macro.description}</p>
          {macro.shortcut && (
            <p className="text-xs text-muted-foreground mt-1">
              {macro.shortcut}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// Compact Macro Button (for use in input bar)
// ============================================

export interface CompactMacroButtonProps {
  macro: Macro;
  onClick: () => void;
  className?: string;
}

export function CompactMacroButton({
  macro,
  onClick,
  className,
}: CompactMacroButtonProps) {
  const Icon = getIconComponent(macro.icon);
  const categoryColor = MACRO_CATEGORY_COLORS[macro.category];
  const color = macro.color || categoryColor;

  return (
    <motion.button
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-xl',
        'bg-muted/50 hover:bg-muted',
        'transition-colors duration-200',
        'text-sm font-medium',
        className
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <Icon className="w-4 h-4" style={{ color }} />
      <span className="truncate">{macro.name}</span>
    </motion.button>
  );
}

// ============================================
// Macro Badge (for inline display)
// ============================================

export interface MacroBadgeProps {
  category: MacroCategory;
  className?: string;
}

export function MacroBadge({ category, className }: MacroBadgeProps) {
  const color = MACRO_CATEGORY_COLORS[category];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider',
        className
      )}
      style={{
        backgroundColor: `${color}20`,
        color: color,
      }}
    >
      {category}
    </span>
  );
}
