"use client";

/**
 * FileDropZone Component
 * 
 * Drag and drop overlay with visual feedback, file type validation,
 * and animated drop indicator. Supports full-screen and inline modes.
 */

import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileCheck, FileX, Image, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDragDrop } from "@/hooks/use-drag-drop";
import { formatFileSize, type FileCategory } from "@/lib/files/file-types";

export interface FileDropZoneProps {
  /** Callback when files are dropped */
  onFilesDrop: (files: File[]) => void;
  /** Accepted file types (MIME types or extensions like ['image/*', '.pdf']) */
  accept?: string[];
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Maximum number of files */
  maxFiles?: number;
  /** Child elements */
  children: React.ReactNode;
  /** Whether to show full-screen overlay on drag */
  fullScreen?: boolean;
  /** Custom className */
  className?: string;
  /** Whether drop zone is disabled */
  disabled?: boolean;
  /** Visual variant */
  variant?: "default" | "subtle" | "bordered";
}

/**
 * Get icon for file type
 */
function getFileTypeIcon(accept?: string[]): React.ReactNode {
  if (!accept) return <Upload className="h-12 w-12" />;

  const hasImages = accept.some((t) => t.startsWith("image/"));
  const hasDocuments = accept.some(
    (t) => t.includes("pdf") || t.includes("doc") || t.includes("text")
  );

  if (hasImages && !hasDocuments) {
    return <Image className="h-12 w-12" />;
  }
  if (hasDocuments && !hasImages) {
    return <FileText className="h-12 w-12" />;
  }
  return <Upload className="h-12 w-12" />;
}

/**
 * Format accept array for display
 */
function formatAcceptTypes(accept?: string[]): string {
  if (!accept) return "any file";
  if (accept.length <= 3) return accept.join(", ");
  return `${accept.slice(0, 3).join(", ")}...`;
}

export function FileDropZone({
  onFilesDrop,
  accept,
  maxSize,
  maxFiles,
  children,
  fullScreen = true,
  className,
  disabled = false,
  variant = "default",
}: FileDropZoneProps) {
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDrop = useCallback(
    (files: File[]) => {
      setDroppedFiles(files);
      onFilesDrop(files);
      // Clear after animation
      setTimeout(() => setDroppedFiles([]), 1000);
    },
    [onFilesDrop]
  );

  const { isDragging, isValidDrag, dragProps } = useDragDrop({
    onDrop: handleDrop,
    accept,
    maxSize,
    maxFiles,
    enabled: !disabled,
    multiple: maxFiles !== 1,
  });

  const isActive = isDragging && isValidDrag && !disabled;

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      {...dragProps}
    >
      {/* Main content */}
      <div
        className={cn(
          "transition-opacity duration-200",
          isActive && fullScreen && "opacity-50"
        )}
      >
        {children}
      </div>

      {/* Drop overlay */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "pointer-events-none flex flex-col items-center justify-center z-50",
              fullScreen
                ? "fixed inset-0 bg-background/95 backdrop-blur-sm"
                : "absolute inset-0 bg-background/90 backdrop-blur-sm rounded-lg"
            )}
          >
            {/* Animated border container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "relative p-12 rounded-2xl border-4 border-dashed",
                "flex flex-col items-center gap-6 text-center max-w-md mx-4",
                variant === "default" && "border-accent bg-accent/5",
                variant === "subtle" && "border-muted-foreground/30 bg-surface",
                variant === "bordered" && "border-2 border-border bg-card"
              )}
            >
              {/* Pulsing ring effect */}
              <motion.div
                className={cn(
                  "absolute inset-0 rounded-2xl",
                  variant === "default" && "bg-accent/10",
                  variant === "subtle" && "bg-muted/10",
                  variant === "bordered" && "bg-primary/5"
                )}
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Icon */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className={cn(
                  "relative z-10 p-4 rounded-full",
                  variant === "default" && "bg-accent/20 text-accent",
                  variant === "subtle" && "bg-muted text-muted-foreground",
                  variant === "bordered" && "bg-primary/10 text-primary"
                )}
              >
                {getFileTypeIcon(accept)}
              </motion.div>

              {/* Text */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="relative z-10 space-y-2"
              >
                <h3 className="text-xl font-semibold text-foreground">
                  Drop files here
                </h3>
                <p className="text-sm text-muted-foreground">
                  Accepts {formatAcceptTypes(accept)}
                </p>
                {maxSize && (
                  <p className="text-xs text-muted-foreground">
                    Max size: {formatFileSize(maxSize)}
                  </p>
                )}
                {maxFiles && (
                  <p className="text-xs text-muted-foreground">
                    Max files: {maxFiles}
                  </p>
                )}
              </motion.div>

              {/* File preview on hover */}
              {droppedFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative z-10 mt-4 space-y-2"
                >
                  {droppedFiles.slice(0, 3).map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <FileCheck className="h-4 w-4 text-success" />
                      <span className="truncate max-w-[200px]">{file.name}</span>
                      <span className="text-xs">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                  ))}
                  {droppedFiles.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{droppedFiles.length - 3} more
                    </p>
                  )}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Invalid drag indicator */}
        {isDragging && !isValidDrag && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "pointer-events-none flex flex-col items-center justify-center z-50",
              fullScreen
                ? "fixed inset-0 bg-error/10 backdrop-blur-sm"
                : "absolute inset-0 bg-error/5 backdrop-blur-sm rounded-lg"
            )}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="p-8 rounded-2xl border-4 border-dashed border-error/50 bg-error/5 flex flex-col items-center gap-4"
            >
              <FileX className="h-12 w-12 text-error" />
              <p className="text-lg font-medium text-error">
                Invalid file type
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Inline drop zone for embedding in forms
 */
export interface InlineDropZoneProps {
  onFilesDrop: (files: File[]) => void;
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  className?: string;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export function InlineDropZone({
  onFilesDrop,
  accept,
  maxSize,
  maxFiles,
  className,
  disabled = false,
  label = "Drag & drop files here",
  description,
}: InlineDropZoneProps) {
  const { isDragging, isValidDrag, dragProps, openFilePicker, inputProps } =
    useDragDrop({
      onDrop: onFilesDrop,
      accept,
      maxSize,
      maxFiles,
      enabled: !disabled,
      multiple: maxFiles !== 1,
    });

  const isActive = isDragging && isValidDrag && !disabled;

  return (
    <div
      {...dragProps}
      onClick={openFilePicker}
      className={cn(
        "relative cursor-pointer transition-all duration-200",
        "border-2 border-dashed rounded-xl p-8",
        "flex flex-col items-center justify-center gap-3 text-center",
        isActive && "border-accent bg-accent/5 scale-[1.02]",
        !isActive && !disabled && "border-border hover:border-accent/50 hover:bg-surface",
        disabled && "opacity-50 cursor-not-allowed border-muted",
        className
      )}
    >
      <input {...inputProps} />

      <motion.div
        animate={{
          scale: isActive ? 1.1 : 1,
          y: isActive ? -4 : 0,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "p-3 rounded-full",
          isActive ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
        )}
      >
        <Upload className="h-6 w-6" />
      </motion.div>

      <div className="space-y-1">
        <p className="font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {!description && (
          <p className="text-xs text-muted-foreground">
            or click to browse
            {maxSize && ` · Max ${formatFileSize(maxSize)}`}
          </p>
        )}
      </div>

      {accept && (
        <p className="text-xs text-muted-foreground">
          Accepts: {formatAcceptTypes(accept)}
        </p>
      )}
    </div>
  );
}

/**
 * Drop zone button for compact UI
 */
export interface DropZoneButtonProps {
  onFilesDrop: (files: File[]) => void;
  accept?: string[];
  maxSize?: number;
  className?: string;
  disabled?: boolean;
}

export function DropZoneButton({
  onFilesDrop,
  accept,
  maxSize,
  className,
  disabled = false,
}: DropZoneButtonProps) {
  const { dragProps, openFilePicker, inputProps } = useDragDrop({
    onDrop: onFilesDrop,
    accept,
    maxSize,
    enabled: !disabled,
    multiple: true,
  });

  return (
    <div {...dragProps} className={cn("relative", className)}>
      <input {...inputProps} />
      <button
        type="button"
        onClick={openFilePicker}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg",
          "bg-surface hover:bg-surface-hover text-foreground",
          "border border-border hover:border-accent/50",
          "transition-colors duration-200",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Upload className="h-4 w-4" />
        <span className="text-sm font-medium">Attach files</span>
      </button>
    </div>
  );
}
