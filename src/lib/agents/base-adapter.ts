/**
 * Base Agent Adapter Interface
 * 
 * Defines the contract that all agent adapters must implement.
 * Adapters handle protocol-specific differences between LLM providers.
 */

import type { AgentType, MessagePart } from '@/types/index';

/**
 * Parameters for chat completion requests
 */
export interface ChatRequestParams {
  model: string;
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stream: boolean;
}

/**
 * Delta/update from a streaming response
 */
export interface StreamDelta {
  type: 'text' | 'reasoning' | 'tool_call' | 'done' | 'error';
  content?: string;
  toolName?: string;
  toolArgs?: string;
  finishReason?: string;
  error?: string;
}

/**
 * Fully parsed message from a complete response
 */
export interface ParsedMessage {
  role: 'assistant';
  content: string;
  parts: MessagePart[];
  model?: string;
}

/**
 * Agent Adapter Interface
 * 
 * All agent adapters must implement this interface to provide
 * protocol-specific handling for different LLM providers.
 */
export interface AgentAdapter {
  readonly agentType: AgentType;
  
  /**
   * Get the chat completion endpoint path
   */
  getChatEndpoint(baseUrl: string): string;
  
  /**
   * Get the models list endpoint path
   */
  getModelsEndpoint(baseUrl: string): string;
  
  /**
   * Format request headers with authentication
   */
  formatHeaders(authToken?: string, customHeaders?: Record<string, string>): Record<string, string>;
  
  /**
   * Format the request body for chat completions
   */
  formatChatBody(params: ChatRequestParams): object;
  
  /**
   * Parse a streaming chunk (SSE or NDJSON line)
   * Returns null if the chunk should be skipped
   */
  parseStreamChunk(chunk: string): StreamDelta | null;
  
  /**
   * Parse a complete (non-streaming) response
   */
  parseCompleteResponse(response: object): ParsedMessage;
  
  /**
   * Parse the models list response
   */
  parseModelsResponse(response: object): string[];
}
