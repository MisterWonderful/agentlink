'use client';

import { useState, useEffect } from 'react';

// Breakpoint constants matching Tailwind defaults
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Media Query Hook
 * 
 * A React hook that tracks whether a CSS media query matches.
 * SSR-safe - returns false during server rendering.
 * 
 * @example
 * const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
 * const isLandscape = useMediaQuery('(orientation: landscape)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia(query);
    
    // Set initial value
    setMatches(media.matches);

    // Create event listener
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener (with fallback for older browsers)
    if (media.addEventListener) {
      media.addEventListener('change', listener);
    } else {
      // Fallback for older Safari versions
      media.addListener(listener);
    }

    // Cleanup
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener);
      } else {
        media.removeListener(listener);
      }
    };
  }, [query]);

  // Return false during SSR to prevent hydration mismatch
  if (!isMounted) {
    return false;
  }

  return matches;
}

/**
 * Mobile Detection Hook
 * 
 * Returns true if the viewport is below the 'md' breakpoint (768px).
 * Commonly used to conditionally render mobile-specific UI.
 * 
 * @example
 * const isMobile = useIsMobile();
 * return isMobile ? <MobileNav /> : <DesktopNav />;
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`);
}

/**
 * Desktop Detection Hook
 * 
 * Returns true if the viewport is at or above the 'md' breakpoint (768px).
 * 
 * @example
 * const isDesktop = useIsDesktop();
 * return isDesktop && <DesktopSidebar />;
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`);
}

/**
 * Tablet Detection Hook
 * 
 * Returns true if the viewport is between 'sm' and 'lg' breakpoints.
 */
export function useIsTablet(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.sm}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`);
}

/**
 * Breakpoint Hook Factory
 * 
 * Creates a hook for a specific breakpoint.
 * 
 * @example
 * const useIsLargeScreen = createBreakpointHook('lg');
 * const isLarge = useIsLargeScreen(); // true at >= 1024px
 */
export function createBreakpointHook(breakpoint: Breakpoint, type: 'min' | 'max' = 'min') {
  return function useBreakpoint(): boolean {
    const value = BREAKPOINTS[breakpoint];
    const query = type === 'min' 
      ? `(min-width: ${value}px)` 
      : `(max-width: ${value - 1}px)`;
    return useMediaQuery(query);
  };
}

// Pre-created breakpoint hooks
export const useIsSm = createBreakpointHook('sm');
export const useIsMd = createBreakpointHook('md');
export const useIsLg = createBreakpointHook('lg');
export const useIsXl = createBreakpointHook('xl');
export const useIs2xl = createBreakpointHook('2xl');

/**
 * Reduced Motion Hook
 * 
 * Returns true if the user prefers reduced motion.
 * Use this to disable animations for accessibility.
 * 
 * @example
 * const prefersReducedMotion = usePrefersReducedMotion();
 * <motion.div animate={prefersReducedMotion ? undefined : animation} />
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * Dark Mode Hook
 * 
 * Returns true if the user prefers dark color scheme.
 * 
 * @example
 * const prefersDark = usePrefersDarkMode();
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

/**
 * Hover Capability Hook
 * 
 * Returns true if the device supports hover interactions.
 * Useful for adapting UI for touch vs mouse devices.
 */
export function useHoverCapability(): boolean {
  return useMediaQuery('(hover: hover)');
}

/**
 * Pointer Type Hook
 * 
 * Returns the primary pointer type ('coarse' for touch, 'fine' for mouse).
 */
export function usePointerType(): 'coarse' | 'fine' | 'none' {
  const isCoarse = useMediaQuery('(pointer: coarse)');
  const isFine = useMediaQuery('(pointer: fine)');
  
  if (isCoarse) return 'coarse';
  if (isFine) return 'fine';
  return 'none';
}
