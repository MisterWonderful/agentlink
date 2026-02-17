/**
 * File Store
 * 
 * IndexedDB storage for files with thumbnail generation,
 * conversation association, and offline support.
 */

import { db } from "@/lib/db/indexeddb";
import {
  type FileMetadata,
  type FileCategory,
  detectFileCategory,
  createFileMetadata,
  getFileExtension,
  isImageFile,
} from "./file-types";

/**
 * Stored file with blob data
 */
export interface StoredFile extends FileMetadata {
  /** Binary blob data */
  blob: Blob;
  /** Conversation ID this file belongs to */
  conversationId: string;
  /** Message ID this file is attached to (if sent) */
  messageId?: string;
  /** Thumbnail blob for images */
  thumbnailBlob?: Blob;
  /** Whether file is queued for upload when online */
  isQueued: boolean;
  /** Upload attempt count */
  uploadAttempts: number;
  /** Last upload attempt timestamp */
  lastUploadAttempt?: number;
  /** Expiration timestamp (for cleanup) */
  expiresAt?: number;
}

const FILES_STORE_NAME = "files";
const THUMBNAIL_SIZE = 300; // Max dimension for thumbnails
const MAX_FILE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Store a file in IndexedDB
 */
export async function storeFile(
  file: File,
  conversationId: string,
  options: {
    messageId?: string;
    generateThumbnail?: boolean;
  } = {}
): Promise<StoredFile> {
  const { messageId, generateThumbnail = true } = options;

  const metadata = createFileMetadata(file, conversationId);
  const storedFile: StoredFile = {
    ...metadata,
    blob: file,
    conversationId,
    messageId,
    isQueued: false,
    uploadAttempts: 0,
    expiresAt: Date.now() + MAX_FILE_AGE_MS,
  };

  // Generate thumbnail for images
  if (generateThumbnail && isImageFile(metadata)) {
    try {
      const thumbnailBlob = await generateThumbnailBlob(file);
      if (thumbnailBlob) {
        storedFile.thumbnailBlob = thumbnailBlob;
        storedFile.thumbnailUrl = URL.createObjectURL(thumbnailBlob);
      }
    } catch {
      // Thumbnail generation failed, continue without it
    }
  }

  // Create blob URL for preview
  storedFile.previewUrl = URL.createObjectURL(file);

  // Store in IndexedDB
  await db.table(FILES_STORE_NAME).put(storedFile, storedFile.id);

  return storedFile;
}

/**
 * Get a file by ID
 */
export async function getFile(
  fileId: string
): Promise<StoredFile | undefined> {
  const storedFile = await db.table(FILES_STORE_NAME).get(fileId);

  if (!storedFile) return undefined;

  // Recreate blob URLs if needed
  if (storedFile.blob && !storedFile.previewUrl) {
    storedFile.previewUrl = URL.createObjectURL(storedFile.blob);
  }
  if (storedFile.thumbnailBlob && !storedFile.thumbnailUrl) {
    storedFile.thumbnailUrl = URL.createObjectURL(storedFile.thumbnailBlob);
  }

  return storedFile as StoredFile;
}

/**
 * Get multiple files by IDs
 */
export async function getFiles(fileIds: string[]): Promise<StoredFile[]> {
  const files = await db.table(FILES_STORE_NAME).bulkGet(fileIds);
  return files
    .filter((f): f is StoredFile => f !== undefined)
    .map((file) => {
      // Recreate blob URLs
      if (file.blob && !file.previewUrl) {
        file.previewUrl = URL.createObjectURL(file.blob);
      }
      if (file.thumbnailBlob && !file.thumbnailUrl) {
        file.thumbnailUrl = URL.createObjectURL(file.thumbnailBlob);
      }
      return file;
    });
}

/**
 * Delete a file
 */
export async function deleteFile(fileId: string): Promise<void> {
  const file = await getFile(fileId);
  if (file) {
    // Revoke blob URLs to prevent memory leaks
    if (file.previewUrl) {
      URL.revokeObjectURL(file.previewUrl);
    }
    if (file.thumbnailUrl) {
      URL.revokeObjectURL(file.thumbnailUrl);
    }
  }

  await db.table(FILES_STORE_NAME).delete(fileId);
}

/**
 * Get all files for a conversation
 */
export async function getFilesByConversation(
  conversationId: string
): Promise<StoredFile[]> {
  const files = await db
    .table(FILES_STORE_NAME)
    .where("conversationId")
    .equals(conversationId)
    .toArray();

  return files.map((file: StoredFile) => {
    // Recreate blob URLs
    if (file.blob && !file.previewUrl) {
      file.previewUrl = URL.createObjectURL(file.blob);
    }
    if (file.thumbnailBlob && !file.thumbnailUrl) {
      file.thumbnailUrl = URL.createObjectURL(file.thumbnailBlob);
    }
    return file;
  });
}

/**
 * Get files for a specific message
 */
export async function getFilesByMessage(
  messageId: string
): Promise<StoredFile[]> {
  const files = await db
    .table(FILES_STORE_NAME)
    .where("messageId")
    .equals(messageId)
    .toArray();

  return files.map((file: StoredFile) => {
    if (file.blob && !file.previewUrl) {
      file.previewUrl = URL.createObjectURL(file.blob);
    }
    if (file.thumbnailBlob && !file.thumbnailUrl) {
      file.thumbnailUrl = URL.createObjectURL(file.thumbnailBlob);
    }
    return file;
  });
}

/**
 * Get queued files (waiting for upload when online)
 */
export async function getQueuedFiles(): Promise<StoredFile[]> {
  const files = await db
    .table(FILES_STORE_NAME)
    .where("isQueued")
    .equals(1)
    .toArray();

  return files.map((file: StoredFile) => {
    if (file.blob && !file.previewUrl) {
      file.previewUrl = URL.createObjectURL(file.blob);
    }
    return file;
  });
}

/**
 * Update file metadata
 */
export async function updateFile(
  fileId: string,
  updates: Partial<Omit<StoredFile, "id" | "blob">>
): Promise<StoredFile | undefined> {
  const file = await getFile(fileId);
  if (!file) return undefined;

  const updatedFile = { ...file, ...updates };
  await db.table(FILES_STORE_NAME).put(updatedFile, fileId);

  return updatedFile;
}

/**
 * Queue a file for upload when online
 */
export async function queueFileForUpload(fileId: string): Promise<void> {
  await updateFile(fileId, {
    isQueued: true,
    uploadStatus: "queued",
    lastUploadAttempt: Date.now(),
  });
}

/**
 * Mark file as uploaded
 */
export async function markFileUploaded(
  fileId: string,
  remoteUrl: string,
  messageId?: string
): Promise<void> {
  await updateFile(fileId, {
    isQueued: false,
    uploadStatus: "complete",
    uploadProgress: 100,
    previewUrl: remoteUrl,
    messageId,
  });
}

/**
 * Generate a thumbnail blob from an image file
 */
export async function generateThumbnailBlob(
  file: File | Blob
): Promise<Blob | undefined> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate thumbnail dimensions
      let { width, height } = img;
      const maxSize = THUMBNAIL_SIZE;

      if (width > height && width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }

      // Create canvas and draw thumbnail
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Use better quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Could not create thumbnail blob"));
          }
        },
        "image/jpeg",
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };

    img.src = url;
  });
}

/**
 * Generate thumbnail URL from a stored file
 */
export async function generateThumbnail(
  file: StoredFile
): Promise<string | undefined> {
  if (file.thumbnailUrl) {
    return file.thumbnailUrl;
  }

  if (file.thumbnailBlob) {
    const url = URL.createObjectURL(file.thumbnailBlob);
    await updateFile(file.id, { thumbnailUrl: url });
    return url;
  }

  if (isImageFile(file) && file.blob) {
    try {
      const thumbnailBlob = await generateThumbnailBlob(file.blob);
      if (thumbnailBlob) {
        const url = URL.createObjectURL(thumbnailBlob);
        await updateFile(file.id, {
          thumbnailBlob,
          thumbnailUrl: url,
        });
        return url;
      }
    } catch {
      // Failed to generate thumbnail
    }
  }

  return undefined;
}

/**
 * Get file statistics for a conversation
 */
export interface FileStats {
  totalFiles: number;
  totalSize: number;
  byCategory: Record<FileCategory, number>;
}

export async function getFileStats(
  conversationId: string
): Promise<FileStats> {
  const files = await getFilesByConversation(conversationId);

  const stats: FileStats = {
    totalFiles: files.length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
    byCategory: {
      image: 0,
      document: 0,
      code: 0,
      data: 0,
      archive: 0,
      audio: 0,
      video: 0,
      unknown: 0,
    },
  };

  for (const file of files) {
    stats.byCategory[file.category]++;
  }

  return stats;
}

/**
 * Clean up expired files
 */
export async function cleanupExpiredFiles(): Promise<number> {
  const now = Date.now();
  const files = await db.table(FILES_STORE_NAME).toArray();

  let deletedCount = 0;
  for (const file of files) {
    if (file.expiresAt && file.expiresAt < now) {
      await deleteFile(file.id);
      deletedCount++;
    }
  }

  return deletedCount;
}

/**
 * Get total storage used by files
 */
export async function getStorageUsage(): Promise<{
  fileCount: number;
  totalSize: number;
}> {
  const files = await db.table(FILES_STORE_NAME).toArray();

  return {
    fileCount: files.length,
    totalSize: files.reduce((sum: number, f: StoredFile) => {
      const blobSize = f.blob?.size || 0;
      const thumbnailSize = f.thumbnailBlob?.size || 0;
      return sum + blobSize + thumbnailSize;
    }, 0),
  };
}

/**
 * Clear all files for a conversation
 */
export async function clearConversationFiles(
  conversationId: string
): Promise<number> {
  const files = await getFilesByConversation(conversationId);

  for (const file of files) {
    await deleteFile(file.id);
  }

  return files.length;
}

/**
 * Revoke all blob URLs for a file (call before deleting)
 */
export function revokeFileUrls(file: StoredFile): void {
  if (file.previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(file.previewUrl);
  }
  if (file.thumbnailUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(file.thumbnailUrl);
  }
}

/**
 * Duplicate a file for a new conversation
 */
export async function duplicateFile(
  fileId: string,
  newConversationId: string
): Promise<StoredFile | undefined> {
  const originalFile = await getFile(fileId);
  if (!originalFile) return undefined;

  const newMetadata = createFileMetadata(
    new File([originalFile.blob], originalFile.name, {
      type: originalFile.mimeType,
    }),
    newConversationId
  );

  const newFile: StoredFile = {
    ...newMetadata,
    blob: originalFile.blob,
    thumbnailBlob: originalFile.thumbnailBlob,
    conversationId: newConversationId,
    isQueued: true,
    uploadAttempts: 0,
    expiresAt: Date.now() + MAX_FILE_AGE_MS,
  };

  // Recreate URLs
  newFile.previewUrl = URL.createObjectURL(newFile.blob);
  if (newFile.thumbnailBlob) {
    newFile.thumbnailUrl = URL.createObjectURL(newFile.thumbnailBlob);
  }

  await db.table(FILES_STORE_NAME).put(newFile, newFile.id);

  return newFile;
}

/**
 * Search files by name in a conversation
 */
export async function searchFiles(
  conversationId: string,
  query: string
): Promise<StoredFile[]> {
  const files = await getFilesByConversation(conversationId);
  const lowerQuery = query.toLowerCase();

  return files.filter((file) =>
    file.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Initialize the files store (create table if needed)
 * Call this when the app starts
 */
export async function initFilesStore(): Promise<void> {
  // The table should already exist from the main DB initialization
  // This function ensures any migrations or cleanup runs

  // Clean up expired files on startup
  await cleanupExpiredFiles();

  // Log storage usage
  const usage = await getStorageUsage();
  console.log(`[FileStore] ${usage.fileCount} files, ${usage.totalSize} bytes`);
}
