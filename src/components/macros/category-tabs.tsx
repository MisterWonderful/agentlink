/**
 * Category Tabs Component
 * Horizontal scrollable category filter tabs
 */

'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { MacroCategory } from '@/types/macros';
import {
  MACRO_CATEGORIES,
  MACRO_CATEGORY_LABELS,
} from '@/types/macros';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// ============================================
// Types
// ============================================

export interface CategoryTabsProps {
  activeCategory: MacroCategory | 'all';
  onCategoryChange: (category: MacroCategory | 'all') => void;
  counts?: Record<MacroCategory | 'all', number>;
  className?: string;
}

// ============================================
// Category Icons (using simple dots for now)
// ============================================

const CATEGORY_ICONS: Record<MacroCategory | 'all', string> = {
  all: '○',
  system: '⚙️',
  context: '@',
  prompts: '💡',
  files: '📎',
  tools: '🛠️',
  custom: '✨',
};

// ============================================
// Component
// ============================================

export function CategoryTabs({
  activeCategory,
  onCategoryChange,
  counts,
  className,
}: CategoryTabsProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // All categories plus 'all'
  const allCategories: (MacroCategory | 'all')[] = ['all', ...MACRO_CATEGORIES];

  // Update indicator position when active category changes
  useEffect(() => {
    if (tabsRef.current) {
      const activeTab = tabsRef.current.querySelector(
        `[data-category="${activeCategory}"]`
      ) as HTMLElement;

      if (activeTab) {
        setIndicatorStyle({
          left: activeTab.offsetLeft,
          width: activeTab.offsetWidth,
        });
      }
    }
  }, [activeCategory]);

  return (
    <div className={cn('relative', className)}>
      <ScrollArea className="w-full whitespace-nowrap">
        <div
          ref={tabsRef}
          className="flex items-center gap-1 px-1 py-2"
        >
          {allCategories.map((category) => {
            const isActive = activeCategory === category;
            const count = counts?.[category] ?? 0;

            return (
              <button
                key={category}
                data-category={category}
                onClick={() => onCategoryChange(category)}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-2 rounded-full',
                  'text-sm font-medium transition-colors duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground/80'
                )}
              >
                <span className="text-base">{CATEGORY_ICONS[category]}</span>
                <span>{category === 'all' ? 'All' : MACRO_CATEGORY_LABELS[category]}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      'ml-1 text-xs px-1.5 py-0.5 rounded-full',
                      isActive
                        ? 'bg-accent/20 text-accent'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Animated Underline Indicator */}
        <motion.div
          className="absolute bottom-0 h-0.5 bg-accent rounded-full"
          initial={false}
          animate={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 30,
          }}
        />

        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}

// ============================================
// Compact Category Chips
// ============================================

export interface CategoryChipsProps {
  selectedCategories: MacroCategory[];
  onToggleCategory: (category: MacroCategory) => void;
  className?: string;
}

export function CategoryChips({
  selectedCategories,
  onToggleCategory,
  className,
}: CategoryChipsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {MACRO_CATEGORIES.map((category) => {
        const isSelected = selectedCategories.includes(category);

        return (
          <motion.button
            key={category}
            onClick={() => onToggleCategory(category)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
              'transition-colors duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
              isSelected
                ? 'bg-accent text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>{CATEGORY_ICONS[category]}</span>
            <span>{MACRO_CATEGORY_LABELS[category]}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

// ============================================
// Category Filter Dropdown
// ============================================

export interface CategoryFilterProps {
  selectedCategory: MacroCategory | 'all';
  onCategoryChange: (category: MacroCategory | 'all') => void;
  className?: string;
}

export function CategoryFilter({
  selectedCategory,
  onCategoryChange,
  className,
}: CategoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allCategories: (MacroCategory | 'all')[] = ['all', ...MACRO_CATEGORIES];

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl',
          'bg-muted text-sm font-medium',
          'hover:bg-muted/80 transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50'
        )}
      >
        <span>{CATEGORY_ICONS[selectedCategory]}</span>
        <span>
          {selectedCategory === 'all'
            ? 'All Categories'
            : MACRO_CATEGORY_LABELS[selectedCategory]}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </motion.span>
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            'absolute top-full left-0 mt-1 z-50',
            'min-w-[180px] p-1 rounded-xl',
            'bg-popover border border-border shadow-lg'
          )}
        >
          {allCategories.map((category) => (
            <button
              key={category}
              onClick={() => {
                onCategoryChange(category);
                setIsOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg',
                'text-sm transition-colors',
                'hover:bg-accent/10',
                selectedCategory === category && 'bg-accent/10 text-accent'
              )}
            >
              <span>{CATEGORY_ICONS[category]}</span>
              <span>
                {category === 'all' ? 'All Categories' : MACRO_CATEGORY_LABELS[category]}
              </span>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
