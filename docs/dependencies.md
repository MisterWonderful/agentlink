# Dependencies

## Core Framework

| Package | Version | Purpose |
|---|---|---|
| `next` | ^15.0 | Framework — App Router, SSR, API routes, Edge Functions |
| `react` | ^19.0 | UI library |
| `react-dom` | ^19.0 | React DOM renderer |
| `typescript` | ^5.5 | Type safety |

## AI / Chat

| Package | Version | Purpose |
|---|---|---|
| `ai` | ^4.0 | Vercel AI SDK — `useChat` hook, SSE streaming, message parts |
| `@ai-sdk/openai` | ^1.0 | OpenAI provider adapter for Vercel AI SDK |
| `@ai-elements/react` | latest | AI Elements — `Conversation`, `Message`, `Reasoning`, `PromptInput` |
| `streamdown` | latest | Streaming markdown renderer (replaces react-markdown) |

**Install AI Elements individually**:
```bash
npx ai-elements@latest add conversation message reasoning prompt-input sources model-selector
```

## UI Components

| Package | Version | Purpose |
|---|---|---|
| `tailwindcss` | ^4.0 | Utility-first CSS |
| `class-variance-authority` | ^0.7 | Component variant definitions (used by shadcn/ui) |
| `clsx` | ^2.0 | Conditional class merging |
| `tailwind-merge` | ^2.0 | Tailwind class deduplication |
| `lucide-react` | ^0.400 | Icon library (used by shadcn/ui) |
| `framer-motion` | ^11.0 | Animations — page transitions, message appear, accordion |
| `sonner` | ^1.5 | Toast notifications |
| `cmdk` | ^1.0 | Command palette (for search) |
| `vaul` | ^0.9 | Drawer/bottom sheet component |
| `next-themes` | ^0.3 | Theme switching (system/light/dark) |

**shadcn/ui components to install**:
```bash
npx shadcn@latest add button input textarea select switch slider tabs
npx shadcn@latest add dialog sheet dropdown-menu toast skeleton avatar badge
npx shadcn@latest add card separator scroll-area tooltip popover
```

## State Management

| Package | Version | Purpose |
|---|---|---|
| `zustand` | ^5.0 | Global state — agent store, chat store, UI store |
| `immer` | ^10.0 | Immutable state updates in Zustand (optional middleware) |

## Database / Storage

| Package | Version | Purpose |
|---|---|---|
| `@supabase/supabase-js` | ^2.40 | Supabase client — PostgreSQL queries, RLS |
| `@supabase/ssr` | ^0.3 | Supabase SSR helpers for Next.js |
| `dexie` | ^4.0 | IndexedDB wrapper — on-device message storage |
| `dexie-react-hooks` | ^1.1 | React hooks for Dexie (`useLiveQuery`) |
| `idb-keyval` | ^6.2 | Simple key-value IndexedDB (for settings, preferences) |

## Authentication

| Package | Version | Purpose |
|---|---|---|
| `@clerk/nextjs` | ^5.0 | Clerk integration — auth middleware, components, hooks |
| `svix` | ^1.20 | Webhook signature verification (for Clerk webhooks) |

## Payments

| Package | Version | Purpose |
|---|---|---|
| `stripe` | ^16.0 | Stripe Node.js SDK — subscriptions, checkout, webhooks |
| `@stripe/stripe-js` | ^4.0 | Stripe browser SDK — for Checkout redirect |

## Rate Limiting

| Package | Version | Purpose |
|---|---|---|
| `@upstash/redis` | ^1.30 | Upstash Redis client |
| `@upstash/ratelimit` | ^2.0 | Rate limiting middleware |

## Validation

| Package | Version | Purpose |
|---|---|---|
| `zod` | ^3.23 | Runtime schema validation — all API boundaries |

## PWA

| Package | Version | Purpose |
|---|---|---|
| `next-pwa` | ^5.6 | PWA plugin for Next.js (Workbox integration) |
| `workbox-webpack-plugin` | ^7.0 | Service worker generation |

## Utilities

| Package | Version | Purpose |
|---|---|---|
| `date-fns` | ^3.6 | Date formatting (relative timestamps like "2m ago") |
| `nanoid` | ^5.0 | ID generation for local entities |
| `ky` | ^1.3 | HTTP client (lighter than axios, better error handling) |

## Code Quality (devDependencies)

| Package | Version | Purpose |
|---|---|---|
| `eslint` | ^9.0 | Linting |
| `eslint-config-next` | ^15.0 | Next.js ESLint config |
| `prettier` | ^3.3 | Code formatting |
| `prettier-plugin-tailwindcss` | ^0.6 | Tailwind class sorting |
| `@types/react` | ^19.0 | React types |
| `@types/node` | ^22.0 | Node.js types |

## Testing (devDependencies)

| Package | Version | Purpose |
|---|---|---|
| `vitest` | ^2.0 | Unit + integration tests (faster than Jest with ESM) |
| `@testing-library/react` | ^16.0 | Component testing |
| `@testing-library/user-event` | ^14.5 | User interaction simulation |
| `@playwright/test` | ^1.45 | E2E testing |
| `msw` | ^2.3 | Mock Service Worker — mock SSE streams for testing |
| `fake-indexeddb` | ^6.0 | IndexedDB mock for Node.js testing |

## Monitoring (production)

| Package | Version | Purpose |
|---|---|---|
| `@sentry/nextjs` | ^8.0 | Error tracking |
| `posthog-js` | ^1.130 | Analytics, feature flags |

---

## Installation Commands

```bash
# Core
npx create-next-app@latest agentlink --typescript --tailwind --eslint --app --src-dir

# AI / Chat
npm install ai @ai-sdk/openai streamdown
npx ai-elements@latest add conversation message reasoning prompt-input

# UI (shadcn)
npx shadcn@latest init
npx shadcn@latest add button input textarea select switch slider tabs dialog sheet dropdown-menu toast skeleton avatar badge card separator scroll-area tooltip popover

# UI extras
npm install framer-motion sonner cmdk vaul next-themes lucide-react

# State
npm install zustand immer

# Database
npm install @supabase/supabase-js @supabase/ssr dexie dexie-react-hooks idb-keyval

# Auth
npm install @clerk/nextjs svix

# Payments
npm install stripe @stripe/stripe-js

# Rate limiting
npm install @upstash/redis @upstash/ratelimit

# Validation + Utilities
npm install zod date-fns nanoid ky

# PWA
npm install next-pwa

# Dev dependencies
npm install -D vitest @testing-library/react @testing-library/user-event @playwright/test msw fake-indexeddb
npm install -D prettier prettier-plugin-tailwindcss

# Monitoring
npm install @sentry/nextjs posthog-js
```

## Phase 3 Additional Dependencies (React Native)

| Package | Purpose |
|---|---|
| `expo` | React Native framework |
| `react-native-gifted-chat` | Chat UI scaffold |
| `react-native-mmkv` | Secure key-value storage (uses Keychain/Keystore) |
| `react-native-reanimated` | 60fps animations |
| `@powersync/react-native` | SQLite ↔ Postgres sync |
| `@react-native-firebase/messaging` | Push notifications (FCM) |
| `expo-local-authentication` | Biometric auth (Face ID, fingerprint) |
| `expo-speech` | Text-to-speech |
| `@react-native-voice/voice` | Speech-to-text |
| `react-native-markdown-display` | Markdown rendering in RN |
| `react-syntax-highlighter` | Code block highlighting |
