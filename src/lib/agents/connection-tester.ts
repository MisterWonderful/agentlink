/**
 * Agent Connection Tester
 * 
 * Tests connections to agents and auto-detects agent types.
 */

import type { AgentType, AgentCapabilities } from '@/types/index';
import { getAdapter } from './adapter-factory';

/**
 * Result of testing a connection to an agent
 */
export interface TestConnectionResult {
  success: boolean;
  agentType: AgentType;
  modelName?: string;
  availableModels?: string[];
  latencyMs: number;
  capabilities: AgentCapabilities;
  error?: string;
  troubleshooting?: string[];
}

/**
 * Test a connection to an agent endpoint
 * 
 * @param endpointUrl - The base URL of the agent endpoint
 * @param authToken - Optional authentication token
 * @param agentType - The type of agent to test
 * @returns Test connection result with latency, capabilities, and error info
 */
export async function testConnection(
  endpointUrl: string,
  authToken: string | undefined,
  agentType: AgentType
): Promise<TestConnectionResult> {
  const startTime = performance.now();
  const adapter = getAdapter(agentType);
  
  const result: TestConnectionResult = {
    success: false,
    agentType,
    latencyMs: 0,
    capabilities: {
      vision: false,
      tools: false,
      reasoning: false,
      fileUpload: false,
      codeExecution: false,
    },
  };

  try {
    // Validate URL
    let url: URL;
    try {
      url = new URL(endpointUrl);
    } catch {
      result.error = 'Invalid endpoint URL';
      result.troubleshooting = [
        'Ensure the URL starts with http:// or https://',
        'Check for typos in the URL',
        'Example: http://localhost:11434 for Ollama',
      ];
      return result;
    }

    // Test models endpoint
    const modelsEndpoint = adapter.getModelsEndpoint(endpointUrl);
    const headers = adapter.formatHeaders(authToken);

    const response = await fetch(modelsEndpoint, {
      method: 'GET',
      headers,
    });

    const latencyMs = Math.round(performance.now() - startTime);
    result.latencyMs = latencyMs;

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      result.error = `HTTP ${response.status}: ${errorText}`;
      result.troubleshooting = generateTroubleshooting(response.status, agentType, endpointUrl);
      return result;
    }

    // Parse models response
    const data = await response.json() as object;
    const models = adapter.parseModelsResponse(data);
    result.availableModels = models;
    result.modelName = models[0]; // Use first model as default

    // Infer capabilities from available models
    result.capabilities = inferCapabilities(models, agentType);
    result.success = true;

    return result;
  } catch (error) {
    result.latencyMs = Math.round(performance.now() - startTime);
    result.error = error instanceof Error ? error.message : String(error);
    result.troubleshooting = generateTroubleshooting(0, agentType, endpointUrl, result.error);
    return result;
  }
}

/**
 * Auto-detect the agent type for a given endpoint
 * 
 * Tries OpenAI → Ollama → Custom in order
 * 
 * @param endpointUrl - The base URL of the agent endpoint
 * @param authToken - Optional authentication token
 * @returns The detected agent type, or 'custom' if detection fails
 */
export async function autoDetectAgentType(
  endpointUrl: string,
  authToken?: string
): Promise<AgentType> {
  // Validate URL first
  try {
    new URL(endpointUrl);
  } catch {
    return 'custom';
  }

  const typesToTry: AgentType[] = ['openai_compatible', 'ollama', 'custom'];

  for (const agentType of typesToTry) {
    try {
      const result = await testConnection(endpointUrl, authToken, agentType);
      if (result.success) {
        return agentType;
      }
    } catch {
      // Continue to next type
    }
  }

  // Default to custom if detection fails
  return 'custom';
}

/**
 * Generate troubleshooting hints based on error context
 */
function generateTroubleshooting(
  statusCode: number,
  agentType: AgentType,
  endpointUrl: string,
  errorMessage?: string
): string[] {
  const hints: string[] = [];

  // Network/connection errors
  if (statusCode === 0 || errorMessage?.includes('fetch') || errorMessage?.includes('network')) {
    hints.push('Check that the server is running and accessible');
    hints.push('Verify the endpoint URL is correct');
    
    if (agentType === 'ollama') {
      hints.push('Ollama default port is 11434 (e.g., http://localhost:11434)');
    }
    
    hints.push('Check firewall settings if connecting to a remote server');
    return hints;
  }

  // Authentication errors
  if (statusCode === 401) {
    hints.push('Check that your API key is correct');
    hints.push('Ensure the API key has not expired');
    
    if (agentType === 'anthropic_compatible') {
      hints.push('Anthropic uses x-api-key header, not Authorization: Bearer');
    }
    
    return hints;
  }

  // Forbidden
  if (statusCode === 403) {
    hints.push('Your API key may not have permission to access this resource');
    hints.push('Check your account permissions and rate limits');
    return hints;
  }

  // Not found
  if (statusCode === 404) {
    hints.push('The endpoint path may be incorrect');
    
    switch (agentType) {
      case 'openai_compatible':
        hints.push('OpenAI-compatible endpoints typically use /v1/chat/completions');
        break;
      case 'ollama':
        hints.push('Ollama endpoints typically use /api/chat and /api/tags');
        hints.push('Verify Ollama version (newer versions may have different paths)');
        break;
      case 'anthropic_compatible':
        hints.push('Anthropic endpoints typically use /v1/messages');
        break;
    }
    
    return hints;
  }

  // Method not allowed
  if (statusCode === 405) {
    hints.push('The HTTP method may not be supported for this endpoint');
    hints.push('Try using a different agent type');
    return hints;
  }

  // Server errors
  if (statusCode >= 500) {
    hints.push('The server encountered an internal error');
    hints.push('Check the server logs for more details');
    hints.push('The service may be temporarily unavailable');
    return hints;
  }

  // General hints
  hints.push('Verify the endpoint URL is correct');
  hints.push('Check that the agent type matches the endpoint');
  
  if (!endpointUrl.startsWith('https')) {
    hints.push('Consider using HTTPS for production deployments');
  }

  return hints;
}

/**
 * Infer agent capabilities from available models
 */
function inferCapabilities(models: string[], agentType: AgentType): AgentCapabilities {
  const capabilities: AgentCapabilities = {
    vision: false,
    tools: false,
    reasoning: false,
    fileUpload: false,
    codeExecution: false,
  };

  const modelString = models.join(' ').toLowerCase();

  // Vision models
  if (
    modelString.includes('vision') ||
    modelString.includes('gpt-4') && modelString.includes('vision') ||
    modelString.includes('claude-3') && !modelString.includes('claude-3-sonnet-20240229') ||
    modelString.includes('llava') ||
    modelString.includes('bakllava')
  ) {
    capabilities.vision = true;
  }

  // Tool support
  if (
    modelString.includes('gpt-4') ||
    modelString.includes('gpt-3.5') ||
    modelString.includes('claude-3') ||
    modelString.includes('tool') ||
    modelString.includes('function')
  ) {
    capabilities.tools = true;
  }

  // Reasoning models (DeepSeek R1 style)
  if (
    modelString.includes('r1') ||
    modelString.includes('reasoning') ||
    modelString.includes('deepseek') ||
    modelString.includes('o1') ||
    modelString.includes('o3')
  ) {
    capabilities.reasoning = true;
  }

  // File upload
  if (
    agentType === 'anthropic_compatible' ||
    modelString.includes('claude-3') ||
    modelString.includes('gpt-4')
  ) {
    capabilities.fileUpload = true;
  }

  // Code execution
  if (
    modelString.includes('code') ||
    modelString.includes('coder')
  ) {
    capabilities.codeExecution = true;
  }

  return capabilities;
}
