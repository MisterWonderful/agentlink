"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Loader2 } from "lucide-react";
import { useUIStore } from "@/stores";
import { cn } from "@/lib/utils";

interface OfflineIndicatorProps {
  /** Optional className for styling overrides */
  className?: string;
  /** Position of the indicator */
  position?: "top" | "bottom";
}

// Subscribe to online/offline events
function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

/**
 * Offline indicator banner component
 * 
 * Features:
 * - Shows "You are offline" banner when network is down
 * - Displays queued message count
 * - Smooth slide-in/slide-out animations
 * - Auto-detects online/offline status
 * - Shows reconnection state
 */
export function OfflineIndicator({
  className,
  position = "top",
}: OfflineIndicatorProps): React.ReactElement {
  const { queuedMessageCount } = useUIStore();
  
  // Use sync external store for online status
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  
  // Track previous online state to detect changes
  const [wasOnline, setWasOnline] = useState(isOnline);
  const [showReconnecting, setShowReconnecting] = useState(false);
  
  // Compute display state
  const showOffline = !wasOnline || (!isOnline && !showReconnecting);

  /* eslint-disable react-hooks/set-state-in-effect -- This is intentional state synchronization with external browser API */
  useEffect(() => {
    // Just came online
    if (isOnline && !wasOnline) {
      setShowReconnecting(true);
      const timer = setTimeout(() => {
        setShowReconnecting(false);
        setWasOnline(true);
      }, 500);
      return () => clearTimeout(timer);
    }
    
    // Just went offline
    if (!isOnline && wasOnline) {
      setWasOnline(false);
      setShowReconnecting(false);
    }
  }, [isOnline, wasOnline]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const positionClasses = position === "top" 
    ? "top-0 safe-top" 
    : "bottom-16 md:bottom-0 safe-bottom";

  return (
    <AnimatePresence>
      {(!showOffline && showReconnecting) || showOffline ? (
        <motion.div
          initial={{ y: position === "top" ? -50 : 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: position === "top" ? -50 : 50, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={cn(
            "fixed left-0 right-0 z-50",
            positionClasses,
            className
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-2",
              "bg-warning/90 backdrop-blur-sm text-warning-foreground",
              "shadow-lg",
              position === "top" ? "border-b border-warning" : "border-t border-warning"
            )}
          >
            {showReconnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Reconnecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                <span className="text-sm font-medium">
                  You are offline
                  {queuedMessageCount > 0 && (
                    <span className="ml-1">
                      • {queuedMessageCount} message{queuedMessageCount !== 1 ? "s" : ""} queued
                    </span>
                  )}
                </span>
              </>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// Subscribe function for offline status (always returns true on server)
function subscribeOffline(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  
  const handler = () => callback();
  window.addEventListener("offline", handler);
  return () => window.removeEventListener("offline", handler);
}

function getOfflineSnapshot(): boolean {
  return typeof navigator !== "undefined" ? !navigator.onLine : false;
}

function getServerOfflineSnapshot(): boolean {
  return false;
}

/**
 * Compact offline status dot for inline use
 */
export function OfflineStatusDot({ className }: { className?: string }): React.ReactElement | null {
  const isOffline = useSyncExternalStore(
    subscribeOffline,
    getOfflineSnapshot,
    getServerOfflineSnapshot
  );

  if (!isOffline) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        "h-2 w-2 rounded-full bg-warning",
        className
      )}
      title="Offline"
    />
  );
}

/**
 * Online status indicator with text
 */
export function ConnectionStatus({ className }: { className?: string }): React.ReactElement {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Use requestAnimationFrame to avoid direct setState in effect body
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
        <span className="text-sm">Checking...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex items-center gap-2",
        !isOnline ? "text-warning" : "text-success",
        className
      )}
    >
      <motion.div
        animate={!isOnline ? {} : { scale: [1, 1.2, 1] }}
        transition={!isOnline ? {} : { duration: 2, repeat: Infinity }}
        className={cn(
          "h-2 w-2 rounded-full",
          !isOnline ? "bg-warning" : "bg-success"
        )}
      />
      <span className="text-sm font-medium">
        {!isOnline ? "Offline" : "Online"}
      </span>
    </motion.div>
  );
}
