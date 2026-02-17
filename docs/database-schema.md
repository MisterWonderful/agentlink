# Database Schema

## Server-Side: Supabase (PostgreSQL)

Stores platform data only. Never stores message content.

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  sync_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Agents Table

```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  accent_color TEXT DEFAULT '#3b82f6', -- hex color for visual differentiation
  agent_type TEXT DEFAULT 'openai_compatible'
    CHECK (agent_type IN ('openai_compatible', 'ollama', 'anthropic_compatible', 'custom')),

  -- Connection details (encrypted client-side before storage)
  endpoint_url_encrypted TEXT NOT NULL,  -- base64-encoded AES-256-GCM ciphertext
  auth_token_encrypted TEXT,             -- base64-encoded, null if no auth
  encryption_iv TEXT NOT NULL,           -- base64-encoded IV for decryption

  -- Configuration (not sensitive — stored plaintext)
  system_prompt TEXT DEFAULT '',
  default_model TEXT,
  temperature REAL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER DEFAULT 4096,
  context_length INTEGER DEFAULT 8192,
  top_p REAL DEFAULT 1.0,
  frequency_penalty REAL DEFAULT 0.0,
  presence_penalty REAL DEFAULT 0.0,

  -- Capabilities (detected or manually set)
  capabilities JSONB DEFAULT '{
    "vision": false,
    "tools": false,
    "reasoning": false,
    "file_upload": false,
    "code_execution": false
  }'::jsonb,

  -- Status (updated by client health checks, synced to server)
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  avg_latency_ms INTEGER,

  -- Custom settings
  custom_headers JSONB DEFAULT '{}',  -- additional headers to send
  request_timeout_ms INTEGER DEFAULT 30000,
  max_retries INTEGER DEFAULT 3,
  custom_ca_cert TEXT,                 -- PEM certificate for self-signed certs

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Conversations Table (Metadata Only)

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  title TEXT DEFAULT 'New Conversation',
  message_count INTEGER DEFAULT 0,
  last_message_preview TEXT,    -- First 100 chars of last message
  last_message_role TEXT CHECK (last_message_role IN ('user', 'assistant')),
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  folder TEXT,
  tags TEXT[] DEFAULT '{}',
  forked_from_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  forked_from_message_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Indexes

```sql
CREATE INDEX idx_agents_user ON agents(user_id);
CREATE INDEX idx_agents_user_active ON agents(user_id) WHERE is_active = true;
CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);
CREATE INDEX idx_conversations_agent ON conversations(agent_id);
CREATE INDEX idx_conversations_user_pinned ON conversations(user_id, is_pinned DESC, updated_at DESC);
```

### Row Level Security

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own data
CREATE POLICY users_own ON users
  FOR ALL USING (clerk_id = auth.jwt()->>'sub');

CREATE POLICY agents_own ON agents
  FOR ALL USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'));

CREATE POLICY conversations_own ON conversations
  FOR ALL USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'));
```

---

## Client-Side: IndexedDB (via Dexie.js)

Stores all message content and local copies of agent configs.

### Dexie Database Definition

```typescript
// src/lib/db/indexeddb.ts
import Dexie, { type Table } from 'dexie';

export interface LocalAgent {
  id: string;           // matches Supabase agent.id (or local UUID if not synced)
  serverId?: string;    // Supabase ID when synced
  name: string;
  avatarUrl?: string;
  accentColor: string;
  agentType: 'openai_compatible' | 'ollama' | 'anthropic_compatible' | 'custom';
  endpointUrl: string;  // decrypted — only exists in IndexedDB, encrypted via Web Crypto
  authToken?: string;   // decrypted — only exists in IndexedDB
  systemPrompt: string;
  defaultModel?: string;
  temperature: number;
  maxTokens: number;
  contextLength: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  capabilities: {
    vision: boolean;
    tools: boolean;
    reasoning: boolean;
    fileUpload: boolean;
    codeExecution: boolean;
  };
  customHeaders: Record<string, string>;
  requestTimeoutMs: number;
  maxRetries: number;
  customCaCert?: string;
  isActive: boolean;
  lastSeenAt?: string;
  avgLatencyMs?: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocalConversation {
  id: string;
  agentId: string;
  title: string;
  messageCount: number;
  lastMessagePreview?: string;
  lastMessageRole?: 'user' | 'assistant';
  isPinned: boolean;
  isArchived: boolean;
  folder?: string;
  tags: string[];
  forkedFromConversationId?: string;
  forkedFromMessageIndex?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocalMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;           // plain text content
  parts: MessagePart[];      // structured parts (text, reasoning, tool-call, etc.)
  model?: string;            // model that generated this response
  tokenCount?: number;       // estimated token count
  latencyMs?: number;        // response generation time
  status: 'sending' | 'sent' | 'queued' | 'failed' | 'streaming';
  error?: string;            // error message if status === 'failed'
  retryCount: number;
  createdAt: string;
}

export interface MessagePart {
  type: 'text' | 'reasoning' | 'tool-call' | 'tool-result' | 'file' | 'source-url';
  content: string;
  // type-specific fields
  toolName?: string;       // for tool-call
  toolArgs?: string;       // for tool-call (JSON string)
  toolResult?: string;     // for tool-result
  fileName?: string;       // for file
  fileType?: string;       // for file
  fileUrl?: string;        // for file (local blob URL)
  sourceUrl?: string;      // for source-url
  sourceTitle?: string;    // for source-url
  thinkingTimeMs?: number; // for reasoning
}

export class AgentLinkDB extends Dexie {
  agents!: Table<LocalAgent>;
  conversations!: Table<LocalConversation>;
  messages!: Table<LocalMessage>;

  constructor() {
    super('agentlink');
    this.version(1).stores({
      agents: 'id, serverId, name, agentType, isActive, sortOrder',
      conversations: 'id, agentId, title, isPinned, isArchived, updatedAt, [agentId+updatedAt]',
      messages: 'id, conversationId, role, status, createdAt, [conversationId+createdAt]',
    });
  }
}

export const db = new AgentLinkDB();
```

### Indexing Strategy

| Table | Index | Purpose |
|---|---|---|
| messages | `[conversationId+createdAt]` | Load messages for a conversation in order |
| messages | `status` | Find queued/failed messages for retry |
| conversations | `[agentId+updatedAt]` | List conversations per agent, newest first |
| conversations | `isPinned` | Show pinned conversations at top |
| agents | `isActive` | Filter to active agents only |

### Full-Text Search

For MVP, use Dexie's `where().startsWithIgnoreCase()` or iterate with `.filter()` for substring matching on message content. For Phase 2+, consider:

- **Dexie Cloud** — built-in full-text search
- **MiniSearch** — lightweight in-browser full-text search library
- **FlexSearch** — fastest in-browser search engine

Implementation in `src/lib/chat/message-search.ts`:

```typescript
import { db } from '@/lib/db/indexeddb';

export async function searchMessages(query: string, agentId?: string): Promise<LocalMessage[]> {
  const lowerQuery = query.toLowerCase();
  let collection = db.messages.orderBy('createdAt');

  if (agentId) {
    // Get conversation IDs for this agent first
    const convIds = await db.conversations
      .where('agentId').equals(agentId)
      .primaryKeys();
    collection = db.messages.where('conversationId').anyOf(convIds);
  }

  return collection
    .filter(msg => msg.content.toLowerCase().includes(lowerQuery))
    .reverse()
    .limit(50)
    .toArray();
}
```
