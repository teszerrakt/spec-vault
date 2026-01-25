'use client'

import { ErrorBoundary } from '@/components/error-boundary'

export default function ContractsError({
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
      title="Failed to Load Contracts"
      description="Unable to fetch the contract list. Please check your connection and try again."
    />
  )
}
