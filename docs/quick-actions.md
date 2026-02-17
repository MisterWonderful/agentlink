# Quick Actions Menu

An iMessage/Facebook Messenger-style Quick Actions Menu for AgentLink with customizable macros and plugins.

## Overview

The Quick Actions Menu provides:
- **iMessage-style tray**: Slides up smoothly from the input area
- **Categorized macros**: System, Prompts, Files, Tools, Custom
- **Favorites**: Pin frequently used macros
- **Recent**: Recently used appear first
- **Search**: Find macros quickly
- **Custom macros**: Users can create their own
- **Keyboard shortcuts**: Power user friendly
- **Template variables**: Dynamic content (`@last`, `{{date}}`)

## Architecture

```
src/
├── types/macros.ts          # Type definitions
├── stores/macro-store.ts    # Zustand store for macros
├── lib/macros/
│   └── macro-engine.ts      # Template processing engine
├── hooks/
│   └── use-macro-executor.ts # Macro execution hook
└── components/macros/
    ├── index.ts             # Barrel exports
    ├── quick-actions-tray.tsx    # Main tray component
    ├── macro-grid.tsx            # Grid of macro buttons
    ├── macro-button.tsx          # Individual macro button
    ├── macro-creator.tsx         # Create/edit macros
    ├── category-tabs.tsx         # Category filter tabs
    └── macro-search.tsx          # Search component
```

## Usage

### Basic Integration

```tsx
import { ChatInputEnhanced } from '@/components/chat';

function ChatPage() {
  const [input, setInput] = useState('');
  
  return (
    <ChatInputEnhanced
      input={input}
      setInput={setInput}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      isStreaming={isStreaming}
      onStop={handleStop}
      conversationId={conversationId}
      agentId={agentId}
    />
  );
}
```

### Standalone Quick Actions

```tsx
import { QuickActionsTrigger } from '@/components/macros';

function MyComponent() {
  const handleMacroSelect = (macro: Macro) => {
    console.log('Selected:', macro.name);
  };

  return <QuickActionsTrigger onMacroSelect={handleMacroSelect} />;
}
```

### Using the Macro Store

```tsx
import { useMacroStore, useFavoriteMacros } from '@/stores';

function MyComponent() {
  const { macros, addMacro, toggleFavorite } = useMacroStore();
  const favorites = useFavoriteMacros();
  
  // Add a custom macro
  const newMacro = addMacro({
    name: 'My Macro',
    description: 'Does something cool',
    icon: 'Sparkles',
    category: 'custom',
    action: {
      type: 'insert_text',
      payload: { text: 'Hello {{date}}!', position: 'end' }
    },
    isCustom: true
  });
  
  return (...);
}
```

### Executing Macros Programmatically

```tsx
import { useMacroExecutor } from '@/hooks';

function MyComponent() {
  const { execute, canExecute, getPreview } = useMacroExecutor({
    onInsertText: (text) => console.log('Insert:', text),
    onRunCommand: (cmd) => console.log('Command:', cmd),
  });

  const handleExecute = async (macro: Macro) => {
    if (canExecute(macro)) {
      const result = await execute(macro, {
        conversationId: '123',
        agentId: 'agent-1',
        variables: new Map()
      });
      console.log('Result:', result);
    }
  };
}
```

## Macro Types

### Built-in Macros

The following default macros are included:

| Name | Icon | Category | Action |
|------|------|----------|--------|
| Explain | 💡 | prompts | Insert "Please explain this..." |
| Refactor | ✨ | prompts | Insert "Please refactor..." |
| Debug | 🐛 | prompts | Insert debug request |
| Summarize | 📝 | context | @last summary request |
| Clear | 🗑️ | system | Run /clear command |
| Image | 🖼️ | files | Upload image |
| Code | 💻 | system | Insert code block |
| Reset | 🔄 | system | Run /reset command |
| Improve | ✨ | prompts | Improve writing |
| Translate | 🌐 | prompts | Translate to English |
| Document | 📄 | prompts | Generate documentation |
| Test | 🧪 | prompts | Generate unit tests |

### Action Types

1. **insert_text**: Insert text into the input
   ```ts
   {
     type: 'insert_text',
     payload: { text: 'Hello!', position: 'end' }
   }
   ```

2. **run_command**: Execute a slash command
   ```ts
   {
     type: 'run_command',
     payload: { command: '/clear', args: [] }
   }
   ```

3. **upload_file**: Open file picker
   ```ts
   {
     type: 'upload_file',
     payload: { accept: 'image/*', multiple: false }
   }
   ```

4. **set_variable**: Set a context variable
   ```ts
   {
     type: 'set_variable',
     payload: { key: 'theme', value: 'dark' }
   }
   ```

5. **open_menu**: Open a submenu
   ```ts
   {
     type: 'open_menu',
     payload: { menuId: 'settings' }
   }
   ```

## Template Variables

Use variables in macro text for dynamic content:

### Context Variables
- `@last` - Last message content
- `@agent` - Current agent ID
- `@conversation` - Current conversation ID
- `@file` - First referenced file
- `@files` - All referenced files (newline separated)

### Date/Time Variables
- `{{date}}` - Current date (locale)
- `{{time}}` - Current time (locale)
- `{{datetime}}` - Current date and time
- `{{iso}}` - ISO timestamp
- `{{timestamp}}` - Unix timestamp
- `{{year}}`, `{{month}}`, `{{day}}` - Date components
- `{{hour}}`, `{{minute}}`, `{{second}}` - Time components
- `{{weekday}}` - Day of week

### Special Variables
- `{{newline}}` - Newline character
- `{{tab}}` - Tab character

### Conditionals
```
{{#if last}}Previous: @last{{/if}}
```

### Loops
```
{{#each files}}- {{this}}
{{/each}}
```

## Keyboard Shortcuts

- `Cmd/Ctrl + K` - Open Quick Actions tray
- `Esc` - Close tray
- `↑/↓` - Navigate search results
- `Enter` - Select highlighted macro

Individual macros can have custom shortcuts:
```ts
{
  name: 'Clear',
  shortcut: 'cmd+shift+k',
  // ...
}
```

## Customization

### Adding a Custom Category

```ts
// In types/macros.ts
export type MacroCategory = 
  | 'system'
  | 'context'
  | 'prompts'
  | 'files'
  | 'tools'
  | 'custom'
  | 'my-category'; // Add your category

// Add labels and colors
export const MACRO_CATEGORY_LABELS: Record<MacroCategory, string> = {
  // ... existing
  'my-category': 'My Category',
};

export const MACRO_CATEGORY_COLORS: Record<MacroCategory, string> = {
  // ... existing
  'my-category': '#ff6b6b',
};
```

### Styling

The components use Tailwind CSS and can be customized via:

1. **CSS Variables**: Override in globals.css
2. **Component props**: Pass className to components
3. **Tailwind config**: Extend theme

Example:
```tsx
<QuickActionsTray
  className="bg-surface/95 backdrop-blur-xl"
/>
```

## Persistence

Macros, favorites, and recent usage are persisted to localStorage via Zustand's persist middleware. The store automatically:
- Saves custom macros
- Remembers favorite selections
- Tracks recently used macros (last 20)

## Performance

- **Virtual scrolling**: For large macro lists (future enhancement)
- **Memoized selectors**: Use `useFavoriteMacros()`, `useRecentMacros()` for efficient re-renders
- **Lazy loading**: Components load on-demand
- **Animation optimization**: Uses `transform` and `opacity` for 60fps animations

## Future Enhancements

- [ ] Drag-and-drop reordering with @dnd-kit
- [ ] Import/export macros (JSON)
- [ ] Macro plugins/extensions system
- [ ] AI-powered macro suggestions
- [ ] Shared macro libraries
- [ ] Macro analytics (usage stats)
