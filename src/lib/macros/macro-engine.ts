/**
 * Macro Engine
 * Template processing and variable substitution for macros
 */

import type { ExecutionContext } from '@/types/macros';

// ============================================
// Variable Resolvers
// ============================================

type VariableResolver = (context: ExecutionContext) => string;

const VARIABLE_RESOLVERS: Record<string, VariableResolver> = {
  // Context variables
  '@last': (ctx) => {
    if (ctx.lastMessage?.content) {
      return ctx.lastMessage.content;
    }
    return '';
  },

  '@agent': (ctx) => {
    return ctx.agentId || '';
  },

  '@conversation': (ctx) => {
    return ctx.conversationId || '';
  },

  '@file': (ctx) => {
    const files = ctx.referencedFiles;
    if (files && files.length > 0) {
      return files[0];
    }
    return '';
  },

  '@files': (ctx) => {
    const files = ctx.referencedFiles;
    if (files && files.length > 0) {
      return files.join('\n');
    }
    return '';
  },

  // Date/time variables
  '{{date}}': () => {
    return new Date().toLocaleDateString();
  },

  '{{time}}': () => {
    return new Date().toLocaleTimeString();
  },

  '{{datetime}}': () => {
    return new Date().toLocaleString();
  },

  '{{iso}}': () => {
    return new Date().toISOString();
  },

  '{{timestamp}}': () => {
    return Date.now().toString();
  },

  '{{year}}': () => {
    return new Date().getFullYear().toString();
  },

  '{{month}}': () => {
    return (new Date().getMonth() + 1).toString().padStart(2, '0');
  },

  '{{day}}': () => {
    return new Date().getDate().toString().padStart(2, '0');
  },

  '{{hour}}': () => {
    return new Date().getHours().toString().padStart(2, '0');
  },

  '{{minute}}': () => {
    return new Date().getMinutes().toString().padStart(2, '0');
  },

  '{{second}}': () => {
    return new Date().getSeconds().toString().padStart(2, '0');
  },

  '{{weekday}}': () => {
    return new Date().toLocaleDateString(undefined, { weekday: 'long' });
  },

  // Special variables
  '{{newline}}': () => '\n',
  '{{tab}}': () => '\t',
  '{{clipboard}}': () => {
    try {
      // Return empty string synchronously - clipboard access needs to be handled differently
      return '';
    } catch {
      return '';
    }
  },
};

// ============================================
// Template Processing
// ============================================

export interface ProcessOptions {
  /** Maximum recursion depth for nested templates */
  maxDepth?: number;
  /** Custom variable resolvers */
  customResolvers?: Record<string, VariableResolver>;
}

/**
 * Process a template string, replacing variables with their values
 */
export function processTemplate(
  template: string,
  context: ExecutionContext,
  options: ProcessOptions = {}
): string {
  const { maxDepth = 5 } = options;
  let result = template;

  // Process variables iteratively to handle nested references
  for (let depth = 0; depth < maxDepth; depth++) {
    const previousResult = result;
    result = processVariables(result, context);

    // If no more changes, we're done
    if (result === previousResult) {
      break;
    }
  }

  return result;
}

/**
 * Process all variables in a string
 */
function processVariables(template: string, context: ExecutionContext): string {
  let result = template;

  // Process context variables (@last, @agent, etc.)
  for (const [pattern, resolver] of Object.entries(VARIABLE_RESOLVERS)) {
    if (pattern.startsWith('@')) {
      result = result.replace(new RegExp(`\\${pattern}\\b`, 'g'), resolver(context));
    } else if (pattern.startsWith('{{')) {
      result = result.replace(
        new RegExp(pattern.replace(/[{}]/g, '\\$&'), 'g'),
        resolver(context)
      );
    }
  }

  // Process conditional blocks
  result = processConditionals(result, context);

  // Process loops
  result = processLoops(result, context);

  return result;
}

// ============================================
// Conditional Processing
// ============================================

const CONDITIONAL_REGEX = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

function processConditionals(template: string, context: ExecutionContext): string {
  return template.replace(CONDITIONAL_REGEX, (match, condition, content) => {
    const value = resolveCondition(condition, context);
    return value ? content : '';
  });
}

function resolveCondition(condition: string, context: ExecutionContext): boolean {
  switch (condition) {
    case 'last':
      return !!context.lastMessage;
    case 'files':
      return !!(context.referencedFiles && context.referencedFiles.length > 0);
    case 'agent':
      return !!context.agentId;
    default:
      // Check custom variables
      return context.variables.has(condition);
  }
}

// ============================================
// Loop Processing
// ============================================

const LOOP_REGEX = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

function processLoops(template: string, context: ExecutionContext): string {
  return template.replace(LOOP_REGEX, (match, collection, content) => {
    const items = resolveCollection(collection, context);
    if (!items || items.length === 0) {
      return '';
    }

    return items
      .map((item) => {
        // Replace {{this}} with the current item
        return content.replace(/\{\{this\}\}/g, String(item));
      })
      .join('');
  });
}

function resolveCollection(collection: string, context: ExecutionContext): unknown[] {
  switch (collection) {
    case 'files':
      return context.referencedFiles ?? [];
    default:
      // Check custom variables
      const value = context.variables.get(collection);
      if (Array.isArray(value)) {
        return value;
      }
      return [];
  }
}

// ============================================
// Macro Preview
// ============================================

/**
 * Generate a preview of what a macro will produce
 */
export function generatePreview(template: string, context: ExecutionContext): string {
  const processed = processTemplate(template, context, { maxDepth: 1 });

  // Truncate if too long
  const maxLength = 100;
  if (processed.length > maxLength) {
    return processed.substring(0, maxLength) + '...';
  }

  return processed || '(Empty result)';
}

// ============================================
// Macro Engine Class
// ============================================

export class MacroEngine {
  private customResolvers: Map<string, VariableResolver> = new Map();

  /**
   * Register a custom variable resolver
   */
  registerVariable(name: string, resolver: VariableResolver): void {
    this.customResolvers.set(name, resolver);
  }

  /**
   * Unregister a custom variable resolver
   */
  unregisterVariable(name: string): void {
    this.customResolvers.delete(name);
  }

  /**
   * Process a template with the engine's custom resolvers
   */
  process(template: string, context: ExecutionContext): string {
    const customResolvers: Record<string, VariableResolver> = {};
    this.customResolvers.forEach((resolver, name) => {
      customResolvers[name] = resolver;
    });

    return processTemplate(template, context, { customResolvers });
  }

  /**
   * Preview what a template will produce
   */
  preview(template: string, context: ExecutionContext): string {
    return generatePreview(template, context);
  }
}

// ============================================
// Singleton Instance
// ============================================

let globalEngine: MacroEngine | null = null;

export function getMacroEngine(): MacroEngine {
  if (!globalEngine) {
    globalEngine = new MacroEngine();
  }
  return globalEngine;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Extract all variables from a template
 */
export function extractVariables(template: string): string[] {
  const variables: string[] = [];

  // Extract @variables
  const atMatches = template.match(/@\w+/g);
  if (atMatches) {
    variables.push(...atMatches);
  }

  // Extract {{variables}}
  const braceMatches = template.match(/\{\{\w+\}\}/g);
  if (braceMatches) {
    variables.push(...braceMatches.map((v) => v.slice(2, -2)));
  }

  return [...new Set(variables)];
}

/**
 * Validate a template for syntax errors
 */
export function validateTemplate(template: string): { valid: boolean; error?: string } {
  // Check for unclosed conditionals
  const openIfCount = (template.match(/\{\{#if/g) || []).length;
  const closeIfCount = (template.match(/\{\{\/if\}\}/g) || []).length;

  if (openIfCount !== closeIfCount) {
    return {
      valid: false,
      error: `Unmatched #if blocks: ${openIfCount} opened, ${closeIfCount} closed`,
    };
  }

  // Check for unclosed loops
  const openEachCount = (template.match(/\{\{#each/g) || []).length;
  const closeEachCount = (template.match(/\{\{\/each\}\}/g) || []).length;

  if (openEachCount !== closeEachCount) {
    return {
      valid: false,
      error: `Unmatched #each blocks: ${openEachCount} opened, ${closeEachCount} closed`,
    };
  }

  return { valid: true };
}
