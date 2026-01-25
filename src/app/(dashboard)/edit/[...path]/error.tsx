'use client'

import { ErrorBoundary } from '@/components/error-boundary'

export default function EditorError({
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
      title="Editor Error"
      description="Failed to load the contract editor. Your changes may not have been saved."
    />
  )
}
