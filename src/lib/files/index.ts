/**
 * File Library Barrel Export
 * 
 * Central export point for all file-related utilities and types.
 */

// Types
export type {
  FileCategory,
  UploadStatus,
  FileMetadata,
} from "./file-types";

// File type utilities
export {
  detectFileCategory,
  getFileIcon,
  formatFileSize,
  formatFileSizeDetailed,
  isPreviewable,
  isImageFile,
  getFileExtension,
  getFileNameWithoutExtension,
  validateFile,
  generateFileId,
  createFileMetadata,
  calculateChecksum,
  isSupportedByAgent,
  getLanguageFromExtension,
  extractTextContent,
} from "./file-types";

// File uploader
export {
  FileUploader,
  uploadFileSimple,
  getPendingUploads,
  clearAllUploadSessions,
  retryQueuedUpload,
} from "./file-uploader";
export type {
  UploadOptions,
  UploadResult,
} from "./file-uploader";

// File store
export {
  storeFile,
  getFile,
  getFiles,
  deleteFile,
  getFilesByConversation,
  getFilesByMessage,
  getQueuedFiles,
  updateFile,
  queueFileForUpload,
  markFileUploaded,
  generateThumbnail,
  generateThumbnailBlob,
  getFileStats,
  cleanupExpiredFiles,
  getStorageUsage,
  clearConversationFiles,
  revokeFileUrls,
  duplicateFile,
  searchFiles,
  initFilesStore,
} from "./file-store";
export type {
  StoredFile,
  FileStats,
} from "./file-store";
