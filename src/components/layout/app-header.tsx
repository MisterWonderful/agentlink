"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AppHeaderProps {
  /** Page title displayed in the header */
  title: string;
  /** Whether to show the back button */
  showBack?: boolean;
  /** Callback when back button is pressed */
  onBack?: () => void;
  /** Optional content to display on the right side */
  rightContent?: React.ReactNode;
  /** Optional className for styling overrides */
  className?: string;
  /** Optional subtitle displayed below the title */
  subtitle?: string;
}

/**
 * App header component for consistent page headers
 * 
 * Features:
 * - Back button with animation
 * - Title with optional subtitle
 * - Right-aligned action content
 * - Responsive padding (mobile vs desktop)
 * - Safe area support for notched devices
 */
export function AppHeader({
  title,
  showBack = false,
  onBack,
  rightContent,
  className,
  subtitle,
}: AppHeaderProps): React.JSX.Element {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center gap-3 px-4 md:px-6 py-4",
        "border-b border-border bg-surface",
        "safe-top",
        className
      )}
    >
      {/* Back Button */}
      {showBack && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="shrink-0 -ml-2"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </motion.div>
      )}

      {/* Title Section */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg md:text-xl font-semibold text-foreground truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs md:text-sm text-muted-foreground truncate">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right Content */}
      {rightContent && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="shrink-0 flex items-center gap-2"
        >
          {rightContent}
        </motion.div>
      )}
    </motion.header>
  );
}
