/**
 * useMacroExecutor Hook
 * Execute macro actions with full context support
 */

import { useCallback, useRef } from 'react';
import type {
  Macro,
  MacroAction,
  ExecutionContext,
  InsertTextPayload,
  RunCommandPayload,
  UploadFilePayload,
  SetVariablePayload,
  OpenMenuPayload,
} from '@/types/macros';
import { processTemplate, generatePreview } from '@/lib/macros/macro-engine';
import { useMacroStore } from '@/stores/macro-store';

// ============================================
// Execution Result Types
// ============================================

export interface ExecutionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

export interface ExecutorOptions {
  /** Callback when text is inserted */
  onInsertText?: (text: string, position?: string) => void;
  /** Callback when a command is run */
  onRunCommand?: (command: string, args?: string[]) => void;
  /** Callback when file upload is requested */
  onUploadFile?: (accept?: string, multiple?: boolean) => Promise<File[]>;
  /** Callback when a variable is set */
  onSetVariable?: (key: string, value: unknown) => void;
  /** Callback when a menu is opened */
  onOpenMenu?: (menuId: string) => void;
  /** Callback for execution completion */
  onComplete?: (result: ExecutionResult) => void;
  /** Callback for execution errors */
  onError?: (error: Error) => void;
}

// ============================================
// Default Execution Context
// ============================================

function createDefaultContext(): ExecutionContext {
  return {
    conversationId: '',
    agentId: '',
    variables: new Map(),
  };
}

// ============================================
// Hook Implementation
// ============================================

export function useMacroExecutor(options: ExecutorOptions = {}) {
  const {
    onInsertText,
    onRunCommand,
    onUploadFile,
    onSetVariable,
    onOpenMenu,
    onComplete,
    onError,
  } = options;

  const recordUsage = useMacroStore((state) => state.recordUsage);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Check if a macro can be executed
   */
  const canExecute = useCallback((macro: Macro): boolean => {
    switch (macro.action.type) {
      case 'insert_text':
        return !!onInsertText;
      case 'run_command':
        return !!onRunCommand;
      case 'upload_file':
        return !!onUploadFile;
      case 'set_variable':
        return !!onSetVariable;
      case 'open_menu':
        return !!onOpenMenu;
      default:
        return false;
    }
  }, [onInsertText, onRunCommand, onUploadFile, onSetVariable, onOpenMenu]);

  /**
   * Get a preview of what the macro will do
   */
  const getPreview = useCallback(
    (macro: Macro, context?: Partial<ExecutionContext>): string => {
      const fullContext = { ...createDefaultContext(), ...context };

      switch (macro.action.type) {
        case 'insert_text': {
          const payload = macro.action.payload as InsertTextPayload;
          return generatePreview(payload.text, fullContext);
        }
        case 'run_command': {
          const payload = macro.action.payload as RunCommandPayload;
          return `Run command: ${payload.command}`;
        }
        case 'upload_file': {
          const payload = macro.action.payload as UploadFilePayload;
          return `Upload file${payload.multiple ? 's' : ''} (${payload.accept || 'any'})`;
        }
        case 'set_variable': {
          const payload = macro.action.payload as SetVariablePayload;
          return `Set ${payload.key}`;
        }
        case 'open_menu': {
          const payload = macro.action.payload as OpenMenuPayload;
          return `Open ${payload.menuId}`;
        }
        default:
          return 'Unknown action';
      }
    },
    []
  );

  /**
   * Execute a macro action
   */
  const executeAction = useCallback(
    async (action: MacroAction, context: ExecutionContext): Promise<ExecutionResult> => {
      switch (action.type) {
        case 'insert_text': {
          const payload = action.payload as InsertTextPayload;
          const processedText = processTemplate(payload.text, context);

          if (onInsertText) {
            onInsertText(processedText, payload.position);
            return { success: true, data: processedText };
          }
          return { success: false, error: 'Insert text handler not provided' };
        }

        case 'run_command': {
          const payload = action.payload as RunCommandPayload;

          if (onRunCommand) {
            onRunCommand(payload.command, payload.args);
            return { success: true, data: payload.command };
          }
          return { success: false, error: 'Run command handler not provided' };
        }

        case 'upload_file': {
          const payload = action.payload as UploadFilePayload;

          if (onUploadFile) {
            try {
              const files = await onUploadFile(payload.accept, payload.multiple);
              return { success: true, data: files };
            } catch (error) {
              return {
                success: false,
                error: error instanceof Error ? error.message : 'Upload failed',
              };
            }
          }

          // Fallback: use native file picker
          return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = payload.accept || '*';
            input.multiple = payload.multiple ?? false;

            input.onchange = () => {
              const files = Array.from(input.files || []);
              resolve({ success: true, data: files });
            };

            input.oncancel = () => {
              resolve({ success: false, error: 'User cancelled' });
            };

            // Handle case where user cancels without triggering oncancel
            setTimeout(() => {
              if (!input.files?.length && input.parentNode) {
                resolve({ success: false, error: 'User cancelled' });
              }
            }, 1000);

            input.click();
          });
        }

        case 'set_variable': {
          const payload = action.payload as SetVariablePayload;

          if (onSetVariable) {
            onSetVariable(payload.key, payload.value);
            return { success: true };
          }
          return { success: false, error: 'Set variable handler not provided' };
        }

        case 'open_menu': {
          const payload = action.payload as OpenMenuPayload;

          if (onOpenMenu) {
            onOpenMenu(payload.menuId);
            return { success: true };
          }
          return { success: false, error: 'Open menu handler not provided' };
        }

        default:
          return { success: false, error: `Unknown action type: ${action.type}` };
      }
    },
    [onInsertText, onRunCommand, onUploadFile, onSetVariable, onOpenMenu]
  );

  /**
   * Execute a complete macro
   */
  const execute = useCallback(
    async (
      macro: Macro,
      context?: Partial<ExecutionContext>
    ): Promise<ExecutionResult> => {
      const fullContext: ExecutionContext = {
        ...createDefaultContext(),
        ...context,
      };

      try {
        // Record usage
        recordUsage(macro.id);

        // Execute the action
        const result = await executeAction(macro.action, fullContext);

        if (result.success) {
          onComplete?.(result);
        } else {
          onError?.(new Error(result.error || 'Execution failed'));
        }

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const result: ExecutionResult = {
          success: false,
          error: errorMessage,
        };
        onError?.(error instanceof Error ? error : new Error(errorMessage));
        return result;
      }
    },
    [executeAction, recordUsage, onComplete, onError]
  );

  /**
   * Execute a macro by ID
   */
  const executeById = useCallback(
    async (
      macroId: string,
      context?: Partial<ExecutionContext>
    ): Promise<ExecutionResult> => {
      const macro = useMacroStore.getState().getMacroById(macroId);

      if (!macro) {
        const result: ExecutionResult = {
          success: false,
          error: `Macro not found: ${macroId}`,
        };
        onError?.(new Error(result.error));
        return result;
      }

      return execute(macro, context);
    },
    [execute, onError]
  );

  return {
    execute,
    executeById,
    canExecute,
    getPreview,
  };
}

// ============================================
// Utility Hook for Chat Integration
// ============================================

export interface ChatExecutorConfig {
  /** Insert text into the chat input */
  insertText: (text: string, position?: string) => void;
  /** Run a slash command */
  runCommand: (command: string, args?: string[]) => void;
  /** Upload files */
  uploadFiles: (files: File[]) => void;
  /** Current conversation ID */
  conversationId: string;
  /** Current agent ID */
  agentId: string;
  /** Get last message content */
  getLastMessage?: () => { id: string; content: string; role: string } | undefined;
  /** Get referenced files */
  getReferencedFiles?: () => string[];
}

export function useChatMacroExecutor(config: ChatExecutorConfig) {
  const {
    insertText,
    runCommand,
    uploadFiles,
    conversationId,
    agentId,
    getLastMessage,
    getReferencedFiles,
  } = config;

  const createContext = useCallback((): ExecutionContext => {
    return {
      conversationId,
      agentId,
      lastMessage: getLastMessage?.(),
      referencedFiles: getReferencedFiles?.(),
      variables: new Map(),
    };
  }, [conversationId, agentId, getLastMessage, getReferencedFiles]);

  const executor = useMacroExecutor({
    onInsertText: insertText,
    onRunCommand: runCommand,
    onUploadFile: async (accept, multiple) => {
      return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept || '*';
        input.multiple = multiple ?? false;

        input.onchange = () => {
          const files = Array.from(input.files || []);
          uploadFiles(files);
          resolve(files);
        };

        input.click();
      });
    },
  });

  const execute = useCallback(
    async (macro: Macro) => {
      const context = createContext();
      return executor.execute(macro, context);
    },
    [executor, createContext]
  );

  return {
    ...executor,
    execute,
    createContext,
  };
}
