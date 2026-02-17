# AgentLink: Building a Mobile-First Chat Client for Self-Hosted LLM Agents

## Architecture, Strategy & Implementation Guide

---

## Executive Summary

There is no purpose-built, polished mobile client for self-hosted LLM agents. Users running OpenClaw, NanoClaw, Ollama, vLLM, or custom homelab AI assistants are forced into Telegram bots, Discord channels, WhatsApp integrations, or awkward desktop web UIs viewed on phone browsers. Each of these is a compromise — messaging apps lack streaming, thought display, conversation management, and agent configuration; desktop UIs aren't designed for touch interaction or cellular networks.

This report lays out a complete plan to build a mobile-first chat client — working name **AgentLink** — that connects users to their own remote agents with a native-quality experience comparable to ChatGPT or Claude's official apps. Commercial LLM providers (OpenAI, Anthropic, Google) are supported as a secondary feature, but the product's identity and architecture center on the self-hosted agent use case.

The technical ingredients exist today. The gap is someone assembling them into a product designed around agent connectivity rather than provider access.

---

## Part 1: What Makes This Different from Existing Open-Source Chat UIs

### The core insight: agent connection management IS the product

Every existing open-source LLM chat UI (LibreChat, LobeChat, Open WebUI, big-AGI) treats the backend provider as configuration — something you set once in a settings panel and forget. That makes sense when everyone connects to the same OpenAI or Anthropic API. It makes no sense when every user has a unique agent running at a different URL, with different capabilities, different uptime patterns, and different auth schemes.

For AgentLink, the agent connection is the equivalent of a contact in a messaging app. The core UX loop is:

1. **Add an agent** — enter endpoint URL, auth token, give it a name and avatar
2. **See your agents** — a contacts-style list showing online/offline status, latency, last-seen time
3. **Chat** — tap an agent to open a conversation, with full streaming, thought display, and history
4. **Manage** — configure system prompts, model parameters, capabilities per agent

This is a fundamentally different product from "ChatGPT clone that also supports custom endpoints."

### Why messaging apps fail for this use case

| Limitation | Telegram/Discord Bots | AgentLink |
|---|---|---|
| Streaming text | No real-time token streaming; messages arrive in chunks or complete | True SSE streaming with token-by-token rendering |
| Thought/reasoning display | Impossible — no UI primitive for collapsible thinking blocks | Native `<Reasoning>` component with auto-open/collapse |
| Multiple chat sessions | One thread per bot, no branching or forking | Unlimited sessions per agent, conversation forking from any message |
| Agent configuration | Hardcoded or slash-command based | Full configuration panel: system prompt, temperature, context length, model selection |
| File/image handling | Platform-limited, lossy compression | Direct multimodal upload with client-side compression control |
| Conversation search | Bot-dependent, usually absent | Full-text search across all conversations with all agents |
| Offline access | None — messages disappear without connectivity | Local message cache with background sync when online |
| Connection health | No visibility into agent status | Real-time latency, uptime, and reachability indicators |
| Security | Bot tokens exposed to platform operator | Direct client-to-agent TLS with no intermediary |

---

## Part 2: Open-Source Foundations — What to Use and What to Learn From

### Recommended approach: fork selectively, build purpose-built

No existing project should be forked wholesale. Instead, extract specific packages, patterns, and components from the strongest projects and build a purpose-built client around the agent-connection-first architecture.

### LibreChat — best backend architecture to learn from

- **Repository**: [github.com/danny-avila/LibreChat](https://github.com/danny-avila/LibreChat)
- **Stars**: ~33K | **License**: MIT | **Stack**: React + Node.js monorepo
- **What to extract**:
  - `@librechat/data-provider` — React Query hooks for conversation CRUD, message streaming, and agent management. These hooks are backend-agnostic and can be adapted for direct client-to-agent communication.
  - `data-schemas` — Zod validation schemas for messages, conversations, and agent configs. Reusable regardless of frontend framework.
  - Agent architecture patterns — LibreChat's no-code agent builder supports MCP tools, code interpreter, conversation forking, and agent handoffs. Study this for the agent configuration panel design.
- **What to skip**: The full monorepo deployment (MongoDB dependency, server-side proxy architecture). AgentLink's architecture is client-direct, not server-proxied.

### LobeChat — best UI/UX reference

- **Repository**: [github.com/lobehub/lobe-chat](https://github.com/lobehub/lobe-chat)
- **Stars**: ~72K | **License**: MIT | **Stack**: Next.js + React + Zustand
- **What to learn from**:
  - The most polished visual design in the open-source LLM UI space. Study its chat bubble design, sidebar layout, animation patterns, and dark mode implementation.
  - CRDT-based multi-device sync — exactly the pattern AgentLink needs for phone ↔ tablet ↔ desktop continuity.
  - `lobe-ui` component library and plugin SDK architecture for extensibility.
  - Zustand store patterns for managing multiple concurrent agent sessions.
- **What to skip**: The full Next.js server-side architecture. LobeChat assumes server-side API key management, which contradicts AgentLink's client-direct model.

### Open WebUI + Conduit — proof of native mobile feasibility

- **Open WebUI**: [github.com/open-webui/open-webui](https://github.com/open-webui/open-webui) (120K stars, SvelteKit + Python)
- **Conduit**: [github.com/cogwheel0/conduit](https://github.com/cogwheel0/conduit) (Flutter native mobile client for Open WebUI)
- **Relevance**: Conduit proves the model of a native mobile frontend connecting to an existing agent backend. Its Flutter codebase demonstrates how to handle streaming, offline caching, and push notifications for agent responses in a mobile context. The Conduit architecture — thin native client speaking to a backend API — is directly applicable, though AgentLink replaces the centralized backend with direct agent connections.

### Mobile-native starting points

| Project | Stack | Stars | Relevance |
|---|---|---|---|
| **ChatterUI** | React Native + Expo | ~5K | LLM chat with on-device + remote API support. Most relevant codebase for React Native architecture patterns. |
| **react-native-ai** | React Native + Expo | ~3K | Full-stack cross-platform AI app framework by Nader Dabit. Demonstrates streaming in React Native with built-in provider support. |
| **react-native-gifted-chat** | React Native | 13.5K (100K+ weekly npm downloads) | The standard chat UI scaffold for React Native. Provides message bubbles, input toolbar, scroll-to-bottom, typing indicators. Not AI-specific but battle-tested. |

---

## Part 3: The Component Stack

### Core rendering: Vercel AI SDK 6

The Vercel AI SDK (20M+ monthly npm downloads) is the clear standard for AI chat rendering in React. Its `useChat` hook manages the entire conversation lifecycle:

- Conversation state (messages array with parts)
- SSE streaming with automatic reconnection
- Loading, error, and abort states
- Tool call and tool result rendering
- Reasoning/thinking token display
- File attachment handling

The message parts system natively supports: `text`, `tool-call`, `tool-result`, `reasoning`, `file`, and `source-url` — exactly the primitives needed for agent interactions.

**Critical for AgentLink**: `useChat` accepts a custom `fetch` function and arbitrary `api` endpoint URL. This means each agent connection can use a different endpoint without any server-side proxy. The hook handles streaming regardless of where the SSE comes from.

```typescript
// Each agent gets its own useChat instance pointing directly at its endpoint
const { messages, input, handleSubmit } = useChat({
  api: agent.endpointUrl, // e.g., "https://my-homelab.tailscale.ts.net/v1/chat/completions"
  headers: { Authorization: `Bearer ${agent.authToken}` },
  streamProtocol: 'text', // or 'data' for AI SDK protocol
});
```

### UI components

**AI Elements** (by Vercel) — Open-source component library built on shadcn/ui. Install individual components with full source ownership:

- `<Conversation>` — Auto-scrolling message container with virtualization
- `<Message>` — Role-based message rendering with avatar, timestamp, actions
- `<PromptInput>` — Input bar with drag-and-drop file upload, paste handling, submit button
- `<Reasoning>` — Collapsible thinking blocks that auto-open during streaming and collapse when response completes. Displays elapsed thinking time. This is the key differentiator over messaging app bots.
- `<Sources>` — Citation display for RAG-enabled agents
- `<ModelSelector>` — Dropdown for switching models (useful when an agent exposes multiple models)

Install: `npx ai-elements@latest add [component]`

**Streamdown** (by Vercel) — Drop-in `react-markdown` replacement designed for streaming. Solves the historically painful problem of markdown flickering during token-by-token rendering:

- Handles incomplete markdown gracefully (unclosed code blocks, partial tables)
- Built-in Shiki code highlighting (160+ languages)
- KaTeX math rendering
- Mermaid diagram support
- Significantly better performance than react-markdown during streaming

**prompt-kit** (by @ibelick) — Additional composable AI chat components following the shadcn copy-paste model. MIT licensed, provides components not covered by AI Elements.

### React Native specific components

For the native mobile build (Phase 3):

- **react-native-gifted-chat** — Chat scaffold (bubbles, input, scroll, typing indicators)
- **markdown-to-jsx** — Markdown rendering with `optimizeForStreaming` option and React Native support
- **react-syntax-highlighter** — Code blocks with Prism themes
- **react-native-reanimated** — 60fps animations for message transitions, pull-to-refresh, swipe gestures
- **react-native-mmkv** — Ultra-fast key-value storage for agent configs and auth tokens (uses iOS Keychain / Android Keystore under the hood)

---

## Part 4: Streaming Protocol Architecture

### SSE wins for mobile agent connections — decisively

Server-Sent Events (SSE) over standard HTTP is the correct protocol for mobile-to-agent communication. The reasons are especially compelling for the homelab agent use case:

**Automatic reconnection**: SSE clients reconnect automatically with `Last-Event-ID`, critical on mobile where connections drop frequently. WebSocket requires manual reconnection logic.

**Works through everything**: SSE uses standard HTTP, so it passes through corporate firewalls, hotel WiFi captive portals, carrier NAT, and CDN proxies without configuration. WebSocket upgrades get blocked in many of these environments.

**Standard HTTP auth**: Bearer tokens in headers, same as any API call. No custom auth handshake needed.

**HTTP/2 multiplexing**: Multiple SSE streams (multiple concurrent agent chats) share a single TCP connection. WebSocket requires one TCP connection per agent.

**Every self-hosted LLM server already supports it**: vLLM, Ollama, llama.cpp, LocalAI, and OpenClaw all expose OpenAI-compatible SSE endpoints natively. No protocol bridging required.

### The OpenAI Chat Completions format is the universal standard

The client sends:
```
POST /v1/chat/completions
Content-Type: application/json
Authorization: Bearer <token>

{
  "model": "agent-model-name",
  "messages": [{"role": "user", "content": "Hello"}],
  "stream": true
}
```

The agent responds with `text/event-stream`:
```
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":" there"}}]}
data: [DONE]
```

Every major self-hosted LLM framework uses this format. Vercel AI SDK's `useChat` hook handles the parsing automatically.

### Handling thought/reasoning tokens

For agents that support chain-of-thought streaming (Claude via `thinking_delta`, DeepSeek-R1, QwQ, etc.), the SSE stream includes separate event types for reasoning vs. output:

```
event: thinking_delta
data: {"delta": {"thinking": "Let me consider..."}}

event: content_block_delta
data: {"delta": {"text": "Here's my answer..."}}
```

The AI Elements `<Reasoning>` component handles this automatically — it reads `message.parts` for `type === 'reasoning'`, wraps them in a collapsible accordion, shows elapsed thinking time, auto-opens during streaming, and collapses when the response completes.

### Protocol flexibility for non-standard agents

Not all agents expose a perfect OpenAI-compatible endpoint. AgentLink needs an "agent type" system:

| Agent Type | Protocol | Auth | Notes |
|---|---|---|---|
| OpenAI-Compatible | `/v1/chat/completions` SSE | Bearer token | Default. Covers OpenClaw, vLLM, llama.cpp, LocalAI, Ollama |
| Ollama Native | `/api/chat` SSE | None (local) or Basic | Slightly different response format, remap in client |
| Anthropic-Compatible | `/v1/messages` SSE | `x-api-key` header | For agents proxying Claude-format APIs |
| Custom | User-defined URL + method | Configurable | For bespoke agent frameworks, with a JSON path selector for extracting response text |

The agent configuration panel should include a **"Test Connection"** button that sends a simple prompt, validates the response format, and auto-detects the agent type when possible.

---

## Part 5: Architecture — Client-Direct, Not Server-Proxied

### The fundamental architecture decision

Most existing LLM chat UIs route all traffic through a server-side proxy:

```
Client → Platform Server → LLM Provider
```

This makes sense when the platform manages API keys and billing. It makes no sense for AgentLink, where users own their agents. The architecture should be **client-direct**:

```
Mobile Client → User's Agent Endpoint (direct TLS connection)
```

Benefits of client-direct:
- **No intermediary** — the platform never sees conversation content
- **Lower latency** — one fewer network hop
- **No server costs that scale with usage** — the platform's infrastructure cost is independent of how much users chat
- **Privacy by default** — conversations never touch AgentLink servers
- **Works offline** — cached conversations are available without platform connectivity

### What the platform server actually does

AgentLink still needs a lightweight backend, but it handles platform operations, not agent traffic:

- **User authentication** (Clerk)
- **Subscription management** (Stripe)
- **Agent configuration sync** — encrypted sync of agent connection details across devices
- **Conversation metadata sync** — sync conversation lists and metadata (titles, timestamps) across devices; full message content stays on-device or in user-controlled storage
- **Push notification relay** — FCM/APNs for background notifications
- **Connection tunnel relay** (premium) — for agents behind NAT

### System architecture diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE CLIENT                            │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Agent Manager │  │  Chat Engine │  │  Local Storage Layer  │  │
│  │              │  │              │  │                       │  │
│  │ • Add/remove │  │ • useChat()  │  │ • SQLite (messages)   │  │
│  │ • Health     │  │ • SSE stream │  │ • MMKV (agent configs)│  │
│  │   monitoring │  │ • Reasoning  │  │ • Keychain (tokens)   │  │
│  │ • Config UI  │  │ • File upload│  │ • Background sync     │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────────────────┘  │
│         │                 │                                      │
└─────────┼─────────────────┼──────────────────────────────────────┘
          │                 │
          │    Direct TLS   │  Direct TLS (per-agent)
          │    connections  │
          ▼                 ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  OpenClaw Agent │  │ NanoClaw Agent  │  │  Ollama (local) │
│  (homelab)      │  │ (VPS)           │  │  (LAN)          │
│                 │  │                 │  │                 │
│ endpoint:       │  │ endpoint:       │  │ endpoint:       │
│ https://my-     │  │ https://nano.   │  │ http://192.168. │
│ claw.duckdns   │  │ example.com     │  │ 1.50:11434      │
│ .org/v1        │  │ /v1             │  │ /api            │
└─────────────────┘  └─────────────────┘  └─────────────────┘

          │ (Platform operations only — no chat traffic)
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AGENTLINK PLATFORM                            │
│                                                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │   Clerk    │  │   Stripe   │  │  Supabase  │  │ Cloudflare│ │
│  │   (Auth)   │  │  (Billing) │  │ (Metadata  │  │  Tunnel   │ │
│  │            │  │            │  │   Sync)    │  │ (Premium) │ │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Optional: LiteLLM for power users

Some users may want server-side routing — for example, to load-balance across multiple GPU servers or to use the platform as a unified gateway. Offer **self-hosted LiteLLM integration** as an advanced feature:

- User deploys their own LiteLLM instance
- AgentLink connects to it as a single "meta-agent" that routes to multiple backends
- LiteLLM provides usage tracking, cost monitoring, and model fallback
- The AgentLink platform never runs LiteLLM — the user does

---

## Part 6: Low-Maintenance Deployment Stack

### Infrastructure costs at launch

Because chat traffic goes directly from client to agent (not through AgentLink servers), the platform's infrastructure costs are remarkably low:

| Component | Service | Monthly Cost | Purpose |
|---|---|---|---|
| Frontend + API | Vercel Pro | $20 | Next.js app, Edge Functions for auth/billing |
| Database | Supabase Pro | $25 | PostgreSQL for user accounts, agent configs, conversation metadata |
| Auth | Clerk | $0 (under 10K MAU) | Authentication, user management, organizations |
| Payments | Stripe | 2.9% + $0.30/txn | Subscription billing |
| Rate Limiting | Upstash Redis | $10 | API rate limiting, feature flags |
| Push Notifications | Firebase (FCM) | $0 | Background notification relay |
| DNS + CDN | Cloudflare | $0-5 | DDoS protection, edge caching |
| **Total** | | **~$55-60/month** | |

This supports approximately **10,000 monthly active users** before requiring changes. At 50K MAU, expect $500-1,000/month. At 100K MAU, $2,000-5,000/month — still modest because the platform doesn't proxy chat traffic.

### Database schema (Supabase/PostgreSQL)

```sql
-- Users (managed by Clerk, synced via webhook)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  plan TEXT DEFAULT 'free', -- free, pro, team, enterprise
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent connections (encrypted at rest)
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  agent_type TEXT DEFAULT 'openai_compatible',
  -- Connection details (encrypted before storage)
  endpoint_url_encrypted BYTEA NOT NULL,
  auth_token_encrypted BYTEA,
  -- Configuration
  system_prompt TEXT,
  default_model TEXT,
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4096,
  context_length INTEGER DEFAULT 8192,
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  avg_latency_ms INTEGER,
  -- Metadata
  capabilities JSONB DEFAULT '{}', -- vision, tools, reasoning, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations (metadata only — full messages stored on-device)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  title TEXT,
  message_count INTEGER DEFAULT 0,
  last_message_preview TEXT, -- First 100 chars of last message
  is_pinned BOOLEAN DEFAULT false,
  folder TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agents_user ON agents(user_id);
CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);
CREATE INDEX idx_conversations_agent ON conversations(agent_id);
```

Full message content is stored **on-device only** (SQLite via PowerSync or Turso embedded replicas) unless the user explicitly enables encrypted cloud sync. This is both a privacy feature and a cost-saving measure — message storage at scale is expensive.

### CI/CD and maintenance

- **GitHub Actions**: Lint, typecheck, test, deploy on push to `main`. Separate staging and production environments.
- **Renovate**: Automated dependency updates (prefer over Dependabot for monorepo support and grouped updates).
- **PostHog** (open-source): Feature flags, analytics, session replay. Self-hostable for privacy-conscious users.
- **Sentry**: Error tracking with source maps. Free tier covers most early-stage needs.
- **Uptime monitoring**: Betterstack or Checkly for platform API health. Agent health is monitored client-side.

---

## Part 7: Agent Connection Management — The Core Feature

### Agent onboarding flow

This is the most important UX in the entire app and should feel as simple as adding a Wi-Fi network:

```
[+] Add Agent

┌─────────────────────────────────────────┐
│  Agent Type                             │
│  ○ OpenClaw / NanoClaw                  │
│  ○ Ollama                               │
│  ○ vLLM / llama.cpp                     │
│  ○ OpenAI-Compatible (generic)          │
│  ○ Commercial Provider (OpenAI, Claude) │
│  ○ Custom                               │
├─────────────────────────────────────────┤
│                                         │
│  Endpoint URL                           │
│  ┌─────────────────────────────────┐    │
│  │ https://my-agent.duckdns.org/v1 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Auth Token (optional)                  │
│  ┌─────────────────────────────────┐    │
│  │ ••••••••••••••••                │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Display Name                           │
│  ┌─────────────────────────────────┐    │
│  │ My HomeLab GPT                  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌──────────────────────────────┐       │
│  │  🔍 Test Connection           │       │
│  └──────────────────────────────┘       │
│                                         │
│  ✅ Connection successful!              │
│     Model: deepseek-r1:70b              │
│     Latency: 142ms                      │
│     Capabilities: text, reasoning       │
│                                         │
│  ┌──────────────────────────────┐       │
│  │  💾 Save Agent                │       │
│  └──────────────────────────────┘       │
└─────────────────────────────────────────┘
```

### Agent type presets

Each agent type should pre-configure known defaults:

| Type | Default Endpoint Path | Auth | Response Format | Auto-detected Capabilities |
|---|---|---|---|---|
| OpenClaw | `/v1/chat/completions` | Bearer token | OpenAI SSE | Query `/v1/models` for model list |
| NanoClaw | `/v1/chat/completions` | Bearer token | OpenAI SSE | Lightweight, fast response |
| Ollama | `/api/chat` | None | Ollama SSE | Query `/api/tags` for model list |
| vLLM | `/v1/chat/completions` | Bearer token | OpenAI SSE | Query `/v1/models` |
| Commercial | Provider-specific | API key | Provider SSE | Known from provider |
| Custom | User-defined | Configurable | Configurable JSON path | Manual configuration |

### Connection health monitoring

The agent list should show real-time status for each connected agent:

- **🟢 Online** — last health check succeeded, latency < 500ms
- **🟡 Slow** — reachable but latency > 500ms
- **🔴 Offline** — health check failed or timed out
- **⚪ Unknown** — never tested / newly added

Health checks run on a configurable interval (default: every 60 seconds when app is foregrounded). They're lightweight HEAD or GET requests to the agent's base URL, not full chat completions. The client tracks latency history and can display a sparkline graph in the agent detail view.

### Agent configuration panel

Each agent gets a dedicated settings screen:

- **Connection**: Endpoint URL, auth token, agent type, test button
- **Identity**: Display name, avatar (pick from library or upload), accent color
- **Behavior**: System prompt editor (with syntax highlighting), temperature slider, max tokens, context length, top-p, frequency/presence penalty
- **Capabilities**: Toggle checkboxes for vision, tool use, reasoning display, file upload, code execution — controls which UI features are available in chat with this agent
- **Advanced**: Custom headers, request timeout, retry policy, TLS certificate pinning, proxy configuration
- **Danger zone**: Delete agent, export/import agent config as JSON

---

## Part 8: Security — Protecting Agent Connections

### Threat model

AgentLink's threat model differs fundamentally from commercial AI chat apps:

| Threat | Commercial AI Chat | AgentLink |
|---|---|---|
| API key theft | High impact — attacker gets OpenAI access | N/A for self-hosted; auth tokens are user-controlled |
| Man-in-the-middle | Unlikely (major providers use cert pinning) | **Real risk** — homelab agents may use self-signed certs or HTTP |
| Platform data breach | Exposes all user conversations | Minimal impact — conversations stored on-device, not server |
| Agent endpoint compromise | N/A | **Real risk** — if agent is compromised, attacker sees conversations |
| Conversation interception | Low — TLS to provider | **Moderate** — depends on user's agent TLS configuration |

### Authentication

**Clerk** ($0 for 10K MAU, ~$25-35/month to 100K MAU) provides the best developer experience for the platform:

- Pre-built React/React Native sign-in/sign-up components
- Social login (Google, GitHub, Apple — critical for mobile)
- Passkey/WebAuthn support (passwordless login)
- SOC 2 Type II certified
- Organizations feature for Team/Enterprise tiers (shared agent pools, admin management)
- Webhook sync to Supabase for user data

### Agent credential storage

Agent endpoint URLs and auth tokens must be stored securely:

**On-device (primary)**: Use platform-native secure storage.
- **iOS**: Keychain Services (hardware-encrypted, biometric-gated access)
- **Android**: Android Keystore + EncryptedSharedPreferences
- **PWA**: Web Crypto API + IndexedDB with per-user encryption keys derived from Clerk session

**Cross-device sync (optional, encrypted)**: When users enable multi-device sync, agent credentials are encrypted client-side before leaving the device.
- Encryption: AES-256-GCM with per-user keys derived via PBKDF2 from a user-chosen passphrase (separate from account password)
- The platform server stores only ciphertext — it cannot decrypt agent credentials
- Zero-knowledge architecture: even a complete database breach reveals no agent endpoints or tokens

### TLS enforcement and certificate handling

This is the most important security decision for the homelab use case:

- **Enforce HTTPS by default** with a clear warning when users configure HTTP endpoints
- **Support custom CA certificates** — many homelab users run agents behind self-signed certs or private CAs (e.g., Step CA, mkcert). The app should allow importing custom root certificates per agent.
- **Certificate pinning** (optional advanced setting) — for users who want maximum security, allow pinning a specific certificate fingerprint per agent
- **Tailscale/WireGuard-compatible** — the app should work with VPN-based connectivity solutions. Detecting Tailscale/ZeroTier network interfaces and suggesting them during agent setup would be a differentiating UX touch.

### Conversation privacy

- **Default: on-device only** — full message content is stored in local SQLite, encrypted at rest by the OS. The AgentLink platform never sees message content.
- **Optional: encrypted cloud sync** — for users who want conversations available across devices. Client-side encryption (E2EE) before upload to Supabase Storage. The platform stores ciphertext only.
- **Export anytime** — users can export all conversations as JSON or Markdown for any agent, at any time. Data portability is a trust signal.
- **Delete means delete** — account deletion purges all server-side data within 24 hours. On-device data is cleared immediately.

### Rate limiting and abuse prevention

Rate limiting applies to **platform operations** (auth, sync, push notifications), not chat traffic (which goes directly to agents):

- **Upstash Redis** with `@upstash/ratelimit` for sliding-window rate limiting on platform API endpoints
- **Cloudflare Turnstile** (free, privacy-preserving CAPTCHA) for account creation
- **Clerk's built-in bot protection** for login flows

### GDPR / Privacy compliance

The client-direct architecture is a significant advantage for privacy:

- Conversations go directly to user-owned agents — AgentLink is not a "data processor" for chat content
- The platform only processes: account info (email, name), subscription data, agent metadata (names, not endpoints), conversation metadata (titles, timestamps)
- Data export (Article 15) and deletion (Article 17) are straightforward given the minimal server-side footprint
- Privacy policy should clearly state: "AgentLink never sees, stores, or processes your conversations with your agents"

---

## Part 9: Monetization — Platform Value, Not Token Markup

### Why token billing doesn't work here

Commercial AI chat wrappers mark up provider tokens (charge $20/month, pass through $X of API costs, pocket the difference). This is impossible when users run their own compute — there are no tokens to mark up and no API costs to pass through.

AgentLink monetizes the **platform and connectivity value**, not compute.

### Recommended pricing tiers

| Feature | Free | Pro ($9.99/mo) | Team ($24.99/user/mo) |
|---|---|---|---|
| Agent connections | 2 | Unlimited | Unlimited |
| Chat sessions per agent | 10 active | Unlimited | Unlimited |
| Conversation history | 7 days on-device | Unlimited on-device | Unlimited + cloud sync |
| Cross-device sync | No | Yes (encrypted) | Yes (encrypted) |
| File uploads | No | Yes (25MB/file) | Yes (100MB/file) |
| Agent config import/export | No | Yes | Yes |
| Connection tunnel relay | No | 1 tunnel | Unlimited tunnels |
| Custom themes | Default only | Full theme engine | Full + branded |
| Plugins/extensions | Community only | All plugins | All + custom |
| Push notifications | Basic | Priority + custom | Priority + admin controls |
| Shared agent pools | No | No | Yes (team-managed agents) |
| Admin dashboard | No | No | Yes (usage, access controls) |
| SSO/SAML | No | No | Yes |
| Support | Community | Email (48hr) | Priority (4hr) |

### The connection tunnel relay: a premium differentiator worth paying for

Many homelab users don't expose ports to the internet. Their agents run behind NAT with no public IP. Currently they use Tailscale, Cloudflare Tunnel, or ngrok to access their agents remotely — all requiring separate setup and maintenance.

AgentLink can offer a **managed tunnel relay** as a premium feature:

- User installs a lightweight relay agent (single binary, runs alongside their LLM agent)
- The relay establishes an outbound WebSocket to AgentLink's edge network (Cloudflare Workers)
- The mobile client connects to AgentLink's edge, which routes to the relay
- **Chat content passes through but is end-to-end encrypted** — AgentLink sees ciphertext only
- Latency overhead: ~10-20ms (negligible compared to LLM inference time)

This solves a real pain point, justifies a subscription, and creates vendor lock-in that's genuinely earned (the alternative is self-managed tunneling).

**Infrastructure cost**: Cloudflare Workers + Durable Objects handle WebSocket relay at ~$0.50/million requests. Even heavy users generate <100K relay requests/month. The feature costs pennies to operate per user.

### Agent marketplace (Phase 4+)

As the user base grows, an agent marketplace creates network effects:

- **Agent configs**: Pre-built system prompts, parameter sets, and tool configurations for specific use cases (coding assistant, research agent, creative writer). Listed for free or $1-5.
- **Agent hosting referrals**: Partner with VPS/GPU cloud providers (RunPod, Vast.ai, Lambda). Earn affiliate commissions when users spin up new agent backends through AgentLink.
- **Premium plugins**: Third-party developers build AgentLink plugins (custom UI components, integrations, workflow automations). 70/30 revenue split (developer/platform).
- **Commission model**: 15-20% platform commission on marketplace transactions, consistent with industry norms for AI agent marketplaces.

### Mobile payment considerations

- **Apple App Store**: 30% commission on in-app subscriptions (15% after year 1 for small developers < $1M revenue). Consider offering web-only subscription purchase to preserve margin, with the App Store version unlocking Pro features via account login.
- **Google Play**: 15% commission for the first $1M, then 30%. More favorable than Apple for early-stage.
- **Stripe**: 2.9% + $0.30 for web purchases. Support Stripe Billing for subscription management with automatic prorations, dunning, and revenue recovery.

---

## Part 10: Features That Win Users from Telegram Bots

### Ranked by impact ÷ implementation complexity

**1. Thought/reasoning streaming (HIGH impact, LOW complexity)**

The single most compelling "wow this is better than a Telegram bot" feature. The `<Reasoning>` component from AI Elements handles the UX automatically — collapsible thinking blocks that show elapsed time, auto-open during streaming, and collapse when done. Works with Claude's `thinking_delta`, DeepSeek-R1 chain-of-thought, and any model that separates reasoning from output. Implementation: days, not weeks.

**2. Agent contacts list with health monitoring (HIGH impact, MEDIUM complexity)**

The visual anchor of the app. A contacts-style list with:
- Agent avatar, name, and status indicator (🟢/🟡/🔴)
- Last message preview and timestamp
- Swipe actions (pin, archive, configure)
- Pull-to-refresh for health check
- Empty state with "Add your first agent" onboarding

**3. Multi-session conversation management (HIGH impact, MEDIUM complexity)**

Per-agent conversation threads with:
- New conversation button (per agent)
- Conversation list with search, folders, and tags
- Conversation forking — branch from any message to explore alternative responses
- Pin, archive, and bulk delete
- Export individual conversations or all history

**4. Offline message cache (MEDIUM impact, MEDIUM complexity)**

Store all conversations in local SQLite. When offline:
- Browse and search all past conversations
- Queue new messages for sending when connectivity returns (via Background Sync on Android, background fetch on iOS)
- Show clear "offline" indicator with queued message count

Note: iOS limitations mean Background Sync isn't available in PWAs. This feature works best in the React Native build.

**5. Voice input/output (MEDIUM impact, LOW complexity)**

- **Input**: `react-native-voice` (React Native) or Web Speech API (PWA) for speech-to-text. Show waveform visualization during recording.
- **Output**: Text-to-speech for agent responses via `expo-speech` or device TTS. Optional integration with ElevenLabs or OpenAI TTS for higher quality.
- Vercel AI SDK 6 includes experimental `speech()` and `transcribe()` APIs.

**6. File upload and multimodal support (MEDIUM impact, MEDIUM complexity)**

AI Elements' `<PromptInput>` supports drag-and-drop and paste. For mobile:
- Camera integration for photo capture → image analysis
- Document picker for PDF/text file upload
- Client-side image compression before upload (critical on cellular networks)
- Display image thumbnails in conversation history

**7. Push notifications (MEDIUM impact, HIGH complexity)**

For long-running agent tasks or agent-initiated messages:
- Firebase Cloud Messaging (Android + web)
- APNs (iOS, requires native build)
- Notification when: agent completes a long task, agent goes offline/online, new shared conversation (Team tier)

**8. Dark mode and theming (LOW impact, LOW complexity)**

Table stakes for a mobile app. Ship with system-auto, dark, and light. Offer custom accent colors per agent for visual differentiation in the conversation list.

---

## Part 11: Implementation Roadmap

### Phase 1: PWA MVP (Weeks 1–4)

**Goal**: Ship a functional mobile web app that connects to any OpenAI-compatible agent endpoint.

**Tech stack**:
- Next.js 15 (App Router)
- Vercel AI SDK 6 + AI Elements + Streamdown
- Tailwind CSS + shadcn/ui
- Supabase (auth via Clerk webhook sync, PostgreSQL for metadata)
- PWA manifest + Workbox service worker

**Features shipped**:
- Agent onboarding flow (add, test, save)
- Agent list with online/offline status
- Single-agent chat with full SSE streaming
- Reasoning/thought display
- Multiple conversation sessions per agent
- Basic agent configuration (system prompt, temperature, model)
- Dark/light mode
- On-device message storage (IndexedDB)
- Responsive mobile-first design

**Deployment**: Vercel (frontend) + Supabase (backend). Total cost: ~$25/month.

### Phase 2: Polish + Monetize (Weeks 5–8)

**Goal**: Make it worth paying for.

**Features shipped**:
- Stripe subscription integration (Free/Pro tiers)
- Clerk auth with social login (Google, GitHub, Apple)
- Cross-device agent config sync (encrypted)
- Conversation search across all agents
- File upload with client-side compression
- Voice input (Web Speech API)
- Conversation export (JSON, Markdown)
- Agent type presets (OpenClaw, Ollama, vLLM)
- Custom CA certificate support
- Rate limiting via Upstash Redis
- Onboarding tutorial for first-time users

**Deployment**: Add Upstash Redis, Cloudflare for CDN/DDoS protection. Total cost: ~$60/month.

### Phase 3: Native Mobile + Tunnel (Weeks 9–16)

**Goal**: Ship iOS and Android apps; launch the tunnel relay premium feature.

**Tech stack addition**:
- React Native (Expo) with `react-native-gifted-chat`
- Share API client layer from Phase 1/2 Next.js codebase
- `react-native-mmkv` for secure credential storage
- PowerSync for SQLite ↔ Postgres sync (conversation metadata)
- Firebase Cloud Messaging for push notifications

**Features shipped**:
- Native iOS and Android apps (via Expo EAS Build)
- True offline support with background sync
- Push notifications (agent online/offline, long-task completion)
- Connection tunnel relay (Cloudflare Workers + Durable Objects)
- Biometric auth gate (Face ID / fingerprint to access agent tokens)
- Conversation forking
- Agent capability auto-detection (query `/v1/models`, check for vision/tool support)

**Deployment**: Add Cloudflare Workers for tunnel relay. App Store + Play Store submissions. Total cost: ~$150/month + Apple/Google developer fees ($99/year each).

### Phase 4: Scale + Marketplace (Months 5–8+)

**Goal**: Build network effects and enterprise features.

**Features shipped**:
- Agent marketplace (configs, prompts, plugins)
- Team tier with shared agent pools and admin dashboard
- SSO/SAML for enterprise
- Plugin SDK for third-party extensions
- A2A protocol support for multi-agent workflows
- Custom UI themes (community + premium)
- Conversation analytics (token usage, latency trends per agent)
- VPS/GPU provider partnerships (referral revenue)

---

## Part 12: Competitive Landscape and Positioning

### Direct competitors

| Product | Model | Strength | Weakness vs AgentLink |
|---|---|---|---|
| **TypingMind** | BYOK web client | Polished UI, plugin system, one-time purchase option | Desktop-first, no agent health monitoring, no tunnel relay |
| **BoltAI** | Native Mac client | Fast, offline-capable, multi-provider | Mac only, no mobile, no self-hosted agent focus |
| **msty** | Desktop client | Offline-first, clean UI | Desktop only, limited agent management |
| **Open WebUI** | Self-hosted web app | Most features, huge community | Heavy server-side, not mobile-optimized, complex setup |
| **LibreChat** | Self-hosted web app | Enterprise features, agent builder | Server-dependent, not mobile-first |
| **Telegram/Discord bots** | Messaging platform | Zero setup for users, familiar UX | No streaming, no configuration, no thought display, platform-dependent |

### AgentLink's unique positioning

"The only mobile-first chat client purpose-built for self-hosted AI agents."

No existing product occupies this position. The closest are:
- Open WebUI's mobile web view (functional but not optimized)
- Conduit for Open WebUI (early-stage Flutter client)
- Various Telegram/Discord bots (functional but severely limited)

The competitive moat comes from:
1. **Mobile-native UX** that can't be replicated by responsive CSS on a desktop web app
2. **Agent health monitoring** and connection management as first-class features
3. **Tunnel relay** that solves NAT traversal for homelab users
4. **Privacy-first architecture** where conversations never touch AgentLink servers
5. **Network effects** from the agent marketplace (Phase 4)

---

## Part 13: Risk Assessment and Mitigation

### Technical risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SSE streaming reliability on cellular | Medium | High | Automatic reconnection with message deduplication; queue messages locally and reconcile on reconnect |
| iOS PWA limitations (no Background Sync, limited service worker) | Certain | Medium | Prioritize React Native build for iOS; PWA serves as Android + desktop primary |
| Agent endpoint diversity (non-standard responses) | High | Medium | Flexible agent type system with custom JSON path selectors; community-contributed agent type definitions |
| Self-signed certificate handling in mobile WebView | Medium | Medium | Custom certificate store with per-agent CA import; clear documentation for common setups |

### Business risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Users unwilling to pay for a chat UI | Medium | High | Free tier must be genuinely useful; tunnel relay and cross-device sync are clear premium differentiators |
| Apple App Store rejection | Low | High | Ensure app has standalone value beyond connecting to external services; include onboarding with demo agent |
| Open-source competitor ships mobile-first | Medium | Medium | Move fast, build community early, tunnel relay creates switching cost |
| Self-hosted LLM quality plateaus | Low | Medium | Commercial provider support ensures fallback value; platform value is in UX, not model quality |

### Legal risks

| Risk | Mitigation |
|---|---|
| Liability for agent-generated content | Clear ToS: AgentLink is a communication client, not an AI provider. Users are responsible for their agents' outputs. |
| GDPR data processing | Minimal server-side data; privacy-by-design architecture reduces compliance burden |
| App Store content policies | Content filtering is agent-side, not platform-side. Include content reporting mechanism for marketplace items. |

---

## Part 14: Key Repositories and Resources Reference

### Primary dependencies

| Package | Purpose | URL |
|---|---|---|
| Vercel AI SDK | Chat hooks, streaming, agent protocol | [github.com/vercel/ai](https://github.com/vercel/ai) |
| AI Elements | Chat UI components (Conversation, Message, Reasoning, PromptInput) | [elements.ai-sdk.dev](https://elements.ai-sdk.dev) |
| Streamdown | Streaming markdown renderer | [github.com/vercel/streamdown](https://github.com/vercel/streamdown) |
| shadcn/ui | Base component library | [ui.shadcn.com](https://ui.shadcn.com) |
| prompt-kit | Additional AI chat components | [github.com/ibelick/prompt-kit](https://github.com/ibelick/prompt-kit) |
| react-native-gifted-chat | React Native chat scaffold | [github.com/FaridSafi/react-native-gifted-chat](https://github.com/FaridSafi/react-native-gifted-chat) |
| markdown-to-jsx | Streaming-optimized markdown for RN | [github.com/quantizor/markdown-to-jsx](https://github.com/quantizor/markdown-to-jsx) |

### Platform services

| Service | Purpose | URL |
|---|---|---|
| Clerk | Auth + user management | [clerk.com](https://clerk.com) |
| Supabase | Database + storage + realtime | [supabase.com](https://supabase.com) |
| Stripe Billing | Subscriptions + metered billing | [stripe.com/billing](https://stripe.com/billing) |
| Upstash Redis | Rate limiting + caching | [upstash.com](https://upstash.com) |
| PowerSync | SQLite ↔ Postgres sync for offline | [powersync.com](https://powersync.com) |
| Cloudflare Workers | Edge compute, tunnel relay | [workers.cloudflare.com](https://workers.cloudflare.com) |

### Study and reference

| Project | What to learn | URL |
|---|---|---|
| LibreChat | Agent architecture, conversation forking, data-provider hooks | [github.com/danny-avila/LibreChat](https://github.com/danny-avila/LibreChat) |
| LobeChat | UI/UX design, CRDT sync, plugin SDK | [github.com/lobehub/lobe-chat](https://github.com/lobehub/lobe-chat) |
| Open WebUI | Feature completeness reference, RAG patterns | [github.com/open-webui/open-webui](https://github.com/open-webui/open-webui) |
| Conduit | Native mobile + agent backend architecture | [github.com/cogwheel0/conduit](https://github.com/cogwheel0/conduit) |
| ChatterUI | React Native LLM chat patterns | [github.com/Vali-98/ChatterUI](https://github.com/Vali-98/ChatterUI) |
| react-native-ai | Full-stack RN AI app framework | [github.com/dabit3/react-native-ai](https://github.com/dabit3/react-native-ai) |
| LiteLLM | Multi-provider routing (for power user integration) | [github.com/BerriAI/litellm](https://github.com/BerriAI/litellm) |

---

## Conclusion

The self-hosted LLM agent ecosystem has sophisticated backends but primitive frontends. Users running OpenClaw, NanoClaw, or homelab agents deserve a client that matches the quality of ChatGPT's or Claude's official apps — not a Telegram bot that can't even stream text.

AgentLink's client-direct architecture (where conversations go straight from phone to agent, never touching the platform) is both a privacy advantage and a cost advantage. The platform's infrastructure costs stay flat regardless of how much users chat, making the business model sustainable from day one.

The technical stack is proven — Vercel AI SDK powers millions of AI chat sessions daily, SSE streaming is battle-tested, and every component library recommended here is actively maintained with thousands of GitHub stars. The gap isn't technical capability. It's product focus: building a mobile-first client that treats agent connectivity as the core experience rather than an afterthought.

Ship the PWA in 4 weeks. Get it in front of the OpenClaw and homelab AI communities. Iterate based on what breaks. The tunnel relay feature alone — solving the "I can't reach my homelab agent from my phone" problem — may be worth the subscription for many users. Everything else is polish on top of a genuinely useful tool.
