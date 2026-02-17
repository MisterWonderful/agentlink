/**
 * Editor Components
 * 
 * A rich text editor system for AgentLink with markdown support,
 * slash commands, mentions, and terminal-like features.
 * 
 * @example
 * import { RichTextEditor, useEditorCommands } from '@/components/editor';
 * 
 * function ChatInput() {
 *   const [value, setValue] = useState('');
 *   const commands = useEditorCommands();
 *   
 *   return (
 *     <RichTextEditor
 *       value={value}
 *       onChange={setValue}
 *       onSubmit={() => console.log('Submit:', value)}
 *     />
 *   );
 * }
 */

// Main editor component
export { RichTextEditor } from './rich-text-editor';
export type { 
  RichTextEditorProps, 
  RichTextEditorRef 
} from './rich-text-editor';

// Slash command menu
export { 
  SlashCommandMenu, 
  defaultCommands,
  useSlashCommandMenu 
} from './slash-command-menu';
export type { 
  SlashCommand, 
  SlashCommandContext, 
  SlashCommandMenuProps,
  UseSlashCommandMenuOptions,
  UseSlashCommandMenuReturn
} from './slash-command-menu';

// Mention autocomplete
export { 
  MentionAutocomplete, 
  defaultMentionSuggestions,
  useMentionAutocomplete,
  parseMentions,
  formatMention 
} from './mention-autocomplete';
export type { 
  MentionType, 
  MentionSuggestion, 
  MentionAutocompleteProps,
  UseMentionAutocompleteOptions,
  UseMentionAutocompleteReturn
} from './mention-autocomplete';

// Markdown toolbar
export { 
  MarkdownToolbar, 
  useFloatingToolbar 
} from './markdown-toolbar';
export type { 
  MarkdownToolbarProps, 
  ToolbarAction,
  UseFloatingToolbarOptions,
  UseFloatingToolbarReturn
} from './markdown-toolbar';

// Preview pane
export { 
  PreviewPane, 
  PreviewToggle,
  usePreviewPane 
} from './preview-pane';
export type { 
  PreviewPaneProps, 
  PreviewToggleProps,
  UsePreviewPaneOptions,
  UsePreviewPaneReturn
} from './preview-pane';
