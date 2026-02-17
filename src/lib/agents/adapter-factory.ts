/**
 * Agent Adapter Factory
 * 
 * Factory function to get the appropriate adapter for a given agent type.
 */

import type { AgentType } from '@/types/index';
import type { AgentAdapter } from './base-adapter';
import { openAIAdapter } from './openai-adapter';
import { ollamaAdapter } from './ollama-adapter';
import { anthropicAdapter } from './anthropic-adapter';
import { customAdapter } from './custom-adapter';

/**
 * Get the appropriate adapter for the given agent type
 * 
 * @param agentType - The type of agent (openai_compatible, ollama, anthropic_compatible, custom)
 * @returns The adapter instance for the specified agent type
 * @throws Error if the agent type is not supported
 */
export function getAdapter(agentType: AgentType): AgentAdapter {
  switch (agentType) {
    case 'openai_compatible':
      return openAIAdapter;
    
    case 'ollama':
      return ollamaAdapter;
    
    case 'anthropic_compatible':
      return anthropicAdapter;
    
    case 'custom':
      return customAdapter;
    
    default:
      // Type guard to ensure exhaustive check
      throw new Error(`Unsupported agent type: ${agentType as string}`);
  }
}

/**
 * Check if an adapter exists for the given agent type
 * 
 * @param agentType - The type of agent to check
 * @returns true if an adapter exists, false otherwise
 */
export function hasAdapter(agentType: string): agentType is AgentType {
  return ['openai_compatible', 'ollama', 'anthropic_compatible', 'custom'].includes(agentType);
}

/**
 * Get all available adapter types
 * 
 * @returns Array of supported agent types
 */
export function getAvailableAdapterTypes(): AgentType[] {
  return ['openai_compatible', 'ollama', 'anthropic_compatible', 'custom'];
}

/**
 * Get adapter metadata for display purposes
 */
export interface AdapterMetadata {
  type: AgentType;
  name: string;
  description: string;
  docsUrl?: string;
}

/**
 * Get metadata for all available adapters
 * 
 * @returns Array of adapter metadata
 */
export function getAdapterMetadata(): AdapterMetadata[] {
  return [
    {
      type: 'openai_compatible',
      name: 'OpenAI Compatible',
      description: 'OpenAI API and compatible services (DeepSeek, OpenRouter, etc.)',
      docsUrl: 'https://platform.openai.com/docs/api-reference',
    },
    {
      type: 'ollama',
      name: 'Ollama',
      description: 'Ollama native API for local models',
      docsUrl: 'https://github.com/ollama/ollama/blob/main/docs/api.md',
    },
    {
      type: 'anthropic_compatible',
      name: 'Anthropic Compatible',
      description: 'Anthropic Claude API and compatible services',
      docsUrl: 'https://docs.anthropic.com/claude/reference/getting-started-with-the-api',
    },
    {
      type: 'custom',
      name: 'Custom',
      description: 'Custom endpoint configuration',
    },
  ];
}
