'use client'

import { ErrorBoundary } from '@/components/error-boundary'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorBoundary
      error={error}
      reset={reset}
      title="Dashboard Error"
      description="Failed to load the dashboard. Please try again."
    />
  )
}
