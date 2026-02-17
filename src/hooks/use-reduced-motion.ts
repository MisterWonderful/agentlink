"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect if user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook to get animation configuration based on user preference
 */
export interface AnimationConfig {
  enabled: boolean;
  duration: number;
  spring: {
    stiffness: number;
    damping: number;
    mass: number;
  };
}

export function useAnimationConfig(): AnimationConfig {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return {
      enabled: false,
      duration: 0,
      spring: {
        stiffness: 1000,
        damping: 100,
        mass: 0.1,
      },
    };
  }

  return {
    enabled: true,
    duration: 0.3,
    spring: {
      stiffness: 400,
      damping: 30,
      mass: 1,
    },
  };
}

/**
 * Hook to pause animations when tab is hidden
 */
export function useTabVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return isVisible;
}

/**
 * Combined hook for animation state
 */
export interface UseAnimationStateReturn {
  shouldAnimate: boolean;
  config: AnimationConfig;
  isTabVisible: boolean;
}

export function useAnimationState(): UseAnimationStateReturn {
  const config = useAnimationConfig();
  const isTabVisible = useTabVisibility();

  return {
    shouldAnimate: config.enabled && isTabVisible,
    config,
    isTabVisible,
  };
}
