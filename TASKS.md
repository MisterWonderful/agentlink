# AgentLink — Implementation Tasks

> Work through these in order. Each phase builds on the previous. Check boxes as you complete each task.
> Before starting a task, read the referenced doc/spec file for full context.

---

## Phase 1: PWA MVP (Target: 4 weeks)

**Goal**: Ship a functional mobile web app that connects to any OpenAI-compatible agent endpoint.

### 1.1 Project Scaffolding
> No doc reference needed — follow claude.md conventions

- [ ] Initialize Next.js 15 project with App Router, TypeScript strict mode
- [ ] Configure Tailwind CSS v4 with mobile-first breakpoints
- [ ] Install and configure shadcn/ui (dark mode support, cn() utility)
- [ ] Set up project directory structure per claude.md spec
- [ ] Configure ESLint + Prettier with project conventions
- [ ] Set up path aliases (`@/components`, `@/lib`, `@/stores`, `@/types`, `@/hooks`)
- [ ] Create `.env.local.example` with all required environment variables
- [ ] Set up PWA manifest (`public/manifest.json`) with app name, icons, theme colors
- [ ] Configure Workbox service worker for offline caching strategy
- [ ] Create basic `layout.tsx` with dark/light mode support (system preference detection)
- [ ] Set up conventional commit linting (commitlint + husky)

### 1.2 Type System & Schemas
> Read: `docs/database-schema.md`, `docs/agent-types.md`

- [ ] Define Zod schemas in `src/types/schemas/`:
  - [ ] `agent.schema.ts` — Agent, AgentConfig, AgentType enum, AgentStatus
  - [ ] `message.schema.ts` — ChatMessage, MessagePart (text, reasoning, tool-call, tool-result, file, source-url)
  - [ ] `conversation.schema.ts` — Conversation, ConversationMetadata
  - [ ] `user.schema.ts` — User, UserPlan enum
- [ ] Export inferred TypeScript types from each schema: `type Agent = z.infer<typeof AgentSchema>`
- [ ] Create `src/types/index.ts` barrel export
- [ ] Write unit tests for all Zod schemas (valid/invalid data, edge cases)

### 1.3 State Management
> Read: `docs/architecture.md` (State Management section)

- [ ] Create Zustand stores in `src/stores/`:
  - [ ] `agent-store.ts` — agents CRUD, active agent selection, health status tracking
  - [ ] `chat-store.ts` — conversations list, active conversation, message operations
  - [ ] `ui-store.ts` — sidebar open/close, theme, modals, toasts
  - [ ] `connection-store.ts` — per-agent connection status, latency tracking
- [ ] Implement IndexedDB persistence for agent-store and chat-store via Dexie.js
- [ ] Write `src/lib/db/indexeddb.ts` — Dexie database definition with tables: agents, conversations, messages
- [ ] Test store operations: add/remove/update agent, create/delete conversation, add message

### 1.4 Agent Connection Engine
> Read: `docs/agent-types.md`, `specs/agent-connection.spec.md`

- [ ] Create protocol adapters in `src/lib/agents/`:
  - [ ] `base-adapter.ts` — abstract adapter interface: `testConnection()`, `getModels()`, `getChatEndpoint()`, `formatHeaders()`
  - [ ] `openai-adapter.ts` — OpenAI-compatible (default): `/v1/chat/completions`, Bearer token auth
  - [ ] `ollama-adapter.ts` — Ollama native: `/api/chat`, remap response format
  - [ ] `anthropic-adapter.ts` — Anthropic-compatible: `/v1/messages`, `x-api-key` header
  - [ ] `custom-adapter.ts` — User-defined URL, configurable JSON path for response extraction
- [ ] Create `src/lib/agents/adapter-factory.ts` — returns correct adapter based on `agent.agentType`
- [ ] Create `src/lib/agents/connection-tester.ts`:
  - [ ] Send test prompt to agent endpoint
  - [ ] Validate response format
  - [ ] Auto-detect agent type when possible (try each adapter)
  - [ ] Return: success/failure, detected model name, latency, detected capabilities (vision, tools, reasoning)
- [ ] Create `src/lib/agents/credential-store.ts`:
  - [ ] Web Crypto API encryption for tokens stored in IndexedDB
  - [ ] Derive encryption key from Clerk session
  - [ ] Encrypt before store, decrypt on read
- [ ] Write unit tests for each adapter (mock SSE responses)
- [ ] Write integration test for connection tester with mock server

### 1.5 Chat Engine
> Read: `specs/chat-engine.spec.md`, `docs/api-contracts.md`

- [ ] Create `src/lib/chat/chat-engine.ts`:
  - [ ] Wrapper around Vercel AI SDK `useChat` that configures per-agent endpoint + headers
  - [ ] Handle SSE streaming with automatic reconnection on network drop
  - [ ] Parse reasoning/thinking tokens from stream into `message.parts`
  - [ ] Handle tool calls and tool results in message parts
  - [ ] Implement abort controller for stopping generation
  - [ ] Queue messages when offline, send when connectivity returns
- [ ] Create `src/hooks/use-agent-chat.ts`:
  - [ ] Custom hook wrapping chat-engine with agent-specific config
  - [ ] Manages conversation persistence to IndexedDB
  - [ ] Exposes: messages, input, handleSubmit, isLoading, error, stop, reload
- [ ] Create `src/lib/chat/message-store.ts`:
  - [ ] Save/load messages from IndexedDB
  - [ ] Full-text search across messages (basic substring match for MVP, FTS later)
  - [ ] Conversation CRUD operations
- [ ] Write tests for chat engine with mock SSE streams

### 1.6 Agent Management UI
> Read: `docs/ui-ux-spec.md` (Agent screens section)

- [ ] Build `src/components/agents/agent-onboarding.tsx`:
  - [ ] Step 1: Agent type selector (radio buttons with icons for each type)
  - [ ] Step 2: Endpoint URL input + Auth token input (password field)
  - [ ] Step 3: Display name + avatar picker
  - [ ] "Test Connection" button with loading state, success/failure display
  - [ ] "Save Agent" button (disabled until connection tested successfully)
  - [ ] Show detected model name, latency, and capabilities on successful test
- [ ] Build `src/components/agents/agent-list.tsx`:
  - [ ] Contacts-style list with avatar, name, status indicator, last message preview, timestamp
  - [ ] Status indicators: green (online <500ms), yellow (slow >500ms), red (offline), gray (unknown)
  - [ ] Tap to open chat, long-press for context menu (configure, delete)
  - [ ] Pull-to-refresh triggers health check on all agents
  - [ ] Empty state with "Add your first agent" CTA
- [ ] Build `src/components/agents/agent-config-panel.tsx`:
  - [ ] Connection tab: endpoint URL, auth token, agent type, test button
  - [ ] Identity tab: display name, avatar, accent color picker
  - [ ] Behavior tab: system prompt (textarea with monospace font), temperature slider, max tokens, context length
  - [ ] Capabilities tab: toggle checkboxes (vision, tools, reasoning, file upload)
  - [ ] Danger zone: delete agent button with confirmation dialog
- [ ] Build `src/components/agents/agent-status-badge.tsx`:
  - [ ] Colored dot + label component reused across agent list and chat header

### 1.7 Chat UI
> Read: `docs/ui-ux-spec.md` (Chat screens section)

- [ ] Install AI Elements components: `Conversation`, `Message`, `PromptInput`, `Reasoning`
- [ ] Install Streamdown for streaming markdown rendering
- [ ] Build `src/components/chat/chat-view.tsx`:
  - [ ] Full-screen chat view with agent header (name, status, model)
  - [ ] Uses AI Elements `<Conversation>` for auto-scrolling message container
  - [ ] Uses `<Message>` for role-based rendering (user/assistant)
  - [ ] Uses `<Reasoning>` for collapsible thinking blocks
  - [ ] Uses Streamdown for streaming markdown in assistant messages
  - [ ] Uses `<PromptInput>` for message input with submit button
  - [ ] Loading indicator during streaming
  - [ ] Error display with retry button
  - [ ] Stop generation button during streaming
- [ ] Build `src/components/chat/conversation-list.tsx`:
  - [ ] Sidebar/drawer list of conversations for current agent
  - [ ] "New conversation" button
  - [ ] Conversation title, message count, last updated timestamp
  - [ ] Swipe to delete (mobile), right-click context menu (desktop)
  - [ ] Active conversation highlight
- [ ] Build `src/components/chat/message-actions.tsx`:
  - [ ] Copy message text
  - [ ] Regenerate response
  - [ ] Delete message
- [ ] Build `src/components/chat/empty-chat-state.tsx`:
  - [ ] Friendly empty state with suggested first messages

### 1.8 Navigation & Layout
> Read: `docs/ui-ux-spec.md` (Navigation section)

- [ ] Build `src/components/layout/mobile-nav.tsx`:
  - [ ] Bottom tab bar (mobile): Agents, Chat, Settings
  - [ ] Sidebar (desktop): agent list + conversation list
  - [ ] Responsive: bottom tabs on mobile, sidebar on md+ screens
- [ ] Build `src/app/(main)/layout.tsx`:
  - [ ] Main authenticated layout with navigation
- [ ] Build pages in `src/app/(main)/`:
  - [ ] `page.tsx` — Agent list (home screen)
  - [ ] `agents/new/page.tsx` — Agent onboarding flow
  - [ ] `agents/[id]/page.tsx` — Agent detail / config panel
  - [ ] `agents/[id]/chat/page.tsx` — Active chat with agent
  - [ ] `agents/[id]/chat/[conversationId]/page.tsx` — Specific conversation
  - [ ] `settings/page.tsx` — App settings (theme, data, account)
- [ ] Implement dark/light mode toggle in settings

### 1.9 Health Monitoring
> Read: `specs/health-monitor.spec.md`

- [ ] Create `src/lib/agents/health-checker.ts`:
  - [ ] Lightweight HEAD/GET request to agent base URL
  - [ ] Measure round-trip latency
  - [ ] Update agent status in agent-store
  - [ ] Track latency history (last 10 checks) for sparkline display
- [ ] Create `src/hooks/use-health-monitor.ts`:
  - [ ] Runs health checks on configurable interval (default 60s when app is foregrounded)
  - [ ] Pauses when app is backgrounded
  - [ ] Triggers immediate check on app foreground
- [ ] Wire health status into agent-list status badges

### 1.10 PWA Finalization
- [ ] Configure service worker caching strategy:
  - [ ] Cache-first for static assets (JS, CSS, images)
  - [ ] Network-first for API calls
  - [ ] Cache conversation data for offline browsing
- [ ] Test PWA install flow on iOS Safari and Chrome Android
- [ ] Add "Add to Home Screen" prompt
- [ ] Test offline functionality: browse cached conversations, queue new messages
- [ ] Performance audit: Lighthouse score > 90 on mobile

### 1.11 Phase 1 Testing & QA
- [ ] Run full test suite (unit + integration)
- [ ] Manual test on: iPhone Safari, Android Chrome, Desktop Chrome, Desktop Firefox
- [ ] Test with real endpoints: Ollama (local), OpenAI-compatible (remote)
- [ ] Test offline scenario: airplane mode, queue message, reconnect
- [ ] Test dark mode on all screens
- [ ] Fix any responsive layout issues
- [ ] Deploy to Vercel (staging environment)

---

## Phase 2: Polish + Monetize (Target: weeks 5-8)

**Goal**: Make it worth paying for.

### 2.1 Authentication (Clerk)
> Read: `docs/security.md` (Authentication section)

- [ ] Install Clerk (`@clerk/nextjs`)
- [ ] Configure sign-in/sign-up with social login: Google, GitHub, Apple
- [ ] Add passkey/WebAuthn support
- [ ] Create Clerk webhook handler at `src/app/api/webhooks/clerk/route.ts`
  - [ ] On user.created: insert user row in Supabase
  - [ ] On user.updated: sync email/name changes
  - [ ] On user.deleted: cascade delete user data
- [ ] Protect all routes under `(main)` group with Clerk middleware
- [ ] Build sign-in/sign-up pages with Clerk components
- [ ] Test auth flow on mobile (social login redirect behavior)

### 2.2 Database (Supabase)
> Read: `docs/database-schema.md`

- [ ] Create Supabase project
- [ ] Write migrations in `supabase/migrations/`:
  - [ ] `001_users.sql` — users table with Clerk ID
  - [ ] `002_agents.sql` — agents table with encrypted fields
  - [ ] `003_conversations.sql` — conversation metadata table
  - [ ] `004_rls_policies.sql` — Row Level Security: users can only access their own data
  - [ ] `005_indexes.sql` — Performance indexes
- [ ] Create `src/lib/db/supabase.ts` — server-side and client-side Supabase clients
- [ ] Create `src/lib/db/sync.ts` — sync agent configs and conversation metadata between device and Supabase
- [ ] Wire Clerk session token into Supabase client for RLS

### 2.3 Payments (Stripe)
> Read: `docs/monetization.md`

- [ ] Create Stripe products and prices: Free, Pro ($9.99/mo), Team ($24.99/user/mo)
- [ ] Create `src/app/api/webhooks/stripe/route.ts`:
  - [ ] On checkout.session.completed: update user plan in Supabase
  - [ ] On customer.subscription.updated: sync plan changes
  - [ ] On customer.subscription.deleted: downgrade to Free
- [ ] Create `src/lib/billing/stripe.ts`:
  - [ ] `createCheckoutSession()` — redirect to Stripe Checkout
  - [ ] `createPortalSession()` — redirect to Stripe Customer Portal
  - [ ] `getUserPlan()` — read current plan from Supabase
- [ ] Create `src/lib/billing/feature-gates.ts`:
  - [ ] `canAddAgent(plan, currentCount)` — Free: 2 max, Pro/Team: unlimited
  - [ ] `canSyncCrossDevice(plan)` — Pro/Team only
  - [ ] `canUploadFiles(plan)` — Pro/Team only
  - [ ] `getMaxFileSize(plan)` — Pro: 25MB, Team: 100MB
  - [ ] `canUseTunnel(plan)` — Pro: 1, Team: unlimited
- [ ] Build `src/components/billing/pricing-table.tsx`
- [ ] Build `src/components/billing/upgrade-prompt.tsx` — shown when hitting feature gates
- [ ] Add upgrade prompts at gate points (add 3rd agent on Free, try to sync, etc.)

### 2.4 Enhanced Features
- [ ] **Conversation search**: Full-text search across all messages in IndexedDB
  - [ ] Build `src/components/chat/conversation-search.tsx` with search input and results list
  - [ ] Highlight matching text in results
- [ ] **File upload**: Client-side image compression + upload via PromptInput
  - [ ] Configure PromptInput for file attachments
  - [ ] Client-side compression using browser canvas API (target: < 1MB for images)
  - [ ] Display image thumbnails in message history
- [ ] **Voice input**: Web Speech API integration
  - [ ] Build `src/components/chat/voice-input.tsx` with waveform visualization
  - [ ] Wire speech-to-text result into PromptInput
- [ ] **Conversation export**: JSON and Markdown export per conversation
  - [ ] Build `src/lib/chat/conversation-export.ts`
  - [ ] Add export buttons in conversation actions menu
- [ ] **Agent type presets**: Pre-configured defaults for OpenClaw, Ollama, vLLM
  - [ ] Auto-fill endpoint path and auth method based on selected type
  - [ ] Auto-detect available models by querying `/v1/models` or `/api/tags`
- [ ] **Custom CA certificate support**:
  - [ ] Allow importing PEM certificates per agent in config panel
  - [ ] Store certs in IndexedDB alongside agent config

### 2.5 Cross-Device Sync (Pro feature)
> Read: `docs/security.md` (Encryption section)

- [ ] Create `src/lib/crypto/sync-encryption.ts`:
  - [ ] AES-256-GCM encryption/decryption using Web Crypto API
  - [ ] Key derivation via PBKDF2 from user passphrase
  - [ ] Encrypt agent configs client-side before upload to Supabase
  - [ ] Decrypt on device after download
- [ ] Build sync UI: passphrase setup, sync toggle, sync status indicator
- [ ] Implement sync flow: device → encrypt → Supabase, Supabase → decrypt → device
- [ ] Handle conflict resolution (last-write-wins for MVP)

### 2.6 Rate Limiting & Security Hardening
- [ ] Set up Upstash Redis
- [ ] Add rate limiting middleware to all platform API routes
- [ ] Add Cloudflare Turnstile to account creation
- [ ] Add CSP headers
- [ ] Security audit: check for XSS in markdown rendering, credential exposure in logs

### 2.7 Onboarding
- [ ] Build first-run onboarding flow:
  - [ ] Welcome screen explaining AgentLink concept
  - [ ] "Add your first agent" guided walkthrough
  - [ ] Optional: connect to a demo agent endpoint for trying the app
- [ ] Add tooltip hints on first use of key features

### 2.8 Phase 2 Testing & QA
- [ ] Full test suite including auth, billing, and sync flows
- [ ] Test Stripe webhooks in test mode
- [ ] Test Clerk webhook sync
- [ ] Test cross-device sync with encryption
- [ ] Deploy to production on Vercel
- [ ] Set up Sentry error tracking
- [ ] Set up PostHog analytics (privacy-respecting mode)

---

## Phase 3: Native Mobile + Tunnel (Target: weeks 9-16)

**Goal**: Ship iOS and Android apps; launch the tunnel relay premium feature.

> Read: `specs/tunnel-relay.spec.md` for tunnel implementation

- [ ] Initialize Expo project sharing core logic from Phase 1/2
- [ ] Port chat engine and agent management to React Native
- [ ] Implement react-native-gifted-chat scaffold
- [ ] Implement react-native-mmkv for secure credential storage
- [ ] Implement PowerSync for SQLite ↔ Postgres sync
- [ ] Push notifications via Firebase Cloud Messaging
- [ ] Biometric auth gate (Face ID / fingerprint)
- [ ] Conversation forking from any message
- [ ] Agent capability auto-detection
- [ ] Build tunnel relay service (Cloudflare Workers + Durable Objects)
- [ ] Build relay agent binary for user installation
- [ ] App Store + Play Store submissions
- [ ] E2E test native apps on real devices

---

## Phase 4: Scale + Marketplace (Target: months 5-8+)

- [ ] Agent marketplace (configs, prompts, plugins)
- [ ] Team tier with shared agent pools
- [ ] Admin dashboard for Team/Enterprise
- [ ] SSO/SAML for enterprise
- [ ] Plugin SDK for third-party extensions
- [ ] A2A protocol support for multi-agent workflows
- [ ] Custom UI themes
- [ ] Conversation analytics
- [ ] VPS/GPU provider partnerships
