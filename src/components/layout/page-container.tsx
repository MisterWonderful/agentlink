"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface PageContainerProps {
  /** Page content */
  children: React.ReactNode;
  /** Optional className for styling overrides */
  className?: string;
  /** Whether the container should take full height */
  fullHeight?: boolean;
  /** Whether to center content horizontally and vertically */
  centered?: boolean;
  /** Whether to add bottom padding for mobile nav */
  padBottom?: boolean;
  /** Animation variant for page transitions */
  animation?: "fade" | "slideUp" | "slideLeft" | "none";
}

/**
 * Consistent page wrapper component
 * 
 * Features:
 * - Responsive padding (px-4 on mobile, px-6 on desktop)
 * - Full height support
 * - Centered content option
 * - Smooth page transitions with framer-motion
 * - Bottom padding for mobile navigation
 * - Safe area support
 */
export function PageContainer({
  children,
  className,
  fullHeight = false,
  centered = false,
  padBottom = true,
  animation = "fade",
}: PageContainerProps): React.JSX.Element {
  const getAnimationProps = () => {
    switch (animation) {
      case "fade":
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: 0.2 },
        };
      case "slideUp":
        return {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -20 },
          transition: { duration: 0.3, ease: "easeOut" as const },
        };
      case "slideLeft":
        return {
          initial: { opacity: 0, x: 20 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -20 },
          transition: { duration: 0.3, ease: "easeOut" as const },
        };
      case "none":
      default:
        return {};
    }
  };

  const animationProps = getAnimationProps();

  return (
    <motion.div
      {...animationProps}
      className={cn(
        // Base styles
        "w-full",
        "px-4 md:px-6 py-4 md:py-6",
        "safe-left safe-right",
        
        // Height options
        fullHeight && "h-full flex flex-col",
        
        // Centered content
        centered && "flex items-center justify-center",
        
        // Bottom padding for mobile nav (on mobile only)
        padBottom && "pb-20 md:pb-6",
        
        className
      )}
    >
      {children}
    </motion.div>
  );
}

/**
 * Constrained width page container for consistent max-width
 */
export interface ConstrainedPageContainerProps extends PageContainerProps {
  /** Maximum width of the content */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

/**
 * Page container with maximum width constraint
 */
export function ConstrainedPageContainer({
  children,
  maxWidth = "2xl",
  className,
  ...props
}: ConstrainedPageContainerProps): React.JSX.Element {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-none",
  };

  return (
    <PageContainer className={cn(maxWidthClasses[maxWidth], "mx-auto", className)} {...props}>
      {children}
    </PageContainer>
  );
}
