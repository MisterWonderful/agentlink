/**
 * Terminal Components
 *
 * Professional terminal-specific UI components for AgentLink.
 */

export {
  TerminalMetrics,
  TerminalMetricsBar,
  type TerminalMetricsProps,
  type TerminalMetricsBarProps,
} from "./terminal-metrics";

export {
  ConnectionBar,
  OfflineModeIndicator,
  type ConnectionBarProps,
  type OfflineModeIndicatorProps,
} from "./connection-bar";

export {
  FloatingActions,
  ScrollToBottomButton,
  type FloatingActionsProps,
  type ScrollToBottomButtonProps,
} from "./floating-actions";

export {
  TerminalEmptyState,
  QuickStartCard,
  type TerminalEmptyStateProps,
  type QuickStartCardProps,
} from "./terminal-empty-state";

// Re-export other terminal components (from pre-existing files)
export { TerminalContainer } from "./terminal-container";
export { TerminalHeader } from "./terminal-header";
export { KeyboardShortcutsHelp } from "./keyboard-shortcuts-help";
