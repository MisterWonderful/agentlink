"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Users, Search, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore, useUIStore } from "@/stores";

const navigation = [
  { name: "Agents", href: "/agents", icon: Users },
  { name: "Search", href: "/search", icon: Search },
  { name: "Settings", href: "/settings", icon: Settings },
] as const;

interface MobileNavProps {
  /** Optional className for styling overrides */
  className?: string;
}

/**
 * Mobile bottom tab bar navigation component
 * 
 * Features:
 * - Active tab highlighting with smooth animation
 * - Safe area padding for iOS devices
 * - Haptic feedback support (when enabled in settings)
 * - Fixed position at bottom of viewport
 * - Only visible on mobile (< 768px)
 */
export function MobileNav({ className }: MobileNavProps): React.JSX.Element {
  const pathname = usePathname();
  const { hapticFeedback } = useSettingsStore();
  const { isOffline } = useUIStore();

  const handleTabPress = (): void => {
    // Trigger haptic feedback if enabled and device supports it
    if (hapticFeedback && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
  };

  // Check if any agent-related page is active for the Agents tab
  const isAgentsActive = pathname === "/agents" || 
    pathname === "/" || 
    pathname.startsWith("/agents/");

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-50",
        "bg-surface border-t border-border",
        "safe-bottom",
        "transition-transform duration-300 ease-in-out",
        className
      )}
      aria-label="Mobile navigation"
    >
      {/* Offline indicator strip */}
      {isOffline && (
        <div className="absolute -top-6 left-0 right-0 h-6 bg-warning/10 flex items-center justify-center">
          <span className="text-xs text-warning font-medium">Offline</span>
        </div>
      )}

      <div className="flex items-center justify-around h-16 px-2">
        {navigation.map((item) => {
          const isActive = item.href === "/agents" 
            ? isAgentsActive 
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleTabPress}
              className={cn(
                "relative flex flex-col items-center justify-center",
                "py-2 px-4 min-w-[64px] rounded-lg",
                "transition-colors duration-200",
                isActive
                  ? "text-accent"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-accent/10 rounded-lg"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}

              <item.icon 
                className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isActive && "scale-110"
                )} 
              />
              <span className={cn(
                "text-xs mt-1 font-medium",
                isActive && "text-accent"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
