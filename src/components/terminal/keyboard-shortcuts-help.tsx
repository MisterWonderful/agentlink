"use client";

/**
 * Keyboard Shortcuts Help Component
 * 
 * Displays all available keyboard shortcuts in a modal/dialog.
 * Organized by category for easy reference.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Keyboard,
  Command,
  MessageSquare,
  FileText,
  Zap,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface KeyboardShortcutsHelpProps {
  /** Control open state externally */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Render as dialog or inline */
  variant?: "dialog" | "inline";
  /** Additional class name */
  className?: string;
}

interface ShortcutGroup {
  title: string;
  icon: React.ReactNode;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

/**
 * Get keyboard shortcuts organized by category
 */
function getShortcuts(isMac: boolean): ShortcutGroup[] {
  const mod = isMac ? "⌘" : "Ctrl";
  const alt = isMac ? "⌥" : "Alt";
  const shift = "⇧";
  
  return [
    {
      title: "General",
      icon: <Command className="h-4 w-4" />,
      shortcuts: [
        { keys: [mod, "K"], description: "Open command palette / quick actions" },
        { keys: [mod, "/"], description: "Toggle quick actions tray" },
        { keys: ["Esc"], description: "Close menus, dialogs, or cancel action" },
        { keys: ["?"], description: "Show this help dialog" },
      ],
    },
    {
      title: "Chat",
      icon: <MessageSquare className="h-4 w-4" />,
      shortcuts: [
        { keys: [mod, "Enter"], description: "Send message" },
        { keys: [shift, "Enter"], description: "New line in message" },
        { keys: ["↑"], description: "Previous message in history (when input empty)" },
        { keys: ["↓"], description: "Next message in history (when input empty)" },
        { keys: [mod, "Shift", "↑"], description: "Edit last message" },
      ],
    },
    {
      title: "Editor",
      icon: <FileText className="h-4 w-4" />,
      shortcuts: [
        { keys: [mod, "B"], description: "Bold text" },
        { keys: [mod, "I"], description: "Italic text" },
        { keys: [mod, "E"], description: "Inline code" },
        { keys: [mod, "Shift", "E"], description: "Code block" },
        { keys: [mod, "K"], description: "Add link" },
        { keys: ["/"], description: "Open slash commands" },
        { keys: ["@"], description: "Open mentions" },
        { keys: ["Tab"], description: "Accept autocomplete suggestion" },
      ],
    },
    {
      title: "Streaming",
      icon: <Zap className="h-4 w-4" />,
      shortcuts: [
        { keys: ["Space"], description: "Pause/resume streaming" },
        { keys: [mod, "."], description: "Stop generation" },
        { keys: ["End"], description: "Skip to end" },
        { keys: ["Hover"], description: "Pause on hover during streaming" },
      ],
    },
  ];
}

/**
 * Keyboard Key Component
 */
function Key({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center",
        "min-w-[1.5rem] h-6 px-1.5",
        "bg-muted border border-border/50 rounded-md",
        "text-xs font-medium text-foreground",
        "shadow-sm",
        className
      )}
    >
      {children}
    </kbd>
  );
}

/**
 * Shortcut Row Component
 */
function ShortcutRow({
  keys,
  description,
  isMac,
}: {
  keys: string[];
  description: string;
  isMac: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <span key={index} className="flex items-center">
            <Key>{key}</Key>
            {index < keys.length - 1 && (
              <span className="mx-1 text-muted-foreground">+</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Keyboard Shortcuts Help Component
 */
export function KeyboardShortcutsHelp({
  open: controlledOpen,
  onOpenChange,
  variant = "dialog",
  className,
}: KeyboardShortcutsHelpProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  // Handle controlled/uncontrolled state
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;

  // Detect platform
  useEffect(() => {
    setIsMac(navigator.platform.toLowerCase().includes("mac"));
  }, []);

  // Listen for ? key to open help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Don't trigger in input fields
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) {
          return;
        }
        setIsOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setIsOpen]);

  const shortcuts = getShortcuts(isMac);

  const content = (
    <div className={cn("space-y-6", className)}>
      {shortcuts.map((group) => (
        <div key={group.title}>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-md bg-accent/10 text-accent">
              {group.icon}
            </div>
            <h3 className="font-semibold text-sm">{group.title}</h3>
          </div>
          <div className="space-y-1">
            {group.shortcuts.map((shortcut, index) => (
              <ShortcutRow
                key={index}
                keys={shortcut.keys}
                description={shortcut.description}
                isMac={isMac}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Tip */}
      <div className="pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground text-center">
          Tip: Press <Key className="mx-1">Esc</Key> to close any dialog or menu
        </p>
      </div>
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Keyboard className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
        </div>
        {content}
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Keyboard shortcuts"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-accent" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Keyboard shortcut badge for inline display
 */
export function KeyboardShortcut({
  keys,
  className,
}: {
  keys: string[];
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {keys.map((key, index) => (
        <kbd
          key={index}
          className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono font-medium"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}

export default KeyboardShortcutsHelp;
