import { describe, it, expect, beforeAll } from 'vitest';
import { 
  openAIAdapter, 
  ollamaAdapter, 
  anthropicAdapter, 
  customAdapter,
  getAdapter,
  hasAdapter,
  getAvailableAdapterTypes,
  getAdapterMetadata,
} from './index';
import type { ChatRequestParams, StreamDelta } from './base-adapter';
import type { AgentType } from '@/types/index';

// Mock crypto for tests
beforeAll(() => {
  if (typeof crypto === 'undefined') {
    Object.defineProperty(global, 'crypto', {
      value: {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        },
        subtle: {
          generateKey: () => Promise.resolve({} as CryptoKey),
          importKey: () => Promise.resolve({} as CryptoKey),
          deriveKey: () => Promise.resolve({} as CryptoKey),
          encrypt: () => Promise.resolve(new ArrayBuffer(16)),
          decrypt: () => Promise.resolve(new ArrayBuffer(16)),
          exportKey: () => Promise.resolve(new ArrayBuffer(16)),
        },
      },
      writable: true,
    });
  }
});

describe('Adapter Factory', () => {
  it('should return correct adapter for each agent type', () => {
    expect(getAdapter('openai_compatible')).toBe(openAIAdapter);
    expect(getAdapter('ollama')).toBe(ollamaAdapter);
    expect(getAdapter('anthropic_compatible')).toBe(anthropicAdapter);
    expect(getAdapter('custom')).toBe(customAdapter);
  });

  it('should throw error for unsupported agent type', () => {
    expect(() => getAdapter('unknown' as AgentType)).toThrow('Unsupported agent type');
  });

  it('should correctly check if adapter exists', () => {
    expect(hasAdapter('openai_compatible')).toBe(true);
    expect(hasAdapter('ollama')).toBe(true);
    expect(hasAdapter('anthropic_compatible')).toBe(true);
    expect(hasAdapter('custom')).toBe(true);
    expect(hasAdapter('unknown')).toBe(false);
  });

  it('should return all available adapter types', () => {
    const types = getAvailableAdapterTypes();
    expect(types).toContain('openai_compatible');
    expect(types).toContain('ollama');
    expect(types).toContain('anthropic_compatible');
    expect(types).toContain('custom');
    expect(types).toHaveLength(4);
  });

  it('should return adapter metadata', () => {
    const metadata = getAdapterMetadata();
    expect(metadata).toHaveLength(4);
    
    const openaiMeta = metadata.find(m => m.type === 'openai_compatible');
    expect(openaiMeta).toBeDefined();
    expect(openaiMeta?.name).toBe('OpenAI Compatible');
    expect(openaiMeta?.docsUrl).toBeDefined();
  });
});

describe('OpenAI Adapter', () => {
  const adapter = openAIAdapter;

  it('should have correct agent type', () => {
    expect(adapter.agentType).toBe('openai_compatible');
  });

  it('should generate correct chat endpoint', () => {
    expect(adapter.getChatEndpoint('https://api.openai.com')).toBe('https://api.openai.com/v1/chat/completions');
    expect(adapter.getChatEndpoint('https://api.openai.com/')).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('should generate correct models endpoint', () => {
    expect(adapter.getModelsEndpoint('https://api.openai.com')).toBe('https://api.openai.com/v1/models');
  });

  it('should format headers correctly', () => {
    const headers = adapter.formatHeaders('test-token');
    expect(headers['Authorization']).toBe('Bearer test-token');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('should format headers without auth token', () => {
    const headers = adapter.formatHeaders();
    expect(headers['Authorization']).toBeUndefined();
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('should format chat body correctly', () => {
    const params: ChatRequestParams = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
      systemPrompt: 'You are helpful',
      temperature: 0.7,
      maxTokens: 100,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      stream: true,
    };

    const body = adapter.formatChatBody(params) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
      temperature: number;
      stream: boolean;
    };

    expect(body.model).toBe('gpt-4');
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toBe('You are helpful');
    expect(body.messages[1].role).toBe('user');
    expect(body.temperature).toBe(0.7);
    expect(body.stream).toBe(true);
  });

  it('should parse stream chunk with content', () => {
    const chunk = 'data: {"choices":[{"delta":{"content":"Hello"}}]}';
    const delta = adapter.parseStreamChunk(chunk);
    expect(delta).toEqual({ type: 'text', content: 'Hello' });
  });

  it('should parse stream chunk with reasoning_content', () => {
    const chunk = 'data: {"choices":[{"delta":{"reasoning_content":"Let me think"}}]}';
    const delta = adapter.parseStreamChunk(chunk);
    expect(delta).toEqual({ type: 'reasoning', content: 'Let me think' });
  });

  it('should parse stream chunk with tool calls', () => {
    const chunk = 'data: {"choices":[{"delta":{"tool_calls":[{"function":{"name":"search","arguments":"{\\"q\\":\\"test\\"}"}}]}}]}';
    const delta = adapter.parseStreamChunk(chunk);
    expect(delta?.type).toBe('tool_call');
    expect(delta?.toolName).toBe('search');
  });

  it('should parse stream end', () => {
    const chunk = 'data: [DONE]';
    const delta = adapter.parseStreamChunk(chunk);
    expect(delta).toEqual({ type: 'done' });
  });

  it('should parse finish reason', () => {
    const chunk = 'data: {"choices":[{"finish_reason":"stop"}]}';
    const delta = adapter.parseStreamChunk(chunk);
    expect(delta).toEqual({ type: 'done', finishReason: 'stop' });
  });

  it('should return null for non-data chunks', () => {
    const chunk = 'event: message';
    const delta = adapter.parseStreamChunk(chunk);
    expect(delta).toBeNull();
  });

  it('should parse complete response', () => {
    const response = {
      choices: [{
        message: {
          content: 'Hello world',
          reasoning_content: 'Let me think',
        },
      }],
      model: 'gpt-4',
    };

    const parsed = adapter.parseCompleteResponse(response);
    expect(parsed.role).toBe('assistant');
    expect(parsed.content).toContain('Hello world');
    expect(parsed.content).toContain('Let me think');
    expect(parsed.parts).toHaveLength(2);
    expect(parsed.parts[0].type).toBe('reasoning');
    expect(parsed.parts[1].type).toBe('text');
    expect(parsed.model).toBe('gpt-4');
  });

  it('should parse models response', () => {
    const response = {
      data: [{ id: 'gpt-4' }, { id: 'gpt-3.5-turbo' }],
    };

    const models = adapter.parseModelsResponse(response);
    expect(models).toEqual(['gpt-4', 'gpt-3.5-turbo']);
  });

  it('should handle empty models response', () => {
    const response = { data: [] };
    const models = adapter.parseModelsResponse(response);
    expect(models).toEqual([]);
  });
});

describe('Ollama Adapter', () => {
  const adapter = ollamaAdapter;

  it('should have correct agent type', () => {
    expect(adapter.agentType).toBe('ollama');
  });

  it('should generate correct chat endpoint', () => {
    expect(adapter.getChatEndpoint('http://localhost:11434')).toBe('http://localhost:11434/api/chat');
  });

  it('should generate correct models endpoint', () => {
    expect(adapter.getModelsEndpoint('http://localhost:11434')).toBe('http://localhost:11434/api/tags');
  });

  it('should format headers with basic auth', () => {
    const headers = adapter.formatHeaders('username:password');
    expect(headers['Authorization']).toBe('Basic ' + btoa('username:password'));
    expect(headers['Accept']).toBe('application/x-ndjson');
  });

  it('should format chat body correctly', () => {
    const params: ChatRequestParams = {
      model: 'llama2',
      messages: [{ role: 'user', content: 'Hello' }],
      systemPrompt: 'You are helpful',
      temperature: 0.7,
      maxTokens: 100,
      topP: 0.9,
      frequencyPenalty: 0.5,
      presencePenalty: 0.5,
      stream: true,
    };

    const body = adapter.formatChatBody(params) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
      stream: boolean;
      options: { temperature: number; num_predict: number; top_p: number };
    };

    expect(body.model).toBe('llama2');
    expect(body.messages).toHaveLength(2);
    expect(body.options.temperature).toBe(0.7);
    expect(body.options.num_predict).toBe(100);
    expect(body.options.top_p).toBe(0.9);
  });

  it('should parse NDJSON stream chunk', () => {
    const chunk = '{"model":"llama2","message":{"role":"assistant","content":"Hello"},"done":false}';
    const delta = adapter.parseStreamChunk(chunk);
    expect(delta).toEqual({ type: 'text', content: 'Hello' });
  });

  it('should parse stream done', () => {
    const chunk = '{"done":true}';
    const delta = adapter.parseStreamChunk(chunk);
    expect(delta).toEqual({ type: 'done', finishReason: 'stop' });
  });

  it('should parse complete response', () => {
    const response = {
      message: {
        role: 'assistant',
        content: 'Hello world',
      },
      model: 'llama2',
    };

    const parsed = adapter.parseCompleteResponse(response);
    expect(parsed.role).toBe('assistant');
    expect(parsed.content).toBe('Hello world');
    expect(parsed.parts).toHaveLength(1);
    expect(parsed.parts[0].type).toBe('text');
  });

  it('should parse models response', () => {
    const response = {
      models: [
        { name: 'llama2', model: 'llama2:latest' },
        { name: 'mistral' },
      ],
    };

    const models = adapter.parseModelsResponse(response);
    expect(models).toEqual(['llama2', 'mistral']);
  });
});

describe('Anthropic Adapter', () => {
  const adapter = anthropicAdapter;

  it('should have correct agent type', () => {
    expect(adapter.agentType).toBe('anthropic_compatible');
  });

  it('should generate correct chat endpoint', () => {
    expect(adapter.getChatEndpoint('https://api.anthropic.com')).toBe('https://api.anthropic.com/v1/messages');
  });

  it('should format headers correctly', () => {
    const headers = adapter.formatHeaders('test-api-key');
    expect(headers['x-api-key']).toBe('test-api-key');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    expect(headers['Authorization']).toBeUndefined();
  });

  it('should format chat body with system prompt', () => {
    const params: ChatRequestParams = {
      model: 'claude-3-opus',
      messages: [{ role: 'user', content: 'Hello' }],
      systemPrompt: 'You are helpful',
      temperature: 0.7,
      maxTokens: 100,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      stream: true,
    };

    const body = adapter.formatChatBody(params) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
      system: string;
      max_tokens: number;
      stream: boolean;
    };

    expect(body.model).toBe('claude-3-opus');
    expect(body.system).toBe('You are helpful');
    expect(body.max_tokens).toBe(100);
    expect(body.messages[0].role).toBe('user');
  });

  it('should parse content_block_delta event', () => {
    const chunk = 'event: content_block_delta\ndata: {"delta":{"type":"text_delta","text":"Hello"}}';
    const delta = adapter.parseStreamChunk(chunk);
    expect(delta).toEqual({ type: 'text', content: 'Hello' });
  });

  it('should parse message_stop event', () => {
    const chunk = 'event: message_stop\ndata: {}';
    const delta = adapter.parseStreamChunk(chunk);
    expect(delta).toEqual({ type: 'done' });
  });

  it('should parse complete response with thinking', () => {
    const response = {
      content: [
        { type: 'thinking', thinking: 'Let me analyze' },
        { type: 'text', text: 'Here is the answer' },
      ],
      model: 'claude-3-opus',
    };

    const parsed = adapter.parseCompleteResponse(response);
    expect(parsed.role).toBe('assistant');
    expect(parsed.content).toBe('Let me analyzeHere is the answer');
    expect(parsed.parts).toHaveLength(2);
    expect(parsed.parts[0].type).toBe('reasoning');
    expect(parsed.parts[1].type).toBe('text');
  });

  it('should parse models response', () => {
    const response = {
      data: [{ id: 'claude-3-opus' }, { id: 'claude-3-sonnet' }],
    };

    const models = adapter.parseModelsResponse(response);
    expect(models).toEqual(['claude-3-opus', 'claude-3-sonnet']);
  });
});

describe('Custom Adapter', () => {
  it('should extend OpenAI adapter by default', () => {
    const chatEndpoint = customAdapter.getChatEndpoint('https://api.example.com');
    expect(chatEndpoint).toBe('https://api.example.com/v1/chat/completions');
  });

  it('should allow custom endpoint paths', () => {
    customAdapter.updateConfig({ chatEndpointPath: '/custom/chat' });
    const chatEndpoint = customAdapter.getChatEndpoint('https://api.example.com');
    expect(chatEndpoint).toBe('https://api.example.com/custom/chat');
    
    // Reset for other tests
    customAdapter.updateConfig({ chatEndpointPath: undefined });
  });

  it('should allow custom body formatter', () => {
    customAdapter.updateConfig({
      bodyFormatter: (params) => ({
        custom_model: params.model,
        input: params.messages.map(m => m.content).join(' '),
      }),
    });

    const params: ChatRequestParams = {
      model: 'custom-model',
      messages: [{ role: 'user', content: 'Hello' }],
      temperature: 0.5,
      maxTokens: 100,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      stream: false,
    };

    const body = customAdapter.formatChatBody(params) as { custom_model: string; input: string };
    expect(body.custom_model).toBe('custom-model');
    expect(body.input).toBe('Hello');
    
    // Reset for other tests
    customAdapter.updateConfig({ bodyFormatter: undefined });
  });

  it('should allow custom stream parser', () => {
    customAdapter.updateConfig({
      streamParser: (chunk) => {
        if (chunk.includes('CUSTOM:')) {
          return { type: 'text', content: chunk.replace('CUSTOM:', '').trim() };
        }
        return null;
      },
    });

    const delta = customAdapter.parseStreamChunk('CUSTOM: Hello world');
    expect(delta).toEqual({ type: 'text', content: 'Hello world' });
    
    // Reset for other tests
    customAdapter.updateConfig({ streamParser: undefined });
  });

  it('should get and update config', () => {
    const initialConfig = customAdapter.getConfig();
    expect(initialConfig.chatEndpointPath).toBeUndefined();

    customAdapter.updateConfig({ chatEndpointPath: '/test' });
    const updatedConfig = customAdapter.getConfig();
    expect(updatedConfig.chatEndpointPath).toBe('/test');
    
    // Reset
    customAdapter.updateConfig({ chatEndpointPath: undefined });
  });
});

describe('Stream Delta Types', () => {
  it('should handle all delta types', () => {
    const textDelta: StreamDelta = { type: 'text', content: 'Hello' };
    expect(textDelta.type).toBe('text');

    const reasoningDelta: StreamDelta = { type: 'reasoning', content: 'Thinking...' };
    expect(reasoningDelta.type).toBe('reasoning');

    const toolDelta: StreamDelta = { type: 'tool_call', toolName: 'search', toolArgs: '{}' };
    expect(toolDelta.type).toBe('tool_call');

    const doneDelta: StreamDelta = { type: 'done', finishReason: 'stop' };
    expect(doneDelta.type).toBe('done');

    const errorDelta: StreamDelta = { type: 'error', error: 'Something went wrong' };
    expect(errorDelta.type).toBe('error');
  });
});
