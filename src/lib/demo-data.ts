import type { Agent, Conversation, ChatMessage } from '@/types/schemas';
import { db } from '@/lib/db/indexeddb';

/**
 * Demo Data for First-Time Users
 * 
 * This module provides demo data to help new users understand
 * how AgentLink works before they connect their own agents.
 */

export const DEMO_AGENT_ID = 'demo-agent-001';
export const DEMO_CONVERSATION_ID = 'demo-conversation-001';

/**
 * Demo Agent Configuration
 * A sample agent that demonstrates the capabilities of AgentLink
 */
export const demoAgent: Agent = {
  id: DEMO_AGENT_ID,
  name: 'AgentLink Assistant',
  agentType: 'openai_compatible',
  endpointUrl: 'https://api.demo.agentlink.local/v1/chat',
  systemPrompt: 'I am a helpful AI assistant for AgentLink, a mobile-first chat client for LLM agents. I can help you understand how to use the app, connect your agents, and make the most of your AI conversations.',
  defaultModel: 'demo-model',
  temperature: 0.7,
  maxTokens: 2048,
  contextLength: 8192,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  capabilities: {
    vision: true,
    tools: true,
    reasoning: true,
    fileUpload: true,
    codeExecution: false,
  },
  customHeaders: {},
  requestTimeoutMs: 30000,
  maxRetries: 3,
  isActive: true,
  lastSeenAt: new Date().toISOString(),
  avgLatencyMs: 120,
  sortOrder: 0,
  accentColor: '#3b82f6',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Demo Conversation
 */
export const demoConversation: Conversation = {
  id: DEMO_CONVERSATION_ID,
  agentId: DEMO_AGENT_ID,
  title: 'Welcome to AgentLink!',
  messageCount: 6,
  lastMessagePreview: 'Feel free to explore the app and let me know if you have any questions!',
  lastMessageRole: 'assistant',
  isPinned: true,
  isArchived: false,
  tags: ['demo', 'welcome'],
  createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
  updatedAt: new Date().toISOString(),
};

/**
 * Demo Messages
 * A sample conversation to demonstrate the chat interface
 */
export const demoMessages: ChatMessage[] = [
  {
    id: 'demo-msg-001',
    conversationId: DEMO_CONVERSATION_ID,
    role: 'assistant',
    content: 'Welcome to AgentLink! I\'m your demo assistant. I\'m here to help you get started with this mobile-first chat client for LLM agents.',
    parts: [
      {
        type: 'text',
        content: 'Welcome to AgentLink! I\'m your demo assistant. I\'m here to help you get started with this mobile-first chat client for LLM agents.',
      },
    ],
    model: 'demo-model',
    tokenCount: 28,
    latencyMs: 150,
    status: 'sent',
    retryCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
  },
  {
    id: 'demo-msg-002',
    conversationId: DEMO_CONVERSATION_ID,
    role: 'user',
    content: 'What can I do with AgentLink?',
    parts: [
      {
        type: 'text',
        content: 'What can I do with AgentLink?',
      },
    ],
    status: 'sent',
    retryCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
  },
  {
    id: 'demo-msg-003',
    conversationId: DEMO_CONVERSATION_ID,
    role: 'assistant',
    content: `With AgentLink, you can:\n\n**Connect Multiple Agents**\n• Ollama running locally\n• OpenAI-compatible endpoints\n• Anthropic Claude\n• Custom API providers\n\n**Chat Features**\n• Real-time streaming responses\n• Offline message queuing\n• Code syntax highlighting\n• Markdown support\n• Conversation organization\n\n**Mobile-First Design**\n• Works offline as a PWA\n• Swipe gestures\n• Haptic feedback\n• Optimized for touch`,
    parts: [
      {
        type: 'text',
        content: `With AgentLink, you can:\n\n**Connect Multiple Agents**\n• Ollama running locally\n• OpenAI-compatible endpoints\n• Anthropic Claude\n• Custom API providers\n\n**Chat Features**\n• Real-time streaming responses\n• Offline message queuing\n• Code syntax highlighting\n• Markdown support\n• Conversation organization\n\n**Mobile-First Design**\n• Works offline as a PWA\n• Swipe gestures\n• Haptic feedback\n• Optimized for touch`,
      },
    ],
    model: 'demo-model',
    tokenCount: 89,
    latencyMs: 210,
    status: 'sent',
    retryCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 49).toISOString(),
  },
  {
    id: 'demo-msg-004',
    conversationId: DEMO_CONVERSATION_ID,
    role: 'user',
    content: 'How do I add my first real agent?',
    parts: [
      {
        type: 'text',
        content: 'How do I add my first real agent?',
      },
    ],
    status: 'sent',
    retryCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'demo-msg-005',
    conversationId: DEMO_CONVERSATION_ID,
    role: 'assistant',
    content: 'It\'s easy! Here\'s how:\n\n1. **Tap the + button** in the agents list\n2. **Choose your provider**: Ollama, OpenAI, or custom\n3. **Enter the endpoint URL** (e.g., http://localhost:11434 for Ollama)\n4. **Add your API key** if needed\n5. **Test the connection** and save\n\nYour agent will appear in the list, and you can start chatting right away!',
    parts: [
      {
        type: 'text',
        content: 'It\'s easy! Here\'s how:\n\n1. **Tap the + button** in the agents list\n2. **Choose your provider**: Ollama, OpenAI, or custom\n3. **Enter the endpoint URL** (e.g., http://localhost:11434 for Ollama)\n4. **Add your API key** if needed\n5. **Test the connection** and save\n\nYour agent will appear in the list, and you can start chatting right away!',
      },
    ],
    model: 'demo-model',
    tokenCount: 76,
    latencyMs: 180,
    status: 'sent',
    retryCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 44).toISOString(),
  },
  {
    id: 'demo-msg-006',
    conversationId: DEMO_CONVERSATION_ID,
    role: 'assistant',
    content: 'Feel free to explore the app and let me know if you have any questions! You can delete this demo conversation anytime by swiping left on it in the conversations list.',
    parts: [
      {
        type: 'text',
        content: 'Feel free to explore the app and let me know if you have any questions! You can delete this demo conversation anytime by swiping left on it in the conversations list.',
      },
    ],
    model: 'demo-model',
    tokenCount: 32,
    latencyMs: 95,
    status: 'sent',
    retryCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 43).toISOString(),
  },
];

/**
 * Check if demo data exists in the database
 */
export async function hasDemoData(): Promise<boolean> {
  try {
    const existingAgent = await db.agents.get(DEMO_AGENT_ID);
    return !!existingAgent;
  } catch {
    return false;
  }
}

/**
 * Seed demo data into the database
 */
export async function seedDemoData(): Promise<void> {
  try {
    // Check if demo data already exists
    const exists = await hasDemoData();
    if (exists) {
      console.log('Demo data already exists, skipping...');
      return;
    }

    // Convert agent to LocalAgent format
    const localAgent = {
      id: demoAgent.id,
      serverId: demoAgent.serverId,
      name: demoAgent.name,
      avatarUrl: demoAgent.avatarUrl,
      accentColor: demoAgent.accentColor,
      agentType: demoAgent.agentType,
      endpointUrl: demoAgent.endpointUrl,
      authToken: demoAgent.authToken,
      systemPrompt: demoAgent.systemPrompt,
      defaultModel: demoAgent.defaultModel,
      temperature: demoAgent.temperature,
      maxTokens: demoAgent.maxTokens,
      contextLength: demoAgent.contextLength,
      topP: demoAgent.topP,
      frequencyPenalty: demoAgent.frequencyPenalty,
      presencePenalty: demoAgent.presencePenalty,
      capabilities: demoAgent.capabilities,
      customHeaders: demoAgent.customHeaders,
      requestTimeoutMs: demoAgent.requestTimeoutMs,
      maxRetries: demoAgent.maxRetries,
      customCaCert: demoAgent.customCaCert,
      isActive: demoAgent.isActive,
      lastSeenAt: demoAgent.lastSeenAt,
      avgLatencyMs: demoAgent.avgLatencyMs,
      sortOrder: demoAgent.sortOrder,
      createdAt: demoAgent.createdAt,
      updatedAt: demoAgent.updatedAt,
    };

    // Add demo agent
    await db.agents.add(localAgent);

    // Add demo conversation
    await db.conversations.add({
      id: demoConversation.id,
      agentId: demoConversation.agentId,
      title: demoConversation.title,
      messageCount: demoConversation.messageCount,
      lastMessagePreview: demoConversation.lastMessagePreview,
      lastMessageRole: demoConversation.lastMessageRole,
      isPinned: demoConversation.isPinned,
      isArchived: demoConversation.isArchived,
      folder: demoConversation.folder,
      tags: demoConversation.tags,
      forkedFromConversationId: demoConversation.forkedFromConversationId,
      forkedFromMessageIndex: demoConversation.forkedFromMessageIndex,
      createdAt: demoConversation.createdAt,
      updatedAt: demoConversation.updatedAt,
    });

    // Add demo messages
    for (const message of demoMessages) {
      await db.messages.add({
        id: message.id,
        conversationId: message.conversationId,
        role: message.role,
        content: message.content,
        parts: message.parts,
        model: message.model,
        tokenCount: message.tokenCount,
        latencyMs: message.latencyMs,
        status: message.status,
        error: message.error,
        retryCount: message.retryCount,
        createdAt: message.createdAt,
      });
    }

    console.log('Demo data seeded successfully');
  } catch (error) {
    console.error('Failed to seed demo data:', error);
    throw error;
  }
}

/**
 * Clear all demo data from the database
 */
export async function clearDemoData(): Promise<void> {
  try {
    // Delete demo messages
    const demoMessageIds = demoMessages.map(m => m.id);
    await db.messages.bulkDelete(demoMessageIds);

    // Delete demo conversation
    await db.conversations.delete(DEMO_CONVERSATION_ID);

    // Delete demo agent
    await db.agents.delete(DEMO_AGENT_ID);

    console.log('Demo data cleared successfully');
  } catch (error) {
    console.error('Failed to clear demo data:', error);
    throw error;
  }
}

/**
 * Check if an agent is the demo agent
 */
export function isDemoAgent(agentId: string): boolean {
  return agentId === DEMO_AGENT_ID;
}

/**
 * Check if a conversation is the demo conversation
 */
export function isDemoConversation(conversationId: string): boolean {
  return conversationId === DEMO_CONVERSATION_ID;
}
