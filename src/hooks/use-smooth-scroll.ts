"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseSmoothScrollOptions {
  containerRef?: React.RefObject<HTMLElement | null>;
  threshold?: number;
  behavior?: ScrollBehavior;
}

export interface UseSmoothScrollReturn {
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  scrollToMessage: (messageId: string, behavior?: ScrollBehavior) => void;
  scrollToTop: (behavior?: ScrollBehavior) => void;
  isAtBottom: boolean;
  isAtTop: boolean;
  scrollProgress: number;
}

export function useSmoothScroll(
  options: UseSmoothScrollOptions = {}
): UseSmoothScrollReturn {
  const { containerRef, threshold = 100, behavior = "smooth" } = options;

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getContainer = useCallback(() => {
    return containerRef?.current || window;
  }, [containerRef]);

  const getScrollHeight = useCallback(() => {
    const container = getContainer();
    if (container === window) {
      return document.documentElement.scrollHeight;
    }
    return (container as HTMLElement).scrollHeight;
  }, [getContainer]);

  const getClientHeight = useCallback(() => {
    const container = getContainer();
    if (container === window) {
      return window.innerHeight;
    }
    return (container as HTMLElement).clientHeight;
  }, [getContainer]);

  const getScrollTop = useCallback(() => {
    const container = getContainer();
    if (container === window) {
      return window.scrollY || document.documentElement.scrollTop;
    }
    return (container as HTMLElement).scrollTop;
  }, [getContainer]);

  const updateScrollState = useCallback(() => {
    const scrollTop = getScrollTop();
    const scrollHeight = getScrollHeight();
    const clientHeight = getClientHeight();

    const atBottom = scrollHeight - scrollTop - clientHeight < threshold;
    const atTop = scrollTop < threshold;
    const progress =
      scrollHeight > clientHeight
        ? (scrollTop / (scrollHeight - clientHeight)) * 100
        : 0;

    setIsAtBottom(atBottom);
    setIsAtTop(atTop);
    setScrollProgress(Math.min(100, Math.max(0, progress)));
  }, [getScrollTop, getScrollHeight, getClientHeight, threshold]);

  useEffect(() => {
    const container = getContainer();
    const element = container === window ? document : (container as HTMLElement);

    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Throttle scroll state updates
      scrollTimeoutRef.current = setTimeout(updateScrollState, 50);
    };

    element.addEventListener("scroll", handleScroll, { passive: true });
    updateScrollState();

    return () => {
      element.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [getContainer, updateScrollState]);

  const scrollToBottom = useCallback(
    (overrideBehavior?: ScrollBehavior) => {
      const container = getContainer();
      const scrollHeight = getScrollHeight();
      const clientHeight = getClientHeight();

      if (container === window) {
        window.scrollTo({
          top: scrollHeight - clientHeight,
          behavior: overrideBehavior || behavior,
        });
      } else {
        (container as HTMLElement).scrollTo({
          top: scrollHeight - clientHeight,
          behavior: overrideBehavior || behavior,
        });
      }
    },
    [getContainer, getScrollHeight, getClientHeight, behavior]
  );

  const scrollToTop = useCallback(
    (overrideBehavior?: ScrollBehavior) => {
      const container = getContainer();

      if (container === window) {
        window.scrollTo({
          top: 0,
          behavior: overrideBehavior || behavior,
        });
      } else {
        (container as HTMLElement).scrollTo({
          top: 0,
          behavior: overrideBehavior || behavior,
        });
      }
    },
    [getContainer, behavior]
  );

  const scrollToMessage = useCallback(
    (messageId: string, overrideBehavior?: ScrollBehavior) => {
      const element = document.getElementById(`message-${messageId}`);
      if (element) {
        element.scrollIntoView({
          behavior: overrideBehavior || behavior,
          block: "center",
        });
      }
    },
    [behavior]
  );

  return {
    scrollToBottom,
    scrollToMessage,
    scrollToTop,
    isAtBottom,
    isAtTop,
    scrollProgress,
  };
}

/**
 * Hook specifically for chat message list auto-scroll
 */
export interface UseChatAutoScrollOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  messagesCount: number;
  isStreaming: boolean;
  enabled?: boolean;
}

export function useChatAutoScroll(
  options: UseChatAutoScrollOptions
): { scrollToBottom: () => void; isAtBottom: boolean } {
  const { containerRef, messagesCount, isStreaming, enabled = true } = options;

  const scrollState = useSmoothScroll({ containerRef });
  const previousMessageCount = useRef(messagesCount);
  const userScrolledRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll on new messages or streaming
  useEffect(() => {
    if (!enabled) return;

    const hasNewMessages = messagesCount > previousMessageCount.current;
    previousMessageCount.current = messagesCount;

    // Only auto-scroll if user hasn't manually scrolled up, or if streaming
    if ((hasNewMessages && (scrollState.isAtBottom || !userScrolledRef.current)) || isStreaming) {
      // Small delay to allow DOM to update
      timeoutRef.current = setTimeout(() => {
        scrollState.scrollToBottom("auto");
      }, 50);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [messagesCount, isStreaming, enabled, scrollState]);

  // Track user scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      userScrolledRef.current = !scrollState.isAtBottom;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [containerRef, scrollState.isAtBottom]);

  return {
    scrollToBottom: () => scrollState.scrollToBottom("smooth"),
    isAtBottom: scrollState.isAtBottom,
  };
}
