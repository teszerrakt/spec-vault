'use client'

import { useImportCleanup } from '@/hooks/use-import-cleanup'

/**
 * Client component that runs import cleanup on mount.
 * Include this component once in the app layout.
 */
export function ImportCleanupProvider({ children }: { children: React.ReactNode }) {
  useImportCleanup()
  return <>{children}</>
}
