/**
 * Custom Adapter
 * 
 * Placeholder for custom endpoints that may not conform to
 * standard OpenAI, Ollama, or Anthropic formats.
 * 
 * This adapter extends OpenAI adapter as a baseline but can be
 * customized for specific provider requirements.
 */

import { OpenAIAdapter } from './openai-adapter';
import type { ChatRequestParams, StreamDelta, ParsedMessage } from './base-adapter';
import type { AgentType } from '@/types/index';

/**
 * Configuration for custom adapter behavior
 */
export interface CustomAdapterConfig {
  /** Custom endpoint path for chat completions */
  chatEndpointPath?: string;
  /** Custom endpoint path for models list */
  modelsEndpointPath?: string;
  /** Custom header formatter */
  headerFormatter?: (authToken?: string, customHeaders?: Record<string, string>) => Record<string, string>;
  /** Custom body formatter */
  bodyFormatter?: (params: ChatRequestParams) => object;
  /** Custom stream chunk parser */
  streamParser?: (chunk: string) => StreamDelta | null;
  /** Custom response parser */
  responseParser?: (response: object) => ParsedMessage;
  /** Custom models parser */
  modelsParser?: (response: object) => string[];
}

export class CustomAdapter extends OpenAIAdapter {
  readonly agentType: AgentType = 'custom';
  
  private config: CustomAdapterConfig;

  constructor(config: CustomAdapterConfig = {}) {
    super();
    this.config = config;
  }

  override getChatEndpoint(baseUrl: string): string {
    if (this.config.chatEndpointPath) {
      const normalized = baseUrl.replace(/\/$/, '');
      return `${normalized}${this.config.chatEndpointPath}`;
    }
    return super.getChatEndpoint(baseUrl);
  }

  override getModelsEndpoint(baseUrl: string): string {
    if (this.config.modelsEndpointPath) {
      const normalized = baseUrl.replace(/\/$/, '');
      return `${normalized}${this.config.modelsEndpointPath}`;
    }
    return super.getModelsEndpoint(baseUrl);
  }

  override formatHeaders(authToken?: string, customHeaders?: Record<string, string>): Record<string, string> {
    if (this.config.headerFormatter) {
      return this.config.headerFormatter(authToken, customHeaders);
    }
    return super.formatHeaders(authToken, customHeaders);
  }

  override formatChatBody(params: ChatRequestParams): object {
    if (this.config.bodyFormatter) {
      return this.config.bodyFormatter(params);
    }
    return super.formatChatBody(params);
  }

  override parseStreamChunk(chunk: string): StreamDelta | null {
    if (this.config.streamParser) {
      return this.config.streamParser(chunk);
    }
    return super.parseStreamChunk(chunk);
  }

  override parseCompleteResponse(response: object): ParsedMessage {
    if (this.config.responseParser) {
      return this.config.responseParser(response);
    }
    return super.parseCompleteResponse(response);
  }

  override parseModelsResponse(response: object): string[] {
    if (this.config.modelsParser) {
      return this.config.modelsParser(response);
    }
    return super.parseModelsResponse(response);
  }

  /**
   * Update the adapter configuration
   */
  updateConfig(config: Partial<CustomAdapterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): CustomAdapterConfig {
    return { ...this.config };
  }
}

// Export singleton instance with default config
export const customAdapter = new CustomAdapter();
