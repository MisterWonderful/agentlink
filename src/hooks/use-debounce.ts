'use client';

import { useState, useEffect } from 'react';

/**
 * Debounce Hook
 * 
 * Delays updating a value until after a specified delay has passed
 * since the last change. Useful for search inputs and other scenarios
 * where you want to avoid triggering actions on every keystroke.
 * 
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns The debounced value
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 500);
 * 
 * // Use debouncedSearch for API calls
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     searchAPI(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay expires
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounced Callback Hook
 * 
 * Returns a debounced version of the provided callback function.
 * Unlike useDebounce which debounces a value, this debounces function calls.
 * 
 * @param callback - The function to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns A debounced version of the callback
 * 
 * @example
 * const debouncedSave = useDebouncedCallback((data) => {
 *   saveToAPI(data);
 * }, 1000);
 * 
 * // Call multiple times, but only executes once after 1 second of inactivity
 * debouncedSave(data);
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return (...args: Parameters<T>) => {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };
}

/**
 * Throttle Hook
 * 
 * Ensures a value update happens at most once per specified period.
 * Useful for scroll events, resize handlers, and other high-frequency updates.
 * 
 * @param value - The value to throttle
 * @param limit - The minimum time between updates in milliseconds (default: 100ms)
 * @returns The throttled value
 * 
 * @example
 * const [scrollPosition, setScrollPosition] = useState(0);
 * const throttledPosition = useThrottle(scrollPosition, 100);
 */
export function useThrottle<T>(value: T, limit: number = 100): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdate;

    if (timeSinceLastUpdate >= limit) {
      // Enough time has passed, update immediately
      setThrottledValue(value);
      setLastUpdate(now);
    } else {
      // Schedule update for when the limit period has passed
      const timeoutId = setTimeout(() => {
        setThrottledValue(value);
        setLastUpdate(Date.now());
      }, limit - timeSinceLastUpdate);

      return () => clearTimeout(timeoutId);
    }
  }, [value, limit, lastUpdate]);

  return throttledValue;
}

/**
 * Throttled Callback Hook
 * 
 * Returns a throttled version of the provided callback function.
 * 
 * @param callback - The function to throttle
 * @param limit - The minimum time between calls in milliseconds (default: 100ms)
 * @returns A throttled version of the callback
 * 
 * @example
 * const throttledScroll = useThrottledCallback((e) => {
 *   console.log('Scroll position:', window.scrollY);
 * }, 100);
 * 
 * window.addEventListener('scroll', throttledScroll);
 */
export function useThrottledCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  limit: number = 100
): (...args: Parameters<T>) => void {
  const [inThrottle, setInThrottle] = useState(false);

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      callback(...args);
      setInThrottle(true);
      
      setTimeout(() => {
        setInThrottle(false);
      }, limit);
    }
  };
}
