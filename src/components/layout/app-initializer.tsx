"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Bot } from "lucide-react";
import {
  registerServiceWorker,
  captureInstallPrompt,
} from "@/lib/pwa/service-worker-registration";
import { useAgentStore, useUIStore, useChatStore } from "@/stores";
import { initFilesStore } from "@/lib/files/file-store";
import { subscribeToQueue } from "@/lib/chat/offline-queue";
import { useMultiAgentHealthMonitor } from "@/hooks/use-health-monitor";
import { cn } from "@/lib/utils";

interface AppInitializerProps {
  children: ReactNode;
}

/**
 * App Initializer Component
 *
 * Handles app initialization including:
 * - Store hydration
 * - Service worker registration
 * - Network status monitoring
 * - Health monitoring initialization
 * - Loading state management
 */
export function AppInitializer({ children }: AppInitializerProps): React.JSX.Element {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Get store actions
  const loadAgents = useAgentStore((state) => state.loadAgents);
  const loadConversations = useChatStore((state) => state.loadAllConversations);
  const loadMessages = useChatStore((state) => state.loadAllMessages);
  const setOffline = useUIStore((state) => state.setOffline);
  const setQueuedMessageCount = useUIStore((state) => state.setQueuedMessageCount);

  // Get all agent IDs for health monitoring
  const agents = useAgentStore((state) => state.agents);
  const agentIds = Array.from(agents.keys());

  // Initialize health monitoring for all agents
  useMultiAgentHealthMonitor({
    agentIds,
    intervalMs: 60000, // 1 minute
    enabled: true,
    pauseWhenHidden: true,
  });

  // Initialize app
  useEffect(() => {
    const initialize = async () => {
      try {
        // Step 1: Capture install prompt early
        captureInstallPrompt();

        // Step 2: Register service worker
        registerServiceWorker({
          onSuccess: () => {
            console.log("[App] Service worker registered successfully");
          },
          onUpdate: () => {
            console.log("[App] Service worker update available");
          },
        });

        // Step 3: Set up network status monitoring
        const handleOnline = () => {
          setOffline(false);
          console.log("[App] Connection restored");
        };

        const handleOffline = () => {
          setOffline(true);
          console.log("[App] Connection lost");
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Set initial offline state
        setOffline(!navigator.onLine);

        // Step 4: Hydrate stores and initialize file storage
        await Promise.all([
          loadAgents(),
          loadConversations(),
          loadMessages(),
          initFilesStore(),
        ]);

        // Step 5: Set up queue monitoring
        const unsubscribeQueue = subscribeToQueue((count) => {
          setQueuedMessageCount(count);
        });

        // Mark initialization complete
        setIsInitializing(false);

        // Cleanup function
        return () => {
          window.removeEventListener("online", handleOnline);
          window.removeEventListener("offline", handleOffline);
          unsubscribeQueue();
        };
      } catch (error) {
        console.error("[App] Initialization failed:", error);
        setInitError(
          error instanceof Error ? error.message : "Failed to initialize app"
        );
        setIsInitializing(false);
      }
    };

    void initialize();
  }, [loadAgents, loadConversations, loadMessages, setOffline, setQueuedMessageCount]);

  // Show loading screen while initializing
  if (isInitializing) {
    return <LoadingScreen />;
  }

  // Show error screen if initialization failed
  if (initError) {
    return <ErrorScreen error={initError} />;
  }

  // Render children when initialized
  return <>{children}</>;
}

/**
 * Loading screen component
 */
function LoadingScreen(): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        {/* Logo */}
        <div className="relative">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-20 h-20 bg-accent/10 rounded-2xl flex items-center justify-center mb-6"
          >
            <Bot className="w-10 h-10 text-accent" />
          </motion.div>

          {/* Loading ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-2xl border-2 border-accent/20 border-t-accent"
          />
        </div>

        {/* Text */}
        <h1 className="text-2xl font-bold text-foreground mb-2">AgentLink</h1>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Initializing...
        </p>
      </motion.div>
    </div>
  );
}

/**
 * Error screen component
 */
function ErrorScreen({ error }: { error: string }): React.JSX.Element {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-md w-full text-center"
      >
        {/* Error Icon */}
        <div className="w-20 h-20 bg-error/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">⚠️</span>
        </div>

        {/* Error Message */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Failed to start
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          We encountered an error while initializing the app:
        </p>

        {/* Error Details */}
        <div className="bg-surface rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-error font-mono break-words">{error}</p>
        </div>

        {/* Retry Button */}
        <button
          onClick={handleRetry}
          className={cn(
            "px-6 py-3 bg-accent text-accent-foreground rounded-lg",
            "font-medium hover:bg-accent/90 transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          )}
        >
          Try again
        </button>
      </motion.div>
    </div>
  );
}

/**
 * Hydration wrapper to prevent hydration mismatches
 */
export function HydrationWrapper({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background">
        {/* Pre-hydration placeholder */}
      </div>
    );
  }

  return <>{children}</>;
}
