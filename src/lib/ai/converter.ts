/**
 * AI Converter - utility functions only.
 *
 * The actual AI generation is now done via streaming API routes:
 * - POST /api/generate - Text to OpenAPI
 * - POST /api/generate/image - Image to OpenAPI
 *
 * This file contains shared utilities used by those routes.
 */

/**
 * Clean up YAML output by removing markdown code blocks if present.
 */
export function cleanYamlOutput(text: string): string {
  let cleaned = text.trim()

  // Remove markdown code blocks
  if (cleaned.startsWith('```yaml')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```yml')) {
    cleaned = cleaned.slice(6)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }

  return cleaned.trim()
}
