"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { OfflineIndicator } from "@/components/layout/offline-indicator";
import { InstallPrompt, IOSInstallInstructions } from "@/components/pwa/install-prompt";
import { UpdatePrompt } from "@/components/pwa/update-prompt";

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * Main authenticated layout component
 * 
 * Features:
 * - Mobile: Bottom nav only with full-screen content
 * - Desktop: Sidebar (280px) + main content area
 * - Responsive switching at 768px breakpoint
 * - Smooth page transitions with framer-motion
 * - Offline indicator banner
 * - Safe area support for mobile devices
 * - PWA install and update prompts
 */
export default function MainLayout({ children }: MainLayoutProps): React.JSX.Element {
  return (
    <div className="flex min-h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden md:flex h-screen shrink-0">
        <AppSidebar />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Update Prompt - shows when new version available */}
        <UpdatePrompt />

        {/* Offline Indicator */}
        <OfflineIndicator position="top" />

        {/* Page Content with Transitions */}
        <div className="flex-1 overflow-auto scrollbar-dark relative scroll-smooth-momentum">
          <AnimatePresence mode="wait">
            <motion.div
              key={typeof window !== "undefined" ? window.location.pathname : "initial"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{
                duration: 0.2,
                ease: "easeInOut",
              }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile Navigation - hidden on desktop */}
        <MobileNav />

        {/* PWA Install Prompt */}
        <InstallPrompt />

        {/* iOS Install Instructions */}
        <IOSInstallInstructions />
      </main>
    </div>
  );
}
