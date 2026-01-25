'use client'

import { useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorDisplayProps {
  error: Error | string
  className?: string
  onRetry?: () => void
}

export function ErrorDisplay({ error, className, onRetry }: ErrorDisplayProps) {
  const message = typeof error === 'string' ? error : error.message

  return (
    <Alert variant="destructive" className={cn('', className)}>
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

interface ErrorBoundaryFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export function ErrorBoundaryFallback({ error, resetErrorBoundary }: ErrorBoundaryFallbackProps) {
  useEffect(() => {
    // Log error to console in development
    console.error('Error boundary caught:', error)
  }, [error])

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h2 className="mb-2 text-lg font-semibold">Something went wrong</h2>
        <p className="mb-4 text-sm text-muted-foreground">{error.message}</p>
        <Button onClick={resetErrorBoundary}>Try Again</Button>
      </div>
    </div>
  )
}

interface PageErrorProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function PageError({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}: PageErrorProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mb-4 text-4xl">:(</div>
        <h2 className="mb-2 text-lg font-semibold">{title}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{message}</p>
        {onRetry && <Button onClick={onRetry}>Try Again</Button>}
      </div>
    </div>
  )
}

interface NotFoundProps {
  title?: string
  message?: string
  backHref?: string
  backLabel?: string
}

export function NotFound({
  title = 'Not Found',
  message = 'The resource you are looking for does not exist.',
  backHref = '/',
  backLabel = 'Go Home',
}: NotFoundProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mb-4 text-6xl font-bold text-muted-foreground">404</div>
        <h2 className="mb-2 text-lg font-semibold">{title}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{message}</p>
        <Button asChild>
          <a href={backHref}>{backLabel}</a>
        </Button>
      </div>
    </div>
  )
}
