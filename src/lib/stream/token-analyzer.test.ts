/**
 * Token Analyzer Tests
 * 
 * Unit tests for content analysis and segmentation.
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeContent,
  preprocessContent,
  estimateRenderTime,
  getAdaptiveSpeed,
  type ContentSegment,
} from './token-analyzer';

describe('analyzeContent', () => {
  it('should return empty array for empty content', () => {
    const result = analyzeContent('');
    expect(result).toEqual([]);
  });

  it('should analyze plain text', () => {
    const content = 'Hello world';
    const result = analyzeContent(content);
    
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe('text');
    expect(result[0].content).toBe(content);
    expect(result[0].renderMode).toBe('character');
  });

  it('should detect code blocks', () => {
    const content = '```typescript\nconst x = 1;\n```';
    const result = analyzeContent(content);
    
    const codeSegment = result.find(s => s.type === 'code');
    expect(codeSegment).toBeDefined();
    expect(codeSegment?.language).toBe('typescript');
    expect(codeSegment?.renderMode).toBe('line');
  });

  it('should detect tables', () => {
    const content = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1 | Cell 2 |';
    const result = analyzeContent(content);
    
    const tableSegment = result.find(s => s.type === 'table');
    expect(tableSegment).toBeDefined();
    expect(tableSegment?.renderMode).toBe('instant');
  });

  it('should detect lists', () => {
    const content = '- Item 1\n- Item 2\n- Item 3';
    const result = analyzeContent(content);
    
    const listSegment = result.find(s => s.type === 'list');
    expect(listSegment).toBeDefined();
    expect(listSegment?.renderMode).toBe('token');
  });

  it('should detect headings', () => {
    const content = '# Heading 1\n## Heading 2';
    const result = analyzeContent(content);
    
    const headings = result.filter(s => s.type === 'heading');
    expect(headings.length).toBe(2);
    expect(headings[0].depth).toBe(1);
    expect(headings[1].depth).toBe(2);
  });

  it('should detect nested structures', () => {
    const content = `# Title

Some text here.

\`\`\`javascript
console.log("hello");
\`\`\`

More text.`;
    
    const result = analyzeContent(content);
    
    expect(result.some(s => s.type === 'heading')).toBe(true);
    expect(result.some(s => s.type === 'text')).toBe(true);
    expect(result.some(s => s.type === 'code')).toBe(true);
    expect(result.some(s => s.type === 'newline')).toBe(true);
  });
});

describe('preprocessContent', () => {
  it('should normalize line endings', () => {
    const content = 'Line 1\r\nLine 2\rLine 3';
    const result = preprocessContent(content);
    
    expect(result).not.toContain('\r\n');
    expect(result).not.toContain('\r');
    expect(result.split('\n').length).toBe(3);
  });

  it('should handle already normalized content', () => {
    const content = 'Line 1\nLine 2\nLine 3';
    const result = preprocessContent(content);
    
    expect(result).toBe(content);
  });
});

describe('estimateRenderTime', () => {
  it('should return 0 for empty content', () => {
    expect(estimateRenderTime('')).toBe(0);
  });

  it('should estimate time for text content', () => {
    const content = 'Hello world'; // 11 chars
    const result = estimateRenderTime(content);
    
    // Character mode = 16ms per char
    expect(result).toBeGreaterThan(0);
  });

  it('should estimate time for code content', () => {
    const content = '```\nline 1\nline 2\nline 3\n```';
    const result = estimateRenderTime(content);
    
    // Line mode = 30ms per line
    expect(result).toBeGreaterThan(0);
  });
});

describe('getAdaptiveSpeed', () => {
  it('should return defaults for empty content', () => {
    const result = getAdaptiveSpeed('');
    
    expect(result.speed).toBeDefined();
    expect(result.mode).toBeDefined();
  });

  it('should suggest faster speed for code-heavy content', () => {
    const content = '```typescript\nconst a = 1;\nconst b = 2;\n```';
    const result = getAdaptiveSpeed(content);
    
    // Code should use 'line' mode
    expect(result.mode).toBe('line');
  });

  it('should suggest instant for tables', () => {
    const content = '| Col1 | Col2 |\n|------|------|\n| A | B |';
    const result = getAdaptiveSpeed(content);
    
    // Tables should use 'instant' mode
    expect(result.mode).toBe('instant');
  });

  it('should suggest character mode for prose', () => {
    const content = 'This is a long paragraph of text that should be rendered character by character for smooth reading experience.';
    const result = getAdaptiveSpeed(content);
    
    expect(result.mode).toBe('character');
  });
});
