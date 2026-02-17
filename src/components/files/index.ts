/**
 * File Components Barrel Export
 * 
 * Central export point for all file-related components.
 */

// Main components
export { FileDropZone, InlineDropZone, DropZoneButton } from "./file-drop-zone";
export {
  FileAttachment,
  FileAttachmentList,
  FileAttachmentGrid,
} from "./file-attachment";
export { FilePreview, InlineFilePreview } from "./file-preview";
export {
  ImagePreviewGrid,
  CompactImageGrid,
  MessageImageGrid,
} from "./image-preview-grid";

// Types
export type { FileDropZoneProps, InlineDropZoneProps, DropZoneButtonProps } from "./file-drop-zone";
export type {
  FileAttachmentProps,
  FileAttachmentListProps,
  FileAttachmentGridProps,
} from "./file-attachment";
export type { FilePreviewProps, InlineFilePreviewProps } from "./file-preview";
export type {
  ImagePreviewGridProps,
  CompactImageGridProps,
  MessageImageGridProps,
} from "./image-preview-grid";
