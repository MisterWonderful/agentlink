/**
 * useDragDrop Hook
 * 
 * React hook for handling drag and drop file operations.
 * Provides visual feedback and file validation.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";

/**
 * Options for the useDragDrop hook
 */
export interface UseDragDropOptions {
  /** Callback when files are dropped */
  onDrop: (files: File[]) => void;
  /** Callback when drag enters the drop zone */
  onDragEnter?: () => void;
  /** Callback when drag leaves the drop zone */
  onDragLeave?: () => void;
  /** Accepted file types (MIME types or extensions) */
  accept?: string[];
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Maximum number of files */
  maxFiles?: number;
  /** Whether drag and drop is enabled */
  enabled?: boolean;
  /** Whether to allow multiple files */
  multiple?: boolean;
}

/**
 * Return type for the useDragDrop hook
 */
export interface UseDragDropReturn {
  /** Whether files are currently being dragged over */
  isDragging: boolean;
  /** Whether the drag contains valid files */
  isValidDrag: boolean;
  /** Props to spread on the drop zone element */
  dragProps: {
    onDragEnter: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  /** Manually open file picker */
  openFilePicker: () => void;
  /** Props for a hidden file input */
  inputProps: {
    ref: React.RefObject<HTMLInputElement | null>;
    type: "file";
    style: React.CSSProperties;
    accept?: string;
    multiple?: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
}

/**
 * Validate files against criteria
 */
function validateFiles(
  files: File[],
  options: {
    accept?: string[];
    maxSize?: number;
    maxFiles?: number;
    multiple?: boolean;
  }
): { valid: boolean; files: File[]; errors: string[] } {
  const errors: string[] = [];
  let validFiles = [...files];

  // Check max files
  if (options.maxFiles !== undefined && files.length > options.maxFiles) {
    if (options.multiple === false) {
      errors.push(`Only 1 file allowed. Using first file.`);
      validFiles = [files[0]];
    } else {
      errors.push(
        `Too many files. Maximum ${options.maxFiles} files allowed. Using first ${options.maxFiles}.`
      );
      validFiles = files.slice(0, options.maxFiles);
    }
  }

  // Validate each file
  validFiles = validFiles.filter((file) => {
    // Check file size
    if (options.maxSize !== undefined && file.size > options.maxSize) {
      const sizeMB = (options.maxSize / (1024 * 1024)).toFixed(1);
      errors.push(`${file.name}: File too large (max ${sizeMB}MB)`);
      return false;
    }

    // Check file type
    if (options.accept && options.accept.length > 0) {
      const isAccepted = options.accept.some((pattern) => {
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
        const extension = file.name.split(".").pop()?.toLowerCase() || "";
        const patternExt = pattern.startsWith(".") ? pattern.slice(1) : pattern;
        return extension === patternExt.toLowerCase();
      });

      if (!isAccepted) {
        errors.push(`${file.name}: File type not accepted`);
        return false;
      }
    }

    return true;
  });

  return {
    valid: validFiles.length > 0,
    files: validFiles,
    errors,
  };
}

/**
 * Hook for drag and drop file handling
 */
export function useDragDrop(options: UseDragDropOptions): UseDragDropReturn {
  const {
    onDrop,
    onDragEnter,
    onDragLeave,
    accept,
    maxSize,
    maxFiles,
    enabled = true,
    multiple = true,
  } = options;

  const [isDragging, setIsDragging] = useState(false);
  const [isValidDrag, setIsValidDrag] = useState(true);
  const dragCounter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dragCounter.current = 0;
    };
  }, []);

  /**
   * Check if drag contains files
   */
  const hasFiles = useCallback((e: React.DragEvent): boolean => {
    return e.dataTransfer.types.includes("Files");
  }, []);

  /**
   * Handle drag enter
   */
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (!enabled) return;

      e.preventDefault();
      e.stopPropagation();

      dragCounter.current++;

      if (!hasFiles(e)) {
        setIsValidDrag(false);
        return;
      }

      setIsDragging(true);
      setIsValidDrag(true);
      onDragEnter?.();
    },
    [enabled, hasFiles, onDragEnter]
  );

  /**
   * Handle drag over
   */
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!enabled) return;

      e.preventDefault();
      e.stopPropagation();

      // Set drop effect
      e.dataTransfer.dropEffect = hasFiles(e) ? "copy" : "none";
    },
    [enabled, hasFiles]
  );

  /**
   * Handle drag leave
   */
  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (!enabled) return;

      e.preventDefault();
      e.stopPropagation();

      dragCounter.current--;

      if (dragCounter.current === 0) {
        setIsDragging(false);
        setIsValidDrag(true);
        onDragLeave?.();
      }
    },
    [enabled, onDragLeave]
  );

  /**
   * Handle drop
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!enabled) return;

      e.preventDefault();
      e.stopPropagation();

      dragCounter.current = 0;
      setIsDragging(false);
      setIsValidDrag(true);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      // Validate files
      const validation = validateFiles(files, {
        accept,
        maxSize,
        maxFiles,
        multiple,
      });

      // Show errors
      if (validation.errors.length > 0) {
        validation.errors.forEach((error) => {
          toast.error(error);
        });
      }

      if (validation.valid) {
        onDrop(validation.files);
      }
    },
    [enabled, accept, maxSize, maxFiles, multiple, onDrop]
  );

  /**
   * Open file picker
   */
  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  /**
   * Handle file input change
   */
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      // Validate files
      const validation = validateFiles(files, {
        accept,
        maxSize,
        maxFiles,
        multiple,
      });

      // Show errors
      if (validation.errors.length > 0) {
        validation.errors.forEach((error) => {
          toast.error(error);
        });
      }

      if (validation.valid) {
        onDrop(validation.files);
      }

      // Reset input
      e.target.value = "";
    },
    [accept, maxSize, maxFiles, multiple, onDrop]
  );

  /**
   * Build accept string for input
   */
  const acceptString = accept?.join(",") ?? undefined;

  return {
    isDragging,
    isValidDrag,
    dragProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
    openFilePicker,
    inputProps: {
      ref: inputRef,
      type: "file",
      style: { display: "none" },
      accept: acceptString,
      multiple,
      onChange: handleFileInputChange,
    },
  };
}

/**
 * Hook for global drag and drop (full page)
 */
export function useGlobalDragDrop(
  options: Omit<UseDragDropOptions, "enabled"> & {
    containerRef?: React.RefObject<HTMLElement | null>;
  }
): UseDragDropReturn {
  const { containerRef, ...restOptions } = options;
  const [isDragging, setIsDragging] = useState(false);
  const [isValidDrag, setIsValidDrag] = useState(true);
  const dragCounter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasFiles = useCallback((e: DragEvent): boolean => {
    return e.dataTransfer?.types.includes("Files") ?? false;
  }, []);

  useEffect(() => {
    const container = containerRef?.current ?? document.body;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current++;

      if (!hasFiles(e)) {
        setIsValidDrag(false);
        return;
      }

      setIsDragging(true);
      setIsValidDrag(true);
      options.onDragEnter?.();
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = hasFiles(e) ? "copy" : "none";
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;

      if (dragCounter.current === 0) {
        setIsDragging(false);
        setIsValidDrag(true);
        options.onDragLeave?.();
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);
      setIsValidDrag(true);

      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;

      const validation = validateFiles(files, {
        accept: options.accept,
        maxSize: options.maxSize,
        maxFiles: options.maxFiles,
        multiple: options.multiple,
      });

      if (validation.errors.length > 0) {
        validation.errors.forEach((error) => {
          toast.error(error);
        });
      }

      if (validation.valid) {
        options.onDrop(validation.files);
      }
    };

    container.addEventListener("dragenter", handleDragEnter);
    container.addEventListener("dragover", handleDragOver);
    container.addEventListener("dragleave", handleDragLeave);
    container.addEventListener("drop", handleDrop);

    return () => {
      container.removeEventListener("dragenter", handleDragEnter);
      container.removeEventListener("dragover", handleDragOver);
      container.removeEventListener("dragleave", handleDragLeave);
      container.removeEventListener("drop", handleDrop);
    };
  }, [containerRef, hasFiles, options]);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const validation = validateFiles(files, {
        accept: options.accept,
        maxSize: options.maxSize,
        maxFiles: options.maxFiles,
        multiple: options.multiple,
      });

      if (validation.errors.length > 0) {
        validation.errors.forEach((error) => {
          toast.error(error);
        });
      }

      if (validation.valid) {
        options.onDrop(validation.files);
      }

      e.target.value = "";
    },
    [options]
  );

  const acceptString = options.accept?.join(",") ?? undefined;

  return {
    isDragging,
    isValidDrag,
    dragProps: {
      onDragEnter: () => {},
      onDragOver: () => {},
      onDragLeave: () => {},
      onDrop: () => {},
    },
    openFilePicker,
    inputProps: {
      ref: inputRef,
      type: "file",
      style: { display: "none" },
      accept: acceptString,
      multiple: options.multiple,
      onChange: handleFileInputChange,
    },
  };
}
