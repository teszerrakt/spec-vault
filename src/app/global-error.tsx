'use client'

import { ErrorBoundary } from '@/components/error-boundary'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <ErrorBoundary
          error={error}
          reset={reset}
          title="Application Error"
          description="A critical error occurred. Please refresh the page or try again later."
          showHomeButton={true}
        />
      </body>
    </html>
  )
}
