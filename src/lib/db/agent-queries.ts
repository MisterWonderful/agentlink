import { db, type LocalAgent } from './indexeddb';

/**
 * Get all agents sorted by sortOrder, then by name.
 * @returns Array of all agents
 */
export async function getAllAgents(): Promise<LocalAgent[]> {
  return db.agents
    .orderBy('sortOrder')
    .toArray();
}

/**
 * Get a single agent by its ID.
 * @param id - Agent ID
 * @returns The agent or undefined if not found
 */
export async function getAgentById(id: string): Promise<LocalAgent | undefined> {
  return db.agents.get(id);
}

/**
 * Get an agent by its Supabase server ID (for sync scenarios).
 * @param serverId - Supabase agent ID
 * @returns The agent or undefined if not found
 */
export async function getAgentByServerId(serverId: string): Promise<LocalAgent | undefined> {
  return db.agents.where('serverId').equals(serverId).first();
}

/**
 * Get all active agents.
 * @returns Array of agents where isActive is true
 */
export async function getActiveAgents(): Promise<LocalAgent[]> {
  return db.agents
    .where('isActive')
    .equals(1) // Dexie stores booleans as 0/1
    .toArray();
}

/**
 * Create a new agent.
 * @param agent - Agent data (without id, createdAt, updatedAt)
 * @returns The created agent with generated id and timestamps
 */
export async function createAgent(
  agent: Omit<LocalAgent, 'id' | 'createdAt' | 'updatedAt'>
): Promise<LocalAgent> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  
  // Get max sortOrder to append at end
  const maxSortOrder = await db.agents
    .orderBy('sortOrder')
    .last()
    .then(last => last?.sortOrder ?? -1);
  
  const newAgent: LocalAgent = {
    ...agent,
    id,
    sortOrder: maxSortOrder + 1,
    createdAt: now,
    updatedAt: now,
  };
  
  await db.agents.add(newAgent);
  return newAgent;
}

/**
 * Update an existing agent.
 * @param id - Agent ID to update
 * @param updates - Partial agent data to update
 * @throws Error if agent not found
 */
export async function updateAgent(
  id: string,
  updates: Partial<Omit<LocalAgent, 'id' | 'createdAt'>>
): Promise<void> {
  const existing = await db.agents.get(id);
  if (!existing) {
    throw new Error(`Agent with id ${id} not found`);
  }
  
  await db.agents.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete an agent and all its associated conversations and messages.
 * @param id - Agent ID to delete
 */
export async function deleteAgent(id: string): Promise<void> {
  await db.transaction('rw', db.agents, db.conversations, db.messages, async () => {
    // Get all conversations for this agent
    const conversations = await db.conversations
      .where('agentId')
      .equals(id)
      .toArray();
    
    const conversationIds = conversations.map(c => c.id);
    
    // Delete all messages for these conversations
    if (conversationIds.length > 0) {
      await db.messages
        .where('conversationId')
        .anyOf(conversationIds)
        .delete();
    }
    
    // Delete all conversations for this agent
    await db.conversations
      .where('agentId')
      .equals(id)
      .delete();
    
    // Delete the agent
    await db.agents.delete(id);
  });
}

/**
 * Reorder agents by setting their sortOrder based on the provided ID array.
 * @param orderedIds - Array of agent IDs in desired order
 */
export async function reorderAgents(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.agents, async () => {
    const updates = orderedIds.map((id, index) => 
      db.agents.update(id, { 
        sortOrder: index,
        updatedAt: new Date().toISOString(),
      })
    );
    await Promise.all(updates);
  });
}

/**
 * Update agent status from health check results.
 * @param id - Agent ID
 * @param isActive - Whether agent is online
 * @param avgLatencyMs - Average latency in milliseconds
 */
export async function updateAgentStatus(
  id: string,
  isActive: boolean,
  avgLatencyMs?: number
): Promise<void> {
  await db.agents.update(id, {
    isActive,
    avgLatencyMs,
    lastSeenAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Search agents by name (case-insensitive substring match).
 * @param query - Search query string
 * @returns Array of matching agents
 */
export async function searchAgents(query: string): Promise<LocalAgent[]> {
  const lowerQuery = query.toLowerCase();
  return db.agents
    .filter(agent => agent.name.toLowerCase().includes(lowerQuery))
    .toArray();
}

/**
 * Count total number of agents.
 * @returns Agent count
 */
export async function countAgents(): Promise<number> {
  return db.agents.count();
}

/**
 * Bulk create agents (useful for sync/import scenarios).
 * @param agents - Array of agent data
 * @returns Array of created agents
 */
export async function bulkCreateAgents(
  agents: Omit<LocalAgent, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<LocalAgent[]> {
  const now = new Date().toISOString();
  
  // Get current max sortOrder
  const maxSortOrder = await db.agents
    .orderBy('sortOrder')
    .last()
    .then(last => last?.sortOrder ?? -1);
  
  const newAgents: LocalAgent[] = agents.map((agent, index) => ({
    ...agent,
    id: crypto.randomUUID(),
    sortOrder: maxSortOrder + index + 1,
    createdAt: now,
    updatedAt: now,
  }));
  
  await db.agents.bulkAdd(newAgents);
  return newAgents;
}

/**
 * Duplicate an existing agent with a new name.
 * @param id - Agent ID to duplicate
 * @param newName - Name for the duplicated agent
 * @returns The new duplicated agent
 */
export async function duplicateAgent(
  id: string,
  newName: string
): Promise<LocalAgent> {
  const existing = await db.agents.get(id);
  if (!existing) {
    throw new Error(`Agent with id ${id} not found`);
  }
  
  const { id: _, serverId: __, createdAt: ___, updatedAt: ____, ...agentData } = existing;
  
  return createAgent({
    ...agentData,
    name: newName,
  });
}
