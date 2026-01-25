'use client'

import { ErrorBoundary } from '@/components/error-boundary'

export default function ContractDetailError({
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
      title="Failed to Load Contract"
      description="Unable to fetch the contract details. The contract may not exist or you may not have access."
    />
  )
}
