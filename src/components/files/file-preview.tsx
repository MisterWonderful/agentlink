"use client";

/**
 * FilePreview Component
 * 
 * Modal preview for files with support for images, PDFs, code files,
 * data files (CSV/JSON), text files, and fallback download view.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  FileCode,
  FileSpreadsheet,
  File,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type FileMetadata,
  formatFileSize,
  formatFileSizeDetailed,
  getFileIcon,
  isPreviewable,
  getLanguageFromExtension,
} from "@/lib/files/file-types";

export interface FilePreviewProps {
  /** File to preview */
  file: FileMetadata;
  /** Whether the preview is open */
  isOpen: boolean;
  /** Callback when preview is closed */
  onClose: () => void;
  /** Callback when download is requested */
  onDownload?: () => void;
  /** Array of files for navigation (optional) */
  files?: FileMetadata[];
  /** Callback when navigating to another file */
  onNavigate?: (file: FileMetadata) => void;
  /** Current index in files array */
  currentIndex?: number;
}

// ============================================
// Image Preview
// ============================================

interface ImagePreviewProps {
  url: string;
  alt: string;
  onZoomChange?: (zoom: number) => void;
}

function ImagePreview({ url, alt, onZoomChange }: ImagePreviewProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = useCallback(() => {
    setScale((s) => {
      const newScale = Math.min(s * 1.25, 5);
      onZoomChange?.(newScale);
      return newScale;
    });
  }, [onZoomChange]);

  const handleZoomOut = useCallback(() => {
    setScale((s) => {
      const newScale = Math.max(s / 1.25, 0.5);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
      onZoomChange?.(newScale);
      return newScale;
    });
  }, [onZoomChange]);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    onZoomChange?.(1);
  }, [onZoomChange]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale > 1) {
        setIsDragging(true);
        dragStart.current = {
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        };
      }
    },
    [scale, position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && scale > 1) {
        setPosition({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y,
        });
      }
    },
    [isDragging, scale]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    },
    [handleZoomIn, handleZoomOut]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden bg-background"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
    >
      {/* Loading skeleton */}
      {!imageLoaded && <Skeleton className="absolute inset-4" />}

      {/* Image */}
      <motion.img
        src={url}
        alt={alt}
        className="max-w-full max-h-full object-contain"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        }}
        drag={scale > 1}
        dragConstraints={containerRef}
        onLoad={() => setImageLoaded(true)}
        draggable={false}
      />

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-background/90 backdrop-blur-sm rounded-full shadow-lg border border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          disabled={scale <= 0.5}
          className="h-8 w-8"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[60px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          disabled={scale >= 5}
          className="h-8 w-8"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button variant="ghost" size="icon" onClick={handleReset} className="h-8 w-8">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================
// PDF Preview
// ============================================

interface PDFPreviewProps {
  url: string;
}

function PDFPreview({ url }: PDFPreviewProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg font-medium">Could not load PDF preview</p>
        <Button asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in new tab
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background">
      <iframe
        src={`${url}#toolbar=1&navpanes=0`}
        className="w-full h-full border-0"
        title="PDF Preview"
        onError={() => setError(true)}
      />
    </div>
  );
}

// ============================================
// Code Preview
// ============================================

interface CodePreviewProps {
  content: string;
  language: string;
  fileName: string;
}

function CodePreview({ content, language, fileName }: CodePreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple syntax highlighting (in production, use Shiki or Prism)
  const lines = content.split("\n");

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#d4d4d4] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium">{fileName}</span>
          <span className="text-xs text-muted-foreground">({language})</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Code content */}
      <ScrollArea className="flex-1">
        <div className="p-4 font-mono text-sm">
          {lines.map((line, index) => (
            <div key={index} className="flex">
              <span className="select-none text-[#858585] w-12 text-right pr-4 shrink-0">
                {index + 1}
              </span>
              <pre className="flex-1 whitespace-pre-wrap break-all">{line || " "}</pre>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================
// JSON Preview
// ============================================

interface JSONPreviewProps {
  content: string;
}

function JSONPreview({ content }: JSONPreviewProps) {
  const [parsed, setParsed] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const data = JSON.parse(content);
      setParsed(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
      setParsed(null);
    }
  }, [content]);

  if (error) {
    return <CodePreview content={content} language="text" fileName="data.json" />;
  }

  return (
    <div className="flex flex-col h-full bg-surface rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-muted border-b border-border">
        <FileCode className="h-4 w-4 text-yellow-400" />
        <span className="text-sm font-medium">JSON Viewer</span>
      </div>
      <ScrollArea className="flex-1 p-4">
        <pre className="font-mono text-sm">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      </ScrollArea>
    </div>
  );
}

// ============================================
// CSV Preview
// ============================================

interface CSVPreviewProps {
  content: string;
}

function CSVPreview({ content }: CSVPreviewProps) {
  const [rows, setRows] = useState<string[][]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Simple CSV parsing (for production, use Papa Parse)
      const lines = content.split("\n").filter((line) => line.trim());
      const parsed = lines.map((line) => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;

        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      });

      setRows(parsed);
      setError(null);
    } catch (e) {
      setError("Failed to parse CSV");
      setRows([]);
    }
  }, [content]);

  if (error || rows.length === 0) {
    return <CodePreview content={content} language="csv" fileName="data.csv" />;
  }

  const headers = rows[0] || [];
  const dataRows = rows.slice(1, 101); // Limit to 100 rows for preview

  return (
    <div className="flex flex-col h-full bg-surface rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-muted border-b border-border">
        <FileSpreadsheet className="h-4 w-4 text-green-400" />
        <span className="text-sm font-medium">CSV Preview</span>
        <span className="text-xs text-muted-foreground">
          ({rows.length - 1} rows)
        </span>
      </div>
      <ScrollArea className="flex-1">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-0">
            <tr>
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="px-4 py-2 text-left font-medium border-b border-border"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border/50">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 101 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            ... and {rows.length - 101} more rows
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ============================================
// Text Preview
// ============================================

interface TextPreviewProps {
  content: string;
  fileName: string;
}

function TextPreview({ content, fileName }: TextPreviewProps) {
  return <CodePreview content={content} language="text" fileName={fileName} />;
}

// ============================================
// Download Fallback
// ============================================

interface DownloadFallbackProps {
  file: FileMetadata;
  onDownload?: () => void;
}

function DownloadFallback({ file, onDownload }: DownloadFallbackProps) {
  const Icon = getFileIcon(file.category);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="p-6 rounded-full bg-muted">
        <Icon className="h-16 w-16 text-muted-foreground" />
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">{file.name}</h3>
        <p className="text-muted-foreground">{formatFileSize(file.size)}</p>
        <p className="text-sm text-muted-foreground">{file.mimeType}</p>
      </div>

      <div className="text-sm text-muted-foreground text-center max-w-md">
        <p>This file type cannot be previewed.</p>
        <p>Download the file to view its contents.</p>
      </div>

      {onDownload && (
        <Button onClick={onDownload} size="lg">
          <Download className="h-4 w-4 mr-2" />
          Download File
        </Button>
      )}
    </div>
  );
}

// ============================================
// Main File Preview Component
// ============================================

export function FilePreview({
  file,
  isOpen,
  onClose,
  onDownload,
  files,
  onNavigate,
  currentIndex = 0,
}: FilePreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if we can preview this file
  const canPreview = isPreviewable(file);

  // Load content for text-based previews
  useEffect(() => {
    if (!isOpen || !canPreview || file.category === "image" || file.category === "video") {
      setContent(null);
      return;
    }

    const loadContent = async () => {
      if (!file.previewUrl) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(file.previewUrl);
        if (!response.ok) throw new Error("Failed to load file");
        const text = await response.text();
        setContent(text);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load file");
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [isOpen, file, canPreview]);

  // Navigation
  const hasNavigation = files && files.length > 1 && onNavigate;
  const canGoPrevious = hasNavigation && currentIndex > 0;
  const canGoNext = hasNavigation && currentIndex < files.length - 1;

  const handlePrevious = useCallback(() => {
    if (canGoPrevious && files) {
      onNavigate!(files[currentIndex - 1]);
    }
  }, [canGoPrevious, files, currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (canGoNext && files) {
      onNavigate!(files[currentIndex + 1]);
    }
  }, [canGoNext, files, currentIndex, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrevious();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handlePrevious, handleNext, onClose]);

  // Render preview based on file type
  const renderPreview = () => {
    if (!canPreview) {
      return <DownloadFallback file={file} onDownload={onDownload} />;
    }

    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Skeleton className="w-full h-full" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
          <p className="text-error">{error}</p>
          <DownloadFallback file={file} onDownload={onDownload} />
        </div>
      );
    }

    // Image preview
    if (file.category === "image" && file.previewUrl) {
      return <ImagePreview url={file.previewUrl} alt={file.name} />;
    }

    // PDF preview
    if (file.mimeType === "application/pdf" && file.previewUrl) {
      return <PDFPreview url={file.previewUrl} />;
    }

    // Video preview
    if (file.category === "video" && file.previewUrl) {
      return (
        <div className="flex items-center justify-center h-full bg-black">
          <video
            src={file.previewUrl}
            controls
            className="max-w-full max-h-full"
          />
        </div>
      );
    }

    // Text/code previews
    if (content) {
      if (file.extension === "json") {
        return <JSONPreview content={content} />;
      }
      if (file.extension === "csv") {
        return <CSVPreview content={content} />;
      }
      return (
        <CodePreview
          content={content}
          language={getLanguageFromExtension(file.extension)}
          fileName={file.name}
        />
      );
    }

    return <DownloadFallback file={file} onDownload={onDownload} />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-5xl w-[95vw] h-[90vh] p-0 overflow-hidden"
        aria-describedby="file-preview-description"
      >
        <DialogTitle className="sr-only">File Preview: {file.name}</DialogTitle>
        <div id="file-preview-description" className="sr-only">
          Preview dialog for {file.name} ({formatFileSize(file.size)})
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* File icon */}
            <div className="p-2 rounded-lg bg-muted shrink-0">
              {React.createElement(getFileIcon(file.category), {
                className: "h-5 w-5 text-muted-foreground",
              })}
            </div>

            {/* File info */}
            <div className="min-w-0">
              <h3 className="font-medium truncate">{file.name}</h3>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
                {hasNavigation && (
                  <span className="ml-2">
                    {currentIndex + 1} of {files?.length}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Navigation */}
            {hasNavigation && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevious}
                  disabled={!canGoPrevious}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
              </>
            )}

            {/* Download */}
            {onDownload && (
              <Button variant="ghost" size="icon" onClick={onDownload} className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            )}

            {/* Close */}
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview content */}
        <div className="flex-1 overflow-hidden relative">{renderPreview()}</div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline file preview (for embedding in messages)
 */
export interface InlineFilePreviewProps {
  file: FileMetadata;
  className?: string;
}

export function InlineFilePreview({ file, className }: InlineFilePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (file.category === "image" && file.previewUrl) {
    return (
      <>
        <motion.div
          layoutId={`file-${file.id}`}
          className={cn(
            "relative rounded-lg overflow-hidden cursor-pointer group",
            "border border-border hover:border-accent/50 transition-colors",
            className
          )}
          onClick={() => setIsOpen(true)}
        >
          <img
            src={file.thumbnailUrl || file.previewUrl}
            alt={file.name}
            className="w-full h-48 object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        </motion.div>

        <FilePreview
          file={file}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </>
    );
  }

  return null;
}
