# Security

## Threat Model

| Threat | Risk Level | Mitigation |
|---|---|---|
| API key/token theft from device | Medium | Web Crypto encryption, Keychain (iOS), Keystore (Android) |
| Man-in-the-middle (homelab self-signed certs) | High | HTTPS enforced by default, custom CA cert support, cert pinning option |
| Platform database breach | Low impact | Only metadata stored server-side; credentials encrypted client-side |
| Agent endpoint compromise | User-managed | Out of AgentLink's control; document best practices |
| Conversation interception | Medium | Direct TLS to agent; E2EE for cloud sync |
| XSS via markdown rendering | Medium | Sanitize HTML in Streamdown output; CSP headers |

## Authentication (Clerk)

### Configuration

```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)',  // Webhooks must be public
  '/',                    // Landing page
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});
```

### Social Login Providers
- Google (required — most common on mobile)
- GitHub (required — target audience is developers)
- Apple (required — App Store mandate for iOS apps with social login)
- Passkey/WebAuthn (recommended — passwordless)

### Clerk → Supabase Webhook Sync

```typescript
// src/app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';

export async function POST(request: Request) {
  const payload = await request.json();
  const headers = Object.fromEntries(request.headers);

  // Verify webhook signature via svix
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  const event = wh.verify(JSON.stringify(payload), headers);

  switch (event.type) {
    case 'user.created':
      // Insert user row in Supabase
      await supabase.from('users').insert({
        clerk_id: event.data.id,
        email: event.data.email_addresses[0]?.email_address,
        display_name: `${event.data.first_name} ${event.data.last_name}`.trim(),
      });
      break;
    case 'user.updated':
      // Sync changes
      break;
    case 'user.deleted':
      // Cascade delete (RLS handles child records)
      await supabase.from('users').delete().eq('clerk_id', event.data.id);
      break;
  }

  return new Response('OK', { status: 200 });
}
```

## Agent Credential Storage

### On-Device (Primary) — Web Crypto API

Agent endpoint URLs and auth tokens are encrypted before storage in IndexedDB.

```typescript
// src/lib/crypto/credential-store.ts

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

/** Derive encryption key from Clerk session token */
async function deriveKey(sessionToken: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(sessionToken),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('agentlink-credential-store'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptCredential(
  plaintext: string,
  sessionToken: string
): Promise<{ ciphertext: string; iv: string }> {
  const key = await deriveKey(sessionToken);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptCredential(
  ciphertext: string,
  iv: string,
  sessionToken: string
): Promise<string> {
  const key = await deriveKey(sessionToken);
  const decoder = new TextDecoder();

  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: Uint8Array.from(atob(iv), c => c.charCodeAt(0)),
    },
    key,
    Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
  );

  return decoder.decode(decrypted);
}
```

### Cross-Device Sync Encryption (Pro Feature)

When users enable sync, credentials are encrypted with a **user-chosen passphrase** (separate from account password) before upload to Supabase.

```typescript
// src/lib/crypto/sync-encryption.ts

/** Derive sync key from user passphrase (not session token) */
async function deriveSyncKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 600000,  // Higher iterations for sync (stored remotely)
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
```

**Zero-knowledge guarantee**: The server stores only ciphertext + salt. Even a complete database breach reveals no agent endpoints or tokens. The passphrase never leaves the device.

## TLS Enforcement

### Default Behavior
- HTTPS endpoints: connect normally
- HTTP endpoints: show warning dialog before allowing connection
  - "This connection is not encrypted. Your messages and auth token could be intercepted."
  - "Continue anyway" / "Cancel"
- `localhost` and `192.168.*` / `10.*` / `172.16-31.*` addresses: allow HTTP without warning (local network)

### Custom CA Certificates
Many homelab users use self-signed certificates. Support importing per-agent:

```typescript
// Agent config includes:
interface AgentConfig {
  // ...
  customCaCert?: string;  // PEM-encoded certificate string
}
```

**PWA limitation**: Custom CA certs can't be used with browser `fetch()`. For PWA, users must install the CA cert at the OS level. The app should detect this and provide setup instructions.

**React Native (Phase 3)**: Can use `react-native-ssl-pinning` or custom `fetch` with certificate pinning.

### Certificate Pinning (Advanced Option)
For maximum security, allow pinning a specific certificate fingerprint per agent:

```typescript
interface AgentConfig {
  // ...
  pinnedCertFingerprint?: string;  // SHA-256 fingerprint
}
```

## Content Security

### Markdown XSS Prevention
Streamdown and react-markdown sanitize HTML by default. Ensure:
- No raw HTML passthrough in rendered markdown
- `<script>` tags stripped
- `javascript:` URLs stripped
- `data:` URLs limited to images only

### CSP Headers

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval'",  // needed for some markdown renderers
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https:",
      "connect-src 'self' https: wss:",   // allow connections to any HTTPS agent
      "font-src 'self'",
    ].join('; '),
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];
```

## Rate Limiting

Platform API only (chat traffic goes direct to agents):

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),  // 60 requests per minute
  analytics: true,
});
```

## GDPR Compliance

The client-direct architecture minimizes GDPR scope:

| Data | Location | GDPR Status |
|---|---|---|
| Email, name | Clerk + Supabase | Personal data — standard processing |
| Agent configs (encrypted) | Supabase | Encrypted, not readable by platform |
| Conversation metadata | Supabase | Titles/timestamps — minimal PII |
| Message content | On-device only (default) | NOT processed by platform |
| Stripe billing data | Stripe | Stripe is data processor |

**Data export** (Article 15): Export all Supabase data + on-device data as JSON.
**Right to deletion** (Article 17): Delete Clerk account → webhook cascades to Supabase → on-device data cleared.
**Privacy policy statement**: "AgentLink never sees, stores, or processes your conversations with your agents."
