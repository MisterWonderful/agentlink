import { db, type LocalConversation } from './indexeddb';

/**
 * Get all conversations for a specific agent, sorted by updatedAt descending.
 * @param agentId - Agent ID
 * @returns Array of conversations
 */
export async function getConversationsByAgent(agentId: string): Promise<LocalConversation[]> {
  return db.conversations
    .where('[agentId+updatedAt]')
    .equals([agentId, Dexie.minKey])
    .until(conv => conv.agentId !== agentId)
    .reverse()
    .toArray();
}

/**
 * Get a single conversation by its ID.
 * @param id - Conversation ID
 * @returns The conversation or undefined if not found
 */
export async function getConversationById(id: string): Promise<LocalConversation | undefined> {
  return db.conversations.get(id);
}

/**
 * Create a new conversation.
 * @param agentId - Associated agent ID
 * @param title - Optional conversation title (defaults to "New Conversation")
 * @returns The created conversation
 */
export async function createConversation(
  agentId: string,
  title?: string
): Promise<LocalConversation> {
  const now = new Date().toISOString();
  const newConversation: LocalConversation = {
    id: crypto.randomUUID(),
    agentId,
    title: title ?? 'New Conversation',
    messageCount: 0,
    isPinned: false,
    isArchived: false,
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
  
  await db.conversations.add(newConversation);
  return newConversation;
}

/**
 * Update an existing conversation.
 * @param id - Conversation ID to update
 * @param updates - Partial conversation data to update
 * @throws Error if conversation not found
 */
export async function updateConversation(
  id: string,
  updates: Partial<Omit<LocalConversation, 'id' | 'createdAt' | 'agentId'>>
): Promise<void> {
  const existing = await db.conversations.get(id);
  if (!existing) {
    throw new Error(`Conversation with id ${id} not found`);
  }
  
  await db.conversations.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Update conversation's last message metadata.
 * Internal helper - updates message preview and count.
 * @param id - Conversation ID
 * @param preview - Message preview text
 * @param role - Role of last message
 */
export async function updateConversationLastMessage(
  id: string,
  preview: string,
  role: 'user' | 'assistant'
): Promise<void> {
  const existing = await db.conversations.get(id);
  if (!existing) return;
  
  await db.conversations.update(id, {
    lastMessagePreview: preview.slice(0, 100),
    lastMessageRole: role,
    messageCount: existing.messageCount + 1,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete a conversation and all its messages.
 * @param id - Conversation ID to delete
 */
export async function deleteConversation(id: string): Promise<void> {
  await db.transaction('rw', db.conversations, db.messages, async () => {
    // Delete all messages for this conversation
    await db.messages
      .where('conversationId')
      .equals(id)
      .delete();
    
    // Delete the conversation
    await db.conversations.delete(id);
  });
}

/**
 * Get pinned conversations for an agent.
 * @param agentId - Agent ID
 * @returns Array of pinned conversations, sorted by updatedAt descending
 */
export async function getPinnedConversations(agentId: string): Promise<LocalConversation[]> {
  return db.conversations
    .where('[agentId+updatedAt]')
    .equals([agentId, Dexie.minKey])
    .until(conv => conv.agentId !== agentId)
    .filter(conv => conv.isPinned && !conv.isArchived)
    .reverse()
    .toArray();
}

/**
 * Get archived conversations for an agent.
 * @param agentId - Agent ID
 * @returns Array of archived conversations
 */
export async function getArchivedConversations(agentId: string): Promise<LocalConversation[]> {
  return db.conversations
    .where('[agentId+updatedAt]')
    .equals([agentId, Dexie.minKey])
    .until(conv => conv.agentId !== agentId)
    .filter(conv => conv.isArchived)
    .reverse()
    .toArray();
}

/**
 * Archive a conversation.
 * @param id - Conversation ID to archive
 */
export async function archiveConversation(id: string): Promise<void> {
  await updateConversation(id, { isArchived: true });
}

/**
 * Unarchive a conversation.
 * @param id - Conversation ID to unarchive
 */
export async function unarchiveConversation(id: string): Promise<void> {
  await updateConversation(id, { isArchived: false });
}

/**
 * Pin a conversation.
 * @param id - Conversation ID to pin
 */
export async function pinConversation(id: string): Promise<void> {
  await updateConversation(id, { isPinned: true });
}

/**
 * Unpin a conversation.
 * @param id - Conversation ID to unpin
 */
export async function unpinConversation(id: string): Promise<void> {
  await updateConversation(id, { isPinned: false });
}

/**
 * Toggle pin status of a conversation.
 * @param id - Conversation ID
 */
export async function togglePinConversation(id: string): Promise<void> {
  const conv = await db.conversations.get(id);
  if (!conv) {
    throw new Error(`Conversation with id ${id} not found`);
  }
  await updateConversation(id, { isPinned: !conv.isPinned });
}

/**
 * Fork a conversation from a specific message index.
 * Creates a new conversation with reference to the original.
 * @param conversationId - Original conversation ID
 * @param messageIndex - Index to fork from
 * @param newTitle - Title for the forked conversation
 * @returns The new forked conversation
 */
export async function forkConversation(
  conversationId: string,
  messageIndex: number,
  newTitle?: string
): Promise<LocalConversation> {
  const original = await db.conversations.get(conversationId);
  if (!original) {
    throw new Error(`Conversation with id ${conversationId} not found`);
  }
  
  const now = new Date().toISOString();
  const forkedConversation: LocalConversation = {
    id: crypto.randomUUID(),
    agentId: original.agentId,
    title: newTitle ?? `${original.title} (Fork)`,
    messageCount: 0,
    isPinned: false,
    isArchived: false,
    tags: [...original.tags],
    forkedFromConversationId: conversationId,
    forkedFromMessageIndex: messageIndex,
    createdAt: now,
    updatedAt: now,
  };
  
  await db.conversations.add(forkedConversation);
  return forkedConversation;
}

/**
 * Search conversations by title.
 * @param agentId - Agent ID to search within
 * @param query - Search query string
 * @returns Array of matching conversations
 */
export async function searchConversations(
  agentId: string,
  query: string
): Promise<LocalConversation[]> {
  const lowerQuery = query.toLowerCase();
  return db.conversations
    .where('agentId')
    .equals(agentId)
    .filter(conv => conv.title.toLowerCase().includes(lowerQuery))
    .reverse()
    .toArray();
}

/**
 * Count conversations for an agent.
 * @param agentId - Agent ID
 * @returns Conversation count
 */
export async function countConversationsByAgent(agentId: string): Promise<number> {
  return db.conversations
    .where('agentId')
    .equals(agentId)
    .count();
}

/**
 * Get all conversations across all agents (for admin/backup purposes).
 * @returns Array of all conversations
 */
export async function getAllConversations(): Promise<LocalConversation[]> {
  return db.conversations
    .orderBy('updatedAt')
    .reverse()
    .toArray();
}

/**
 * Add a tag to a conversation.
 * @param id - Conversation ID
 * @param tag - Tag to add
 */
export async function addConversationTag(id: string, tag: string): Promise<void> {
  const conv = await db.conversations.get(id);
  if (!conv) {
    throw new Error(`Conversation with id ${id} not found`);
  }
  
  if (!conv.tags.includes(tag)) {
    await updateConversation(id, {
      tags: [...conv.tags, tag],
    });
  }
}

/**
 * Remove a tag from a conversation.
 * @param id - Conversation ID
 * @param tag - Tag to remove
 */
export async function removeConversationTag(id: string, tag: string): Promise<void> {
  const conv = await db.conversations.get(id);
  if (!conv) {
    throw new Error(`Conversation with id ${id} not found`);
  }
  
  await updateConversation(id, {
    tags: conv.tags.filter(t => t !== tag),
  });
}

// Import Dexie for minKey
import Dexie from 'dexie';
