'use client'

import { ErrorBoundary } from '@/components/error-boundary'

export default function SettingsError({
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
      title="Settings Error"
      description="Failed to load or save settings. Please check your permissions and try again."
    />
  )
}
