"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface MessageActionsProps {
  onCopy: () => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
  showRegenerate?: boolean;
  className?: string;
}

export function MessageActions({
  onCopy,
  onRegenerate,
  onDelete,
  showRegenerate = false,
  className,
}: MessageActionsProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDelete = () => {
    if (onDelete && confirm("Delete this message?")) {
      onDelete();
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        className={cn(
          "flex items-center gap-1 p-1 rounded-lg bg-surface/80 backdrop-blur-sm border border-border/50",
          className
        )}
      >
        {/* Copy Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                {isCopied ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{isCopied ? "Copied!" : "Copy message"}</p>
          </TooltipContent>
        </Tooltip>

        {/* Regenerate Button */}
        {showRegenerate && onRegenerate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRegenerate}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Regenerate response</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Delete Button */}
        {onDelete && (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="h-7 w-7 text-muted-foreground hover:text-error"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Delete message</p>
            </TooltipContent>
          </Tooltip>
        )}
      </motion.div>
    </TooltipProvider>
  );
}
