# Spec: Connection Tunnel Relay (Premium Feature — Phase 3)

## Overview

Many homelab users run agents behind NAT with no public IP. The tunnel relay solves "I can't reach my homelab agent from my phone" by establishing an outbound WebSocket from the user's network to AgentLink's edge, then routing mobile traffic through it.

This is a Pro/Team feature and a key monetization differentiator.

## Architecture

```
┌──────────────┐    Direct TLS     ┌────────────────┐
│ Mobile Client │ ──(when possible)──> │  Agent (public) │
└──────────────┘                    └────────────────┘

┌──────────────┐    WebSocket      ┌───────────────┐    WebSocket    ┌───────────────┐
│ Mobile Client │ ───────────────> │  CF Worker +   │ <───────────── │ Relay Agent   │
│              │   (encrypted)     │  Durable Object│   (outbound)   │ (user's LAN)  │
└──────────────┘                   └───────────────┘                └───────┬───────┘
                                                                           │ HTTP
                                                                    ┌──────▼───────┐
                                                                    │ Agent Server  │
                                                                    │ (homelab)     │
                                                                    └──────────────┘
```

**Key**: The relay agent makes an OUTBOUND connection to CloudFlare. No port forwarding needed on the user's router.

## Components

### 1. Relay Agent (User-Installed Binary)

Lightweight single binary that runs alongside the user's LLM agent. Written in Go or Rust for easy cross-compilation.

```
relay-agent
├── Establishes outbound WebSocket to CF Worker
├── Receives proxied requests from mobile client
├── Forwards to local agent HTTP endpoint
├── Returns responses through WebSocket
└── Handles reconnection with exponential backoff
```

Configuration:
```yaml
# relay-agent.yaml
relay_server: wss://relay.agentlink.app
relay_token: <user's relay token from AgentLink dashboard>
local_agent_url: http://localhost:11434  # Ollama, vLLM, etc.
```

### 2. Cloudflare Worker + Durable Object

Handles WebSocket connection management and request routing.

```typescript
// Durable Object per relay connection
class RelayConnection {
  private agentSocket: WebSocket | null = null;
  private clientSockets: Map<string, WebSocket> = new Map();

  // Relay agent connects here (outbound from user's LAN)
  async handleAgentConnection(ws: WebSocket, relayToken: string) {
    // Validate relay token
    // Store WebSocket reference
    this.agentSocket = ws;
  }

  // Mobile client connects here to send chat requests
  async handleClientRequest(request: Request) {
    if (!this.agentSocket) {
      return new Response('Agent offline', { status: 503 });
    }

    // Forward request to agent via WebSocket
    // Wait for response
    // Return to client
  }
}
```

### 3. Mobile Client Integration

The client detects whether to use direct connection or tunnel:

```typescript
function getConnectionUrl(agent: Agent): string {
  if (agent.tunnelEnabled && agent.tunnelId) {
    // Route through relay
    return `https://relay.agentlink.app/tunnel/${agent.tunnelId}/v1/chat/completions`;
  }
  // Direct connection
  return agent.endpointUrl;
}
```

## End-to-End Encryption

Chat content passes through the relay but is **end-to-end encrypted**:

1. Client generates ephemeral key pair on connection
2. Relay agent has the matching key (exchanged during setup)
3. All chat content encrypted before entering WebSocket
4. CloudFlare Workers see only ciphertext
5. Relay agent decrypts, forwards to local agent as plaintext HTTP

Protocol: NaCl box (X25519 + XSalsa20-Poly1305) for message encryption.

## Setup Flow

```
1. User clicks "Enable Tunnel" in agent config (Pro feature gate)
2. AgentLink generates a relay token and tunnel ID
3. User shown instructions:
   a. Download relay-agent binary for their OS
   b. Copy configuration (relay token + local agent URL)
   c. Run relay-agent (systemd service recommended)
4. Relay agent connects to CF Worker
5. AgentLink detects connection → agent status shows "Online (via tunnel)"
6. Mobile client automatically routes through tunnel
```

## Cost Model

- Cloudflare Workers: ~$0.50/million requests
- Durable Objects: ~$0.15/million requests + $0.15/GB-month storage
- Per heavy user: ~100K relay requests/month = ~$0.07/user/month
- At 1,000 tunnel users: ~$70/month infrastructure cost

Revenue per tunnel user: $9.99/month (Pro) = **~140x margin**.

## Feature Gating

| Plan | Tunnel Connections |
|---|---|
| Free | 0 |
| Pro | 1 |
| Team | Unlimited |

## Phase 3 Implementation Priority

This is the signature premium feature. Build after native mobile apps are working. The direct connection path (Phase 1-2) works without any tunnel infrastructure.

Implementation order:
1. CF Worker + Durable Object relay infrastructure
2. Relay agent binary (Go, cross-compiled for Linux/macOS/Windows/ARM)
3. Mobile client tunnel routing
4. E2EE layer
5. Dashboard: tunnel status, bandwidth usage, connection logs
