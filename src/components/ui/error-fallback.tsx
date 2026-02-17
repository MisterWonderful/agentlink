'use client';

import { AlertCircle, RefreshCw, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface ErrorFallbackProps {
  title?: string;
  message?: string;
  error?: Error | null;
  onRetry?: () => void;
  onReset?: () => void;
  showDetails?: boolean;
}

/**
 * Reusable Error Fallback Component
 * 
 * A flexible error display component that can be used throughout the app
 * for handling errors in various contexts (data fetching, form submission, etc.)
 */
export function ErrorFallback({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  error = null,
  onRetry,
  onReset,
  showDetails = true,
}: ErrorFallbackProps): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="rounded-lg border border-error/20 bg-error/5 p-6 text-center">
        {/* Icon */}
        <div className="mx-auto h-12 w-12 rounded-full bg-error/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6 text-error" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-medium text-foreground mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
          {message}
        </p>

        {/* Error Details */}
        {showDetails && error && (
          <div className="mb-4">
            <details className="group text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2">
                <Bug className="h-4 w-4" />
                Error details
              </summary>
              <div className="mt-2 p-3 rounded bg-surface text-xs font-mono text-error overflow-auto max-h-32">
                <p className="font-semibold">{error.message}</p>
                {error.stack && process.env.NODE_ENV === 'development' && (
                  <pre className="mt-2 text-muted-foreground whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {onRetry && (
            <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          )}
          {onReset && (
            <Button onClick={onReset} size="sm">
              Reset
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Compact Error Fallback
 * 
 * A smaller version for inline error display.
 */
export function CompactErrorFallback({
  message = 'Error occurred',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-error/10 text-error text-sm">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="h-auto py-1 px-2">
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Inline Error Message
 * 
 * Simple inline error text for form fields and small areas.
 */
export function InlineError({ message }: { message: string }): React.ReactElement {
  return (
    <span className="text-xs text-error flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {message}
    </span>
  );
}
