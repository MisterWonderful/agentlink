import { describe, it, expect } from 'vitest';
import {
  AgentTypeSchema,
  AgentCapabilitiesSchema,
  AgentSchema,
  AgentInputSchema,
  AgentUpdateSchema,
  type Agent,
  type AgentType,
  type AgentCapabilities,
} from './agent.schema';

describe('AgentTypeSchema', () => {
  it('should validate valid agent types', () => {
    const validTypes: AgentType[] = [
      'openai_compatible',
      'ollama',
      'anthropic_compatible',
      'custom',
    ];

    for (const type of validTypes) {
      const result = AgentTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid agent types', () => {
    const invalidTypes = ['invalid', 'openai', 'anthropic', ''];

    for (const type of invalidTypes) {
      const result = AgentTypeSchema.safeParse(type);
      expect(result.success).toBe(false);
    }
  });
});

describe('AgentCapabilitiesSchema', () => {
  it('should validate with all fields provided', () => {
    const capabilities: AgentCapabilities = {
      vision: true,
      tools: true,
      reasoning: true,
      fileUpload: true,
      codeExecution: true,
    };

    const result = AgentCapabilitiesSchema.safeParse(capabilities);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(capabilities);
    }
  });

  it('should apply catch values for invalid fields', () => {
    const result = AgentCapabilitiesSchema.safeParse({
      vision: 'invalid',
      tools: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vision).toBe(false);
      expect(result.data.tools).toBe(false);
    }
  });

  it('should validate partial capabilities', () => {
    const result = AgentCapabilitiesSchema.safeParse({ vision: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vision).toBe(true);
      expect(result.data.tools).toBe(false);
    }
  });
});

describe('AgentSchema', () => {
  const validAgent: Agent = {
    id: 'agent-1',
    name: 'Test Agent',
    agentType: 'openai_compatible',
    endpointUrl: 'https://api.example.com/v1',
    capabilities: {
      vision: true,
      tools: false,
      reasoning: false,
      fileUpload: false,
      codeExecution: false,
    },
    accentColor: '#3b82f6',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 4096,
    contextLength: 8192,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    customHeaders: {},
    requestTimeoutMs: 30000,
    maxRetries: 3,
    isActive: true,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should validate a complete valid agent', () => {
    const result = AgentSchema.safeParse(validAgent);
    expect(result.success).toBe(true);
  });

  it('should validate with serverId', () => {
    const agentWithServerId = {
      ...validAgent,
      serverId: 'server-agent-1',
    };

    const result = AgentSchema.safeParse(agentWithServerId);
    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
    const invalidAgent = {
      ...validAgent,
      name: '',
    };

    const result = AgentSchema.safeParse(invalidAgent);
    expect(result.success).toBe(false);
  });

  it('should reject name longer than 100 characters', () => {
    const invalidAgent = {
      ...validAgent,
      name: 'a'.repeat(101),
    };

    const result = AgentSchema.safeParse(invalidAgent);
    expect(result.success).toBe(false);
  });

  it('should reject invalid URL', () => {
    const invalidAgent = {
      ...validAgent,
      endpointUrl: 'not-a-url',
    };

    const result = AgentSchema.safeParse(invalidAgent);
    expect(result.success).toBe(false);
  });

  it('should reject temperature out of range', () => {
    const invalidAgent1 = {
      ...validAgent,
      temperature: -0.1,
    };
    const invalidAgent2 = {
      ...validAgent,
      temperature: 2.1,
    };

    expect(AgentSchema.safeParse(invalidAgent1).success).toBe(false);
    expect(AgentSchema.safeParse(invalidAgent2).success).toBe(false);
  });

  it('should reject invalid temperature type', () => {
    const agentWithInvalidTemp = {
      ...validAgent,
      temperature: 'hot',
    };

    const result = AgentSchema.safeParse(agentWithInvalidTemp);
    expect(result.success).toBe(false);
  });

  it('should reject negative maxTokens', () => {
    const invalidAgent = {
      ...validAgent,
      maxTokens: -100,
    };

    const result = AgentSchema.safeParse(invalidAgent);
    expect(result.success).toBe(false);
  });

  it('should reject maxRetries out of range', () => {
    const invalidAgent1 = {
      ...validAgent,
      maxRetries: -1,
    };
    const invalidAgent2 = {
      ...validAgent,
      maxRetries: 11,
    };

    expect(AgentSchema.safeParse(invalidAgent1).success).toBe(false);
    expect(AgentSchema.safeParse(invalidAgent2).success).toBe(false);
  });

  it('should validate optional datetime fields', () => {
    const agentWithDates = {
      ...validAgent,
      lastSeenAt: new Date().toISOString(),
    };

    const result = AgentSchema.safeParse(agentWithDates);
    expect(result.success).toBe(true);
  });

  it('should validate with optional fields', () => {
    const agentWithOptionals = {
      ...validAgent,
      avatarUrl: 'https://example.com/avatar.png',
      authToken: 'secret-token',
      defaultModel: 'gpt-4',
      lastSeenAt: new Date().toISOString(),
      avgLatencyMs: 150,
      customCaCert: '-----BEGIN CERTIFICATE-----',
    };

    const result = AgentSchema.safeParse(agentWithOptionals);
    expect(result.success).toBe(true);
  });
});

describe('AgentInputSchema', () => {
  it('should validate without auto-generated fields', () => {
    const input = {
      name: 'New Agent',
      agentType: 'openai_compatible' as const,
      endpointUrl: 'https://api.example.com',
      capabilities: {
        vision: true,
        tools: false,
        reasoning: false,
        fileUpload: false,
        codeExecution: false,
      },
      temperature: 0.7,
      maxTokens: 4096,
      contextLength: 8192,
      maxRetries: 3,
    };

    const result = AgentInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject if id is provided', () => {
    const inputWithId = {
      id: 'should-not-be-here',
      name: 'New Agent',
      agentType: 'openai_compatible' as const,
      endpointUrl: 'https://api.example.com',
      capabilities: {},
    };

    const result = AgentInputSchema.safeParse(inputWithId);
    expect(result.success).toBe(false);
  });
});

describe('AgentUpdateSchema', () => {
  it('should validate with only id', () => {
    const update = { id: 'agent-1' };

    const result = AgentUpdateSchema.safeParse(update);
    expect(result.success).toBe(true);
  });

  it('should validate with partial fields', () => {
    const update = {
      id: 'agent-1',
      name: 'Updated Name',
    };

    const result = AgentUpdateSchema.safeParse(update);
    expect(result.success).toBe(true);
  });

  it('should reject without id', () => {
    const update = { name: 'Updated Name' };

    const result = AgentUpdateSchema.safeParse(update);
    expect(result.success).toBe(false);
  });
});
