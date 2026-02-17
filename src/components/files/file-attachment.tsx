"use client";

/**
 * FileAttachment Component
 * 
 * File attachment pill with upload progress, error states,
 * and preview capabilities. Used in chat input and message display.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  RefreshCw,
  File,
  FileImage,
  FileText,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  FileAudio,
  FileVideo,
  AlertCircle,
  Check,
  Loader2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  type FileMetadata,
  formatFileSize,
  getFileIcon,
  type FileCategory,
} from "@/lib/files/file-types";

export interface FileAttachmentProps {
  /** File metadata */
  file: FileMetadata;
  /** Callback when remove button is clicked */
  onRemove?: () => void;
  /** Callback when attachment is clicked (for preview) */
  onClick?: () => void;
  /** Callback to retry failed upload */
  onRetry?: () => void;
  /** Compact mode for smaller display */
  compact?: boolean;
  /** Whether this is in a message (vs input) */
  inMessage?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Get icon component for file category
 */
function CategoryIcon({
  category,
  className,
}: {
  category: FileCategory;
  className?: string;
}) {
  const Icon = getFileIcon(category);
  return <Icon className={className} />;
}

/**
 * Progress bar component
 */
function ProgressBar({
  progress,
  status,
}: {
  progress: number;
  status: FileMetadata["uploadStatus"];
}) {
  const getStatusColor = () => {
    switch (status) {
      case "error":
        return "bg-error";
      case "complete":
        return "bg-success";
      case "queued":
        return "bg-warning";
      default:
        return "bg-accent";
    }
  };

  return (
    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
      <motion.div
        className={cn("h-full rounded-full", getStatusColor())}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{
          duration: 0.3,
          ease: "easeOut",
        }}
      />
    </div>
  );
}

/**
 * Status icon based on upload status
 */
function StatusIcon({
  status,
  className,
}: {
  status: FileMetadata["uploadStatus"];
  className?: string;
}) {
  switch (status) {
    case "pending":
      return <Clock className={cn("text-muted-foreground", className)} />;
    case "uploading":
      return <Loader2 className={cn("animate-spin text-accent", className)} />;
    case "complete":
      return <Check className={cn("text-success", className)} />;
    case "error":
      return <AlertCircle className={cn("text-error", className)} />;
    case "queued":
      return <Clock className={cn("text-warning", className)} />;
    default:
      return null;
  }
}

export function FileAttachment({
  file,
  onRemove,
  onClick,
  onRetry,
  compact = false,
  inMessage = false,
  className,
}: FileAttachmentProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isUploading = file.uploadStatus === "uploading";
  const isError = file.uploadStatus === "error";
  const isPending = file.uploadStatus === "pending" || file.uploadStatus === "queued";
  const isComplete = file.uploadStatus === "complete";

  const handleClick = () => {
    if (!isUploading && onClick) {
      onClick();
    }
  };

  if (compact) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={cn(
          "group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
          "bg-surface border border-border/50",
          "text-sm transition-colors duration-200",
          onClick && !isUploading && "cursor-pointer hover:bg-surface-hover",
          isError && "border-error/50 bg-error/5",
          isComplete && "border-success/30 bg-success/5",
          className
        )}
        onClick={handleClick}
      >
        <CategoryIcon
          category={file.category}
          className={cn(
            "h-4 w-4 shrink-0",
            isError && "text-error",
            isComplete && "text-success",
            !isError && !isComplete && "text-muted-foreground"
          )}
        />
        <span className="truncate max-w-[120px] font-medium">{file.name}</span>
        <span className="text-xs text-muted-foreground">
          {formatFileSize(file.size)}
        </span>

        {isUploading && (
          <Loader2 className="h-3 w-3 animate-spin text-accent" />
        )}

        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="ml-1 p-0.5 rounded-full hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "group relative rounded-xl border transition-all duration-200",
        "bg-surface border-border hover:border-accent/30",
        isError && "border-error/50 bg-error/5 hover:border-error/50",
        isComplete && "border-success/30 bg-success/5",
        onClick && !isUploading && "cursor-pointer",
        inMessage ? "p-3" : "p-4",
        className
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3">
        {/* File icon */}
        <div
          className={cn(
            "shrink-0 rounded-lg p-2.5 transition-colors",
            isError && "bg-error/10",
            isComplete && "bg-success/10",
            !isError && !isComplete && "bg-muted"
          )}
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          ) : (
            <CategoryIcon
              category={file.category}
              className={cn(
                "h-5 w-5",
                isError && "text-error",
                isComplete && "text-success",
                !isError && !isComplete && "text-muted-foreground"
              )}
            />
          )}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "font-medium truncate",
              isError && "text-error",
              inMessage ? "text-sm" : "text-sm"
            )}
          >
            {file.name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatFileSize(file.size)}
            {isUploading && (
              <span className="ml-2 text-accent">
                {file.uploadProgress.toFixed(0)}%
              </span>
            )}
          </p>

          {/* Progress bar */}
          {(isUploading || isPending) && (
            <div className="mt-2">
              <ProgressBar progress={file.uploadProgress} status={file.uploadStatus} />
            </div>
          )}

          {/* Error message */}
          {isError && file.errorMessage && (
            <p className="text-xs text-error mt-2">{file.errorMessage}</p>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-1">
          {isError && onRetry && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              className="h-8 w-8 text-error hover:text-error hover:bg-error/10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

          {isComplete && (
            <div className="h-8 w-8 flex items-center justify-center">
              <Check className="h-4 w-4 text-success" />
            </div>
          )}

          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className={cn(
                "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
                "text-muted-foreground hover:text-foreground"
              )}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Hover overlay for preview hint */}
      {onClick && !isUploading && isHovered && !inMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-accent/5 rounded-xl flex items-center justify-center pointer-events-none"
        >
          <span className="text-xs font-medium text-accent">Click to preview</span>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Attachment list for displaying multiple files
 */
export interface FileAttachmentListProps {
  files: FileMetadata[];
  onRemove?: (fileId: string) => void;
  onClick?: (file: FileMetadata) => void;
  onRetry?: (fileId: string) => void;
  compact?: boolean;
  inMessage?: boolean;
  className?: string;
  maxVisible?: number;
}

export function FileAttachmentList({
  files,
  onRemove,
  onClick,
  onRetry,
  compact = false,
  inMessage = false,
  className,
  maxVisible,
}: FileAttachmentListProps) {
  const visibleFiles = maxVisible ? files.slice(0, maxVisible) : files;
  const hiddenCount = maxVisible ? Math.max(0, files.length - maxVisible) : 0;

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        compact ? "" : "flex-col items-stretch",
        className
      )}
    >
      <AnimatePresence mode="popLayout">
        {visibleFiles.map((file) => (
          <FileAttachment
            key={file.id}
            file={file}
            compact={compact}
            inMessage={inMessage}
            onRemove={onRemove ? () => onRemove(file.id) : undefined}
            onClick={onClick ? () => onClick(file) : undefined}
            onRetry={onRetry ? () => onRetry(file.id) : undefined}
          />
        ))}
      </AnimatePresence>

      {hiddenCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
            "bg-muted text-muted-foreground text-sm",
            compact ? "" : "justify-center py-3"
          )}
        >
          <span className="font-medium">+{hiddenCount} more</span>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Attachment grid for message display
 */
export interface FileAttachmentGridProps {
  files: FileMetadata[];
  onFileClick?: (file: FileMetadata) => void;
  className?: string;
}

export function FileAttachmentGrid({
  files,
  onFileClick,
  className,
}: FileAttachmentGridProps) {
  return (
    <div
      className={cn(
        "grid gap-2",
        files.length === 1 && "grid-cols-1",
        files.length === 2 && "grid-cols-2",
        files.length >= 3 && "grid-cols-3",
        className
      )}
    >
      {files.map((file) => (
        <FileAttachment
          key={file.id}
          file={file}
          compact
          inMessage
          onClick={onFileClick ? () => onFileClick(file) : undefined}
        />
      ))}
    </div>
  );
}
