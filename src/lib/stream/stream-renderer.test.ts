/**
 * Stream Renderer Tests
 * 
 * Unit tests for the stream animation engine.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StreamRenderer, injectStreamStyles, createAdaptiveRenderer, type StreamOptions } from './stream-renderer';

// Mock DOM APIs
document.createElement = vi.fn(() => ({
  style: {},
  appendChild: vi.fn(),
  removeChild: vi.fn(),
  querySelectorAll: vi.fn(() => []),
  getBoundingClientRect: vi.fn(() => ({ right: 0, top: 0 })),
})) as unknown as typeof document.createElement;

document.createDocumentFragment = vi.fn(() => ({
  appendChild: vi.fn(),
})) as unknown as typeof document.createDocumentFragment;

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
  return setTimeout(cb, 16) as unknown as number;
});

global.cancelAnimationFrame = vi.fn((id: number) => {
  clearTimeout(id);
});

global.performance = {
  now: vi.fn(() => Date.now()),
} as unknown as typeof performance;

describe('StreamRenderer', () => {
  let container: HTMLElement;
  let options: StreamOptions;

  beforeEach(() => {
    container = document.createElement('div') as unknown as HTMLElement;
    options = {
      tokens: ['H', 'e', 'l', 'l', 'o'],
      container,
      speed: 'normal',
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create a StreamRenderer instance', () => {
      const renderer = new StreamRenderer(options);
      expect(renderer).toBeInstanceOf(StreamRenderer);
      renderer.destroy();
    });

    it('should initialize with correct state', () => {
      const renderer = new StreamRenderer(options);
      expect(renderer.getComplete()).toBe(false);
      expect(renderer.getPaused()).toBe(false);
      expect(renderer.getProgress()).toBe(0);
      renderer.destroy();
    });
  });

  describe('start', () => {
    it('should start rendering', () => {
      const renderer = new StreamRenderer(options);
      renderer.start();
      expect(renderer.getMetrics().isActive).toBe(true);
      renderer.destroy();
    });

    it('should not start if already complete', () => {
      const renderer = new StreamRenderer(options);
      renderer.skipToEnd();
      renderer.start();
      // Should not throw or error
      renderer.destroy();
    });
  });

  describe('pause/resume', () => {
    it('should pause rendering', () => {
      const renderer = new StreamRenderer(options);
      renderer.start();
      renderer.pause();
      expect(renderer.getPaused()).toBe(true);
      expect(renderer.getMetrics().isActive).toBe(false);
      renderer.destroy();
    });

    it('should resume rendering', () => {
      const renderer = new StreamRenderer(options);
      renderer.start();
      renderer.pause();
      renderer.resume();
      expect(renderer.getPaused()).toBe(false);
      expect(renderer.getMetrics().isActive).toBe(true);
      renderer.destroy();
    });

    it('should toggle pause state', () => {
      const renderer = new StreamRenderer(options);
      renderer.start();
      renderer.toggle();
      expect(renderer.getPaused()).toBe(true);
      renderer.toggle();
      expect(renderer.getPaused()).toBe(false);
      renderer.destroy();
    });
  });

  describe('setSpeed', () => {
    it('should set speed by preset', () => {
      const renderer = new StreamRenderer(options);
      renderer.setSpeed('fast');
      // Speed is internal, but method should not throw
      renderer.destroy();
    });

    it('should set speed by number', () => {
      const renderer = new StreamRenderer(options);
      renderer.setSpeed(10);
      renderer.destroy();
    });
  });

  describe('skipToEnd', () => {
    it('should complete rendering instantly', () => {
      const renderer = new StreamRenderer(options);
      const onComplete = vi.fn();
      
      renderer.skipToEnd();
      
      expect(renderer.getComplete()).toBe(true);
      expect(renderer.getProgress()).toBe(100);
    });

    it('should fire onComplete callback', () => {
      const onComplete = vi.fn();
      const renderer = new StreamRenderer({
        ...options,
        onComplete,
      });
      
      renderer.skipToEnd();
      
      expect(onComplete).toHaveBeenCalled();
      renderer.destroy();
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      const renderer = new StreamRenderer(options);
      const metrics = renderer.getMetrics();
      
      expect(metrics).toHaveProperty('currentIndex');
      expect(metrics).toHaveProperty('totalTokens');
      expect(metrics).toHaveProperty('tokensPerSecond');
      expect(metrics).toHaveProperty('elapsedTime');
      expect(metrics).toHaveProperty('isActive');
      expect(metrics.totalTokens).toBe(options.tokens.length);
      renderer.destroy();
    });
  });

  describe('getProgress', () => {
    it('should return 0 at start', () => {
      const renderer = new StreamRenderer(options);
      expect(renderer.getProgress()).toBe(0);
      renderer.destroy();
    });

    it('should return 100 when complete', () => {
      const renderer = new StreamRenderer(options);
      renderer.skipToEnd();
      expect(renderer.getProgress()).toBe(100);
      renderer.destroy();
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      const renderer = new StreamRenderer(options);
      renderer.start();
      renderer.destroy();
      
      expect(renderer.getPaused()).toBe(true);
    });
  });
});

describe('injectStreamStyles', () => {
  it('should inject styles into document head', () => {
    const appendChildSpy = vi.spyOn(document.head, 'appendChild');
    
    injectStreamStyles();
    
    expect(appendChildSpy).toHaveBeenCalled();
    appendChildSpy.mockRestore();
  });

  it('should not inject styles twice', () => {
    injectStreamStyles();
    const appendChildSpy = vi.spyOn(document.head, 'appendChild');
    
    injectStreamStyles();
    
    expect(appendChildSpy).not.toHaveBeenCalled();
    appendChildSpy.mockRestore();
  });
});

describe('createAdaptiveRenderer', () => {
  it('should create renderer with code detection', () => {
    const container = document.createElement('div') as unknown as HTMLElement;
    const content = '```typescript\nconst x = 1;\n```';
    
    const renderer = createAdaptiveRenderer(content, container);
    
    expect(renderer).toBeInstanceOf(StreamRenderer);
    renderer.destroy();
  });

  it('should create renderer with table detection', () => {
    const container = document.createElement('div') as unknown as HTMLElement;
    const content = '| Header |\n|--------|\n| Cell |';
    
    const renderer = createAdaptiveRenderer(content, container);
    
    expect(renderer).toBeInstanceOf(StreamRenderer);
    renderer.destroy();
  });
});
