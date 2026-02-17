/**
 * useStreamAnimation Hook
 * 
 * React hook for controlling stream animations with full state management.
 * Provides real-time metrics, pause/resume/skip functionality, and smooth rendering.
 */

'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { StreamRenderer, StreamSpeed, RenderMetrics } from '@/lib/stream/stream-renderer';
import { analyzeContent, ContentSegment, getAdaptiveSpeed } from '@/lib/stream/token-analyzer';

export interface UseStreamAnimationOptions {
  /** Content to stream */
  content: string;
  /** Whether the stream is currently active */
  isActive: boolean;
  /** Base speed preset */
  speed?: StreamSpeed;
  /** Custom delay between tokens in ms (overrides speed) */
  customDelay?: number;
  /** Whether to enable typing sound */
  enableTypingSound?: boolean;
  /** Callback when stream completes */
  onComplete?: () => void;
  /** Callback on each token render */
  onToken?: (token: string, index: number) => void;
  /** Container ref to render into (if not provided, creates internal container) */
  containerRef?: React.RefObject<HTMLElement | null>;
  /** Whether to use adaptive speed based on content type */
  adaptiveSpeed?: boolean;
}

export interface UseStreamAnimationReturn {
  /** Currently displayed content string */
  displayedContent: string;
  /** Whether stream has completed */
  isComplete: boolean;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current tokens per second */
  tokensPerSecond: number;
  /** Whether stream is currently paused */
  isPaused: boolean;
  /** Whether stream is currently streaming */
  isStreaming: boolean;
  /** Pause the stream */
  pause: () => void;
  /** Resume the stream */
  resume: () => void;
  /** Toggle pause/resume */
  toggle: () => void;
  /** Skip to end instantly */
  skip: () => void;
  /** Change speed preset */
  setSpeed: (speed: StreamSpeed) => void;
  /** Set custom delay */
  setCustomDelay: (delay: number) => void;
  /** Current render metrics */
  metrics: RenderMetrics;
  /** Analyzed content segments */
  segments: ContentSegment[];
  /** Ref to attach to container element */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Reset the stream */
  reset: () => void;
}

/**
 * Hook for managing stream animation state and controls
 */
export function useStreamAnimation(options: UseStreamAnimationOptions): UseStreamAnimationReturn {
  const {
    content,
    isActive,
    speed = 'normal',
    customDelay,
    enableTypingSound = false,
    onComplete,
    onToken,
    containerRef: externalContainerRef,
    adaptiveSpeed = true,
  } = options;

  // Internal refs
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef ?? internalContainerRef;
  const rendererRef = useRef<StreamRenderer | null>(null);
  const contentRef = useRef(content);
  const isActiveRef = useRef(isActive);
  
  // State
  const [displayedContent, setDisplayedContent] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tokensPerSecond, setTokensPerSecond] = useState(0);
  const [segments, setSegments] = useState<ContentSegment[]>([]);
  
  // Metrics ref for sync updates
  const metricsRef = useRef<RenderMetrics>({
    currentIndex: 0,
    totalTokens: 0,
    tokensPerSecond: 0,
    elapsedTime: 0,
    isActive: false,
  });

  // Update refs when props change
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Analyze content when it changes
  useEffect(() => {
    if (content) {
      const analyzedSegments = analyzeContent(content);
      setSegments(analyzedSegments);
    } else {
      setSegments([]);
    }
  }, [content]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, []);

  // Create and start renderer when active changes
  useEffect(() => {
    if (!isActive || !content || !containerRef.current) {
      return;
    }

    // Clean up previous renderer
    if (rendererRef.current) {
      rendererRef.current.destroy();
    }

    // Clear container
    containerRef.current.innerHTML = '';

    // Reset state
    setDisplayedContent('');
    setIsComplete(false);
    setIsPaused(false);
    setIsStreaming(true);
    setProgress(0);
    setTokensPerSecond(0);

    // Determine speed
    let effectiveSpeed = speed;
    let effectiveDelay = customDelay;
    
    if (adaptiveSpeed && !customDelay) {
      const adaptive = getAdaptiveSpeed(content);
      effectiveDelay = adaptive.speed;
    }

    // Tokenize content
    const tokens = tokenizeForRender(content, segments);

    // Create renderer
    const renderer = new StreamRenderer({
      tokens,
      container: containerRef.current,
      speed: effectiveSpeed,
      customDelay: effectiveDelay,
      enableTypingSound,
      onToken: (token, index) => {
        onToken?.(token, index);
        // Update displayed content for text mode
        if (containerRef.current) {
          const text = containerRef.current.textContent || '';
          setDisplayedContent(text);
        }
      },
      onComplete: () => {
        setIsComplete(true);
        setIsStreaming(false);
        setIsPaused(false);
        setProgress(100);
        onComplete?.();
      },
    });

    rendererRef.current = renderer;

    // Start metrics polling
    const metricsInterval = setInterval(() => {
      if (rendererRef.current) {
        const metrics = rendererRef.current.getMetrics();
        metricsRef.current = metrics;
        setTokensPerSecond(metrics.tokensPerSecond);
        setProgress(rendererRef.current.getProgress());
      }
    }, 100);

    // Start rendering
    renderer.start();

    return () => {
      clearInterval(metricsInterval);
    };
  }, [isActive, content, adaptiveSpeed]); // Intentionally omitting speed/customDelay from deps

  // Control callbacks
  const pause = useCallback(() => {
    rendererRef.current?.pause();
    setIsPaused(true);
    setIsStreaming(false);
  }, []);

  const resume = useCallback(() => {
    rendererRef.current?.resume();
    setIsPaused(false);
    setIsStreaming(true);
  }, []);

  const toggle = useCallback(() => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  }, [isPaused, pause, resume]);

  const skip = useCallback(() => {
    rendererRef.current?.skipToEnd();
  }, []);

  const setSpeed = useCallback((newSpeed: StreamSpeed) => {
    rendererRef.current?.setSpeed(newSpeed);
  }, []);

  const setCustomDelay = useCallback((delay: number) => {
    rendererRef.current?.setSpeed(delay);
  }, []);

  const reset = useCallback(() => {
    rendererRef.current?.destroy();
    rendererRef.current = null;
    setDisplayedContent('');
    setIsComplete(false);
    setIsPaused(false);
    setIsStreaming(false);
    setProgress(0);
    setTokensPerSecond(0);
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
  }, [containerRef]);

  // Use sync external store for metrics to avoid re-renders
  const metrics = useSyncExternalStore(
    (callback) => {
      const interval = setInterval(callback, 100);
      return () => clearInterval(interval);
    },
    () => metricsRef.current,
    () => metricsRef.current
  );

  return {
    displayedContent,
    isComplete,
    progress,
    tokensPerSecond,
    isPaused,
    isStreaming,
    pause,
    resume,
    toggle,
    skip,
    setSpeed,
    setCustomDelay,
    metrics,
    segments,
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    reset,
  };
}

/**
 * Tokenize content for rendering based on analyzed segments
 */
function tokenizeForRender(content: string, segments: ContentSegment[]): string[] {
  if (segments.length === 0) {
    return content.split('');
  }

  const tokens: string[] = [];
  
  for (const segment of segments) {
    switch (segment.renderMode) {
      case 'character':
        tokens.push(...segment.content.split(''));
        break;
      case 'token':
        // Split by words/punctuation while preserving whitespace
        tokens.push(...segment.content.split(/(\s+)/).filter(Boolean));
        break;
      case 'line':
        // Split by lines
        tokens.push(...segment.content.split('\n').map((line, i, arr) => 
          i < arr.length - 1 ? line + '\n' : line
        ));
        break;
      case 'instant':
        // Render as single unit
        tokens.push(segment.content);
        break;
    }
  }
  
  return tokens;
}

/**
 * Hook for simplified stream control (just play/pause/skip)
 */
export function useStreamControls(
  streamRef: React.RefObject<{ 
    pause: () => void; 
    resume: () => void; 
    skipToEnd: () => void;
    setSpeed: (speed: number) => void;
  } | null>
) {
  const pause = useCallback(() => {
    streamRef.current?.pause();
  }, [streamRef]);

  const resume = useCallback(() => {
    streamRef.current?.resume();
  }, [streamRef]);

  const skip = useCallback(() => {
    streamRef.current?.skipToEnd();
  }, [streamRef]);

  const setSpeed = useCallback((speed: number) => {
    streamRef.current?.setSpeed(speed);
  }, [streamRef]);

  return { pause, resume, skip, setSpeed };
}

/**
 * Hook for tracking stream metrics without full animation control
 */
export function useStreamMetrics(
  rendererRef: React.RefObject<StreamRenderer | null>
): RenderMetrics {
  const [metrics, setMetrics] = useState<RenderMetrics>({
    currentIndex: 0,
    totalTokens: 0,
    tokensPerSecond: 0,
    elapsedTime: 0,
    isActive: false,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (rendererRef.current) {
        setMetrics(rendererRef.current.getMetrics());
      }
    }, 100);

    return () => clearInterval(interval);
  }, [rendererRef]);

  return metrics;
}

/**
 * Hook for detecting when user wants to pause on hover
 */
export function usePauseOnHover(
  containerRef: React.RefObject<HTMLElement | null>,
  onPause: () => void,
  onResume: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const element = containerRef.current;
    let wasStreaming = false;

    const handleMouseEnter = () => {
      if (rendererRef.current?.getComplete() === false) {
        wasStreaming = !rendererRef.current?.getPaused();
        onPause();
      }
    };

    const handleMouseLeave = () => {
      if (wasStreaming) {
        onResume();
        wasStreaming = false;
      }
    };

    // We need access to the renderer state, so this is a placeholder
    // The actual implementation would check if streaming is active
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [containerRef, onPause, onResume, enabled]);
}

// Reference to renderer for usePauseOnHover
let rendererRef: React.MutableRefObject<StreamRenderer | null> = { current: null };
