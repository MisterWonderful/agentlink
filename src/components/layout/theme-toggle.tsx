"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Monitor, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUIStore } from "@/stores";
import type { Theme } from "@/types";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  /** Optional className for styling overrides */
  className?: string;
  /** Whether to show label text alongside icon */
  showLabel?: boolean;
  /** Variant of the trigger button */
  variant?: "default" | "outline" | "ghost";
  /** Size of the trigger button */
  size?: "default" | "sm" | "lg" | "icon";
}

const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * Theme toggle component with dropdown menu
 * 
 * Features:
 * - System, Light, Dark theme options
 * - Animated icon transitions
 * - Accessible dropdown menu
 * - Syncs with UI store and document class
 */
export function ThemeToggle({
  className,
  showLabel = false,
  variant = "ghost",
  size = "icon",
}: ThemeToggleProps): React.ReactElement {
  const { theme, setTheme } = useUIStore();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const currentTheme = themes.find((t) => t.value === theme) || themes[2];
  const Icon = currentTheme.icon;

  if (!mounted) {
    return (
      <Button variant={variant} size={size} className={className} aria-label="Loading theme">
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn("gap-2", className)}
          aria-label={`Current theme: ${currentTheme.label}. Click to change.`}
        >
          <motion.div
            key={theme}
            initial={{ scale: 0.8, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.8, rotate: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Icon className="h-[1.2rem] w-[1.2rem]" />
          </motion.div>
          {showLabel && <span>{currentTheme.label}</span>}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        {themes.map((t) => {
          const ThemeIcon = t.icon;
          const isActive = theme === t.value;

          return (
            <DropdownMenuItem
              key={t.value}
              onClick={() => handleThemeChange(t.value)}
              className="gap-3 cursor-pointer"
            >
              <ThemeIcon className="h-4 w-4" />
              <span className="flex-1">{t.label}</span>
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.15 }}
                >
                  <Check className="h-4 w-4 text-accent" />
                </motion.div>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Simple theme toggle button (cycles through themes)
 */
export function SimpleThemeToggle({
  className,
  variant = "ghost",
  size = "icon",
}: Omit<ThemeToggleProps, "showLabel">): React.ReactElement {
  const { theme, setTheme } = useUIStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const cycleTheme = () => {
    const themeOrder: Theme[] = ["light", "dark", "system"];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  };

  if (!mounted) {
    return (
      <Button variant={variant} size={size} className={className}>
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={cycleTheme}
      className={className}
      aria-label={`Current theme: ${theme}. Click to cycle.`}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 90, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {theme === "light" && <Sun className="h-[1.2rem] w-[1.2rem]" />}
        {theme === "dark" && <Moon className="h-[1.2rem] w-[1.2rem]" />}
        {theme === "system" && <Monitor className="h-[1.2rem] w-[1.2rem]" />}
      </motion.div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
