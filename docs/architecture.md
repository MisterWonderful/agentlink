# Architecture

## System Overview

AgentLink uses a **client-direct** architecture. Chat traffic flows directly from the mobile client to the user's agent endpoint via TLS. The AgentLink platform handles only platform operations (auth, billing, metadata sync).

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE CLIENT                            │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Agent Manager │  │  Chat Engine │  │  Local Storage Layer  │  │
│  │              │  │              │  │                       │  │
│  │ • Add/remove │  │ • useChat()  │  │ • IndexedDB (msgs)   │  │
│  │ • Health     │  │ • SSE stream │  │ • IndexedDB (agents)  │  │
│  │   monitoring │  │ • Reasoning  │  │ • Web Crypto (tokens) │  │
│  │ • Config UI  │  │ • File upload│  │ • Background sync     │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────────────────┘  │
│         │                 │                                      │
└─────────┼─────────────────┼──────────────────────────────────────┘
          │                 │
          │    Direct TLS   │  Direct TLS (per-agent)
          │    connections  │
          ▼                 ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  OpenClaw Agent │  │ Ollama (local)  │  │  vLLM (VPS)     │
│  (homelab)      │  │ (LAN)           │  │                 │
│  https://...    │  │ http://192...   │  │  https://...    │
└─────────────────┘  └─────────────────┘  └─────────────────┘

          │ (Platform operations only — no chat traffic)
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AGENTLINK PLATFORM                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │   Clerk    │  │   Stripe   │  │  Supabase  │  │  Upstash  │ │
│  │   (Auth)   │  │  (Billing) │  │ (Metadata  │  │  (Rate    │ │
│  │            │  │            │  │   Sync)    │  │  Limiting) │ │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### Chat Message Flow (Happy Path)

```
User types message
  → useAgentChat hook captures input
  → Message saved to IndexedDB (immediate, local-first)
  → HTTP POST to agent.endpointUrl/v1/chat/completions
    - Headers: Authorization: Bearer <decrypted token>
    - Body: { model, messages, stream: true }
  → SSE stream opens
  → Tokens arrive as: data: {"choices":[{"delta":{"content":"..."}}]}
  → Each token chunk appended to assistant message in real-time
  → Reasoning tokens (if present) routed to message.parts[type=reasoning]
  → On stream end (data: [DONE]):
    - Full message saved to IndexedDB
    - Conversation metadata updated (last_message_preview, message_count, updated_at)
    - If sync enabled: metadata synced to Supabase (NOT message content)
```

### Agent Connection Test Flow

```
User enters endpoint URL + auth token
  → UI shows "Testing connection..." spinner
  → connectionTester.test(url, token, agentType):
    1. If agentType specified: use that adapter
    2. If agentType is 'auto': try each adapter in order (OpenAI → Ollama → Anthropic)
    3. Send lightweight test prompt ("Hi" with max_tokens: 5)
    4. Measure round-trip latency
    5. Parse response to detect: model name, capabilities
    6. If adapter has getModels(): fetch available model list
  → Return: { success, agentType, modelName, latency, capabilities, availableModels }
  → UI updates: show green check + detected info, or red X + error message
```

### Offline Queue Flow

```
User sends message while offline
  → Message saved to IndexedDB with status: 'queued'
  → UI shows message with "queued" indicator (clock icon)
  → Connection monitor detects network recovery
  → Queue processor:
    1. Read all queued messages ordered by timestamp
    2. For each: POST to agent endpoint
    3. On success: update message status to 'sent', append response
    4. On failure: keep 'queued', increment retry count
    5. After 3 failures: mark as 'failed', show retry button
```

## State Management Architecture

### Zustand Store Structure

```
agentStore
├── agents: Map<agentId, Agent>          # All configured agents
├── activeAgentId: string | null         # Currently selected agent
├── addAgent(agent)                      # Add new agent
├── updateAgent(id, partial)             # Update agent config
├── removeAgent(id)                      # Delete agent
├── setActiveAgent(id)                   # Select agent for chat
└── getAgent(id)                         # Read single agent

chatStore
├── conversations: Map<convId, ConversationMeta>  # All conversations
├── activeConversationId: string | null
├── messages: Map<convId, ChatMessage[]>           # Messages per conversation
├── createConversation(agentId)
├── deleteConversation(convId)
├── addMessage(convId, message)
├── updateMessage(convId, msgId, partial)
└── getConversations(agentId)            # Filter conversations by agent

connectionStore
├── statuses: Map<agentId, AgentStatus>  # Online/offline/slow per agent
├── latencies: Map<agentId, number[]>    # Latency history (last 10)
├── updateStatus(agentId, status)
├── addLatency(agentId, ms)
└── getStatus(agentId)

uiStore
├── theme: 'light' | 'dark' | 'system'
├── sidebarOpen: boolean
├── activeModal: string | null
├── toasts: Toast[]
└── toggleSidebar()
```

### Persistence Strategy

| Store | Persistence | Sync to Cloud |
|---|---|---|
| agentStore | IndexedDB (encrypted tokens via Web Crypto) | Pro: agent configs sync to Supabase (encrypted) |
| chatStore.conversations | IndexedDB (metadata) | Metadata only syncs to Supabase |
| chatStore.messages | IndexedDB (full content) | NEVER syncs by default; optional E2EE sync |
| connectionStore | In-memory only | Never — ephemeral per session |
| uiStore | localStorage (theme preference) | Never |

## Server-Side Architecture (Next.js)

### API Routes (Platform Operations Only)

```
src/app/api/
├── webhooks/
│   ├── clerk/route.ts       # Clerk user events → Supabase sync
│   └── stripe/route.ts      # Stripe subscription events → plan updates
├── agents/
│   ├── route.ts             # GET: list user agents, POST: create agent (metadata only)
│   └── [id]/route.ts        # GET/PUT/DELETE single agent metadata
├── conversations/
│   ├── route.ts             # GET: list conversation metadata, POST: create
│   └── [id]/route.ts        # GET/PUT/DELETE conversation metadata
├── billing/
│   ├── checkout/route.ts    # POST: create Stripe Checkout session
│   └── portal/route.ts      # POST: create Stripe Customer Portal session
└── health/route.ts          # GET: platform health check
```

**Critical**: There are NO chat proxy routes. The client talks directly to agents.

### Middleware

```
src/middleware.ts
├── Clerk auth: protect all /api/* and /(main)/* routes
├── Rate limiting: Upstash Redis sliding-window on /api/*
└── CORS: restrict to app domain
```

## Infrastructure Cost Model

| Component | Service | Monthly Cost | Scales With |
|---|---|---|---|
| Frontend + API | Vercel Pro | $20 | Page views, edge function invocations |
| Database | Supabase Pro | $25 | Rows (metadata only, not messages) |
| Auth | Clerk | $0 (<10K MAU) | Monthly active users |
| Payments | Stripe | 2.9% + $0.30/txn | Transactions |
| Rate Limiting | Upstash Redis | $10 | API calls to platform |
| Push Notifications | Firebase (FCM) | $0 | Notifications sent |
| CDN | Cloudflare | $0-5 | Bandwidth |
| **Total (launch)** | | **~$55-60/mo** | |

Chat traffic costs $0 to the platform because it goes directly to user agents.
