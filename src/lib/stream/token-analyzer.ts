/**
 * Token Analyzer
 * 
 * Analyzes content to determine optimal rendering strategies.
 * Splits content into segments with appropriate render modes and delays.
 */

export type SegmentType = 'text' | 'code' | 'reasoning' | 'table' | 'list' | 'heading' | 'newline';
export type RenderMode = 'character' | 'token' | 'line' | 'instant';

export interface ContentSegment {
  /** Type of content segment */
  type: SegmentType;
  /** Raw content of the segment */
  content: string;
  /** Rendering mode for this segment */
  renderMode: RenderMode;
  /** Delay between elements in ms */
  delay: number;
  /** Language identifier for code blocks */
  language?: string;
  /** Depth for nested structures (lists) */
  depth?: number;
  /** Whether this segment contains markdown formatting */
  hasFormatting?: boolean;
}

/** Default delays for each render mode (ms) */
const DEFAULT_DELAYS: Record<RenderMode, number> = {
  character: 16,  // ~60 chars/sec - smooth reading
  token: 8,       // ~120 tokens/sec - fast but visible
  line: 30,       // ~33 lines/sec - code reveal
  instant: 0,     // immediate - for tables/structured data
};

/** Thresholds for segment detection */
const THRESHOLDS = {
  codeBlock: 3,      // ``` to trigger code
  tableColumn: 2,    // minimum |columns| for table
  listIndent: 2,     // spaces for list indentation
  heading: 4,        // #### max heading level
};

/**
 * Analyze content and split into segments with optimal rendering strategies
 */
export function analyzeContent(content: string): ContentSegment[] {
  if (!content || content.length === 0) {
    return [];
  }
  
  const segments: ContentSegment[] = [];
  const lines = content.split('\n');
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Detect code blocks
    if (trimmed.startsWith('```')) {
      const { segment, nextIndex } = extractCodeBlock(lines, i);
      segments.push(segment);
      i = nextIndex;
      continue;
    }
    
    // Detect reasoning/thinking blocks
    if (isReasoningBlock(trimmed)) {
      const { segment, nextIndex } = extractReasoningBlock(lines, i);
      segments.push(segment);
      i = nextIndex;
      continue;
    }
    
    // Detect tables
    if (isTableRow(trimmed)) {
      const { segment, nextIndex } = extractTable(lines, i);
      segments.push(segment);
      i = nextIndex;
      continue;
    }
    
    // Detect headings
    if (isHeading(trimmed)) {
      segments.push({
        type: 'heading',
        content: line,
        renderMode: 'token',
        delay: DEFAULT_DELAYS.token,
        depth: getHeadingLevel(trimmed),
      });
      i++;
      continue;
    }
    
    // Detect lists
    if (isListItem(trimmed)) {
      const { segment, nextIndex } = extractList(lines, i);
      segments.push(segment);
      i = nextIndex;
      continue;
    }
    
    // Empty lines
    if (trimmed === '') {
      segments.push({
        type: 'newline',
        content: '\n',
        renderMode: 'instant',
        delay: 0,
      });
      i++;
      continue;
    }
    
    // Regular text paragraph
    const { segment, nextIndex } = extractTextBlock(lines, i);
    segments.push(segment);
    i = nextIndex;
  }
  
  return mergeConsecutiveSegments(segments);
}

/**
 * Extract a code block starting at the given line index
 */
function extractCodeBlock(lines: string[], startIndex: number): { segment: ContentSegment; nextIndex: number } {
  const startLine = lines[startIndex];
  const fenceMatch = startLine.match(/^```(\w+)?/);
  const language = fenceMatch?.[1] || '';
  
  let content = startLine + '\n';
  let i = startIndex + 1;
  
  while (i < lines.length) {
    const line = lines[i];
    content += line + '\n';
    
    if (line.trim().startsWith('```') && line.trim() !== '```') {
      // End of code block
      i++;
      break;
    }
    i++;
  }
  
  return {
    segment: {
      type: 'code',
      content: content.trimEnd(),
      renderMode: 'line',
      delay: DEFAULT_DELAYS.line,
      language,
    },
    nextIndex: i,
  };
}

/**
 * Extract a reasoning/thinking block
 */
function extractReasoningBlock(lines: string[], startIndex: number): { segment: ContentSegment; nextIndex: number } {
  let content = lines[startIndex] + '\n';
  let i = startIndex + 1;
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // End reasoning on empty line followed by non-reasoning content
    if (trimmed === '' && i + 1 < lines.length && !isReasoningLine(lines[i + 1].trim())) {
      content += '\n';
      i++;
      break;
    }
    
    content += line + '\n';
    i++;
  }
  
  return {
    segment: {
      type: 'reasoning',
      content: content.trimEnd(),
      renderMode: 'character',
      delay: DEFAULT_DELAYS.character * 0.75, // Slightly faster than normal text
    },
    nextIndex: i,
  };
}

/**
 * Extract a table starting at the given line index
 */
function extractTable(lines: string[], startIndex: number): { segment: ContentSegment; nextIndex: number } {
  let content = lines[startIndex] + '\n';
  let i = startIndex + 1;
  
  while (i < lines.length) {
    const line = lines[i];
    if (!isTableRow(line.trim()) && !isTableSeparator(line.trim())) {
      break;
    }
    content += line + '\n';
    i++;
  }
  
  return {
    segment: {
      type: 'table',
      content: content.trimEnd(),
      renderMode: 'instant',
      delay: 0,
    },
    nextIndex: i,
  };
}

/**
 * Extract a list starting at the given line index
 */
function extractList(lines: string[], startIndex: number): { segment: ContentSegment; nextIndex: number } {
  const firstLine = lines[startIndex];
  const baseIndent = getIndentLevel(firstLine);
  
  let content = firstLine + '\n';
  let i = startIndex + 1;
  let maxDepth = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Check if line continues the list
    if (trimmed === '') {
      content += '\n';
      i++;
      continue;
    }
    
    const indent = getIndentLevel(line);
    
    // Allow for nested lists and continuation paragraphs
    if (isListItem(trimmed) || indent > baseIndent) {
      content += line + '\n';
      maxDepth = Math.max(maxDepth, Math.floor((indent - baseIndent) / THRESHOLDS.listIndent));
      i++;
    } else {
      break;
    }
  }
  
  return {
    segment: {
      type: 'list',
      content: content.trimEnd(),
      renderMode: 'token',
      delay: DEFAULT_DELAYS.token,
      depth: maxDepth,
    },
    nextIndex: i,
  };
}

/**
 * Extract a text paragraph/block
 */
function extractTextBlock(lines: string[], startIndex: number): { segment: ContentSegment; nextIndex: number } {
  let content = lines[startIndex];
  let i = startIndex + 1;
  let hasFormatting = hasMarkdownFormatting(content);
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Stop on empty line or special block
    if (trimmed === '' || 
        isHeading(trimmed) || 
        isListItem(trimmed) || 
        isTableRow(trimmed) ||
        trimmed.startsWith('```')) {
      break;
    }
    
    content += '\n' + line;
    hasFormatting = hasFormatting || hasMarkdownFormatting(line);
    i++;
  }
  
  return {
    segment: {
      type: 'text',
      content,
      renderMode: 'character',
      delay: DEFAULT_DELAYS.character,
      hasFormatting,
    },
    nextIndex: i,
  };
}

/**
 * Check if line is a reasoning block indicator
 */
function isReasoningBlock(line: string): boolean {
  return /^<(thinking|reasoning|analysis)>/.test(line) ||
         /^\s*(Thinking|Reasoning|Analysis):/i.test(line);
}

/**
 * Check if line is part of reasoning content
 */
function isReasoningLine(line: string): boolean {
  return line.startsWith('>') || 
         /^\s{2,}/.test(line) || 
         isReasoningBlock(line);
}

/**
 * Check if line is a table row
 */
function isTableRow(line: string): boolean {
  return line.startsWith('|') && line.endsWith('|') && line.includes('|', 1);
}

/**
 * Check if line is a table separator (|---|---|)
 */
function isTableSeparator(line: string): boolean {
  return /^\|[-:|\s]+\|$/.test(line);
}

/**
 * Check if line is a heading
 */
function isHeading(line: string): boolean {
  return /^#{1,6}\s+/.test(line);
}

/**
 * Get heading level (1-6)
 */
function getHeadingLevel(line: string): number {
  const match = line.match(/^(#{1,6})\s/);
  return match ? match[1].length : 0;
}

/**
 * Check if line is a list item
 */
function isListItem(line: string): boolean {
  return /^\s*[-*+]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line);
}

/**
 * Get indentation level (number of leading spaces)
 */
function getIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

/**
 * Check if text contains markdown formatting
 */
function hasMarkdownFormatting(text: string): boolean {
  return /[*_~`\[\]!]/.test(text);
}

/**
 * Merge consecutive segments of the same type for efficiency
 */
function mergeConsecutiveSegments(segments: ContentSegment[]): ContentSegment[] {
  const merged: ContentSegment[] = [];
  
  for (const segment of segments) {
    const last = merged[merged.length - 1];
    
    // Only merge text segments with same render mode
    if (last && 
        last.type === segment.type && 
        last.renderMode === segment.renderMode &&
        segment.type === 'text' &&
        !segment.hasFormatting && !last.hasFormatting) {
      last.content += '\n' + segment.content;
    } else {
      merged.push({ ...segment });
    }
  }
  
  return merged;
}

/**
 * Calculate total estimated render time for a content string
 */
export function estimateRenderTime(content: string): number {
  const segments = analyzeContent(content);
  let totalTime = 0;
  
  for (const segment of segments) {
    const elementCount = countElements(segment);
    totalTime += elementCount * segment.delay;
  }
  
  return totalTime;
}

/**
 * Count renderable elements in a segment
 */
function countElements(segment: ContentSegment): number {
  switch (segment.renderMode) {
    case 'character':
      return segment.content.length;
    case 'token':
      return segment.content.split(/\s+/).length;
    case 'line':
      return segment.content.split('\n').length;
    case 'instant':
      return 1;
    default:
      return segment.content.length;
  }
}

/**
 * Get adaptive speed recommendation based on content analysis
 */
export function getAdaptiveSpeed(content: string): { speed: number; mode: RenderMode } {
  const segments = analyzeContent(content);
  
  // Calculate weighted average based on content types
  let totalWeight = 0;
  let weightedSpeed = 0;
  
  for (const segment of segments) {
    const weight = segment.content.length;
    totalWeight += weight;
    weightedSpeed += segment.delay * weight;
  }
  
  const avgDelay = totalWeight > 0 ? weightedSpeed / totalWeight : DEFAULT_DELAYS.character;
  
  // Determine mode based on dominant segment type
  const typeCounts: Record<SegmentType, number> = {
    text: 0, code: 0, reasoning: 0, table: 0, list: 0, heading: 0, newline: 0,
  };
  
  for (const segment of segments) {
    typeCounts[segment.type] += segment.content.length;
  }
  
  const dominantType = (Object.keys(typeCounts) as SegmentType[])
    .reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b);
  
  const modeMap: Record<SegmentType, RenderMode> = {
    text: 'character',
    code: 'line',
    reasoning: 'character',
    table: 'instant',
    list: 'token',
    heading: 'token',
    newline: 'instant',
  };
  
  return {
    speed: Math.round(avgDelay),
    mode: modeMap[dominantType],
  };
}

/**
 * Preprocess content for optimal streaming
 * - Normalizes line endings
 * - Detects and marks special content
 * - Returns preprocessed string
 */
export function preprocessContent(content: string): string {
  return content
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Ensure code blocks are properly terminated
    .replace(/```(\w*)\n[\s\S]*?(```|$)/g, (match, lang, end) => {
      if (!end) return match + '\n```';
      return match;
    });
}
