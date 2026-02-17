'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface MainErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Main App Error Boundary
 * 
 * Catches errors within the main app layout and displays a user-friendly
 * error message with options to retry or navigate home.
 */
export default function MainErrorBoundary({ error, reset }: MainErrorBoundaryProps): React.ReactElement {
  useEffect(() => {
    console.error('Main app error boundary caught error:', error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg"
      >
        <Card className="border-error/20">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-error/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-error" />
            </div>
            <CardTitle className="text-xl">Application Error</CardTitle>
            <CardDescription>
              Something went wrong in the application. We&apos;ve logged the error and will look into it.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Error Message */}
            <div className="p-3 rounded-lg bg-surface text-sm text-muted-foreground">
              {error.message || 'An unexpected error occurred'}
            </div>

            {/* Error Details in Development */}
            {process.env.NODE_ENV === 'development' && error.stack && (
              <details className="group">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Stack trace
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-surface text-xs font-mono text-muted-foreground overflow-auto max-h-32">
                  {error.stack}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={reset} className="flex-1 gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Additional Help */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Error ID: {error.digest || 'unknown'} • 
          <Link href="/agents" className="text-accent hover:underline ml-1">
            View your agents
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
