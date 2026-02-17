'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Root Error Boundary
 * 
 * Catches errors at the root level and displays a friendly error message
 * with a retry button to attempt recovery.
 */
export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps): React.ReactElement {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Root error boundary caught error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md"
      >
        <div className="text-center space-y-6">
          {/* Error Icon */}
          <div className="mx-auto h-16 w-16 rounded-full bg-error/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-error" />
          </div>

          {/* Error Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Something went wrong
            </h1>
            <p className="text-muted-foreground">
              We&apos;re sorry, but we encountered an unexpected error. 
              Please try again or refresh the page.
            </p>
          </div>

          {/* Error Details (collapsible in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-left">
              <details className="group">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Error details
                </summary>
                <div className="mt-2 p-3 rounded-lg bg-surface text-xs font-mono text-error overflow-auto max-h-40">
                  <p className="font-semibold">{error.message}</p>
                  {error.stack && (
                    <pre className="mt-2 text-muted-foreground whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  )}
                  {error.digest && (
                    <p className="mt-2 text-muted-foreground">
                      Digest: {error.digest}
                    </p>
                  )}
                </div>
              </details>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>

          {/* Help Link */}
          <p className="text-xs text-muted-foreground">
            If the problem persists, please{' '}
            <a 
              href="https://github.com/agentlink/agentlink/issues" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              report an issue
            </a>
            .
          </p>
        </div>
      </motion.div>
    </div>
  );
}
