"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isInstallPromptAvailable,
  showInstallPrompt,
  onAppInstalled,
  isStandalone,
  canInstall,
} from "@/lib/pwa/service-worker-registration";

/**
 * PWA Install Prompt Component
 *
 * Shows a prompt to install the app as a PWA.
 * Only appears when:
 * - The app is not already installed
 * - The install prompt is available (browser supports it)
 * - User hasn't dismissed the prompt recently
 */
export function InstallPrompt(): React.JSX.Element | null {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if prompt should be shown
  useEffect(() => {
    // Don't show if already installed
    if (isStandalone()) return;

    // Don't show if can't install
    if (!canInstall()) return;

    // Check if user dismissed recently (within 7 days)
    const dismissedAt = localStorage.getItem("installPromptDismissed");
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed =
        (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return;
    }

    // Show prompt when install is available
    const checkInstallAvailability = () => {
      if (isInstallPromptAvailable()) {
        setIsVisible(true);
      }
    };

    // Check immediately
    checkInstallAvailability();

    // Also check periodically as the prompt might become available later
    const interval = setInterval(checkInstallAvailability, 1000);

    // Listen for install completion
    const unsubscribe = onAppInstalled(() => {
      setIsVisible(false);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  // Handle install action
  const handleInstall = useCallback(async () => {
    const accepted = await showInstallPrompt();
    if (accepted) {
      setIsVisible(false);
    }
  }, []);

  // Handle dismiss action
  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem("installPromptDismissed", new Date().toISOString());
  }, []);

  // Don't render if dismissed or not visible
  if (isDismissed || !isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
        >
          <div className="bg-surface border border-border rounded-2xl shadow-2xl p-4 safe-bottom">
            <div className="flex items-start gap-3">
              {/* App Icon Placeholder */}
              <div className="flex-shrink-0 w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-accent" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">
                  Install AgentLink
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add to your home screen for quick access and offline support.
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss install prompt"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Install Button */}
            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleInstall}
                className="flex-1 gap-2"
                size="sm"
              >
                <Download className="w-4 h-4" />
                Install App
              </Button>
              <Button
                variant="ghost"
                onClick={handleDismiss}
                size="sm"
                className="text-muted-foreground"
              >
                Not now
              </Button>
            </div>

            {/* Platform-specific hint */}
            <p className="text-xs text-muted-foreground mt-3 text-center">
              {getInstallHint()}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Get platform-specific install hint
 */
function getInstallHint(): string {
  if (typeof navigator === "undefined") return "";

  const userAgent = navigator.userAgent.toLowerCase();

  // iOS Safari
  if (/iphone|ipad|ipod/.test(userAgent) && /safari/.test(userAgent)) {
    return "Tap the share button, then \"Add to Home Screen\"";
  }

  // Android Chrome
  if (/android/.test(userAgent) && /chrome/.test(userAgent)) {
    return "Tap the menu button, then \"Add to Home screen\"";
  }

  // Desktop Chrome/Edge
  if (/chrome/.test(userAgent) || /edg/.test(userAgent)) {
    return "Look for the install icon in the address bar";
  }

  return "";
}

/**
 * iOS-specific install instructions component
 * Shows when on iOS Safari and install prompt is not available
 */
export function IOSInstallInstructions(): React.JSX.Element | null {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show on iOS Safari in browser (not standalone)
    if (typeof navigator === "undefined") return;
    if (isStandalone()) return;

    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);

    if (isIOS && isSafari) {
      // Check if user has seen instructions
      const hasSeenInstructions = localStorage.getItem("iosInstallSeen");
      if (!hasSeenInstructions) {
        setIsVisible(true);
      }
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    localStorage.setItem("iosInstallSeen", "true");
  }, []);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80"
    >
      <div className="bg-accent text-accent-foreground rounded-2xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium">
              To install AgentLink on iOS:
            </p>
            <ol className="text-sm mt-2 space-y-1 list-decimal list-inside opacity-90">
              <li>Tap the share button</li>
              <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
            </ol>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Dismiss instructions"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
