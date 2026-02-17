/**
 * File Types and Utilities
 * 
 * Type definitions, file categorization, and utility functions
 * for the AgentLink file transfer system.
 */

import {
  FileImage,
  FileText,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  File,
  FileAudio,
  FileVideo,
  type LucideIcon,
} from "lucide-react";

/**
 * File category for grouping and icon selection
 */
export type FileCategory =
  | "image"
  | "document"
  | "code"
  | "data"
  | "archive"
  | "audio"
  | "video"
  | "unknown";

/**
 * Upload status for tracking file upload progress
 */
export type UploadStatus = "pending" | "uploading" | "complete" | "error" | "queued";

/**
 * File metadata structure
 */
export interface FileMetadata {
  /** Unique file ID */
  id: string;
  /** Original file name */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  type: string;
  /** File category for UI grouping */
  category: FileCategory;
  /** Full MIME type string */
  mimeType: string;
  /** File extension (lowercase, without dot) */
  extension: string;
  /** URL for preview (blob URL or remote URL) */
  previewUrl?: string;
  /** URL for thumbnail (for images/videos) */
  thumbnailUrl?: string;
  /** Upload progress (0-100) */
  uploadProgress: number;
  /** Current upload status */
  uploadStatus: UploadStatus;
  /** Error message if upload failed */
  errorMessage?: string;
  /** SHA-256 checksum for integrity verification */
  checksum?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Associated conversation ID */
  conversationId?: string;
  /** Associated message ID (set after message is sent) */
  messageId?: string;
  /** Original File object (transient, not stored) */
  _file?: File;
}

/**
 * MIME type to category mapping
 */
const MIME_TYPE_CATEGORIES: Record<string, FileCategory> = {
  // Images
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/svg+xml": "image",
  "image/bmp": "image",
  "image/tiff": "image",
  "image/avif": "image",
  "image/heic": "image",
  "image/heif": "image",

  // Documents
  "application/pdf": "document",
  "application/msword": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "application/vnd.oasis.opendocument.text": "document",
  "text/plain": "document",
  "text/rtf": "document",
  "application/rtf": "document",

  // Code files
  "text/html": "code",
  "text/css": "code",
  "text/javascript": "code",
  "application/javascript": "code",
  "application/json": "code",
  "application/xml": "code",
  "text/xml": "code",
  "text/x-python": "code",
  "application/x-python-code": "code",
  "text/x-java": "code",
  "text/x-c": "code",
  "text/x-c++": "code",
  "text/x-typescript": "code",
  "application/typescript": "code",
  "text/markdown": "code",
  "text/x-markdown": "code",

  // Data files
  "text/csv": "data",
  "application/vnd.ms-excel": "data",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "data",
  "application/vnd.oasis.opendocument.spreadsheet": "data",

  // Archives
  "application/zip": "archive",
  "application/x-zip-compressed": "archive",
  "application/x-rar-compressed": "archive",
  "application/x-tar": "archive",
  "application/gzip": "archive",
  "application/x-gzip": "archive",
  "application/x-7z-compressed": "archive",
  "application/x-bzip2": "archive",

  // Audio
  "audio/mpeg": "audio",
  "audio/mp3": "audio",
  "audio/wav": "audio",
  "audio/ogg": "audio",
  "audio/aac": "audio",
  "audio/flac": "audio",
  "audio/m4a": "audio",
  "audio/x-m4a": "audio",

  // Video
  "video/mp4": "video",
  "video/mpeg": "video",
  "video/ogg": "video",
  "video/webm": "video",
  "video/quicktime": "video",
  "video/x-msvideo": "video",
  "video/x-matroska": "video",
};

/**
 * Extension to category mapping for fallback detection
 */
const EXTENSION_CATEGORIES: Record<string, FileCategory> = {
  // Images
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  bmp: "image",
  tiff: "image",
  tif: "image",
  avif: "image",
  heic: "image",
  heif: "image",

  // Documents
  pdf: "document",
  doc: "document",
  docx: "document",
  odt: "document",
  txt: "document",
  rtf: "document",
  md: "document",

  // Code
  html: "code",
  htm: "code",
  css: "code",
  js: "code",
  jsx: "code",
  ts: "code",
  tsx: "code",
  json: "code",
  xml: "code",
  py: "code",
  java: "code",
  c: "code",
  cpp: "code",
  cc: "code",
  h: "code",
  hpp: "code",
  go: "code",
  rs: "code",
  rb: "code",
  php: "code",
  swift: "code",
  kt: "code",
  scala: "code",
  yaml: "code",
  yml: "code",
  sql: "code",
  sh: "code",
  bash: "code",
  zsh: "code",
  ps1: "code",

  // Data
  csv: "data",
  xls: "data",
  xlsx: "data",
  ods: "data",
  tsv: "data",

  // Archives
  zip: "archive",
  rar: "archive",
  tar: "archive",
  gz: "archive",
  tgz: "archive",
  bz2: "archive",
  "7z": "archive",
  xz: "archive",

  // Audio
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  aac: "audio",
  flac: "audio",
  m4a: "audio",
  wma: "audio",

  // Video
  mp4: "video",
  avi: "video",
  mov: "video",
  mkv: "video",
  webm: "video",
  flv: "video",
  wmv: "video",
  m4v: "video",
};

/**
 * Detect the category of a file based on its MIME type or extension
 */
export function detectFileCategory(file: File): FileCategory {
  // First try MIME type
  const mimeCategory = MIME_TYPE_CATEGORIES[file.type.toLowerCase()];
  if (mimeCategory) {
    return mimeCategory;
  }

  // Fall back to extension
  const extension = getFileExtension(file.name);
  const extCategory = EXTENSION_CATEGORIES[extension.toLowerCase()];
  if (extCategory) {
    return extCategory;
  }

  return "unknown";
}

/**
 * Get the appropriate Lucide icon for a file category
 */
export function getFileIcon(category: FileCategory): LucideIcon {
  switch (category) {
    case "image":
      return FileImage;
    case "document":
      return FileText;
    case "code":
      return FileCode;
    case "data":
      return FileSpreadsheet;
    case "archive":
      return FileArchive;
    case "audio":
      return FileAudio;
    case "video":
      return FileVideo;
    default:
      return File;
  }
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));

  return `${size} ${units[i]}`;
}

/**
 * Format file size with full precision for detailed views
 */
export function formatFileSizeDetailed(bytes: number): string {
  if (bytes === 0) return "0 bytes";

  const units = ["bytes", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = (bytes / Math.pow(k, i)).toFixed(2);

  return `${size} ${units[i]} (${bytes.toLocaleString()} bytes)`;
}

/**
 * Check if a file can be previewed
 */
export function isPreviewable(file: FileMetadata): boolean {
  const previewableCategories: FileCategory[] = [
    "image",
    "document",
    "code",
    "data",
    "video",
  ];

  if (!previewableCategories.includes(file.category)) {
    return false;
  }

  // Size limit for preview (50MB)
  const PREVIEW_SIZE_LIMIT = 50 * 1024 * 1024;
  if (file.size > PREVIEW_SIZE_LIMIT) {
    return false;
  }

  // PDF preview support
  if (file.mimeType === "application/pdf") {
    return true;
  }

  // Image preview support
  if (file.category === "image") {
    return [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "image/bmp",
    ].includes(file.mimeType.toLowerCase()) || file.mimeType.startsWith("image/");
  }

  // Video preview support
  if (file.category === "video") {
    return [
      "video/mp4",
      "video/webm",
      "video/ogg",
    ].includes(file.mimeType.toLowerCase());
  }

  // Text-based files are previewable
  if (file.category === "code" || file.category === "data") {
    return true;
  }

  // Plain text documents
  if (file.mimeType === "text/plain") {
    return true;
  }

  return false;
}

/**
 * Check if a file is an image that can be displayed
 */
export function isImageFile(file: FileMetadata): boolean {
  return file.category === "image";
}

/**
 * Get file extension from filename (lowercase, without dot)
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === 0) return "";
  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Get filename without extension
 */
export function getFileNameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return filename;
  return filename.slice(0, lastDot);
}

/**
 * Validate file against acceptance criteria
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(
  file: File,
  options: {
    accept?: string[];
    maxSize?: number;
  }
): FileValidationResult {
  const { accept, maxSize } = options;

  // Check file size
  if (maxSize !== undefined && file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${formatFileSize(maxSize)}.`,
    };
  }

  // Check file type
  if (accept && accept.length > 0) {
    const isAccepted = accept.some((pattern) => {
      // Handle wildcards like "image/*"
      if (pattern.endsWith("/*")) {
        const prefix = pattern.slice(0, -1);
        return file.type.startsWith(prefix);
      }
      // Handle specific MIME types
      if (pattern.includes("/")) {
        return file.type === pattern;
      }
      // Handle extensions (with or without dot)
      const extension = getFileExtension(file.name);
      const patternExt = pattern.startsWith(".") ? pattern.slice(1) : pattern;
      return extension === patternExt.toLowerCase();
    });

    if (!isAccepted) {
      return {
        valid: false,
        error: `File type not accepted. Allowed: ${accept.join(", ")}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Generate a unique file ID
 */
export function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create FileMetadata from a File object
 */
export function createFileMetadata(
  file: File,
  conversationId?: string
): FileMetadata {
  const id = generateFileId();
  const category = detectFileCategory(file);
  const extension = getFileExtension(file.name);

  return {
    id,
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    category,
    mimeType: file.type || "application/octet-stream",
    extension,
    uploadProgress: 0,
    uploadStatus: "pending",
    createdAt: new Date(),
    conversationId,
    _file: file,
  };
}

/**
 * Calculate SHA-256 checksum of a file
 */
export async function calculateChecksum(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Check if a file type is supported for upload to agents
 */
export function isSupportedByAgent(
  file: FileMetadata,
  agentCapabilities: { fileUpload?: boolean; vision?: boolean }
): boolean {
  if (!agentCapabilities.fileUpload) {
    return false;
  }

  // For vision-enabled agents, images are always supported
  if (agentCapabilities.vision && file.category === "image") {
    return true;
  }

  // Otherwise, check general file upload support
  return agentCapabilities.fileUpload;
}

/**
 * Language mapping for syntax highlighting
 */
export function getLanguageFromExtension(extension: string): string {
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    py: "python",
    java: "java",
    c: "c",
    cpp: "cpp",
    cc: "cpp",
    h: "c",
    hpp: "cpp",
    go: "go",
    rs: "rust",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    html: "html",
    htm: "html",
    css: "css",
    json: "json",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    zsh: "zsh",
    ps1: "powershell",
    md: "markdown",
    txt: "text",
    csv: "csv",
  };

  return languageMap[extension.toLowerCase()] || "text";
}

/**
 * Extract text content from common file types for preview
 */
export async function extractTextContent(file: File): Promise<string | null> {
  const category = detectFileCategory(file);

  if (category === "code" || category === "data" || file.type === "text/plain") {
    try {
      return await file.text();
    } catch {
      return null;
    }
  }

  return null;
}
