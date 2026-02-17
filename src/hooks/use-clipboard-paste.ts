/**
 * useClipboardPaste Hook
 * 
 * React hook for handling clipboard paste operations.
 * Supports images (screenshots), files, and text conversion.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

/**
 * Pasted item type
 */
export type PastedItemType = "image" | "file" | "text" | "html" | "rtf";

/**
 * Pasted item data
 */
export interface PastedItem {
  /** Type of pasted content */
  type: PastedItemType;
  /** File object (for images and files) */
  file?: File;
  /** Text content */
  text?: string;
  /** HTML content */
  html?: string;
  /** Timestamp of paste */
  timestamp: number;
  /** Original clipboard item */
  originalItem: ClipboardItem;
}

/**
 * Options for the useClipboardPaste hook
 */
export interface UseClipboardPasteOptions {
  /** Callback when items are pasted */
  onPaste: (items: PastedItem[]) => void;
  /** Accepted MIME types */
  acceptedTypes?: string[];
  /** Whether clipboard paste is enabled */
  enabled?: boolean;
  /** Target element ref (defaults to document) */
  targetRef?: React.RefObject<HTMLElement | null>;
  /** Convert text to file */
  convertTextToFile?: boolean;
  /** Filename for text conversion */
  textFileName?: string;
}

/**
 * Return type for the useClipboardPaste hook
 */
export interface UseClipboardPasteReturn {
  /** Whether clipboard paste is enabled and available */
  isPasteEnabled: boolean;
  /** Last pasted items */
  lastPastedItems: PastedItem[];
  /** Whether the browser supports clipboard API */
  isClipboardSupported: boolean;
  /** Manually trigger paste reading */
  readClipboard: () => Promise<void>;
}

/**
 * Check if clipboard API is supported
 */
function isClipboardSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard !== "undefined" &&
    typeof navigator.clipboard.read === "function"
  );
}

/**
 * Check if clipboard contains supported content
 */
function isSupportedType(
  type: string,
  acceptedTypes?: string[]
): PastedItemType | null {
  // Image types
  if (type.startsWith("image/")) {
    if (!acceptedTypes || acceptedTypes.some((t) => t.startsWith("image/"))) {
      return "image";
    }
  }

  // File types
  if (type.includes("file") || type === "application/x-moz-file") {
    if (
      !acceptedTypes ||
      acceptedTypes.some((t) => !t.startsWith("image/") && !t.startsWith("text/"))
    ) {
      return "file";
    }
  }

  // Text types
  if (type === "text/plain") {
    return "text";
  }

  if (type === "text/html") {
    return "html";
  }

  if (type === "text/rtf" || type === "application/rtf") {
    return "rtf";
  }

  return null;
}

/**
 * Convert data URI to File
 */
function dataUriToFile(dataUri: string, filename: string): File | null {
  try {
    const arr = dataUri.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
  } catch {
    return null;
  }
}

/**
 * Create a text file from pasted text
 */
function createTextFile(text: string, filename: string): File {
  const blob = new Blob([text], { type: "text/plain" });
  return new File([blob], filename, { type: "text/plain" });
}

/**
 * Hook for clipboard paste handling
 */
export function useClipboardPaste(
  options: UseClipboardPasteOptions
): UseClipboardPasteReturn {
  const {
    onPaste,
    acceptedTypes,
    enabled = true,
    targetRef,
    convertTextToFile = false,
    textFileName = "pasted-text.txt",
  } = options;

  const [lastPastedItems, setLastPastedItems] = useState<PastedItem[]>([]);
  const [isClipboardAPISupported] = useState(() => isClipboardSupported());
  const isProcessingPaste = useRef(false);

  /**
   * Process clipboard data
   */
  const processClipboardData = useCallback(
    async (dataTransfer: DataTransfer): Promise<PastedItem[]> => {
      const items: PastedItem[] = [];

      // Process files first
      if (dataTransfer.files && dataTransfer.files.length > 0) {
        for (const file of Array.from(dataTransfer.files)) {
          const type = isSupportedType(file.type, acceptedTypes);
          if (type) {
            items.push({
              type,
              file,
              timestamp: Date.now(),
              originalItem: new ClipboardItem({}),
            });
          }
        }
      }

      // Process items
      if (dataTransfer.items && dataTransfer.items.length > 0) {
        for (const item of Array.from(dataTransfer.items)) {
          if (item.kind === "file") {
            const file = item.getAsFile();
            if (file) {
              const type = isSupportedType(file.type, acceptedTypes);
              if (type && !items.some((i) => i.file?.name === file.name)) {
                items.push({
                  type,
                  file,
                  timestamp: Date.now(),
                  originalItem: new ClipboardItem({}),
                });
              }
            }
          }
        }
      }

      return items;
    },
    [acceptedTypes]
  );

  /**
   * Read from Clipboard API
   */
  const readClipboard = useCallback(async () => {
    if (!isClipboardAPISupported || !enabled || isProcessingPaste.current) {
      return;
    }

    isProcessingPaste.current = true;

    try {
      const clipboardItems = await navigator.clipboard.read();
      const pastedItems: PastedItem[] = [];

      for (const clipboardItem of clipboardItems) {
        const types = clipboardItem.types;

        for (const type of types) {
          const itemType = isSupportedType(type, acceptedTypes);
          if (!itemType) continue;

          const blob = await clipboardItem.getType(type);

          if (itemType === "image") {
            const extension = type.split("/")[1] || "png";
            const filename = `screenshot-${Date.now()}.${extension}`;
            const file = new File([blob], filename, { type });
            pastedItems.push({
              type: "image",
              file,
              timestamp: Date.now(),
              originalItem: clipboardItem,
            });
          } else if (itemType === "text" || itemType === "html") {
            const text = await blob.text();
            
            if (convertTextToFile) {
              const file = createTextFile(text, textFileName);
              pastedItems.push({
                type: "file",
                file,
                text,
                timestamp: Date.now(),
                originalItem: clipboardItem,
              });
            } else {
              pastedItems.push({
                type: itemType,
                text,
                html: itemType === "html" ? text : undefined,
                timestamp: Date.now(),
                originalItem: clipboardItem,
              });
            }
          }
        }
      }

      if (pastedItems.length > 0) {
        setLastPastedItems(pastedItems);
        onPaste(pastedItems);
      }
    } catch (error) {
      // Clipboard read failed - might be permission denied
      console.warn("Clipboard read failed:", error);
    } finally {
      isProcessingPaste.current = false;
    }
  }, [
    isClipboardAPISupported,
    enabled,
    acceptedTypes,
    convertTextToFile,
    textFileName,
    onPaste,
  ]);

  /**
   * Handle paste event
   */
  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      if (!enabled || isProcessingPaste.current) return;

      isProcessingPaste.current = true;

      try {
        const items = await processClipboardData(e.clipboardData || new DataTransfer());

        if (items.length > 0) {
          e.preventDefault();
          setLastPastedItems(items);
          onPaste(items);
        }
      } catch (error) {
        console.warn("Paste processing failed:", error);
      } finally {
        isProcessingPaste.current = false;
      }
    },
    [enabled, processClipboardData, onPaste]
  );

  // Set up paste event listener
  useEffect(() => {
    if (!enabled) return;

    const target = targetRef?.current ?? document;
    target.addEventListener("paste", handlePaste as unknown as EventListener);

    return () => {
      target.removeEventListener("paste", handlePaste as unknown as EventListener);
    };
  }, [enabled, targetRef, handlePaste]);

  return {
    isPasteEnabled: enabled && isClipboardAPISupported,
    lastPastedItems,
    isClipboardSupported: isClipboardAPISupported,
    readClipboard,
  };
}

/**
 * Hook specifically for image paste (screenshots)
 */
export function useImagePaste(
  onImagePaste: (file: File) => void,
  options: {
    enabled?: boolean;
    targetRef?: React.RefObject<HTMLElement | null>;
    fileName?: string;
  } = {}
): {
  isEnabled: boolean;
  lastImage: File | null;
} {
  const { enabled = true, targetRef, fileName } = options;
  const [lastImage, setLastImage] = useState<File | null>(null);

  const handlePaste = useCallback(
    (items: PastedItem[]) => {
      const imageItem = items.find((item) => item.type === "image" && item.file);
      if (imageItem?.file) {
        const finalFile = fileName
          ? new File([imageItem.file], fileName, { type: imageItem.file.type })
          : imageItem.file;
        setLastImage(finalFile);
        onImagePaste(finalFile);
      }
    },
    [fileName, onImagePaste]
  );

  const { isPasteEnabled } = useClipboardPaste({
    onPaste: handlePaste,
    acceptedTypes: ["image/*"],
    enabled,
    targetRef,
  });

  return {
    isEnabled: isPasteEnabled,
    lastImage,
  };
}

/**
 * Hook for detecting if user is trying to paste in a specific element
 */
export function usePasteTarget(
  options: {
    onPaste: (items: PastedItem[]) => void;
    acceptedTypes?: string[];
    convertTextToFile?: boolean;
  }
): {
  isFocused: boolean;
  pasteProps: {
    onFocus: () => void;
    onBlur: () => void;
    onPaste: (e: React.ClipboardEvent) => void;
  };
} {
  const [isFocused, setIsFocused] = useState(false);
  const { onPaste, acceptedTypes, convertTextToFile } = options;

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items: PastedItem[] = [];
      const dataTransfer = e.clipboardData;

      if (!dataTransfer) return;

      // Process files
      if (dataTransfer.files.length > 0) {
        for (const file of Array.from(dataTransfer.files)) {
          if (!acceptedTypes || acceptedTypes.some((t) => {
            if (t.endsWith("/*")) {
              return file.type.startsWith(t.slice(0, -1));
            }
            return file.type === t || file.name.endsWith(t);
          })) {
            items.push({
              type: file.type.startsWith("image/") ? "image" : "file",
              file,
              timestamp: Date.now(),
              originalItem: new ClipboardItem({}),
            });
          }
        }
      }

      // Process items
      for (const item of Array.from(dataTransfer.items)) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file && !items.some((i) => i.file?.name === file.name)) {
            items.push({
              type: file.type.startsWith("image/") ? "image" : "file",
              file,
              timestamp: Date.now(),
              originalItem: new ClipboardItem({}),
            });
          }
        } else if (item.kind === "string" && convertTextToFile) {
          item.getAsString((text) => {
            if (text.trim()) {
              const blob = new Blob([text], { type: "text/plain" });
              const file = new File([blob], "pasted-text.txt", {
                type: "text/plain",
              });
              onPaste([
                {
                  type: "file",
                  file,
                  text,
                  timestamp: Date.now(),
                  originalItem: new ClipboardItem({}),
                },
              ]);
            }
          });
        }
      }

      if (items.length > 0) {
        e.preventDefault();
        onPaste(items);
      }
    },
    [acceptedTypes, convertTextToFile, onPaste]
  );

  return {
    isFocused,
    pasteProps: {
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
      onPaste: handlePaste,
    },
  };
}
