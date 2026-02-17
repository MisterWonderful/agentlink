import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

/**
 * Formatting Utilities
 * 
 * A collection of formatting functions for dates, numbers, and text
 * used throughout the AgentLink application.
 */

/**
 * Format a date as a relative time string (e.g., "2 minutes ago", "3 hours ago")
 * 
 * @param date - The date to format (Date object or ISO string)
 * @returns A human-readable relative time string
 * 
 * @example
 * formatRelativeTime(new Date()) // "less than a minute ago"
 * formatRelativeTime('2024-01-01T00:00:00Z') // "2 months ago"
 */
export function formatRelativeTime(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(parsedDate)) {
    return 'Invalid date';
  }

  const now = new Date();
  const diffInMs = now.getTime() - parsedDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

  // For very recent times, show relative
  if (diffInMinutes < 1) {
    return 'just now';
  }

  // For times within the last hour, show minutes
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  // For times within the last 24 hours, show hours
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  // For times within the last 7 days, show days
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  // For older dates, show the full date
  return format(parsedDate, 'MMM d, yyyy');
}

/**
 * Format a date for display in conversation lists
 * Shows time for today, day name for this week, or date for older
 * 
 * @param date - The date to format
 * @returns Formatted date string appropriate for the timeframe
 */
export function formatMessageDate(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(parsedDate)) {
    return 'Invalid date';
  }

  const now = new Date();
  const isToday = format(parsedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
  const isThisWeek = 
    parsedDate > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (isToday) {
    return format(parsedDate, 'h:mm a');
  }

  if (isThisWeek) {
    return format(parsedDate, 'EEE');
  }

  return format(parsedDate, 'MMM d');
}

/**
 * Format a full date and time for detailed display
 * 
 * @param date - The date to format
 * @returns Full date and time string
 */
export function formatFullDateTime(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(parsedDate)) {
    return 'Invalid date';
  }

  return format(parsedDate, "MMM d, yyyy 'at' h:mm a");
}

/**
 * Format latency in milliseconds to a human-readable string
 * 
 * @param ms - Latency in milliseconds
 * @returns Formatted latency string with appropriate unit
 * 
 * @example
 * formatLatency(50) // "50ms"
 * formatLatency(1500) // "1.5s"
 * formatLatency(60000) // "60s"
 */
export function formatLatency(ms: number): string {
  if (ms < 0) {
    return '--';
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * Truncate text to a maximum length with ellipsis
 * 
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @param ellipsis - The ellipsis string (default: '...')
 * @returns Truncated text
 * 
 * @example
 * truncateText('Hello World', 8) // "Hello..."
 * truncateText('Hello', 10) // "Hello"
 */
export function truncateText(
  text: string, 
  maxLength: number, 
  ellipsis: string = '...'
): string {
  if (!text || text.length <= maxLength) {
    return text || '';
  }

  const truncateAt = maxLength - ellipsis.length;
  if (truncateAt <= 0) {
    return ellipsis.slice(0, maxLength);
  }

  return text.slice(0, truncateAt) + ellipsis;
}

/**
 * Truncate text from the middle (useful for IDs and hashes)
 * 
 * @param text - The text to truncate
 * @param startChars - Number of characters to keep at the start
 * @param endChars - Number of characters to keep at the end
 * @returns Middle-truncated text
 * 
 * @example
 * truncateMiddle('abcdef123456', 3, 3) // "abc...456"
 */
export function truncateMiddle(
  text: string, 
  startChars: number = 6, 
  endChars: number = 4
): string {
  if (!text || text.length <= startChars + endChars + 3) {
    return text || '';
  }

  return `${text.slice(0, startChars)}...${text.slice(-endChars)}`;
}

/**
 * Generate a conversation title from the first message
 * 
 * @param message - The message content to generate title from
 * @param maxLength - Maximum length of the title (default: 30)
 * @returns Generated title
 * 
 * @example
 * generateConversationTitle('Hello, how can I help you today?') // "Hello, how can I help you..."
 * generateConversationTitle('Code review for PR #123') // "Code review for PR #123"
 */
export function generateConversationTitle(message: string, maxLength: number = 30): string {
  if (!message) {
    return 'New Conversation';
  }

  // Remove extra whitespace and normalize
  const cleanMessage = message.trim().replace(/\s+/g, ' ');
  
  // Take first line if multi-line
  const firstLine = cleanMessage.split('\n')[0];
  
  // Truncate with ellipsis if needed
  return truncateText(firstLine, maxLength);
}

/**
 * Format a number with commas as thousands separators
 * 
 * @param num - The number to format
 * @returns Formatted number string
 * 
 * @example
 * formatNumber(1234567) // "1,234,567"
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Format file size in bytes to human-readable string
 * 
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Human-readable file size
 * 
 * @example
 * formatFileSize(1024) // "1 KB"
 * formatFileSize(1234567) // "1.18 MB"
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format token count for display
 * 
 * @param count - Number of tokens
 * @returns Formatted token count with appropriate suffix
 * 
 * @example
 * formatTokenCount(1500) // "1.5k"
 * formatTokenCount(1500000) // "1.5M"
 */
export function formatTokenCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  }

  if (count < 1000000) {
    return `${(count / 1000).toFixed(1)}k`;
  }

  return `${(count / 1000000).toFixed(1)}M`;
}

/**
 * Format a duration in milliseconds to a readable string
 * 
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 * 
 * @example
 * formatDuration(65000) // "1m 5s"
 * formatDuration(3600000) // "1h 0m"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }

  return `${seconds}s`;
}

/**
 * Capitalize the first letter of a string
 * 
 * @param str - The string to capitalize
 * @returns Capitalized string
 * 
 * @example
 * capitalize('hello world') // "Hello world"
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a string to title case
 * 
 * @param str - The string to convert
 * @returns Title-cased string
 * 
 * @example
 * toTitleCase('hello world') // "Hello World"
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => capitalize(word.toLowerCase()))
    .join(' ');
}
