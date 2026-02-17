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

// Drag and drop hooks
export {
  useDragDrop,
  useGlobalDragDrop,
  type UseDragDropOptions,
  type UseDragDropReturn,
} from './use-drag-drop';

// Clipboard hooks
export {
  useClipboardPaste,
  useImagePaste,
  usePasteTarget,
  type PastedItem,
  type PastedItemType,
  type UseClipboardPasteOptions,
  type UseClipboardPasteReturn,
} from './use-clipboard-paste';

// Animation hooks
export {
  useSmoothScroll,
  useChatAutoScroll,
  type UseSmoothScrollOptions,
  type UseSmoothScrollReturn,
  type UseChatAutoScrollOptions,
} from './use-smooth-scroll';

export {
  useReducedMotion,
  useAnimationConfig,
  useTabVisibility,
  useAnimationState,
  type AnimationConfig,
  type UseAnimationStateReturn,
} from './use-reduced-motion';
