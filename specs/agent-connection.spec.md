# Spec: Agent Connection & Onboarding

## Overview

The agent onboarding flow is the single most important UX in the app. It should feel as simple as adding a Wi-Fi network.

## User Flow

```
[+ Add Agent] button
    ↓
Step 1: Select Agent Type
    ↓
Step 2: Enter Connection Details
    ↓
Step 3: Test Connection (required)
    ↓
Step 4: Name & Customize
    ↓
[Save Agent] → Navigate to chat
```

## Step 1: Agent Type Selection

Radio button list with icons:

```typescript
const AGENT_TYPES = [
  {
    value: 'openai_compatible',
    label: 'OpenClaw / NanoClaw',
    description: 'OpenAI-compatible API endpoint',
    icon: 'Claw',  // custom icon or generic
    defaultEndpointHint: 'https://your-server.com/v1',
    defaultAuthHint: 'Bearer token from your agent dashboard',
  },
  {
    value: 'ollama',
    label: 'Ollama',
    description: 'Local or remote Ollama instance',
    icon: 'Ollama',
    defaultEndpointHint: 'http://localhost:11434',
    defaultAuthHint: 'Usually not required for local',
  },
  {
    value: 'openai_compatible',
    label: 'vLLM / llama.cpp / LocalAI',
    description: 'OpenAI-compatible self-hosted server',
    icon: 'Server',
    defaultEndpointHint: 'https://your-server.com/v1',
    defaultAuthHint: 'Bearer token (if configured)',
  },
  {
    value: 'openai_compatible',
    label: 'Commercial Provider',
    description: 'OpenAI, Google, Groq, etc.',
    icon: 'Cloud',
    defaultEndpointHint: 'https://api.openai.com/v1',
    defaultAuthHint: 'API key from provider dashboard',
  },
  {
    value: 'anthropic_compatible',
    label: 'Anthropic-Compatible',
    description: 'Claude API or compatible proxy',
    icon: 'Anthropic',
    defaultEndpointHint: 'https://api.anthropic.com',
    defaultAuthHint: 'API key (x-api-key header)',
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Any HTTP endpoint with configurable format',
    icon: 'Settings',
    defaultEndpointHint: 'https://your-endpoint.com/api',
    defaultAuthHint: 'Configure as needed',
  },
];
```

## Step 2: Connection Details

Fields (pre-filled based on Step 1 selection):

```
┌─────────────────────────────────────┐
│ Endpoint URL *                      │
│ ┌─────────────────────────────────┐ │
│ │ https://my-agent.duckdns.org/v1 │ │  ← placeholder from type preset
│ └─────────────────────────────────┘ │
│ The base URL of your agent's API    │
│                                     │
│ Auth Token                          │
│ ┌─────────────────────────────────┐ │
│ │ ••••••••••••••••                │ │  ← password input
│ └─────────────────────────────────┘ │
│ Bearer token or API key (optional)  │
│                                     │
│ ⚠️ HTTP Warning (if applicable)     │
│ This endpoint uses HTTP, not HTTPS. │
│ Your data may be visible on the     │
│ network. [Continue anyway]          │
└─────────────────────────────────────┘
```

Validation:
- URL must be valid (starts with http:// or https://)
- If HTTP and not localhost/private IP: show warning
- Auth token: no validation (optional, varies by agent)

## Step 3: Test Connection

```
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │  🔍 Test Connection             │ │  ← Primary button
│ └─────────────────────────────────┘ │
│                                     │
│ Testing...  ████░░░░░░ (2.3s)       │  ← Progress bar + timer
│                                     │
│ --- SUCCESS STATE ---                │
│                                     │
│ ✅ Connection successful!           │
│                                     │
│ Model:        deepseek-r1:70b       │
│ Latency:      142ms                 │
│ Streaming:    ✓ Supported           │
│ Capabilities:                       │
│   ✓ Text generation                 │
│   ✓ Reasoning/thinking              │
│   ✗ Vision                          │
│   ✗ Tool use                        │
│                                     │
│ Available Models:                   │
│   ● deepseek-r1:70b (default)       │
│   ○ llama3:8b                       │
│   ○ mistral:7b                      │
│                                     │
│ --- FAILURE STATE ---                │
│                                     │
│ ❌ Connection failed                │
│                                     │
│ Error: Connection timed out after   │
│ 10 seconds.                         │
│                                     │
│ Troubleshooting:                    │
│ • Check that your agent is running  │
│ • Verify the endpoint URL           │
│ • Check your auth token             │
│ • Ensure your agent is reachable    │
│   from the internet                 │
│                                     │
│ [🔍 Retry]  [Edit Connection]       │
└─────────────────────────────────────┘
```

### Test Connection Implementation

```typescript
// src/lib/agents/connection-tester.ts

interface TestConnectionParams {
  endpointUrl: string;
  authToken?: string;
  agentType: AgentType;
}

interface TestConnectionResult {
  success: boolean;
  agentType: AgentType;
  modelName?: string;
  availableModels?: string[];
  latencyMs: number;
  capabilities: {
    streaming: boolean;
    vision: boolean;
    tools: boolean;
    reasoning: boolean;
  };
  error?: string;
  troubleshooting?: string[];
}

export async function testConnection(params: TestConnectionParams): Promise<TestConnectionResult> {
  const startTime = performance.now();
  const adapter = getAdapter({ agentType: params.agentType } as Agent);

  try {
    // Step 1: Check reachability with HEAD request
    const healthResponse = await fetch(params.endpointUrl, {
      method: 'HEAD',
      headers: adapter.formatHeaders(params.authToken),
      signal: AbortSignal.timeout(10000),
    });

    // Step 2: Try to list models
    let availableModels: string[] = [];
    try {
      const modelsUrl = adapter.getModelsEndpoint(params.endpointUrl);
      const modelsResponse = await fetch(modelsUrl, {
        headers: adapter.formatHeaders(params.authToken),
        signal: AbortSignal.timeout(5000),
      });
      if (modelsResponse.ok) {
        const data = await modelsResponse.json();
        availableModels = adapter.parseModelsResponse(data);
      }
    } catch {
      // Models endpoint not available — not a failure
    }

    // Step 3: Send test chat message
    const chatUrl = adapter.getChatEndpoint(params.endpointUrl);
    const chatBody = adapter.formatChatBody({
      model: availableModels[0] || 'default',
      messages: [{ role: 'user', content: 'Hi' }],
      systemPrompt: undefined,
      temperature: 0.7,
      maxTokens: 5,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      stream: false,  // Non-streaming for test
    });

    const chatResponse = await fetch(chatUrl, {
      method: 'POST',
      headers: adapter.formatHeaders(params.authToken),
      body: JSON.stringify(chatBody),
      signal: AbortSignal.timeout(15000),
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (!chatResponse.ok) {
      return {
        success: false,
        agentType: params.agentType,
        latencyMs,
        capabilities: { streaming: false, vision: false, tools: false, reasoning: false },
        error: `Agent returned ${chatResponse.status}: ${chatResponse.statusText}`,
        troubleshooting: getTroubleshooting(chatResponse.status),
      };
    }

    const responseData = await chatResponse.json();
    const parsed = adapter.parseCompleteResponse(responseData);

    return {
      success: true,
      agentType: params.agentType,
      modelName: availableModels[0] || parsed.model || 'Unknown',
      availableModels,
      latencyMs,
      capabilities: {
        streaming: true,  // Assume streaming if chat works
        vision: false,     // Can't detect from test
        tools: false,
        reasoning: parsed.parts.some(p => p.type === 'reasoning'),
      },
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      agentType: params.agentType,
      latencyMs,
      capabilities: { streaming: false, vision: false, tools: false, reasoning: false },
      error: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: [
        'Check that your agent is running',
        'Verify the endpoint URL is correct',
        'Ensure your agent is reachable from this device',
        'Check if a VPN or firewall is blocking the connection',
      ],
    };
  }
}
```

## Step 4: Name & Customize

```
┌─────────────────────────────────────┐
│ Display Name *                      │
│ ┌─────────────────────────────────┐ │
│ │ My HomeLab GPT                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Avatar                              │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐    │
│ │ 🤖│ │ 🧠│ │ 💻│ │ 🔬│ │ 📝│    │  ← Preset avatars
│ └───┘ └───┘ └───┘ └───┘ └───┘    │
│ [Upload custom]                     │
│                                     │
│ Accent Color                        │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐    │
│ │ 🔵│ │ 🟢│ │ 🟣│ │ 🟠│ │ 🔴│    │  ← Color swatches
│ └───┘ └───┘ └───┘ └───┘ └───┘    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  💾 Save Agent                  │ │  ← Primary button
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## State Management

The onboarding flow uses local React state (useState or useReducer), NOT Zustand. Only persist to agentStore on final save.

```typescript
interface OnboardingState {
  step: 1 | 2 | 3 | 4;
  agentType: AgentType | null;
  endpointUrl: string;
  authToken: string;
  displayName: string;
  avatarUrl: string;
  accentColor: string;
  testResult: TestConnectionResult | null;
  selectedModel: string | null;
}
```

## Feature Gate

Free plan: max 2 agents. If user has 2 agents, the [+ Add Agent] button should show the UpgradePrompt instead of the onboarding flow.

## QR Code Import (Phase 2+)

Future feature: generate QR codes on agent servers that encode connection details. Scan with phone camera to auto-fill Steps 1-2. Format:

```
agentlink://connect?type=openai_compatible&url=https://...&token=...&name=My+Agent
```
