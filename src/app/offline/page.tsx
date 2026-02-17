"use client";

import React from "react";
import { WifiOff, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

/**
 * Offline Page
 *
 * Fallback page shown when the user is offline and the requested page
 * is not available in the cache.
 */
export default function OfflinePage(): React.ReactElement {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full text-center"
      >
        {/* Offline Icon */}
        <div className="w-24 h-24 bg-warning/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <WifiOff className="w-12 h-12 text-warning" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-4">
          You&apos;re offline
        </h1>

        {/* Description */}
        <p className="text-muted-foreground mb-8">
          It looks like you&apos;ve lost your internet connection. 
          Some features may be unavailable until you&apos;re back online.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleRefresh}
            className="w-full gap-2"
            size="lg"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full gap-2"
            size="lg"
          >
            <Link href="/agents">
              <ArrowLeft className="w-4 h-4" />
              Back to Chats
            </Link>
          </Button>
        </div>

        {/* Helpful tips */}
        <div className="mt-8 p-4 bg-surface rounded-xl border border-border">
          <h2 className="text-sm font-medium text-foreground mb-2">
            What you can do offline:
          </h2>
          <ul className="text-sm text-muted-foreground space-y-1 text-left list-disc list-inside">
            <li>View cached conversations</li>
            <li>Read previous messages</li>
            <li>Queue messages to send later</li>
            <li>Manage your agents</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
