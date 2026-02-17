# AgentLink File Transfer System

A comprehensive file handling system supporting drag & drop, clipboard paste, chunked uploads, and file previews.

## Features

- **Drag & Drop**: Full-screen and inline drop zones with visual feedback
- **Clipboard Paste**: Support for screenshots and copied files
- **Chunked Uploads**: Resumable uploads with automatic retry
- **File Previews**: Images, PDFs, code, CSV/JSON, and text files
- **Image Grids**: Responsive layouts for 1-4+ images
- **Offline Queue**: Queue files for upload when connection returns
- **IndexedDB Storage**: Local file storage with thumbnail generation

## Quick Start

### Basic File Upload

```tsx
import { useState } from 'react';
import { FileDropZone } from '@/components/files';
import { type FileMetadata } from '@/lib/files';

function MyComponent() {
  const [files, setFiles] = useState<FileMetadata[]>([]);

  const handleFilesDrop = (droppedFiles: File[]) => {
    // Process dropped files
    console.log('Files dropped:', droppedFiles);
  };

  return (
    <FileDropZone
      onFilesDrop={handleFilesDrop}
      accept={['image/*', '.pdf', '.txt']}
      maxSize={10 * 1024 * 1024} // 10MB
      maxFiles={5}
    >
      <div>Your content here</div>
    </FileDropZone>
  );
}
```

### Chat Input with File Support

```tsx
import { ChatInputEnhanced } from '@/components/chat';
import { type FileMetadata } from '@/lib/files';

function ChatPage() {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileMetadata[]>([]);

  const handleSubmit = (options?: { attachments?: FileMetadata[] }) => {
    console.log('Message:', input);
    console.log('Attachments:', options?.attachments);
    setInput('');
    setAttachments([]);
  };

  return (
    <ChatInputEnhanced
      input={input}
      setInput={setInput}
      onSubmit={handleSubmit}
      isLoading={false}
      isStreaming={false}
      onStop={() => {}}
      conversationId="conv_123"
      agentId="agent_456"
      attachments={attachments}
      onAttachmentsChange={setAttachments}
      agentEndpoint="https://api.example.com"
      supportsFileUpload={true}
      supportsVision={true}
    />
  );
}
```

### File Preview Modal

```tsx
import { FilePreview } from '@/components/files';
import { type FileMetadata } from '@/lib/files';

function FileViewer({ file }: { file: FileMetadata }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Preview</button>
      
      <FilePreview
        file={file}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onDownload={() => downloadFile(file)}
      />
    </>
  );
}
```

### Image Grid

```tsx
import { ImagePreviewGrid } from '@/components/files';
import { type FileMetadata } from '@/lib/files';

function ImageGallery({ images }: { images: FileMetadata[] }) {
  return (
    <ImagePreviewGrid
      images={images}
      onImageClick={(index) => console.log('Clicked image:', index)}
      onRemove={(index) => console.log('Remove image:', index)}
      maxVisible={4}
      aspectRatio="square"
    />
  );
}
```

## Hooks

### useDragDrop

```tsx
import { useDragDrop } from '@/hooks/use-drag-drop';

function DropZone() {
  const { isDragging, dragProps, openFilePicker, inputProps } = useDragDrop({
    onDrop: (files) => console.log(files),
    accept: ['image/*'],
    maxSize: 5 * 1024 * 1024,
  });

  return (
    <div {...dragProps}>
      <input {...inputProps} />
      {isDragging ? 'Drop here!' : 'Drag files or click to browse'}
    </div>
  );
}
```

### useClipboardPaste

```tsx
import { useClipboardPaste } from '@/hooks/use-clipboard-paste';

function PasteArea() {
  const { isPasteEnabled } = useClipboardPaste({
    onPaste: (items) => {
      items.forEach(item => {
        if (item.file) console.log('Pasted file:', item.file);
      });
    },
    acceptedTypes: ['image/*'],
  });

  return (
    <div>
      {isPasteEnabled ? 'Paste enabled' : 'Paste not supported'}
    </div>
  );
}
```

## File Types

Supported file categories:

| Category | MIME Types | Extensions |
|----------|-----------|------------|
| `image` | image/* | jpg, png, gif, webp, svg |
| `document` | application/pdf, text/plain | pdf, doc, docx, txt |
| `code` | text/javascript, application/json | js, ts, py, html, css |
| `data` | text/csv | csv, xls, xlsx |
| `archive` | application/zip | zip, rar, tar, gz |
| `audio` | audio/mpeg | mp3, wav, ogg |
| `video` | video/mp4 | mp4, webm, mov |

## Storage

Files are stored in IndexedDB with the following features:

- **Automatic cleanup**: Files expire after 7 days
- **Thumbnail generation**: For images
- **Blob URL management**: Automatic cleanup to prevent memory leaks
- **Queue management**: Offline upload queue

```tsx
import { 
  storeFile, 
  getFile, 
  deleteFile,
  getFilesByConversation,
  cleanupExpiredFiles 
} from '@/lib/files';

// Store a file
const storedFile = await storeFile(file, conversationId);

// Retrieve a file
const file = await getFile(fileId);

// Get conversation files
const files = await getFilesByConversation(conversationId);

// Cleanup expired files
const deletedCount = await cleanupExpiredFiles();
```

## Chunked Upload

```tsx
import { FileUploader } from '@/lib/files';

const uploader = new FileUploader();

try {
  const result = await uploader.upload({
    file: myFile,
    agentEndpoint: 'https://api.example.com',
    authToken: 'token',
    chunkSize: 1024 * 1024, // 1MB chunks
    onProgress: (progress) => console.log(`${progress}%`),
    onChunkComplete: (index, total) => 
      console.log(`Chunk ${index + 1}/${total} complete`),
  });
  
  console.log('Uploaded to:', result.url);
} catch (error) {
  console.error('Upload failed:', error);
}

// Pause/resume
await uploader.pause();
await uploader.resume();

// Abort
uploader.abort();
```

## Components Reference

### FileDropZone
- Full-screen or inline drop overlay
- Visual feedback on drag
- File validation

### FileAttachment
- Attachment pill with progress
- Error state with retry
- Remove button

### FilePreview
- Image: zoom, pan
- PDF: embedded viewer
- Code: syntax highlighting
- CSV: formatted table
- JSON: tree view

### ImagePreviewGrid
- 1 image: full width
- 2 images: side by side
- 3-4 images: 2x2 grid
- 5+: masonry with "+N" overlay

## Styling

All components use Tailwind CSS with these conventions:

- Drop zone: `border-dashed`, animated pulse on drag
- Attachment pills: rounded, icon + name + size + remove
- Progress bar: smooth width transition
- Image previews: rounded corners, `object-fit: cover`
- Error state: red border, error icon, retry button
