import type { ParsedImportSource, ImportSource } from '@/types/import'

/**
 * Result of JSON parsing with structural analysis.
 */
export interface JsonParseResult {
  /** The parsed JSON data */
  data: unknown
  /** Human-readable representation for AI */
  textRepresentation: string
  /** Detected structure type */
  structureType: 'openapi' | 'api-response' | 'schema' | 'array' | 'object' | 'unknown'
  /** Number of top-level keys (for objects) */
  topLevelKeyCount?: number
  /** Array length (for arrays) */
  arrayLength?: number
}

/**
 * Parse JSON content and analyze its structure.
 */
export function parseJsonContent(content: string): JsonParseResult {
  const data = JSON.parse(content)
  const structureType = detectStructureType(data)

  return {
    data,
    textRepresentation: generateTextRepresentation(data, structureType),
    structureType,
    topLevelKeyCount: typeof data === 'object' && data !== null && !Array.isArray(data) ? Object.keys(data).length : undefined,
    arrayLength: Array.isArray(data) ? data.length : undefined,
  }
}

/**
 * Parse a JSON import source.
 */
export function parseJsonSource(source: ImportSource): ParsedImportSource {
  const content = typeof source.content === 'string' ? source.content : new TextDecoder().decode(source.content)

  try {
    const result = parseJsonContent(content)

    return {
      source,
      textContent: result.textRepresentation,
      structuredData: result.data,
    }
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Detect what type of JSON structure we're dealing with.
 */
function detectStructureType(data: unknown): JsonParseResult['structureType'] {
  if (typeof data !== 'object' || data === null) {
    return 'unknown'
  }

  if (Array.isArray(data)) {
    return 'array'
  }

  const obj = data as Record<string, unknown>

  // Check for OpenAPI spec markers
  if ('openapi' in obj || 'swagger' in obj) {
    return 'openapi'
  }

  // Check for common API response patterns
  if ('data' in obj || 'results' in obj || 'items' in obj || 'response' in obj) {
    return 'api-response'
  }

  // Check for JSON Schema markers
  if ('$schema' in obj || 'type' in obj || 'properties' in obj) {
    return 'schema'
  }

  return 'object'
}

/**
 * Generate a human-readable text representation of the JSON.
 */
function generateTextRepresentation(data: unknown, structureType: JsonParseResult['structureType']): string {
  const lines: string[] = []

  lines.push(`JSON Structure Type: ${structureType}`)
  lines.push('')

  if (structureType === 'openapi') {
    lines.push('This appears to be an OpenAPI/Swagger specification.')
    lines.push('')
  }

  // Pretty print the JSON with reasonable depth
  const jsonStr = JSON.stringify(data, null, 2)

  // If the JSON is very large, truncate it for the AI
  const MAX_LENGTH = 50000
  if (jsonStr.length > MAX_LENGTH) {
    lines.push('Note: JSON content truncated due to size.')
    lines.push('')
    lines.push(jsonStr.slice(0, MAX_LENGTH) + '\n... (truncated)')
  } else {
    lines.push(jsonStr)
  }

  return lines.join('\n')
}

/**
 * Extract potential API endpoints from JSON data.
 */
export function extractEndpointsFromJson(data: unknown): string[] {
  const endpoints: string[] = []

  function traverse(obj: unknown, path: string[] = []): void {
    if (typeof obj !== 'object' || obj === null) {
      return
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => traverse(item, [...path, `[${index}]`]))
      return
    }

    const record = obj as Record<string, unknown>

    // Look for URL-like keys or values
    for (const [key, value] of Object.entries(record)) {
      // Check if key looks like an HTTP method
      if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(key.toLowerCase())) {
        const pathStr = '/' + path.filter((p) => !p.startsWith('[')).join('/')
        if (!endpoints.includes(pathStr)) {
          endpoints.push(pathStr)
        }
      }

      // Check if key is 'path', 'endpoint', 'url', 'route'
      if (['path', 'endpoint', 'url', 'route'].includes(key.toLowerCase()) && typeof value === 'string') {
        if (value.startsWith('/') && !endpoints.includes(value)) {
          endpoints.push(value)
        }
      }

      traverse(value, [...path, key])
    }
  }

  traverse(data)
  return endpoints
}
