# AgentLink — Claude Code Project Context

## What Is This Project

AgentLink is a **mobile-first chat client for self-hosted LLM agents**. It is NOT another ChatGPT clone. The core insight is that **agent connection management IS the product** — like contacts in a messaging app, but for AI agents running on homelabs, VPS instances, and local networks.

Users running OpenClaw, NanoClaw, Ollama, vLLM, or custom AI agents currently rely on Telegram bots, Discord channels, or desktop web UIs on phone browsers. AgentLink gives them a native-quality mobile experience comparable to ChatGPT or Claude's official apps, but pointed at their own infrastructure.

Commercial providers (OpenAI, Anthropic, Google) are supported as secondary features. The product identity centers on self-hosted agents.

## Architecture — CLIENT-DIRECT, Not Server-Proxied

This is the most important architectural decision. **All chat traffic goes directly from the mobile client to the user's agent endpoint.** The AgentLink platform server NEVER sees conversation content.

```
Mobile Client ──(direct TLS)──> User's Agent Endpoint
Mobile Client ──(platform ops)──> AgentLink Platform (auth, billing, sync metadata only)
```

The platform handles: authentication (Clerk), subscriptions (Stripe), agent config sync (encrypted), conversation metadata sync (titles/timestamps only), push notification relay (FCM/APNs), and connection tunnel relay (premium feature).

The platform does NOT handle: chat messages, streaming responses, file uploads to agents, or any conversation content.

## Tech Stack (Phase 1 — PWA MVP)

| Layer | Technology | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router) | SSR, edge functions, PWA support |
| AI Chat | **Vercel AI SDK 6** (`useChat` hook) | Industry standard, handles SSE streaming, custom endpoints |
| Chat UI | **AI Elements** (by Vercel) + **Streamdown** | `<Conversation>`, `<Message>`, `<Reasoning>`, `<PromptInput>`, streaming markdown |
| Components | **shadcn/ui** + **prompt-kit** | Copy-paste component model, full source ownership |
| Styling | **Tailwind CSS v4** | Mobile-first utility classes |
| State | **Zustand** | Lightweight, multiple stores for agents/conversations/UI |
| Database (server) | **Supabase** (PostgreSQL) | User accounts, agent configs (encrypted), conversation metadata |
| Database (client) | **IndexedDB** via Dexie.js (PWA) | On-device message storage, offline access |
| Auth | **Clerk** | Social login, passkeys, organizations (Team tier), webhook sync to Supabase |
| Payments | **Stripe Billing** | Subscriptions with Free/Pro/Team tiers |
| Rate Limiting | **Upstash Redis** | Sliding-window rate limiting on platform API endpoints |
| Validation | **Zod** | Runtime schema validation for all API boundaries |
| PWA | **Workbox** service worker + manifest | Offline caching, installable mobile web app |

## Project Structure

```
agentlink/
├── claude.md                    # THIS FILE — master context for Claude Code
├── TASKS.md                     # Phased implementation tasks with checkboxes
├── docs/
│   ├── architecture.md          # System architecture, data flow diagrams
│   ├── database-schema.md       # Full PostgreSQL schema + client-side schema
│   ├── api-contracts.md         # Platform API endpoints + agent protocol specs
│   ├── agent-types.md           # Agent type definitions and protocol adapters
│   ├── security.md              # Threat model, credential storage, encryption
│   ├── ui-ux-spec.md            # Screen-by-screen UI specifications
│   ├── monetization.md          # Pricing tiers, Stripe integration, feature gates
│   ├── dependencies.md          # Full dependency list with versions and purposes
│   └── references.md            # Reference repos, what to learn from each
├── specs/
│   ├── agent-connection.spec.md # Agent onboarding flow specification
│   ├── chat-engine.spec.md      # Chat engine: streaming, reconnection, message handling
│   ├── health-monitor.spec.md   # Agent health check system specification
│   └── tunnel-relay.spec.md     # Premium tunnel relay feature specification
├── src/                         # Source code lives here
│   ├── app/                     # Next.js App Router pages
│   ├── components/              # React components
│   │   ├── ui/                  # shadcn/ui base components
│   │   ├── chat/                # Chat-specific components
│   │   ├── agents/              # Agent management components
│   │   └── layout/              # Layout components (sidebar, nav, etc.)
│   ├── lib/                     # Utilities, helpers, constants
│   │   ├── agents/              # Agent connection logic, protocol adapters
│   │   ├── chat/                # Chat engine, message handling
│   │   ├── db/                  # Database clients (Supabase + IndexedDB)
│   │   ├── auth/                # Clerk integration helpers
│   │   ├── billing/             # Stripe integration helpers
│   │   └── crypto/              # Encryption utilities for credentials
│   ├── stores/                  # Zustand stores
│   ├── hooks/                   # Custom React hooks
│   ├── types/                   # TypeScript type definitions
│   └── styles/                  # Global styles, Tailwind config
├── public/                      # Static assets, PWA manifest, icons
├── supabase/                    # Supabase migrations and seed data
│   └── migrations/              # SQL migration files
└── tests/                       # Test files mirroring src/ structure
```

## Coding Conventions

### TypeScript
- **Strict mode always** — `"strict": true` in tsconfig
- Use `interface` for object shapes, `type` for unions/intersections/utility types
- Prefer `const` assertions and `as const` for literal types
- All function parameters and return types must be explicitly typed (no implicit `any`)
- Use Zod schemas as the source of truth, infer TS types from them: `type Agent = z.infer<typeof AgentSchema>`

### React / Next.js
- **Server Components by default** — only add `"use client"` when the component needs interactivity, hooks, or browser APIs
- Use Next.js App Router conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- Colocate related files: `components/chat/ChatMessage.tsx` alongside `components/chat/ChatMessage.test.tsx`
- Prefer composition over prop drilling — use Zustand stores for cross-cutting state
- All components must handle loading, error, and empty states

### Naming
- Files: `kebab-case.tsx` for components, `kebab-case.ts` for utilities
- Components: `PascalCase` — `AgentCard`, `ChatMessage`, `ReasoningBlock`
- Hooks: `camelCase` with `use` prefix — `useAgentHealth`, `useChatStream`
- Stores: `camelCase` with `Store` suffix — `agentStore`, `chatStore`
- Types/Interfaces: `PascalCase` — `Agent`, `ChatMessage`, `AgentConfig`
- Constants: `SCREAMING_SNAKE_CASE` — `MAX_RETRY_ATTEMPTS`, `DEFAULT_TEMPERATURE`
- Database tables: `snake_case` — `agents`, `conversations`, `users`

### Styling
- Tailwind utility classes in JSX — no separate CSS files except for global styles
- Use `cn()` helper (from shadcn/ui) for conditional class merging
- Mobile-first: write base styles for mobile, use `md:` and `lg:` for larger screens
- Dark mode: use `dark:` variant classes, system preference detection

### Error Handling
- Use `Result<T, E>` pattern for operations that can fail (agent connections, API calls)
- Never swallow errors silently — log with structured context
- User-facing errors must have clear, actionable messages
- Network errors should trigger retry logic with exponential backoff

### Testing
- Unit tests for: Zod schemas, utility functions, protocol adapters, crypto helpers
- Integration tests for: agent connection flow, chat streaming, offline storage
- Component tests with React Testing Library for critical UI flows
- E2E tests with Playwright for: agent onboarding, sending a message, conversation management

## Key Design Decisions (Do Not Revisit)

1. **Client-direct architecture** — chat traffic never touches our servers
2. **SSE over WebSocket** for agent communication — automatic reconnection, HTTP/2 multiplexing, works through firewalls
3. **OpenAI Chat Completions format** as the default protocol — universal standard across self-hosted LLM servers
4. **On-device message storage** by default — privacy-first, optional encrypted cloud sync
5. **Clerk for auth** — not Supabase Auth, not NextAuth — Clerk has the best mobile + organizations support
6. **Zustand over Redux/Context** — simpler mental model for multiple concurrent agent sessions
7. **PWA first, React Native later** (Phase 3) — ship fast, validate product-market fit before native investment
8. **Agent credentials encrypted client-side** before any sync — zero-knowledge server architecture

## How to Work Through This Project

1. **Read TASKS.md** for the complete phased breakdown with checkboxes
2. **Read the relevant docs/** file before starting each feature area
3. **Read the relevant specs/** file for detailed specifications of complex features
4. **Follow Phase 1 order** — don't jump ahead. Each task builds on the previous.
5. **Test each feature** before moving to the next — the testing approach is specified per feature in TASKS.md
6. **Commit often** with conventional commit messages: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`

## Critical Implementation Notes

### Agent Connection (the core feature)
- The `useChat` hook from Vercel AI SDK accepts a custom `api` URL and `headers` — use this to point each agent at its own endpoint
- Each agent gets its own `useChat` instance: `useChat({ api: agent.endpointUrl, headers: { Authorization: \`Bearer ${agent.authToken}\` } })`
- Agent health checks are lightweight HEAD/GET requests to the base URL, NOT full chat completions
- Support multiple protocol types: OpenAI-compatible (default), Ollama native, Anthropic-compatible, Custom

### Streaming
- SSE is the protocol. The Vercel AI SDK handles parsing automatically.
- Reasoning/thinking tokens use `message.parts` with `type === 'reasoning'`
- Handle incomplete markdown gracefully during streaming — Streamdown solves this
- Implement automatic reconnection with `Last-Event-ID` for cellular network drops

### Security
- Agent auth tokens stored in: Keychain (iOS), Keystore (Android), Web Crypto + IndexedDB (PWA)
- Cross-device sync uses AES-256-GCM encryption with per-user keys from PBKDF2
- HTTPS enforced by default with warnings for HTTP endpoints
- Support custom CA certificates per agent (homelab users with self-signed certs)

### Offline
- All messages cached in local IndexedDB (PWA) or SQLite (React Native)
- Conversations browseable and searchable while offline
- New messages queued for sending when connectivity returns
- Clear "offline" UI indicator with queued message count

## Environment Variables Required

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRO_PRICE_ID=
STRIPE_TEAM_PRICE_ID=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# App
NEXT_PUBLIC_APP_URL=
ENCRYPTION_MASTER_KEY=    # For server-side encryption operations
```

## SuperClaude Integration Notes

If using SuperClaude tools/skills, the following capabilities are especially useful for this project:
- **Architecture analysis** — validate the client-direct architecture against the specs
- **Code generation** — scaffold components, hooks, and stores from the type definitions
- **Test generation** — generate test suites from the Zod schemas and API contracts
- **Security review** — audit credential storage and encryption implementations
- **Performance profiling** — optimize SSE streaming and markdown rendering performance
