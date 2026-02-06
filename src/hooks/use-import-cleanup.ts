'use client'

import { useEffect, useRef } from 'react'
import { cleanupExpiredSpecs } from '@/lib/import-db'

/**
 * Hook to clean up expired imported specs from IndexedDB.
 *
 * Call this once at the app root level to garbage collect old entries.
 * Only runs once per session (not on every mount).
 */
export function useImportCleanup() {
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    // Run cleanup asynchronously, don't block rendering
    cleanupExpiredSpecs().catch((error) => {
      // Log but don't throw - cleanup is best-effort
      console.warn('Failed to cleanup expired imports:', error)
    })
  }, [])
}
