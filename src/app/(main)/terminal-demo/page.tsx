/**
 * Terminal Demo Page
 * 
 * Full integration demo showcasing all terminal features:
 * - Stream animations
 * - File drag & drop
 * - Rich editor
 * - Quick actions
 * - Keyboard shortcuts
 */

'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Terminal,
  Zap,
  FileText,
  Keyboard,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TokenizedMessage } from '@/components/stream/tokenized-message';
import { AnimatedCodeBlock } from '@/components/stream/animated-code-block';
import { FileDropZone } from '@/components/files/file-drop-zone';
import { FileAttachmentList } from '@/components/files/file-attachment';
import { QuickActionsTray, QuickActionsButton } from '@/components/macros/quick-actions-tray';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { KeyboardShortcutsHelp } from '@/components/terminal/keyboard-shortcuts-help';
import type { Macro } from '@/types/macros';
import { toast } from 'sonner';

const DEMO_CONVERSATION = `Welcome to the AgentLink Terminal Demo!

This is a demonstration of all the integrated terminal features:

1. **Stream Animations** - Watch content stream in token-by-token
2. **File Attachments** - Drag and drop files onto the drop zone
3. **Rich Editor** - Full markdown support with slash commands
4. **Quick Actions** - Press ⌘K or click the + button
5. **Keyboard Shortcuts** - Press ? for help

Try it out below!`;

const DEMO_CODE = `// Example: Streaming data processing
import { useStreamAnimation } from '@/hooks/use-stream-animation';

function StreamingComponent() {
  const { displayedContent, isComplete } = useStreamAnimation({
    content: 'Hello, World!',
    isActive: true,
    speed: 'normal',
  });

  return (
    <div className="terminal-output">
      {displayedContent}
      {!isComplete && <Cursor />}
    </div>
  );
}`;

export default function TerminalDemoPage() {
  const [activeTab, setActiveTab] = useState('stream');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [editorValue, setEditorValue] = useState('Type **markdown** here...\nUse `/` for commands and `@` for mentions.');
  const [editorKey, setEditorKey] = useState(0);

  const handleStartStream = useCallback(() => {
    setIsStreaming(true);
  }, []);

  const handleReset = useCallback(() => {
    setIsStreaming(false);
    setTimeout(() => setIsStreaming(true), 100);
  }, []);

  const handleFileDrop = useCallback((files: File[]) => {
    setDroppedFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      toast.success(`Dropped: ${file.name}`);
    });
  }, []);

  const handleRemoveFile = useCallback((fileId: string) => {
    setDroppedFiles((prev) => prev.filter((_, i) => i.toString() !== fileId));
  }, []);

  const handleMacroSelect = useCallback((macro: Macro) => {
    toast.success(`Selected macro: ${macro.name}`);
    setIsTrayOpen(false);
  }, []);

  const handleEditorSubmit = useCallback(() => {
    toast.success('Message sent!');
    setEditorValue('');
    setEditorKey((k) => k + 1);
  }, []);

  const fileAttachments = droppedFiles.map((file, index) => ({
    id: index.toString(),
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    mimeType: file.type || 'application/octet-stream',
    category: 'unknown' as const,
    extension: file.name.split('.').pop() || '',
    conversationId: 'demo',
    createdAt: new Date(),
    uploadStatus: 'complete' as const,
    uploadProgress: 100,
  }));

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Terminal className="w-8 h-8 text-accent" />
            Terminal Integration Demo
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Experience the complete terminal system with stream animations, 
            file handling, rich editor, and quick actions all working together.
          </p>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Zap className="w-3 h-3" />
            Stream Animations
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <FileText className="w-3 h-3" />
            File Drop Zone
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Keyboard className="w-3 h-3" />
            Rich Editor
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="w-3 h-3" />
            Quick Actions
          </Badge>
        </div>

        {/* Main Demo Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="stream">Stream</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
          </TabsList>

          {/* Stream Tab */}
          <TabsContent value="stream" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-accent" />
                  Stream Animation
                </CardTitle>
                <CardDescription>
                  Token-by-token streaming with cursor tracking and velocity display
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={isStreaming ? handleReset : handleStartStream}
                    className="gap-2"
                  >
                    {isStreaming ? (
                      <><RotateCcw className="w-4 h-4" /> Restart</>
                    ) : (
                      <><Play className="w-4 h-4" /> Start Stream</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsStreaming(false)}
                    disabled={!isStreaming}
                  >
                    <Pause className="w-4 h-4" />
                  </Button>
                </div>

                <div className="border rounded-lg p-4 bg-muted/30 min-h-[200px]">
                  <TokenizedMessage
                    content={DEMO_CONVERSATION}
                    isStreaming={isStreaming}
                    enableCursor
                    showVelocity
                    pauseOnHover
                    streamSpeed="normal"
                    className="bg-transparent"
                  />
                </div>

                <AnimatedCodeBlock
                  code={DEMO_CODE}
                  language="typescript"
                  isStreaming={isStreaming}
                  animateLines
                  showLineNumbers
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" />
                  File Drop Zone
                </CardTitle>
                <CardDescription>
                  Drag and drop files anywhere on this page
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileDropZone
                  onFilesDrop={handleFileDrop}
                  accept={['image/*', '.pdf', '.txt', '.json', '.md']}
                  className="min-h-[300px]"
                >
                  <div className="border-2 border-dashed border-border rounded-xl p-8 min-h-[300px] flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 text-accent" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">Drop files here</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Try dragging images, PDFs, or text files onto this area. 
                      The drop zone provides visual feedback and handles multiple files.
                    </p>
                  </div>
                </FileDropZone>

                {droppedFiles.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Dropped Files:</h4>
                    <FileAttachmentList
                      files={fileAttachments}
                      onRemove={handleRemoveFile}
                      compact
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Editor Tab */}
          <TabsContent value="editor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-accent" />
                  Rich Text Editor
                </CardTitle>
                <CardDescription>
                  Markdown editor with slash commands, mentions, and preview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <RichTextEditor
                    key={editorKey}
                    value={editorValue}
                    onChange={setEditorValue}
                    onSubmit={handleEditorSubmit}
                    placeholder="Type your message..."
                    enableFormatting
                    enableSlashCommands
                    enableMentions
                    enablePreview
                    maxHeight={200}
                  />
                </div>

                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Editor Features:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Type <code className="px-1 py-0.5 bg-muted rounded">/</code> for slash commands</li>
                    <li>• Type <code className="px-1 py-0.5 bg-muted rounded">@</code> for mentions</li>
                    <li>• Use <code className="px-1 py-0.5 bg-muted rounded">Cmd+B</code> for bold</li>
                    <li>• Use <code className="px-1 py-0.5 bg-muted rounded">Cmd+I</code> for italic</li>
                    <li>• Press <code className="px-1 py-0.5 bg-muted rounded">Enter</code> to send</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shortcuts Tab */}
          <TabsContent value="shortcuts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-accent" />
                  Keyboard Shortcuts
                </CardTitle>
                <CardDescription>
                  All available keyboard shortcuts for the terminal interface
                </CardDescription>
              </CardHeader>
              <CardContent>
                <KeyboardShortcutsHelp variant="inline" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Quick Actions Integration
            </CardTitle>
            <CardDescription>
              The quick actions tray can be triggered from anywhere
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <QuickActionsButton
                onClick={() => setIsTrayOpen(true)}
                isOpen={isTrayOpen}
              />
              <span className="text-sm text-muted-foreground">
                Click the button or press <kbd className="px-2 py-1 bg-muted rounded text-xs">⌘K</kbd>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Integration Summary */}
        <Card className="bg-accent/5 border-accent/20">
          <CardHeader>
            <CardTitle>Integration Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              All terminal features are now integrated into the main AgentLink application:
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span>
                TokenizedMessage for streaming with cursor and velocity
              </li>
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span>
                FileDropZone for drag & drop file handling
              </li>
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span>
                RichTextEditor with markdown, slash commands, and mentions
              </li>
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span>
                QuickActionsTray with macro support
              </li>
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span>
                Keyboard shortcuts system
              </li>
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span>
                TerminalHeader with status, latency, and controls
              </li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions Tray */}
      <QuickActionsTray
        isOpen={isTrayOpen}
        onClose={() => setIsTrayOpen(false)}
        onMacroSelect={handleMacroSelect}
      />
    </div>
  );
}
