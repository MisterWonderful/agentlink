/**
 * Custom React Hooks
 * 
 * A collection of reusable React hooks for AgentLink.
 */

// Storage hooks
export { useLocalStorage, useSessionStorage } from './use-local-storage';

// Responsive hooks
export {
  useMediaQuery,
  useIsMobile,
  useIsDesktop,
  useIsTablet,
  createBreakpointHook,
  useIsSm,
  useIsMd,
  useIsLg,
  useIsXl,
  useIs2xl,
  usePrefersReducedMotion,
  usePrefersDarkMode,
  useHoverCapability,
  usePointerType,
} from './use-media-query';

// Debounce/Throttle hooks
export {
  useDebounce,
  useDebouncedCallback,
  useThrottle,
  useThrottledCallback,
} from './use-debounce';
