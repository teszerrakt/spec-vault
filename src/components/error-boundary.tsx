'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  description?: string
  showHomeButton?: boolean
}

/**
 * Reusable error boundary UI component.
 * Used by Next.js error.tsx files to display a consistent error UI.
 */
export function ErrorBoundary({
  error,
  reset,
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  showHomeButton = true,
}: ErrorBoundaryProps) {
  useEffect(() => {
    // Log the error to console in development
    console.error('Error boundary caught:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {process.env.NODE_ENV === 'development' && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium text-destructive">{error.name}</p>
              <p className="mt-1 text-muted-foreground break-words">{error.message}</p>
              {error.digest && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-2">
          <Button onClick={reset} variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          {showHomeButton && (
            <Button variant="outline" asChild>
              <a href="/contracts">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </a>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
