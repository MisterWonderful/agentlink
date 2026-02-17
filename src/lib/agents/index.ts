/**
 * Agent Adapters Barrel Export
 * 
 * Central export point for all agent adapter modules.
 */

// Base types and interfaces
export type {
  AgentAdapter,
  ChatRequestParams,
  StreamDelta,
  ParsedMessage,
} from './base-adapter';

// Adapter implementations
export { OpenAIAdapter, openAIAdapter } from './openai-adapter';
export { OllamaAdapter, ollamaAdapter } from './ollama-adapter';
export { AnthropicAdapter, anthropicAdapter } from './anthropic-adapter';
export { CustomAdapter, customAdapter } from './custom-adapter';
export type { CustomAdapterConfig } from './custom-adapter';

// Factory
export {
  getAdapter,
  hasAdapter,
  getAvailableAdapterTypes,
  getAdapterMetadata,
} from './adapter-factory';
export type { AdapterMetadata } from './adapter-factory';

// Connection testing
export {
  testConnection,
  autoDetectAgentType,
} from './connection-tester';
export type { TestConnectionResult } from './connection-tester';

// Credential encryption
export {
  encryptCredential,
  decryptCredential,
  deriveKey,
  // Legacy functions (deprecated)
  encryptCredentialWithKey,
  decryptCredentialWithKey,
  generateEncryptionKey,
  exportKey,
  importKey,
} from './credential-store';
export type { EncryptedCredential } from './credential-store';

// Health checking
export {
  checkAgentHealth,
  checkAllAgentsHealth,
  checkAgentsHealthBatched,
  toConnectionStatus,
  getStatusDescription,
  isHealthy,
  THRESHOLDS,
} from './health-checker';
export type {
  HealthCheckResult,
} from './health-checker';
