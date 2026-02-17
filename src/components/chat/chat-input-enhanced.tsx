/**
 * Enhanced Chat Input Component
 * Chat input with integrated Quick Actions Menu and File Upload Support
 */

'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Square, Mic, Loader2, Paperclip, Image as ImageIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useMacroStore } from '@/stores/macro-store';
import { useChatMacroExecutor } from '@/hooks/use-macro-executor';
import type { Macro } from '@/types/macros';
import {
  QuickActionsTray,
  QuickActionsButton,
  MacroPills,
} from '@/components/macros';
import { useDragDrop } from '@/hooks/use-drag-drop';
import { useClipboardPaste } from '@/hooks/use-clipboard-paste';
import {
  type FileMetadata,
  createFileMetadata,
  validateFile,
} from '@/lib/files/file-types';
import { storeFile, queueFileForUpload } from '@/lib/files/file-store';
import { FileUploader } from '@/lib/files/file-uploader';
import { FileAttachmentList } from '@/components/files/file-attachment';
import { CompactImageGrid } from '@/components/files/image-preview-grid';

// ============================================
// Types
// ============================================

export interface ChatInputEnhancedProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (options?: { attachments?: FileMetadata[] }) => void;
  isLoading: boolean;
  isStreaming: boolean;
  onStop: () => void;
  disabled?: boolean;
  placeholder?: string;
  maxLines?: number;
  className?: string;
  conversationId: string;
  agentId: string;
  getLastMessage?: () => { id: string; content: string; role: string } | undefined;
  getReferencedFiles?: () => string[];
  onUploadFiles?: (files: File[]) => void;
  // File upload options
  attachments?: FileMetadata[];
  onAttachmentsChange?: (files: FileMetadata[]) => void;
  maxAttachments?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  agentEndpoint?: string;
  authToken?: string;
  supportsFileUpload?: boolean;
  supportsVision?: boolean;
}

// ============================================
// Component
// ============================================

export function ChatInputEnhanced({
  input,
  setInput,
  onSubmit,
  isLoading,
  isStreaming,
  onStop,
  disabled = false,
  placeholder = 'Message...',
  maxLines = 6,
  className,
  conversationId,
  agentId,
  getLastMessage,
  getReferencedFiles,
  onUploadFiles,
  // File upload props
  attachments: externalAttachments,
  onAttachmentsChange: externalOnAttachmentsChange,
  maxAttachments = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedFileTypes,
  agentEndpoint,
  authToken,
  supportsFileUpload = true,
  supportsVision = false,
}: ChatInputEnhancedProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const [showPills, setShowPills] = useState(false);
  
  // Internal file attachment state if not controlled externally
  const [internalAttachments, setInternalAttachments] = useState<FileMetadata[]>([]);
  const attachments = externalAttachments ?? internalAttachments;
  const setAttachments = externalOnAttachmentsChange ?? setInternalAttachments;
  
  const [uploadQueue, setUploadQueue] = useState<Map<string, FileUploader>>(new Map());

  // Macro store
  const { isTrayOpen, setTrayOpen } = useMacroStore();

  // Macro executor
  const macroExecutor = useChatMacroExecutor({
    insertText: (text, position = 'end') => {
      const textarea = textareaRef.current;
      if (!textarea) {
        setInput(input + text);
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = input;

      let newValue: string;
      let newCursorPos: number;

      switch (position) {
        case 'start':
          newValue = text + currentValue;
          newCursorPos = text.length;
          break;
        case 'end':
          newValue = currentValue + text;
          newCursorPos = newValue.length;
          break;
        case 'cursor':
          newValue = currentValue.slice(0, start) + text + currentValue.slice(end);
          newCursorPos = start + text.length;
          break;
        case 'replace':
          newValue = text;
          newCursorPos = text.length;
          break;
        default:
          newValue = currentValue + text;
          newCursorPos = newValue.length;
      }

      setInput(newValue);

      // Set cursor position after state update
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      });
    },
    runCommand: (command, args) => {
      // Handle slash commands
      switch (command) {
        case '/clear':
          setInput('');
          break;
        case '/reset':
          setInput('/reset');
          onSubmit();
          break;
        default:
          // Insert command text
          setInput(input + command + ' ' + (args?.join(' ') || ''));
      }
    },
    uploadFiles: (files) => {
      onUploadFiles?.(files);
      // Also process through our file handler
      processFiles(files);
    },
    conversationId,
    agentId,
    getLastMessage,
    getReferencedFiles,
  });

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
    const maxHeight = lineHeight * maxLines;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;

    const lines = input.split('\n').length;
    setLineCount(Math.min(lines, maxLines));
  }, [input, maxLines]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Show pills when user starts typing
    if (e.target.value.length > 0 && !showPills) {
      setShowPills(true);
    }
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((input.trim() || attachments.length > 0) && !isLoading && !disabled) {
        handleSubmit();
      }
    }
  };

  // Handle submit
  const handleSubmit = () => {
    onSubmit({ attachments });
    setAttachments([]);
  };

  // Process and add files
  const processFiles = useCallback(
    async (files: File[]) => {
      if (!supportsFileUpload) {
        toast.error('This agent does not support file uploads');
        return;
      }

      // Check max attachments
      if (attachments.length + files.length > maxAttachments) {
        toast.error(`Maximum ${maxAttachments} attachments allowed`);
        return;
      }

      const newAttachments: FileMetadata[] = [];

      for (const file of files) {
        // Validate file
        const validation = validateFile(file, {
          accept: acceptedFileTypes,
          maxSize: maxFileSize,
        });

        if (!validation.valid) {
          toast.error(`${file.name}: ${validation.error}`);
          continue;
        }

        // Check if only images are allowed for vision
        if (supportsVision && !file.type.startsWith('image/')) {
          toast.error(`${file.name}: Only images are supported by this agent`);
          continue;
        }

        // Create metadata
        const metadata = createFileMetadata(file, conversationId);

        // Store file locally
        try {
          await storeFile(file, conversationId, {
            generateThumbnail: file.type.startsWith('image/'),
          });
          newAttachments.push(metadata);
        } catch (error) {
          toast.error(`Failed to store ${file.name}`);
        }
      }

      if (newAttachments.length > 0) {
        setAttachments([...attachments, ...newAttachments]);

        // Start upload if endpoint is provided
        if (agentEndpoint) {
          newAttachments.forEach((attachment) => {
            uploadFile(attachment);
          });
        }
      }
    },
    [
      attachments,
      setAttachments,
      maxAttachments,
      maxFileSize,
      acceptedFileTypes,
      conversationId,
      agentEndpoint,
      supportsFileUpload,
      supportsVision,
    ]
  );

  // Upload a file
  const uploadFile = useCallback(
    async (metadata: FileMetadata) => {
      if (!agentEndpoint || !metadata._file) return;

      const uploader = new FileUploader();
      setUploadQueue((prev) => new Map(prev).set(metadata.id, uploader));

      try {
        await uploader.upload({
          file: metadata._file,
          agentEndpoint,
          authToken,
          conversationId,
          onProgress: (progress) => {
            updateAttachmentProgress(metadata.id, progress);
          },
          onStatusChange: (status) => {
            updateAttachmentStatus(metadata.id, status);
          },
        });

        toast.success(`${metadata.name} uploaded successfully`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Upload failed';
        updateAttachmentStatus(metadata.id, 'error', errorMsg);

        // Queue for retry when online
        if (!navigator.onLine) {
          await queueFileForUpload(metadata.id);
          toast.info(`${metadata.name} queued for upload when online`);
        } else {
          toast.error(`Failed to upload ${metadata.name}`);
        }
      } finally {
        setUploadQueue((prev) => {
          const newQueue = new Map(prev);
          newQueue.delete(metadata.id);
          return newQueue;
        });
      }
    },
    [agentEndpoint, authToken, conversationId]
  );

  // Update attachment progress
  const updateAttachmentProgress = (fileId: string, progress: number) => {
    setAttachments(
      attachments.map((att) =>
        att.id === fileId ? { ...att, uploadProgress: progress } : att
      )
    );
  };

  // Update attachment status
  const updateAttachmentStatus = (
    fileId: string,
    status: FileMetadata['uploadStatus'],
    errorMessage?: string
  ) => {
    setAttachments(
      attachments.map((att) =>
        att.id === fileId ? { ...att, uploadStatus: status, errorMessage } : att
      )
    );
  };

  // Remove attachment
  const removeAttachment = (fileId: string) => {
    // Cancel upload if in progress
    const uploader = uploadQueue.get(fileId);
    if (uploader) {
      uploader.abort();
      setUploadQueue((prev) => {
        const newQueue = new Map(prev);
        newQueue.delete(fileId);
        return newQueue;
      });
    }

    setAttachments(attachments.filter((att) => att.id !== fileId));
  };

  // Retry failed upload
  const retryUpload = (fileId: string) => {
    const attachment = attachments.find((att) => att.id === fileId);
    if (attachment && attachment._file) {
      updateAttachmentStatus(fileId, 'uploading');
      uploadFile(attachment);
    }
  };

  // Handle file drop
  const handleDrop = useCallback(
    (files: File[]) => {
      processFiles(files);
    },
    [processFiles]
  );

  // Handle paste
  const handlePaste = useCallback(
    (items: import('@/hooks/use-clipboard-paste').PastedItem[]) => {
      const files = items
        .filter((item) => item.file)
        .map((item) => item.file!);
      
      if (files.length > 0) {
        processFiles(files);
      }
    },
    [processFiles]
  );

  // Set up drag and drop
  const { isDragging, dragProps } = useDragDrop({
    onDrop: handleDrop,
    accept: acceptedFileTypes,
    maxSize: maxFileSize,
    maxFiles: maxAttachments - attachments.length,
    enabled: !disabled && supportsFileUpload,
    multiple: true,
  });

  // Set up clipboard paste
  useClipboardPaste({
    onPaste: handlePaste,
    acceptedTypes: acceptedFileTypes,
    enabled: !disabled && supportsFileUpload,
  });

  // Handle macro selection
  const handleMacroSelect = useCallback(
    async (macro: Macro) => {
      await macroExecutor.execute(macro);
    },
    [macroExecutor]
  );

  // Handle attachment button click
  const handleAttachmentClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    if (acceptedFileTypes) {
      input.accept = acceptedFileTypes.join(',');
    }
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      processFiles(files);
    };
    input.click();
  };

  // Handle voice input
  const handleVoiceInput = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      console.log('Started recording...');
    } else {
      console.log('Stopped recording');
    }
  };

  const isEmpty = input.trim().length === 0 && attachments.length === 0;
  const isSubmitDisabled = isEmpty || isLoading || disabled;
  const hasUploadingFiles = attachments.some(
    (att) => att.uploadStatus === 'uploading'
  );

  // Separate images from other attachments for grid display
  const imageAttachments = attachments.filter((att) => att.category === 'image');
  const otherAttachments = attachments.filter((att) => att.category !== 'image');

  return (
    <div
      className={cn(
        'relative flex flex-col',
        'bg-surface/50 backdrop-blur-sm border-t border-border/50',
        className
      )}
      {...dragProps}
    >
      {/* Drop zone overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 bg-accent/10 border-2 border-dashed border-accent rounded-lg m-2 pointer-events-none flex items-center justify-center"
          >
            <div className="text-center">
              <ImageIcon className="h-8 w-8 mx-auto text-accent mb-2" />
              <p className="text-sm font-medium text-accent">Drop files here</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Macro Pills (shown when typing) */}
      <AnimatePresence>
        {showPills && isEmpty && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pt-3 overflow-hidden"
          >
            <MacroPills onMacroSelect={handleMacroSelect} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachments area */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pt-3 space-y-2"
          >
            {/* Image grid */}
            {imageAttachments.length > 0 && (
              <CompactImageGrid
                images={imageAttachments}
                onRemove={(index) => removeAttachment(imageAttachments[index].id)}
              />
            )}

            {/* Other attachments */}
            {otherAttachments.length > 0 && (
              <FileAttachmentList
                files={otherAttachments}
                compact
                onRemove={(id) => removeAttachment(id)}
                onRetry={(id) => retryUpload(id)}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Row */}
      <div className="flex items-end gap-2 p-3">
        {/* Quick Actions Button */}
        <QuickActionsButton
          onClick={() => setTrayOpen(true)}
          isOpen={isTrayOpen}
        />

        {/* Attachment Button */}
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleAttachmentClick}
            disabled={isStreaming || !supportsFileUpload || attachments.length >= maxAttachments}
            className={cn(
              'shrink-0 h-10 w-10 rounded-full',
              attachments.length > 0
                ? 'text-accent bg-accent/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        </motion.div>

        {/* Input Container */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              supportsFileUpload
                ? placeholder
                : 'Message (file upload not supported)...'
            }
            disabled={disabled || isStreaming}
            rows={1}
            className={cn(
              'w-full resize-none bg-background border border-border rounded-2xl px-4 py-2.5',
              'text-sm text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'scrollbar-dark',
              lineCount > 1 ? 'pr-10' : ''
            )}
            style={{
              minHeight: '44px',
              maxHeight: `${maxLines * 24}px`,
            }}
          />
        </div>

        {/* Action Buttons */}
        <AnimatePresence mode="wait">
          {isEmpty && !isStreaming && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={handleVoiceInput}
                className={cn(
                  'shrink-0 h-10 w-10 rounded-full',
                  isRecording
                    ? 'bg-error/20 text-error animate-pulse'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Mic className="h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {isStreaming && (
            <motion.div
              key="stop"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button
                variant="destructive"
                size="icon"
                onClick={onStop}
                className="shrink-0 h-10 w-10 rounded-full shadow-lg"
              >
                <Square className="h-4 w-4 fill-current" />
              </Button>
            </motion.div>
          )}

          {!isEmpty && !isStreaming && (
            <motion.div
              key="send"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button
                onClick={handleSubmit}
                disabled={isSubmitDisabled || hasUploadingFiles}
                className={cn(
                  'shrink-0 h-10 w-10 rounded-full p-0',
                  'bg-accent hover:bg-accent/90 text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'shadow-lg'
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload progress indicator */}
      {hasUploadingFiles && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Uploading {attachments.filter((a) => a.uploadStatus === 'uploading').length} file(s)...</span>
          </div>
        </div>
      )}

      {/* Quick Actions Tray */}
      <QuickActionsTray
        isOpen={isTrayOpen}
        onClose={() => setTrayOpen(false)}
        onMacroSelect={handleMacroSelect}
        anchorRef={textareaRef as React.RefObject<HTMLElement>}
      />
    </div>
  );
}

// ============================================
// Standalone Quick Actions Trigger
// ============================================

export interface QuickActionsTriggerProps {
  onMacroSelect: (macro: Macro) => void;
  className?: string;
}

export function QuickActionsTrigger({
  onMacroSelect,
  className,
}: QuickActionsTriggerProps) {
  const { isTrayOpen, setTrayOpen } = useMacroStore();

  return (
    <>
      <QuickActionsButton
        onClick={() => setTrayOpen(true)}
        isOpen={isTrayOpen}
        className={className}
      />
      <QuickActionsTray
        isOpen={isTrayOpen}
        onClose={() => setTrayOpen(false)}
        onMacroSelect={onMacroSelect}
      />
    </>
  );
}
