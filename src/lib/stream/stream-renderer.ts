/**
 * Stream Renderer
 * 
 * High-performance token-by-token rendering engine optimized for OpenClaw terminal experience.
 * Uses requestAnimationFrame for 60fps animations and batches DOM updates to avoid React re-renders.
 */

export type StreamSpeed = 'slow' | 'normal' | 'fast' | 'instant';

export interface StreamOptions {
  /** Pre-split tokens to render */
  tokens: string[];
  /** Container element to render into */
  container: HTMLElement;
  /** Callback fired for each rendered token */
  onToken?: (token: string, index: number) => void;
  /** Callback fired when stream completes */
  onComplete?: () => void;
  /** Render speed preset */
  speed: StreamSpeed;
  /** Optional: Enable subtle typing sound effect */
  enableTypingSound?: boolean;
  /** Optional: Custom delay between tokens in ms (overrides speed) */
  customDelay?: number;
}

export interface RenderMetrics {
  /** Current token index being rendered */
  currentIndex: number;
  /** Total tokens in stream */
  totalTokens: number;
  /** Tokens rendered per second */
  tokensPerSecond: number;
  /** Time elapsed since start in ms */
  elapsedTime: number;
  /** Whether stream is currently active */
  isActive: boolean;
}

/** Speed presets in milliseconds per token */
const SPEED_PRESETS: Record<StreamSpeed, number> = {
  slow: 48,      // ~20 tokens/sec
  normal: 16,    // ~60 tokens/sec
  fast: 8,       // ~120 tokens/sec
  instant: 0,    // immediate
};

/** Minimum time between frames for requestAnimationFrame throttling */
const FRAME_BUDGET = 16; // ~60fps

/**
 * StreamRenderer - Token-by-token animation engine
 * 
 * Features:
 * - requestAnimationFrame-based rendering for 60fps performance
 * - Adaptive speed control with presets
 * - Pause/resume/skip functionality
 * - Real-time metrics (tokens/sec, progress)
 * - Batched DOM updates for performance
 */
export class StreamRenderer {
  private tokenQueue: string[] = [];
  private currentIndex = 0;
  private isPaused = false;
  private isComplete = false;
  private renderSpeed = SPEED_PRESETS.normal;
  private options: StreamOptions;
  
  // Animation frame tracking
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private tokenAccumulator = 0;
  
  // Metrics
  private startTime = 0;
  private tokensRendered = 0;
  private lastMetricsUpdate = 0;
  private currentTokensPerSecond = 0;
  
  // Audio context for typing sound
  private audioContext: AudioContext | null = null;
  private typingSoundEnabled = false;

  constructor(options: StreamOptions) {
    this.options = options;
    this.tokenQueue = [...options.tokens];
    this.renderSpeed = options.customDelay ?? SPEED_PRESETS[options.speed];
    this.typingSoundEnabled = options.enableTypingSound ?? false;
    
    if (this.typingSoundEnabled && typeof window !== 'undefined') {
      this.initAudio();
    }
  }

  /**
   * Initialize Web Audio API for typing sound
   */
  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      // Audio not supported, silently fail
      this.typingSoundEnabled = false;
    }
  }

  /**
   * Play subtle typing sound effect
   */
  private playTypingSound(): void {
    if (!this.audioContext || !this.typingSoundEnabled) return;
    
    // Throttle audio to avoid overwhelming the user
    if (this.tokensRendered % 3 !== 0) return;
    
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Very subtle high-frequency click
      oscillator.frequency.value = 800 + Math.random() * 400;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.02, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.03);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.03);
    } catch {
      // Audio playback failed, disable for this session
      this.typingSoundEnabled = false;
    }
  }

  /**
   * Start the stream rendering
   */
  start(): void {
    if (this.isComplete || this.currentIndex >= this.tokenQueue.length) {
      return;
    }
    
    this.startTime = performance.now();
    this.isPaused = false;
    this.scheduleNextFrame();
  }

  /**
   * Pause the stream rendering
   */
  pause(): void {
    this.isPaused = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Resume the stream rendering
   */
  resume(): void {
    if (this.isPaused && !this.isComplete) {
      this.isPaused = false;
      this.lastFrameTime = performance.now();
      this.scheduleNextFrame();
    }
  }

  /**
   * Toggle pause/resume state
   */
  toggle(): void {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * Set rendering speed
   */
  setSpeed(speed: StreamSpeed | number): void {
    if (typeof speed === 'string') {
      this.renderSpeed = SPEED_PRESETS[speed];
    } else {
      this.renderSpeed = speed;
    }
  }

  /**
   * Skip to end of stream instantly
   */
  skipToEnd(): void {
    this.pause();
    
    // Render all remaining tokens
    const remainingTokens = this.tokenQueue.slice(this.currentIndex);
    
    if (remainingTokens.length > 0) {
      // Batch render all remaining tokens
      const fragment = document.createDocumentFragment();
      
      for (let i = 0; i < remainingTokens.length; i++) {
        const token = remainingTokens[i];
        const span = this.createTokenElement(token, this.currentIndex + i);
        fragment.appendChild(span);
      }
      
      this.options.container.appendChild(fragment);
      
      // Fire callbacks for all skipped tokens
      for (let i = 0; i < remainingTokens.length; i++) {
        this.options.onToken?.(remainingTokens[i], this.currentIndex + i);
      }
      
      this.tokensRendered += remainingTokens.length;
    }
    
    this.currentIndex = this.tokenQueue.length;
    this.isComplete = true;
    this.options.onComplete?.();
  }

  /**
   * Get current rendering metrics
   */
  getMetrics(): RenderMetrics {
    const elapsed = this.startTime > 0 ? performance.now() - this.startTime : 0;
    
    return {
      currentIndex: this.currentIndex,
      totalTokens: this.tokenQueue.length,
      tokensPerSecond: this.currentTokensPerSecond,
      elapsedTime: elapsed,
      isActive: !this.isPaused && !this.isComplete,
    };
  }

  /**
   * Check if stream is complete
   */
  getComplete(): boolean {
    return this.isComplete;
  }

  /**
   * Check if stream is paused
   */
  getPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Get current progress percentage (0-100)
   */
  getProgress(): number {
    if (this.tokenQueue.length === 0) return 100;
    return Math.round((this.currentIndex / this.tokenQueue.length) * 100);
  }

  /**
   * Schedule next animation frame
   */
  private scheduleNextFrame(): void {
    if (this.animationFrameId !== null) return;
    
    this.animationFrameId = requestAnimationFrame((timestamp) => this.onFrame(timestamp));
  }

  /**
   * Animation frame handler
   */
  private onFrame(timestamp: number): void {
    this.animationFrameId = null;
    
    if (this.isPaused || this.isComplete) return;
    
    // Initialize lastFrameTime on first frame
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = timestamp;
    }
    
    // Calculate delta time
    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;
    
    // Instant mode - render all at once
    if (this.renderSpeed === 0) {
      this.skipToEnd();
      return;
    }
    
    // Accumulate time for token rendering
    this.tokenAccumulator += deltaTime;
    
    // Render tokens based on accumulated time
    const tokensToRender = Math.floor(this.tokenAccumulator / this.renderSpeed);
    
    if (tokensToRender > 0) {
      this.tokenAccumulator -= tokensToRender * this.renderSpeed;
      this.renderTokensBatch(tokensToRender);
    }
    
    // Update metrics every 100ms
    if (timestamp - this.lastMetricsUpdate > 100) {
      this.updateMetrics();
      this.lastMetricsUpdate = timestamp;
    }
    
    // Schedule next frame if not complete
    if (!this.isComplete) {
      this.scheduleNextFrame();
    }
  }

  /**
   * Render a batch of tokens
   */
  private renderTokensBatch(count: number): void {
    const fragment = document.createDocumentFragment();
    let actualRendered = 0;
    
    for (let i = 0; i < count; i++) {
      if (this.currentIndex >= this.tokenQueue.length) {
        break;
      }
      
      const token = this.tokenQueue[this.currentIndex];
      const span = this.createTokenElement(token, this.currentIndex);
      fragment.appendChild(span);
      
      this.options.onToken?.(token, this.currentIndex);
      this.currentIndex++;
      actualRendered++;
    }
    
    if (actualRendered > 0) {
      this.options.container.appendChild(fragment);
      this.tokensRendered += actualRendered;
      
      if (this.typingSoundEnabled) {
        this.playTypingSound();
      }
    }
    
    // Check for completion
    if (this.currentIndex >= this.tokenQueue.length) {
      this.isComplete = true;
      this.updateMetrics();
      this.options.onComplete?.();
    }
  }

  /**
   * Create a token DOM element with animation
   */
  private createTokenElement(token: string, index: number): HTMLSpanElement {
    const span = document.createElement('span');
    span.textContent = token;
    span.className = 'stream-token';
    span.style.cssText = `
      display: inline;
      opacity: 0;
      transform: translateY(2px);
      animation: tokenAppear 50ms ease-out forwards;
      animation-delay: ${index === this.currentIndex ? 0 : 16}ms;
    `;
    
    // Handle newlines specially
    if (token === '\n') {
      span.style.display = 'block';
      span.style.height = '0';
      span.style.margin = '0';
    }
    
    return span;
  }

  /**
   * Update metrics calculations
   */
  private updateMetrics(): void {
    const elapsed = performance.now() - this.startTime;
    if (elapsed > 0) {
      this.currentTokensPerSecond = Math.round((this.tokensRendered / elapsed) * 1000);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.pause();
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
    }
  }
}

/**
 * Create a stream renderer with adaptive speed based on content type
 */
export function createAdaptiveRenderer(
  content: string,
  container: HTMLElement,
  baseSpeed: StreamSpeed = 'normal',
  onComplete?: () => void
): StreamRenderer {
  // Analyze content to determine optimal strategy
  const hasCodeBlock = /```[\s\S]*?```/.test(content);
  const hasTable = /\|.*\|/.test(content);
  const hasList = /^[\s]*[-*+][\s]/m.test(content);
  
  // Tokenize content
  const tokens = tokenizeContent(content);
  
  // Determine speed based on content type
  let speed: StreamSpeed = baseSpeed;
  if (hasCodeBlock && !hasTable && !hasList) {
    // Code-heavy content -> faster
    speed = baseSpeed === 'slow' ? 'normal' : 'fast';
  } else if (hasTable) {
    // Tables -> instant for readability
    speed = 'instant';
  }
  
  return new StreamRenderer({
    tokens,
    container,
    speed,
    onComplete,
  });
}

/**
 * Simple tokenizer that splits content into renderable tokens
 */
function tokenizeContent(content: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inCodeBlock = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextThree = content.slice(i, i + 3);
    
    // Handle code block markers
    if (nextThree === '```') {
      if (current) {
        tokens.push(...current.split(''))
        current = '';
      }
      tokens.push(nextThree);
      i += 2;
      inCodeBlock = !inCodeBlock;
      continue;
    }
    
    // Handle newlines
    if (char === '\n') {
      if (current) {
        tokens.push(...current.split(''))
        current = '';
      }
      tokens.push('\n');
      continue;
    }
    
    // In code blocks, render line by line for better performance
    if (inCodeBlock && char === '\n') {
      if (current) {
        tokens.push(current);
        current = '';
      }
      tokens.push('\n');
      continue;
    }
    
    current += char;
  }
  
  // Push remaining content
  if (current) {
    if (inCodeBlock) {
      tokens.push(current);
    } else {
      tokens.push(...current.split(''))
    }
  }
  
  return tokens;
}

/**
 * Utility function to create CSS keyframes for token animation
 * Call this once in your app to inject the styles
 */
export function injectStreamStyles(): void {
  if (typeof document === 'undefined') return;
  
  const styleId = 'stream-animation-styles';
  if (document.getElementById(styleId)) return;
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes tokenAppear {
      from {
        opacity: 0;
        transform: translateY(2px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .stream-token {
      will-change: opacity, transform;
    }
  `;
  document.head.appendChild(style);
}
