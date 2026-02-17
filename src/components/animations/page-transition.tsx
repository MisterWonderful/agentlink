"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

import type { Variants } from "framer-motion";

export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: 0.2 },
  },
};

export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
};

export const scaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.15 },
  },
};

export interface PageTransitionProps {
  children: ReactNode;
  variant?: "slide" | "fade" | "scale" | "slideUp";
  className?: string;
}

export function PageTransition({
  children,
  variant = "slide",
  className,
}: PageTransitionProps): React.ReactElement {
  const variants =
    {
      slide: pageTransitionVariants,
      fade: fadeVariants,
      scale: scaleVariants,
      slideUp: slideUpVariants,
    }[variant] || pageTransitionVariants;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export interface AnimateContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function AnimateContainer({
  children,
  className,
  staggerDelay = 0.05,
}: AnimateContainerProps): React.ReactElement {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export interface AnimateItemProps {
  children: ReactNode;
  className?: string;
}

export function AnimateItem({ children, className }: AnimateItemProps): React.ReactElement {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 15 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.35,
            ease: [0.22, 1, 0.36, 1],
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
