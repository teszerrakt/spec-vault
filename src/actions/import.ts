'use server'

/**
 * Import actions - now handled via streaming API routes.
 *
 * The streaming endpoints are:
 * - POST /api/generate - Text to OpenAPI (streaming)
 * - POST /api/generate/image - Image to OpenAPI (streaming)
 *
 * These Server Actions are kept for potential future use (e.g., refine spec).
 */

import { auth } from '@/auth'
import type { ConversionResult } from '@/types/import'

/**
 * Placeholder for future refinement feature.
 * Currently not implemented - would need streaming version.
 */
export async function refineSpecAction(
  _currentSpec: string,
  _feedback: string
): Promise<ConversionResult> {
  const session = await auth()
  if (!session) {
    return {
      yaml: '',
      isValid: false,
      errors: ['Unauthorized - please sign in'],
      model: 'none',
      processingTimeMs: 0,
    }
  }

  // TODO: Implement streaming refinement endpoint
  return {
    yaml: '',
    isValid: false,
    errors: ['Refinement not yet implemented with streaming'],
    model: 'none',
    processingTimeMs: 0,
  }
}
