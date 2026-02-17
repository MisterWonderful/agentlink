"use client";

/**
 * ImagePreviewGrid Component
 * 
 * Responsive grid layout for image previews with various layouts
 * based on image count. Supports 1-4+ images with masonry option.
 */

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FilePreview } from "./file-preview";
import type { FileMetadata } from "@/lib/files/file-types";

export interface ImagePreviewGridProps {
  /** Array of image files to display */
  images: FileMetadata[];
  /** Callback when an image is clicked */
  onImageClick?: (index: number) => void;
  /** Callback when remove button is clicked */
  onRemove?: (index: number) => void;
  /** Maximum number of images to show before "+N more" overlay */
  maxVisible?: number;
  /** Whether to show remove buttons */
  removable?: boolean;
  /** Custom className */
  className?: string;
  /** Image aspect ratio */
  aspectRatio?: "square" | "video" | "auto" | "portrait";
  /** Gap between images */
  gap?: "none" | "sm" | "md" | "lg";
  /** Border radius variant */
  radius?: "none" | "sm" | "md" | "lg" | "xl";
}

/**
 * Aspect ratio classes
 */
const aspectRatioClasses = {
  square: "aspect-square",
  video: "aspect-video",
  auto: "",
  portrait: "aspect-[3/4]",
};

/**
 * Gap classes
 */
const gapClasses = {
  none: "gap-0",
  sm: "gap-1",
  md: "gap-2",
  lg: "gap-3",
};

/**
 * Radius classes
 */
const radiusClasses = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
};

/**
 * Single image layout
 */
function SingleImageLayout({
  image,
  onClick,
  onRemove,
  removable,
  aspectRatio,
  radius,
}: {
  image: FileMetadata;
  onClick: () => void;
  onRemove?: () => void;
  removable?: boolean;
  aspectRatio: keyof typeof aspectRatioClasses;
  radius: keyof typeof radiusClasses;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden cursor-pointer group",
        aspectRatioClasses[aspectRatio],
        radiusClasses[radius]
      )}
      onClick={onClick}
    >
      <img
        src={image.thumbnailUrl || image.previewUrl}
        alt={image.name}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      
      {removable && onRemove && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <ZoomIn className="h-8 w-8 text-white drop-shadow-lg" />
      </div>
    </div>
  );
}

/**
 * Two images layout (side by side)
 */
function TwoImageLayout({
  images,
  onImageClick,
  onRemove,
  removable,
  aspectRatio,
  radius,
  gap,
}: {
  images: FileMetadata[];
  onImageClick: (index: number) => void;
  onRemove?: (index: number) => void;
  removable?: boolean;
  aspectRatio: keyof typeof aspectRatioClasses;
  radius: keyof typeof radiusClasses;
  gap: keyof typeof gapClasses;
}) {
  return (
    <div className={cn("grid grid-cols-2", gapClasses[gap])}>
      {images.map((image, index) => (
        <div
          key={image.id}
          className={cn(
            "relative overflow-hidden cursor-pointer group",
            aspectRatioClasses[aspectRatio],
            radiusClasses[radius]
          )}
          onClick={() => onImageClick(index)}
        >
          <img
            src={image.thumbnailUrl || image.previewUrl}
            alt={image.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          
          {removable && onRemove && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Three images layout
 */
function ThreeImageLayout({
  images,
  onImageClick,
  onRemove,
  removable,
  aspectRatio,
  radius,
  gap,
}: {
  images: FileMetadata[];
  onImageClick: (index: number) => void;
  onRemove?: (index: number) => void;
  removable?: boolean;
  aspectRatio: keyof typeof aspectRatioClasses;
  radius: keyof typeof radiusClasses;
  gap: keyof typeof gapClasses;
}) {
  return (
    <div className={cn("grid grid-cols-2 grid-rows-2", gapClasses[gap])}>
      {/* First image - spans 2 rows */}
      <div
        className={cn(
          "relative overflow-hidden cursor-pointer group row-span-2",
          radiusClasses[radius]
        )}
        onClick={() => onImageClick(0)}
      >
        <img
          src={images[0].thumbnailUrl || images[0].previewUrl}
          alt={images[0].name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        
        {removable && onRemove && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(0);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Second and third images */}
      {images.slice(1, 3).map((image, index) => (
        <div
          key={image.id}
          className={cn(
            "relative overflow-hidden cursor-pointer group",
            radiusClasses[radius]
          )}
          onClick={() => onImageClick(index + 1)}
        >
          <img
            src={image.thumbnailUrl || image.previewUrl}
            alt={image.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          
          {removable && onRemove && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index + 1);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Four images layout (2x2 grid)
 */
function FourImageLayout({
  images,
  onImageClick,
  onRemove,
  removable,
  radius,
  gap,
  showOverlay,
  totalCount,
}: {
  images: FileMetadata[];
  onImageClick: (index: number) => void;
  onRemove?: (index: number) => void;
  removable?: boolean;
  radius: keyof typeof radiusClasses;
  gap: keyof typeof gapClasses;
  showOverlay?: boolean;
  totalCount?: number;
}) {
  return (
    <div className={cn("grid grid-cols-2 grid-rows-2", gapClasses[gap])}>
      {images.map((image, index) => (
        <div
          key={image.id}
          className={cn(
            "relative overflow-hidden cursor-pointer group aspect-square",
            radiusClasses[radius]
          )}
          onClick={() => onImageClick(index)}
        >
          <img
            src={image.thumbnailUrl || image.previewUrl}
            alt={image.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          
          {/* +N more overlay on last visible image */}
          {showOverlay && index === images.length - 1 && totalCount && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                +{totalCount - 4}
              </span>
            </div>
          )}
          
          {removable && onRemove && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Masonry layout for 5+ images
 */
function MasonryLayout({
  images,
  onImageClick,
  onRemove,
  removable,
  radius,
  gap,
  maxVisible,
  totalCount,
}: {
  images: FileMetadata[];
  onImageClick: (index: number) => void;
  onRemove?: (index: number) => void;
  removable?: boolean;
  radius: keyof typeof radiusClasses;
  gap: keyof typeof gapClasses;
  maxVisible: number;
  totalCount: number;
}) {
  const visibleImages = images.slice(0, maxVisible);
  const hasMore = totalCount > maxVisible;
  const remainingCount = totalCount - maxVisible;

  return (
    <div className={cn("grid grid-cols-3 grid-rows-2", gapClasses[gap])}>
      {visibleImages.map((image, index) => (
        <div
          key={image.id}
          className={cn(
            "relative overflow-hidden cursor-pointer group aspect-square",
            index === 0 && "col-span-2 row-span-2",
            radiusClasses[radius]
          )}
          onClick={() => onImageClick(index)}
        >
          <img
            src={image.thumbnailUrl || image.previewUrl}
            alt={image.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          
          {/* +N more overlay on last visible image */}
          {hasMore && index === visibleImages.length - 1 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                +{remainingCount}
              </span>
            </div>
          )}
          
          {removable && onRemove && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

export function ImagePreviewGrid({
  images,
  onImageClick,
  onRemove,
  maxVisible = 4,
  removable = false,
  className,
  aspectRatio = "square",
  gap = "md",
  radius = "lg",
}: ImagePreviewGridProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const handleImageClick = useCallback(
    (index: number) => {
      if (onImageClick) {
        onImageClick(index);
      } else {
        setPreviewIndex(index);
      }
    },
    [onImageClick]
  );

  const handleClosePreview = useCallback(() => {
    setPreviewIndex(null);
  }, []);

  const handleNavigate = useCallback(
    (file: FileMetadata) => {
      const index = images.findIndex((img) => img.id === file.id);
      if (index !== -1) {
        setPreviewIndex(index);
      }
    },
    [images]
  );

  if (images.length === 0) {
    return null;
  }

  // Filter to only image files
  const imageFiles = images.filter((img) => img.category === "image");

  if (imageFiles.length === 0) {
    return null;
  }

  const renderLayout = () => {
    switch (imageFiles.length) {
      case 1:
        return (
          <SingleImageLayout
            image={imageFiles[0]}
            onClick={() => handleImageClick(0)}
            onRemove={onRemove ? () => onRemove(0) : undefined}
            removable={removable}
            aspectRatio={aspectRatio}
            radius={radius}
          />
        );

      case 2:
        return (
          <TwoImageLayout
            images={imageFiles}
            onImageClick={handleImageClick}
            onRemove={onRemove}
            removable={removable}
            aspectRatio={aspectRatio}
            radius={radius}
            gap={gap}
          />
        );

      case 3:
        return (
          <ThreeImageLayout
            images={imageFiles}
            onImageClick={handleImageClick}
            onRemove={onRemove}
            removable={removable}
            aspectRatio={aspectRatio}
            radius={radius}
            gap={gap}
          />
        );

      case 4:
        return (
          <FourImageLayout
            images={imageFiles}
            onImageClick={handleImageClick}
            onRemove={onRemove}
            removable={removable}
            radius={radius}
            gap={gap}
          />
        );

      default:
        // 5+ images
        return (
          <MasonryLayout
            images={imageFiles}
            onImageClick={handleImageClick}
            onRemove={onRemove}
            removable={removable}
            radius={radius}
            gap={gap}
            maxVisible={maxVisible}
            totalCount={imageFiles.length}
          />
        );
    }
  };

  return (
    <>
      <div className={cn("w-full", className)}>{renderLayout()}</div>

      {/* Full preview modal */}
      {previewIndex !== null && (
        <FilePreview
          file={imageFiles[previewIndex]}
          isOpen={previewIndex !== null}
          onClose={handleClosePreview}
          files={imageFiles}
          onNavigate={handleNavigate}
          currentIndex={previewIndex}
        />
      )}
    </>
  );
}

/**
 * Compact image grid for input area
 */
export interface CompactImageGridProps {
  images: FileMetadata[];
  onRemove: (index: number) => void;
  className?: string;
}

export function CompactImageGrid({
  images,
  onRemove,
  className,
}: CompactImageGridProps) {
  const imageFiles = images.filter((img) => img.category === "image");

  if (imageFiles.length === 0) return null;

  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-2 scrollbar-hide", className)}>
      {imageFiles.map((image, index) => (
        <motion.div
          key={image.id}
          layout
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="relative shrink-0 group"
        >
          <div className="w-20 h-20 rounded-lg overflow-hidden border border-border">
            <img
              src={image.thumbnailUrl || image.previewUrl}
              alt={image.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onRemove(index)}
          >
            <X className="h-2.5 w-2.5" />
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Message image grid (for display in chat messages)
 */
export interface MessageImageGridProps {
  images: FileMetadata[];
  onImageClick?: (index: number) => void;
  className?: string;
}

export function MessageImageGrid({
  images,
  onImageClick,
  className,
}: MessageImageGridProps) {
  return (
    <ImagePreviewGrid
      images={images}
      onImageClick={onImageClick}
      maxVisible={4}
      removable={false}
      className={cn("max-w-md", className)}
      aspectRatio="video"
      gap="sm"
      radius="md"
    />
  );
}
