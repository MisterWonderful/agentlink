"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  subscribeToMessages,
  updateApp,
  skipWaiting,
} from "@/lib/pwa/service-worker-registration";
import { toast } from "sonner";

/**
 * PWA Update Prompt Component
 *
 * Notifies users when a new version of the app is available.
 * Allows users to update immediately or dismiss the notification.
 */
export function UpdatePrompt(): React.JSX.Element | null {
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Listen for service worker updates
  useEffect(() => {
    // Subscribe to messages from service worker
    const unsubscribe = subscribeToMessages((event) => {
      if (event.data?.type === "SW_UPDATE") {
        setIsVisible(true);
      }
    });

    // Check for waiting service worker on mount
    const checkForWaitingSW = async () => {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration.waiting) {
          setRegistration(registration);
          setIsVisible(true);
        }

        // Also listen for new updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                setRegistration(registration);
                setIsVisible(true);
              }
            });
          }
        });
      }
    };

    void checkForWaitingSW();

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle update action
  const handleUpdate = useCallback(async () => {
    setIsUpdating(true);

    try {
      // Show updating toast
      toast.loading("Updating AgentLink...", {
        id: "app-update",
        duration: 10000,
      });

      // Skip waiting and reload
      await updateApp();
    } catch (error) {
      console.error("[PWA] Update failed:", error);
      toast.error("Update failed. Please try again.", {
        id: "app-update",
      });
      setIsUpdating(false);
    }
  }, []);

  // Handle dismiss action
  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    // Remind again in 1 hour
    setTimeout(() => {
      if (registration?.waiting) {
        setIsVisible(true);
      }
    }, 60 * 60 * 1000);
  }, [registration]);

  // Handle update later (skip waiting without reload)
  const handleUpdateLater = useCallback(async () => {
    await skipWaiting();
    setIsVisible(false);
    toast.info("Update will apply on next visit", {
      duration: 3000,
    });
  }, []);

  // Don't render if not visible
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[100] safe-top"
        >
          <div className="bg-accent text-accent-foreground shadow-lg">
            <div className="max-w-screen-xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                {/* Icon and Message */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">
                      Update available
                    </p>
                    <p className="text-xs opacity-80 truncate">
                      A new version of AgentLink is ready
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    size="sm"
                    variant="secondary"
                    className="bg-white text-accent hover:bg-white/90 gap-1.5"
                  >
                    {isUpdating ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    Update now
                  </Button>

                  <button
                    onClick={handleDismiss}
                    disabled={isUpdating}
                    className="p-2 opacity-70 hover:opacity-100 transition-opacity disabled:opacity-50"
                    aria-label="Dismiss update prompt"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Alternative inline update banner for use in settings or about page
 */
export function InlineUpdatePrompt(): React.JSX.Element | null {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkForUpdates = useCallback(async () => {
    setIsChecking(true);

    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration) {
          await registration.update();
          if (registration.waiting) {
            setUpdateAvailable(true);
          } else {
            toast.info("You&apos;re on the latest version", {
              duration: 3000,
            });
          }
        }
      }
    } catch (error) {
      console.error("[PWA] Check for updates failed:", error);
      toast.error("Failed to check for updates");
    } finally {
      setIsChecking(false);
    }
  }, []);

  const handleUpdate = useCallback(async () => {
    toast.loading("Updating...", { id: "inline-update" });
    await updateApp();
  }, []);

  if (!updateAvailable) {
    return (
      <button
        onClick={checkForUpdates}
        disabled={isChecking}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        {isChecking ? "Checking..." : "Check for updates"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-accent/10 border border-accent/20 rounded-lg">
      <Sparkles className="w-5 h-5 text-accent" />
      <div className="flex-1">
        <p className="text-sm font-medium">Update available</p>
        <p className="text-xs text-muted-foreground">
          A new version is ready to install
        </p>
      </div>
      <Button onClick={handleUpdate} size="sm" className="gap-1.5">
        <RefreshCw className="w-3.5 h-3.5" />
        Update
      </Button>
    </div>
  );
}

/**
 * Hook to manually trigger update checks
 */
export function useUpdateChecker(): {
  checkForUpdates: () => Promise<boolean>;
  updateAvailable: boolean;
  applyUpdate: () => Promise<void>;
} {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    if (!("serviceWorker" in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      const hasUpdate = !!registration.waiting;
      setUpdateAvailable(hasUpdate);
      return hasUpdate;
    } catch (error) {
      console.error("[PWA] Update check failed:", error);
      return false;
    }
  }, []);

  const applyUpdate = useCallback(async (): Promise<void> => {
    await updateApp();
  }, []);

  return { checkForUpdates, updateAvailable, applyUpdate };
}
