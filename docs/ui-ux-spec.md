# UI/UX Specification

## Design Principles

1. **Mobile-first** — design for 375px width, scale up to desktop
2. **Agent-centric** — agents are contacts, conversations are threads
3. **Speed over decoration** — minimize taps to start chatting
4. **Status visibility** — always show connection state
5. **Dark mode native** — dark is the default for developer audience

## Navigation Structure

### Mobile (< 768px)
Bottom tab bar with 3 tabs:
- **Agents** (home) — agent list with status indicators
- **Search** — full-text search across all conversations
- **Settings** — account, billing, app preferences

Chat views slide in from the right (push navigation). Agent config is a bottom sheet.

### Desktop (>= 768px)
Sidebar layout:
- Left sidebar (280px): agent list + conversation list for selected agent
- Main area: active chat view
- Right panel (optional, toggle): agent configuration

## Screen Specifications

### S1: Agent List (Home Screen)

```
┌─────────────────────────────────┐
│  AgentLink            [+ Add]   │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────────┐│
│  │ 🟢 HomeLab GPT              ││
│  │    "Here's the analysis..." ││
│  │                    2m ago   ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ 🟡 Ollama Local             ││
│  │    "Let me think about..."  ││
│  │                    1h ago   ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ 🔴 VPS Agent                ││
│  │    Last seen 3h ago         ││
│  │                             ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │   ➕ Add your first agent   ││
│  │   Connect to your AI agent  ││
│  └─────────────────────────────┘│
│                                 │
├─────────────────────────────────┤
│  [Agents]  [Search]  [Settings] │
└─────────────────────────────────┘
```

**Components**: `AgentList`, `AgentCard`, `AgentStatusBadge`, `EmptyAgentState`

**Interactions**:
- Tap agent → navigate to chat
- Long press → context menu (Configure, Pin, Delete)
- Pull down → refresh health checks for all agents
- Swipe left → quick actions (Configure, Delete)
- [+ Add] button → navigate to agent onboarding

**Agent card data**:
- Avatar (user-chosen or generated from initials)
- Display name
- Status badge (🟢/🟡/🔴/⚪)
- Last message preview (first 80 chars, truncated)
- Relative timestamp
- Accent color left border

### S2: Agent Onboarding

Multi-step flow. See `specs/agent-connection.spec.md` for full wireframes.

Steps:
1. **Select type** — radio list: OpenClaw, Ollama, vLLM, OpenAI-Compatible, Commercial, Custom
2. **Enter connection** — endpoint URL, auth token (pre-filled based on type)
3. **Test connection** — button triggers test, shows results (model, latency, capabilities)
4. **Name & customize** — display name, avatar picker, accent color
5. **Save** — saves agent, navigates to chat

### S3: Chat View

```
┌─────────────────────────────────┐
│  ← HomeLab GPT    🟢 142ms     │
│     deepseek-r1:70b    [≡]     │
├─────────────────────────────────┤
│                                 │
│        ┌───────────────────┐    │
│  You   │ Can you explain   │    │
│        │ quantum computing?│    │
│        └───────────────────┘    │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 💭 Thinking... (3.2s)     │  │
│  │ ▾ Show reasoning          │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Quantum computing uses    │  │
│  │ quantum mechanical        │  │
│  │ phenomena like...         │  │
│  │                           │  │
│  │ ```python                 │  │
│  │ # Quantum circuit example │  │
│  │ qc = QuantumCircuit(2)    │  │
│  │ ```                       │  │
│  │                     [📋] [🔄]│
│  └───────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│ [📎] [🎤] Type a message... [➤]│
└─────────────────────────────────┘
```

**Components**: AI Elements `<Conversation>`, `<Message>`, `<Reasoning>`, `<PromptInput>`, Streamdown for markdown

**Chat header**:
- Back arrow (mobile)
- Agent name + model name
- Status badge with latency
- Hamburger menu: conversation list, agent config, new conversation

**Message rendering**:
- User messages: right-aligned, accent colored background
- Assistant messages: left-aligned, subtle background
- Reasoning blocks: collapsible accordion, auto-open during streaming, collapse when done, show elapsed time
- Code blocks: syntax highlighted via Shiki (Streamdown built-in)
- Math: KaTeX rendering
- Message actions on hover/long-press: copy, regenerate, delete

**Input area**:
- Text input with auto-grow (max 6 lines before scroll)
- Send button (disabled when empty or streaming)
- Attach file button (📎) — Pro feature
- Voice input button (🎤)
- Stop button replaces send during streaming

### S4: Conversation List

Accessible via hamburger menu in chat view or sidebar on desktop.

```
┌─────────────────────────────────┐
│  Conversations    [+ New]       │
├─────────────────────────────────┤
│  🔍 Search conversations...     │
├─────────────────────────────────┤
│  📌 Pinned                      │
│  ┌─────────────────────────────┐│
│  │ Quantum Computing Explained ││
│  │ 42 messages · 2h ago        ││
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│  Recent                         │
│  ┌─────────────────────────────┐│
│  │ Debug Python Script         ││
│  │ 15 messages · Yesterday     ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ Recipe Ideas                ││
│  │ 8 messages · 3 days ago     ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

**Interactions**:
- Tap → switch to conversation
- Swipe left → delete, archive
- Long press → pin, rename, export, delete
- [+ New] → create new conversation with current agent

### S5: Agent Configuration

Bottom sheet on mobile, side panel on desktop.

Tabs:
- **Connection**: endpoint, auth, type, test button
- **Identity**: name, avatar, accent color
- **Behavior**: system prompt, temperature (slider 0-2), max tokens, context length
- **Capabilities**: toggles for vision, tools, reasoning, file upload
- **Advanced**: custom headers, timeout, retry count, CA cert import
- **Danger**: delete agent (with confirmation)

### S6: Settings

Sections:
- **Account**: email, display name, sign out
- **Appearance**: theme (system/light/dark)
- **Billing**: current plan, upgrade button, manage subscription
- **Data**: export all data, clear local data
- **Sync**: enable/disable cross-device sync, set passphrase
- **About**: version, licenses, feedback link

## Component Library

### From shadcn/ui
- Button, Input, Textarea, Select, Switch, Slider, Tabs, Dialog, Sheet, DropdownMenu, Toast, Skeleton, Avatar, Badge, Card, Separator, ScrollArea, Tooltip

### From AI Elements
- Conversation, Message, PromptInput, Reasoning, Sources, ModelSelector

### Custom Components to Build
- `AgentCard` — agent in the list with status
- `AgentStatusBadge` — colored dot + label
- `StatusIndicator` — online/offline/slow with optional latency
- `LatencySparkline` — tiny chart of last 10 latency measurements
- `ConversationCard` — conversation in the list
- `VoiceInput` — microphone button with waveform
- `FilePreview` — thumbnail for attached files
- `OfflineIndicator` — banner when network is down
- `QueuedMessageBadge` — count of messages waiting to send
- `UpgradePrompt` — CTA when hitting feature gates

## Animation & Transitions

- **Page transitions**: slide left/right on mobile (300ms ease)
- **Message appear**: fade in + slide up (200ms)
- **Streaming text**: no animation needed — natural token arrival is the animation
- **Reasoning accordion**: smooth height animation (200ms ease)
- **Status badge**: pulse animation on status change
- **Pull to refresh**: spring physics
- **Bottom sheet**: spring-based drag physics
- Use `framer-motion` or CSS transitions — no heavy animation libraries

## Responsive Breakpoints

```
Mobile:  < 768px  — single column, bottom tabs, sheets
Tablet:  768-1024px — sidebar + main, collapsible sidebar
Desktop: > 1024px — sidebar + main + optional right panel
```

## Color Palette (Dark Mode Default)

```
Background:     hsl(0, 0%, 7%)       #121212
Surface:        hsl(0, 0%, 12%)      #1e1e1e
Surface hover:  hsl(0, 0%, 16%)      #292929
Border:         hsl(0, 0%, 20%)      #333333
Text primary:   hsl(0, 0%, 95%)      #f2f2f2
Text secondary: hsl(0, 0%, 60%)      #999999
Accent:         hsl(217, 91%, 60%)   #3b82f6  (blue)
Success:        hsl(142, 76%, 36%)   #16a34a  (green)
Warning:        hsl(38, 92%, 50%)    #f59e0b  (amber)
Error:          hsl(0, 84%, 60%)     #ef4444  (red)
```

Light mode: invert backgrounds, keep accent colors.
Agent accent colors: user-customizable per agent for visual differentiation.
