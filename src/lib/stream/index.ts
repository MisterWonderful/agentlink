/**
 * Stream Animation Engine
 * 
 * High-performance token streaming animation for AgentLink.
 * Optimized for OpenClaw terminal experience.
 */

export {
  StreamRenderer,
  createAdaptiveRenderer,
  injectStreamStyles,
  type StreamOptions,
  type RenderMetrics,
  type StreamSpeed,
} from './stream-renderer';

export {
  analyzeContent,
  preprocessContent,
  estimateRenderTime,
  getAdaptiveSpeed,
  type ContentSegment,
  type SegmentType,
  type RenderMode,
} from './token-analyzer';
