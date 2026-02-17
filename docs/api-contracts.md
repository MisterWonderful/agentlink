# API Contracts

## 1. Platform API (AgentLink Server → Next.js API Routes)

All platform routes are authenticated via Clerk middleware. Rate-limited via Upstash Redis.

### Agents

```
GET    /api/agents                    → list user's agent configs (encrypted)
POST   /api/agents                    → create agent config
GET    /api/agents/:id                → get single agent config
PUT    /api/agents/:id                → update agent config
DELETE /api/agents/:id                → delete agent config
```

#### POST /api/agents — Create Agent

Request:
```json
{
  "name": "My HomeLab GPT",
  "agentType": "openai_compatible",
  "endpointUrlEncrypted": "<base64 AES-256-GCM ciphertext>",
  "authTokenEncrypted": "<base64 ciphertext or null>",
  "encryptionIv": "<base64 IV>",
  "systemPrompt": "You are a helpful assistant.",
  "defaultModel": "deepseek-r1:70b",
  "temperature": 0.7,
  "maxTokens": 4096,
  "contextLength": 8192,
  "capabilities": {
    "vision": false,
    "tools": false,
    "reasoning": true,
    "fileUpload": false,
    "codeExecution": false
  }
}
```

Response (201):
```json
{
  "id": "uuid",
  "name": "My HomeLab GPT",
  "agentType": "openai_compatible",
  "createdAt": "2026-01-15T10:30:00Z"
}
```

### Conversations (Metadata Only)

```
GET    /api/conversations             → list conversation metadata
POST   /api/conversations             → create conversation metadata
GET    /api/conversations/:id         → get single conversation metadata
PUT    /api/conversations/:id         → update metadata (title, pins, tags)
DELETE /api/conversations/:id         → delete conversation metadata
```

### Billing

```
POST   /api/billing/checkout          → create Stripe Checkout session
POST   /api/billing/portal            → create Stripe Customer Portal session
GET    /api/billing/plan              → get current user plan
```

### Webhooks

```
POST   /api/webhooks/clerk            → Clerk user events (created, updated, deleted)
POST   /api/webhooks/stripe           → Stripe subscription events
```

---

## 2. Agent Communication Protocols

These are the protocols the CLIENT uses to talk DIRECTLY to user agents. Not our API.

### OpenAI-Compatible (Default)

Used by: OpenClaw, NanoClaw, vLLM, llama.cpp, LocalAI, LiteLLM

#### Chat Completion

```
POST {agent.endpointUrl}/v1/chat/completions
Content-Type: application/json
Authorization: Bearer {agent.authToken}

{
  "model": "{agent.defaultModel}",
  "messages": [
    {"role": "system", "content": "{agent.systemPrompt}"},
    {"role": "user", "content": "Hello, how are you?"}
  ],
  "stream": true,
  "temperature": 0.7,
  "max_tokens": 4096,
  "top_p": 1.0,
  "frequency_penalty": 0.0,
  "presence_penalty": 0.0
}
```

SSE Response:
```
data: {"id":"chatcmpl-abc","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

#### List Models

```
GET {agent.endpointUrl}/v1/models
Authorization: Bearer {agent.authToken}
```

Response:
```json
{
  "data": [
    {"id": "deepseek-r1:70b", "object": "model", "owned_by": "user"},
    {"id": "llama3:8b", "object": "model", "owned_by": "user"}
  ]
}
```

### Ollama Native

Used by: Ollama when not using OpenAI-compatible mode

#### Chat

```
POST {agent.endpointUrl}/api/chat
Content-Type: application/json

{
  "model": "{agent.defaultModel}",
  "messages": [
    {"role": "system", "content": "{agent.systemPrompt}"},
    {"role": "user", "content": "Hello"}
  ],
  "stream": true
}
```

Response (newline-delimited JSON, NOT SSE):
```
{"model":"llama3:8b","message":{"role":"assistant","content":"Hello"},"done":false}
{"model":"llama3:8b","message":{"role":"assistant","content":"!"},"done":false}
{"model":"llama3:8b","message":{"role":"assistant","content":""},"done":true,"total_duration":1234567890}
```

**Adapter must**: Remap this to the standard message format the UI expects.

#### List Models

```
GET {agent.endpointUrl}/api/tags
```

Response:
```json
{
  "models": [
    {"name": "llama3:8b", "size": 4661228800, "details": {"family": "llama"}}
  ]
}
```

### Anthropic-Compatible

Used by: agents proxying Claude-format APIs

#### Chat

```
POST {agent.endpointUrl}/v1/messages
Content-Type: application/json
x-api-key: {agent.authToken}
anthropic-version: 2023-06-01

{
  "model": "{agent.defaultModel}",
  "max_tokens": 4096,
  "system": "{agent.systemPrompt}",
  "messages": [
    {"role": "user", "content": "Hello"}
  ],
  "stream": true
}
```

SSE Response:
```
event: message_start
data: {"type":"message_start","message":{"id":"msg_abc","role":"assistant"}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

event: thinking_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"thinking_delta","thinking":"Let me consider..."}}

event: message_stop
data: {"type":"message_stop"}
```

**Adapter must**: Map Anthropic events to the standard message parts format. Specifically:
- `content_block_delta` with `text_delta` → `{ type: 'text', content }`
- `content_block_delta` with `thinking_delta` → `{ type: 'reasoning', content }`

### Custom Agent

User configures:
- **URL**: Full endpoint URL
- **Method**: POST (default), GET
- **Headers**: Custom headers (key-value pairs)
- **Body template**: JSON template with `{{messages}}` placeholder
- **Response path**: JSONPath expression to extract response text (e.g., `$.choices[0].message.content` or `$.output.text`)
- **Stream**: Whether to expect SSE or wait for complete response

---

## 3. Connection Test Protocol

Used during agent onboarding to validate the endpoint.

```typescript
interface ConnectionTestResult {
  success: boolean;
  agentType: AgentType;         // detected or confirmed type
  modelName?: string;           // detected model name
  availableModels?: string[];   // list if models endpoint exists
  latencyMs: number;            // round-trip time
  capabilities: {
    vision: boolean;
    tools: boolean;
    reasoning: boolean;
    streaming: boolean;
  };
  error?: string;               // error message if success === false
}
```

Test sequence:
1. Try HEAD request to base URL → confirm reachability, measure latency
2. Try GET models endpoint → detect available models
3. Send minimal chat completion: `messages: [{ role: "user", content: "Hi" }]` with `max_tokens: 5`
4. Parse response to confirm format matches expected agent type
5. Check for reasoning tokens in response → set `capabilities.reasoning`
6. Return result

---

## 4. Health Check Protocol

Lightweight check that runs on interval (default: 60s in foreground).

```typescript
interface HealthCheckResult {
  agentId: string;
  status: 'online' | 'slow' | 'offline' | 'unknown';
  latencyMs?: number;
  checkedAt: string;    // ISO timestamp
  error?: string;
}
```

Check method:
1. Send HEAD request (or GET if HEAD not supported) to agent base URL
2. Timeout: 5 seconds
3. If response received:
   - latency < 500ms → status: 'online'
   - latency >= 500ms → status: 'slow'
4. If timeout or error → status: 'offline'
5. Update connectionStore with result
6. Append latency to history array (keep last 10)
