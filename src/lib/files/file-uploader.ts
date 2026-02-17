/**
 * Chunked File Uploader
 * 
 * Handles resumable, chunked file uploads with progress tracking,
 * automatic retry, and offline queue support.
 */

import { toast } from "sonner";
import { db } from "@/lib/db/indexeddb";
import {
  type FileMetadata,
  createFileMetadata,
  calculateChecksum,
} from "./file-types";

/**
 * Upload options configuration
 */
export interface UploadOptions {
  /** File to upload */
  file: File;
  /** Target agent endpoint URL */
  agentEndpoint: string;
  /** Optional auth token for the agent */
  authToken?: string;
  /** Chunk size in bytes (default: 1MB) */
  chunkSize?: number;
  /** Number of concurrent chunk uploads (default: 3) */
  concurrency?: number;
  /** Maximum retry attempts per chunk (default: 3) */
  maxRetries?: number;
  /** Associated conversation ID */
  conversationId?: string;
  /** Progress callback */
  onProgress?: (progress: number) => void;
  /** Chunk complete callback */
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  /** Status change callback */
  onStatusChange?: (status: FileMetadata["uploadStatus"]) => void;
}

/**
 * Upload result
 */
export interface UploadResult {
  /** Remote URL of the uploaded file */
  url: string;
  /** File metadata */
  metadata: FileMetadata;
  /** Response from the server */
  response: unknown;
}

/**
 * Chunk information for resumable uploads
 */
interface UploadChunk {
  index: number;
  start: number;
  end: number;
  size: number;
  retries: number;
  status: "pending" | "uploading" | "complete" | "error";
}

/**
 * Stored upload session for resumption
 */
interface UploadSession {
  fileId: string;
  fileName: string;
  fileSize: number;
  checksum: string;
  chunks: UploadChunk[];
  endpoint: string;
  createdAt: number;
  metadata: FileMetadata;
}

const DB_STORE_NAME = "uploadSessions";
const DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_MAX_RETRIES = 3;
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * FileUploader class for chunked, resumable uploads
 */
export class FileUploader {
  private abortController: AbortController | null = null;
  private options: UploadOptions | null = null;
  private metadata: FileMetadata | null = null;
  private chunks: UploadChunk[] = [];
  private uploadedChunks = 0;
  private totalChunks = 0;
  private isPaused = false;
  private isUploading = false;
  private sessionId: string | null = null;

  /**
   * Upload a file with chunked, resumable support
   */
  async upload(options: UploadOptions): Promise<UploadResult> {
    this.options = options;
    this.abortController = new AbortController();

    try {
      // Create metadata
      this.metadata = createFileMetadata(options.file, options.conversationId);
      this.metadata.uploadStatus = "uploading";
      options.onStatusChange?.("uploading");

      // Calculate file checksum for integrity
      const checksum = await calculateChecksum(options.file);
      this.metadata.checksum = checksum;

      // Check for existing session (resumable upload)
      const existingSession = await this.findExistingSession(
        options.file.name,
        options.file.size,
        checksum,
        options.agentEndpoint
      );

      if (existingSession) {
        await this.resumeUpload(existingSession);
      } else {
        await this.startNewUpload();
      }

      // Verify all chunks uploaded
      const allComplete = this.chunks.every((c) => c.status === "complete");
      if (!allComplete) {
        throw new Error("Upload incomplete - some chunks failed");
      }

      // Finalize upload
      const result = await this.finalizeUpload();

      // Update metadata
      this.metadata.uploadStatus = "complete";
      this.metadata.uploadProgress = 100;
      options.onStatusChange?.("complete");
      options.onProgress?.(100);

      // Clean up session
      await this.clearSession();

      return {
        url: result.url,
        metadata: this.metadata,
        response: result.response,
      };
    } catch (error) {
      this.metadata!.uploadStatus = "error";
      this.metadata!.errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      options.onStatusChange?.("error");

      // Store session for retry if network error
      if (this.isNetworkError(error)) {
        await this.storeSession();
      }

      throw error;
    }
  }

  /**
   * Abort the current upload
   */
  abort(): void {
    this.abortController?.abort();
    this.isUploading = false;
    if (this.metadata) {
      this.metadata.uploadStatus = "error";
      this.metadata.errorMessage = "Upload cancelled";
    }
  }

  /**
   * Pause the upload (stores session for resumption)
   */
  async pause(): Promise<void> {
    this.isPaused = true;
    this.abortController?.abort();
    if (this.metadata) {
      this.metadata.uploadStatus = "pending";
    }
    await this.storeSession();
  }

  /**
   * Resume a paused upload
   */
  async resume(): Promise<UploadResult> {
    if (!this.options || !this.metadata) {
      throw new Error("No upload to resume");
    }

    this.isPaused = false;
    this.abortController = new AbortController();

    const session = await this.findExistingSession(
      this.options.file.name,
      this.options.file.size,
      this.metadata.checksum!,
      this.options.agentEndpoint
    );

    if (!session) {
      throw new Error("No upload session found to resume");
    }

    return this.upload(this.options);
  }

  /**
   * Retry a failed upload
   */
  async retry(): Promise<UploadResult> {
    if (!this.options) {
      throw new Error("No upload to retry");
    }

    // Reset chunk statuses
    this.chunks = this.chunks.map((c) => ({
      ...c,
      status: c.status === "error" ? "pending" : c.status,
      retries: 0,
    }));

    this.metadata!.uploadStatus = "uploading";
    this.metadata!.errorMessage = undefined;

    return this.upload(this.options);
  }

  /**
   * Get current upload progress
   */
  getProgress(): number {
    if (this.totalChunks === 0) return 0;
    const completed = this.chunks.filter((c) => c.status === "complete").length;
    return Math.round((completed / this.totalChunks) * 100);
  }

  /**
   * Check if currently uploading
   */
  isActive(): boolean {
    return this.isUploading;
  }

  /**
   * Start a new upload
   */
  private async startNewUpload(): Promise<void> {
    const { file, chunkSize = DEFAULT_CHUNK_SIZE } = this.options!;

    // Create chunks
    this.chunks = this.createChunks(file.size, chunkSize);
    this.totalChunks = this.chunks.length;
    this.uploadedChunks = 0;

    // Store initial session
    await this.storeSession();

    // Upload chunks
    await this.uploadChunks();
  }

  /**
   * Resume an existing upload
   */
  private async resumeUpload(session: UploadSession): Promise<void> {
    this.chunks = session.chunks;
    this.totalChunks = this.chunks.length;
    this.uploadedChunks = this.chunks.filter((c) => c.status === "complete").length;

    // Calculate current progress
    const progress = this.getProgress();
    this.options?.onProgress?.(progress);

    // Upload remaining chunks
    await this.uploadChunks();
  }

  /**
   * Create chunk definitions from file size
   */
  private createChunks(fileSize: number, chunkSize: number): UploadChunk[] {
    const chunks: UploadChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < fileSize) {
      const end = Math.min(start + chunkSize, fileSize);
      chunks.push({
        index,
        start,
        end,
        size: end - start,
        retries: 0,
        status: "pending",
      });
      start = end;
      index++;
    }

    return chunks;
  }

  /**
   * Upload chunks with concurrency control
   */
  private async uploadChunks(): Promise<void> {
    const { concurrency = DEFAULT_CONCURRENCY } = this.options!;
    this.isUploading = true;

    const pendingChunks = () =>
      this.chunks.filter((c) => c.status === "pending" && !this.isPaused);

    const uploadChunk = async (chunk: UploadChunk): Promise<void> => {
      if (this.isPaused || this.abortController?.signal.aborted) {
        return;
      }

      chunk.status = "uploading";

      try {
        await this.uploadSingleChunk(chunk);
        chunk.status = "complete";
        this.uploadedChunks++;

        // Update progress
        const progress = this.getProgress();
        this.metadata!.uploadProgress = progress;
        this.options?.onProgress?.(progress);
        this.options?.onChunkComplete?.(chunk.index, this.totalChunks);

        // Update session periodically
        if (this.uploadedChunks % 5 === 0) {
          await this.storeSession();
        }
      } catch (error) {
        chunk.status = "error";
        chunk.retries++;

        const maxRetries = this.options?.maxRetries ?? DEFAULT_MAX_RETRIES;
        if (chunk.retries < maxRetries) {
          chunk.status = "pending";
          // Exponential backoff
          const delay = Math.pow(2, chunk.retries) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return uploadChunk(chunk);
        } else {
          throw new Error(
            `Chunk ${chunk.index} failed after ${maxRetries} retries`
          );
        }
      }
    };

    // Process chunks with concurrency limit
    const processQueue = async (): Promise<void> => {
      const executing: Promise<void>[] = [];

      for (const chunk of this.chunks) {
        if (chunk.status !== "pending") continue;

        const promise = uploadChunk(chunk).then(() => {
          executing.splice(executing.indexOf(promise), 1);
        });

        executing.push(promise);

        if (executing.length >= concurrency) {
          await Promise.race(executing);
        }
      }

      await Promise.all(executing);
    };

    await processQueue();
    this.isUploading = false;
  }

  /**
   * Upload a single chunk
   */
  private async uploadSingleChunk(chunk: UploadChunk): Promise<void> {
    const { file, agentEndpoint, authToken } = this.options!;
    const chunkBlob = file.slice(chunk.start, chunk.end);

    const formData = new FormData();
    formData.append("chunk", chunkBlob);
    formData.append("chunkIndex", chunk.index.toString());
    formData.append("totalChunks", this.totalChunks.toString());
    formData.append("fileName", file.name);
    formData.append("fileSize", file.size.toString());
    formData.append("checksum", this.metadata!.checksum!);

    const headers: Record<string, string> = {};
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${agentEndpoint}/upload/chunk`, {
      method: "POST",
      headers,
      body: formData,
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Chunk upload failed: ${response.status} ${errorText}`);
    }
  }

  /**
   * Finalize the upload after all chunks are uploaded
   */
  private async finalizeUpload(): Promise<{
    url: string;
    response: unknown;
  }> {
    const { file, agentEndpoint, authToken } = this.options!;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${agentEndpoint}/upload/finalize`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        checksum: this.metadata!.checksum,
        totalChunks: this.totalChunks,
        conversationId: this.options?.conversationId,
      }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Finalize failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return {
      url: result.url || result.fileUrl || "",
      response: result,
    };
  }

  /**
   * Store upload session for resumption
   */
  private async storeSession(): Promise<void> {
    if (!this.metadata || !this.options) return;

    const session: UploadSession = {
      fileId: this.metadata.id,
      fileName: this.options.file.name,
      fileSize: this.options.file.size,
      checksum: this.metadata.checksum!,
      chunks: this.chunks,
      endpoint: this.options.agentEndpoint,
      createdAt: Date.now(),
      metadata: this.metadata,
    };

    await db.table(DB_STORE_NAME).put(session, session.checksum);
  }

  /**
   * Find existing upload session
   */
  private async findExistingSession(
    fileName: string,
    fileSize: number,
    checksum: string,
    endpoint: string
  ): Promise<UploadSession | null> {
    try {
      const session = await db.table(DB_STORE_NAME).get(checksum);

      if (!session) return null;

      // Validate session matches
      if (
        session.fileName === fileName &&
        session.fileSize === fileSize &&
        session.endpoint === endpoint &&
        Date.now() - session.createdAt < SESSION_EXPIRY_MS
      ) {
        return session as UploadSession;
      }

      // Invalid/expired session, clean up
      await this.clearSession();
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Clear upload session
   */
  private async clearSession(): Promise<void> {
    if (this.metadata?.checksum) {
      await db.table(DB_STORE_NAME).delete(this.metadata.checksum);
    }
  }

  /**
   * Check if error is a network error
   */
  private isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.name === "TypeError" ||
        error.message.includes("network") ||
        error.message.includes("fetch") ||
        error.message.includes("abort")
      );
    }
    return false;
  }
}

/**
 * Simple upload function for non-chunked uploads
 */
export async function uploadFileSimple(
  file: File,
  endpoint: string,
  options: {
    authToken?: string;
    conversationId?: string;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<{ url: string; metadata: FileMetadata }> {
  const { authToken, conversationId, onProgress } = options;

  const metadata = createFileMetadata(file, conversationId);
  metadata.uploadStatus = "uploading";

  const formData = new FormData();
  formData.append("file", file);
  if (conversationId) {
    formData.append("conversationId", conversationId);
  }

  const headers: Record<string, string> = {};
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  // Simulate progress for simple upload
  const progressInterval = setInterval(() => {
    if (metadata.uploadProgress < 90) {
      metadata.uploadProgress += Math.random() * 10;
      onProgress?.(Math.min(metadata.uploadProgress, 90));
    }
  }, 200);

  try {
    const response = await fetch(`${endpoint}/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    clearInterval(progressInterval);

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();

    metadata.uploadProgress = 100;
    metadata.uploadStatus = "complete";
    onProgress?.(100);

    return {
      url: result.url || result.fileUrl || "",
      metadata,
    };
  } catch (error) {
    clearInterval(progressInterval);
    metadata.uploadStatus = "error";
    metadata.errorMessage = error instanceof Error ? error.message : "Upload failed";
    throw error;
  }
}

/**
 * Get all pending upload sessions
 */
export async function getPendingUploads(): Promise<UploadSession[]> {
  try {
    const sessions = await db.table(DB_STORE_NAME).toArray();
    const now = Date.now();

    // Filter out expired sessions
    const validSessions = sessions.filter(
      (s: UploadSession) => now - s.createdAt < SESSION_EXPIRY_MS
    );

    // Clean up expired sessions
    const expiredSessions = sessions.filter(
      (s: UploadSession) => now - s.createdAt >= SESSION_EXPIRY_MS
    );

    for (const session of expiredSessions) {
      await db.table(DB_STORE_NAME).delete(session.checksum);
    }

    return validSessions;
  } catch {
    return [];
  }
}

/**
 * Clear all upload sessions
 */
export async function clearAllUploadSessions(): Promise<void> {
  try {
    await db.table(DB_STORE_NAME).clear();
  } catch {
    // Ignore errors
  }
}

/**
 * Retry a queued upload
 */
export async function retryQueuedUpload(
  session: UploadSession,
  options: Omit<UploadOptions, "file">
): Promise<UploadResult> {
  // This would need access to the original File object
  // For now, just clear the session and let the user re-select
  await db.table(DB_STORE_NAME).delete(session.checksum);
  throw new Error("Please re-select the file to retry upload");
}
