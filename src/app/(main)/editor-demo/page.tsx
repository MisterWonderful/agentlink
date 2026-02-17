/**
 * Editor Demo Page
 * 
 * Interactive demo showcasing the rich text editor features:
 * - Markdown formatting
 * - Slash commands
 * - Mentions
 * - Preview mode
 * - Keyboard shortcuts
 */

'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Type,
  Bold,
  Italic,
  Code,
  Link,
  List,
  ListOrdered,
  Quote,
  Eye,
  Terminal,
  Send,
  Command,
  AtSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { MarkdownToolbar } from '@/components/editor/markdown-toolbar';
import { SlashCommandMenu } from '@/components/editor/slash-command-menu';
import { MentionAutocomplete } from '@/components/editor/mention-autocomplete';
import { toast } from 'sonner';

const SAMPLE_MARKDOWN = `# Welcome to the Editor

This is a **rich text editor** with full *markdown* support.

## Features

- **Bold** and *italic* text
- Inline \`code\` and code blocks
- [Links](https://example.com)
- Lists and quotes

## Try It Out

Type **/** for slash commands
Type **@** for mentions
`;

const MENTION_SUGGESTIONS = [
  { id: '1', name: 'assistant', type: 'agent' as const, description: 'AI Assistant' },
  { id: '2', name: 'last-message', type: 'context' as const, description: 'Last Message' },
  { id: '3', name: 'conversation', type: 'context' as const, description: 'Full Conversation' },
  { id: '4', name: 'date', type: 'variable' as const, description: 'Current Date' },
  { id: '5', name: 'file-upload', type: 'file' as const, description: 'Uploaded File' },
];

export default function EditorDemoPage() {
  const [value, setValue] = useState(SAMPLE_MARKDOWN);
  const [activeTab, setActiveTab] = useState('editor');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');

  const handleSubmit = useCallback(() => {
    if (!value.trim()) {
      toast.error('Please enter a message');
      return;
    }
    toast.success('Message sent!');
    setValue('');
  }, [value]);

  const handleBold = useCallback(() => {
    setValue((prev) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return prev;
      
      const selectedText = selection.toString();
      if (selectedText) {
        return prev.replace(selectedText, `**${selectedText}**`);
      }
      return prev + '**bold**';
    });
  }, []);

  const handleItalic = useCallback(() => {
    setValue((prev) => prev + '*italic*');
  }, []);

  const handleCode = useCallback(() => {
    setValue((prev) => prev + '`code`');
  }, []);

  const handleCodeBlock = useCallback(() => {
    setValue((prev) => prev + '\n\n```typescript\n// Your code here\n```\n\n');
  }, []);

  const handleLink = useCallback(() => {
    setValue((prev) => prev + '[link text](https://)');
  }, []);

  const handleList = useCallback(() => {
    setValue((prev) => prev + '\n- item 1\n- item 2\n- item 3\n');
  }, []);

  const handleOrderedList = useCallback(() => {
    setValue((prev) => prev + '\n1. first\n2. second\n3. third\n');
  }, []);

  const handleQuote = useCallback(() => {
    setValue((prev) => prev + '\n> quote\n');
  }, []);

  const handleSlashCommand = useCallback((command: { id: string; title: string }) => {
    toast.info(`Command: ${command.title}`);
    setShowSlashMenu(false);
  }, []);

  const handleMention = useCallback((suggestion: { name: string }) => {
    setValue((prev) => prev + `@${suggestion.name} `);
    setShowMentionMenu(false);
  }, []);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Type className="w-8 h-8 text-accent" />
            Rich Text Editor
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A powerful markdown editor with formatting tools, slash commands, 
            mentions, and live preview.
          </p>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Bold className="w-3 h-3" />
            Formatting
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Command className="w-3 h-3" />
            Slash Commands
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <AtSign className="w-3 h-3" />
            Mentions
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Eye className="w-3 h-3" />
            Live Preview
          </Badge>
        </div>

        {/* Toolbar Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-accent" />
              Markdown Toolbar
            </CardTitle>
            <CardDescription>
              Quick access formatting buttons
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MarkdownToolbar
              onBold={handleBold}
              onItalic={handleItalic}
              onCode={handleCode}
              onCodeBlock={handleCodeBlock}
              onLink={handleLink}
              onList={handleList}
              onOrderedList={handleOrderedList}
              onQuote={handleQuote}
              isVisible={true}
              position="inline"
            />
          </CardContent>
        </Card>

        {/* Main Editor Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rich Text Editor</CardTitle>
                <CardDescription>
                  Full-featured editor with all capabilities enabled
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RichTextEditor
                  value={value}
                  onChange={setValue}
                  onSubmit={handleSubmit}
                  placeholder="Type your message... Use / for commands, @ for mentions"
                  enableFormatting
                  enableSlashCommands
                  enableMentions
                  enablePreview={false}
                  mentionSuggestions={MENTION_SUGGESTIONS}
                  maxHeight={300}
                />

                <div className="mt-4 flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    {value.length} characters • {value.split('\n').length} lines
                  </p>
                  <Button onClick={handleSubmit} size="sm" className="gap-2">
                    <Send className="w-4 h-4" />
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>
                  See how your markdown renders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RichTextEditor
                  value={value}
                  onChange={setValue}
                  onSubmit={handleSubmit}
                  enableFormatting={false}
                  enableSlashCommands={false}
                  enableMentions={false}
                  enablePreview
                  maxHeight={400}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Slash Commands Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Command className="w-5 h-5 text-accent" />
              Slash Commands
            </CardTitle>
            <CardDescription>
              Type / in the editor to see available commands
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="text-sm text-muted-foreground mb-4">
                Click to preview the slash command menu:
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSlashQuery('');
                  setShowSlashMenu(true);
                }}
              >
                <Command className="w-4 h-4 mr-2" />
                Open Slash Menu
              </Button>
            </div>

            <SlashCommandMenu
              isOpen={showSlashMenu}
              query={slashQuery}
              onSelect={handleSlashCommand}
              onClose={() => setShowSlashMenu(false)}
              position={{ top: 0, left: 0 }}
            />
          </CardContent>
        </Card>

        {/* Mentions Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AtSign className="w-5 h-5 text-accent" />
              Mentions
            </CardTitle>
            <CardDescription>
              Type @ to mention agents, users, or system context
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="text-sm text-muted-foreground mb-4">
                Click to preview the mention autocomplete:
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setMentionQuery('');
                  setShowMentionMenu(true);
                }}
              >
                <AtSign className="w-4 h-4 mr-2" />
                Open Mention Menu
              </Button>
            </div>

            <MentionAutocomplete
              isOpen={showMentionMenu}
              query={mentionQuery}
              onSelect={handleMention}
              onClose={() => setShowMentionMenu(false)}
              suggestions={MENTION_SUGGESTIONS}
              position={{ top: 0, left: 0 }}
            />
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card>
          <CardHeader>
            <CardTitle>Keyboard Shortcuts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bold</span>
                  <kbd className="px-2 py-0.5 bg-muted rounded text-xs">Cmd+B</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Italic</span>
                  <kbd className="px-2 py-0.5 bg-muted rounded text-xs">Cmd+I</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inline Code</span>
                  <kbd className="px-2 py-0.5 bg-muted rounded text-xs">Cmd+E</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Code Block</span>
                  <kbd className="px-2 py-0.5 bg-muted rounded text-xs">Cmd+Shift+E</kbd>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Link</span>
                  <kbd className="px-2 py-0.5 bg-muted rounded text-xs">Cmd+K</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slash Commands</span>
                  <kbd className="px-2 py-0.5 bg-muted rounded text-xs">/</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mentions</span>
                  <kbd className="px-2 py-0.5 bg-muted rounded text-xs">@</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Send Message</span>
                  <kbd className="px-2 py-0.5 bg-muted rounded text-xs">Enter</kbd>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
