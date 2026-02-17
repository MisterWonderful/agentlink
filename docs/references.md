# References & Learning Resources

## Projects to Study

### LibreChat — Best Backend Architecture
- **Repo**: https://github.com/danny-avila/LibreChat (~33K stars)
- **License**: MIT
- **Stack**: React + Node.js monorepo
- **What to extract**:
  - `@librechat/data-provider` — React Query hooks for conversation CRUD, message streaming. Backend-agnostic, adaptable for client-direct.
  - `data-schemas` — Zod validation schemas for messages, conversations, agent configs.
  - Agent architecture patterns — no-code agent builder with MCP tools, code interpreter, conversation forking, agent handoffs.
- **What to skip**: Full monorepo deployment (MongoDB dependency, server-side proxy). AgentLink is client-direct.

### LobeChat — Best UI/UX Reference
- **Repo**: https://github.com/lobehub/lobe-chat (~72K stars)
- **License**: MIT
- **Stack**: Next.js + React + Zustand
- **What to learn**:
  - Most polished visual design in OSS LLM UI space. Study chat bubble design, sidebar layout, animations, dark mode.
  - CRDT-based multi-device sync pattern.
  - `lobe-ui` component library and plugin SDK.
  - Zustand store patterns for multiple concurrent agent sessions.
- **What to skip**: Full Next.js server-side architecture (assumes server-side API key management).

### Open WebUI — Feature Completeness Reference
- **Repo**: https://github.com/open-webui/open-webui (~120K stars)
- **Stack**: SvelteKit + Python
- **What to learn**: Feature checklist — RAG, web search, model management, voice I/O, image generation. Use as a completeness benchmark.
- **What to skip**: Heavy server-side architecture, not mobile-optimized.

### Conduit — Native Mobile Proof of Concept
- **Repo**: https://github.com/cogwheel0/conduit
- **Stack**: Flutter
- **What to learn**: Thin native client speaking to agent backend. Streaming, offline caching, push notifications in mobile context. Directly applicable architecture.

### ChatterUI — React Native Patterns
- **Repo**: https://github.com/Vali-98/ChatterUI (~5K stars)
- **Stack**: React Native + Expo
- **What to learn**: LLM chat in React Native. On-device + remote API support. Most directly relevant RN codebase.

### react-native-ai — Full-Stack RN Framework
- **Repo**: https://github.com/dabit3/react-native-ai (~3K stars)
- **Stack**: React Native + Expo
- **What to learn**: Full-stack cross-platform AI app by Nader Dabit. Streaming in React Native with built-in provider support.

### react-native-gifted-chat — Battle-Tested Chat Scaffold
- **Repo**: https://github.com/FaridSafi/react-native-gifted-chat (13.5K stars, 100K+ weekly npm)
- **What to learn**: The standard chat UI scaffold for React Native. Message bubbles, input toolbar, scroll-to-bottom, typing indicators.

### LiteLLM — Multi-Provider Routing
- **Repo**: https://github.com/BerriAI/litellm
- **What to learn**: For power user integration. Load balancing across GPU servers, unified gateway, usage tracking, model fallback.
- **Integration**: Users deploy their own LiteLLM, AgentLink connects as a meta-agent.

## Key Documentation

### Vercel AI SDK
- **Docs**: https://sdk.vercel.ai/docs
- **Key pages**:
  - `useChat` hook: https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat
  - Custom providers: https://sdk.vercel.ai/docs/foundations/providers-and-models
  - Streaming: https://sdk.vercel.ai/docs/foundations/streaming
  - Message parts (reasoning, tool calls): https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot-with-tool-use

### AI Elements
- **Site**: https://elements.ai-sdk.dev
- **Components**: Conversation, Message, Reasoning, PromptInput, Sources, ModelSelector
- **Install pattern**: `npx ai-elements@latest add [component]` — copies source into project

### Streamdown
- **Repo**: https://github.com/vercel/streamdown
- **Purpose**: Streaming-optimized markdown renderer. Handles incomplete markdown during token-by-token rendering.
- **Features**: Shiki syntax highlighting (160+ languages), KaTeX math, Mermaid diagrams

### shadcn/ui
- **Site**: https://ui.shadcn.com
- **Key**: Copy-paste component model with full source ownership. No npm dependency lock-in.

### prompt-kit
- **Repo**: https://github.com/ibelick/prompt-kit
- **Purpose**: Additional composable AI chat components following shadcn pattern. MIT licensed.

### Clerk
- **Docs**: https://clerk.com/docs
- **Key**: Next.js integration, React Native support, Organizations (Team tier), Webhooks

### Supabase
- **Docs**: https://supabase.com/docs
- **Key**: PostgreSQL, Row Level Security, Edge Functions, Realtime subscriptions

### Stripe Billing
- **Docs**: https://stripe.com/docs/billing
- **Key**: Checkout Sessions, Customer Portal, Webhooks, Subscription lifecycle

### Dexie.js
- **Docs**: https://dexie.org/docs
- **Key**: IndexedDB wrapper, `useLiveQuery` for reactive queries, compound indexes

## Protocol References

### OpenAI Chat Completions API
- **Spec**: https://platform.openai.com/docs/api-reference/chat/create
- **SSE format**: `data: {"choices":[{"delta":{"content":"..."}}]}`
- **Streaming**: `stream: true` in request body

### Ollama API
- **Docs**: https://github.com/ollama/ollama/blob/main/docs/api.md
- **Chat**: POST `/api/chat` with newline-delimited JSON response (not SSE)
- **Models**: GET `/api/tags`

### Anthropic Messages API
- **Spec**: https://docs.anthropic.com/en/api/messages
- **SSE events**: `message_start`, `content_block_start`, `content_block_delta`, `message_stop`
- **Thinking**: `thinking_delta` event type for chain-of-thought

### Server-Sent Events (SSE)
- **MDN**: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- **Key features**: automatic reconnection, `Last-Event-ID` for resuming, works through HTTP proxies

## Community & Distribution

### Target Communities for Launch
- r/selfhosted (Reddit) — primary audience
- r/LocalLLaMA (Reddit) — LLM enthusiasts
- r/homelab (Reddit) — homelab runners
- Hacker News — developer audience
- OpenClaw Discord/GitHub — direct users of Claw agents
- Ollama Discord — Ollama users
- Product Hunt — for broader visibility

### App Store Considerations
- **Apple**: Include demo agent / onboarding so app has standalone value. Apple rejects "thin clients" that only connect to external services.
- **Google Play**: More lenient. Still include good onboarding.
- **Developer fees**: Apple $99/year, Google $25 one-time.
