/**
 * Macro Grid Component
 * Responsive grid of macro buttons with animations
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Macro } from '@/types/macros';
import { MacroButton } from './macro-button';

// ============================================
// Types
// ============================================

export interface MacroGridProps {
  macros: Macro[];
  onMacroClick: (macro: Macro) => void;
  onMacroLongPress?: (macro: Macro) => void;
  onMacroFavoriteToggle?: (macro: Macro) => void;
  favorites?: string[];
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  columns?: 3 | 4 | 5 | 6 | 7 | 8;
  className?: string;
  emptyMessage?: string;
}

// ============================================
// Animation Variants
// ============================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.01,
      staggerDirection: -1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.9,
    transition: {
      duration: 0.15,
    },
  },
};

// ============================================
// Component
// ============================================

export function MacroGrid({
  macros,
  onMacroClick,
  onMacroLongPress,
  onMacroFavoriteToggle,
  favorites = [],
  size = 'md',
  showLabels = true,
  columns,
  className,
  emptyMessage = 'No macros available',
}: MacroGridProps) {
  // Determine column count based on responsive breakpoints if not specified
  const getGridColumns = () => {
    if (columns) {
      return `grid-cols-${columns}`;
    }

    // Responsive defaults
    return 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8';
  };

  const handleMacroClick = (macro: Macro) => {
    onMacroClick(macro);
  };

  const handleMacroLongPress = (macro: Macro) => {
    onMacroLongPress?.(macro);
  };

  const handleFavoriteToggle = (macro: Macro) => {
    onMacroFavoriteToggle?.(macro);
  };

  if (macros.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12 px-4',
          'text-muted-foreground',
          className
        )}
      >
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <motion.div
      className={cn('grid gap-3 sm:gap-4', getGridColumns(), className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {macros.map((macro) => (
        <motion.div
          key={macro.id}
          variants={itemVariants}
          className="flex justify-center"
        >
          <MacroButton
            macro={macro}
            isFavorite={favorites.includes(macro.id)}
            onClick={() => handleMacroClick(macro)}
            onLongPress={
              onMacroLongPress ? () => handleMacroLongPress(macro) : undefined
            }
            onFavoriteToggle={() => handleFavoriteToggle(macro)}
            size={size}
            showLabel={showLabels}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

// ============================================
// Draggable Macro Grid
// ============================================

export interface DraggableMacroGridProps extends MacroGridProps {
  onReorder: (macros: Macro[]) => void;
  isDraggable?: boolean;
}

export function DraggableMacroGrid({
  macros,
  onReorder,
  isDraggable = true,
  ...props
}: DraggableMacroGridProps) {
  // For now, use the regular grid
  // Full drag-and-drop implementation can be added later with @dnd-kit
  return <MacroGrid macros={macros} {...props} />;
}

// ============================================
// Macro Section
// ============================================

export interface MacroSectionProps {
  title: string;
  macros: Macro[];
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: React.ReactNode;
  className?: string;
}

export function MacroSection({
  title,
  macros,
  icon,
  action,
  children,
  className,
}: MacroSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
            {title}
          </h3>
          <span className="text-xs text-muted-foreground">({macros.length})</span>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="text-xs text-accent hover:text-accent/80 font-medium transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
      {children || <MacroGrid macros={macros} onMacroClick={() => {}} />}
    </div>
  );
}

// ============================================
// Compact Macro List (horizontal scroll)
// ============================================

export interface MacroListProps {
  macros: Macro[];
  onMacroClick: (macro: Macro) => void;
  favorites?: string[];
  className?: string;
}

export function MacroList({
  macros,
  onMacroClick,
  favorites = [],
  className,
}: MacroListProps) {
  return (
    <motion.div
      className={cn(
        'flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent',
        className
      )}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      {macros.map((macro) => (
        <motion.button
          key={macro.id}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl',
            'bg-muted/50 hover:bg-muted',
            'border border-transparent hover:border-border/50',
            'transition-all duration-200 whitespace-nowrap',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50'
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onMacroClick(macro)}
        >
          <MacroButton
            macro={macro}
            isFavorite={favorites.includes(macro.id)}
            onClick={() => onMacroClick(macro)}
            size="sm"
            showLabel={false}
          />
          <span className="text-sm font-medium">{macro.name}</span>
        </motion.button>
      ))}
    </motion.div>
  );
}
