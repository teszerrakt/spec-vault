import Papa from 'papaparse'
import type { ParsedImportSource, ImportSource } from '@/types/import'

/**
 * Result of CSV parsing with metadata.
 */
export interface CsvParseResult {
  /** Parsed rows as objects (if headers exist) or arrays */
  data: Record<string, string>[] | string[][]
  /** Column headers if detected */
  headers?: string[]
  /** Number of rows (excluding header) */
  rowCount: number
  /** Number of columns */
  columnCount: number
  /** Human-readable representation for AI */
  textRepresentation: string
  /** Detected CSV type based on headers */
  csvType: 'endpoint-list' | 'schema-definition' | 'data-sample' | 'unknown'
}

/**
 * Headers that suggest API endpoint definitions.
 */
const ENDPOINT_HEADERS = ['method', 'path', 'endpoint', 'url', 'route', 'http_method', 'api_method']

/**
 * Headers that suggest schema definitions.
 */
const SCHEMA_HEADERS = ['field', 'column', 'property', 'attribute', 'name', 'type', 'data_type', 'datatype']

/**
 * Parse CSV content and analyze its structure.
 */
export function parseCsvContent(content: string): CsvParseResult {
  const parseResult = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  })

  const headers = parseResult.meta.fields || []
  const data = parseResult.data
  const csvType = detectCsvType(headers)

  return {
    data,
    headers,
    rowCount: data.length,
    columnCount: headers.length,
    textRepresentation: generateTextRepresentation(data, headers, csvType),
    csvType,
  }
}

/**
 * Parse a CSV import source.
 */
export function parseCsvSource(source: ImportSource): ParsedImportSource {
  const content = typeof source.content === 'string' ? source.content : new TextDecoder().decode(source.content)

  try {
    const result = parseCsvContent(content)

    return {
      source,
      textContent: result.textRepresentation,
      structuredData: {
        data: result.data,
        headers: result.headers,
        rowCount: result.rowCount,
        columnCount: result.columnCount,
        csvType: result.csvType,
      },
    }
  } catch (error) {
    throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Detect what type of CSV data we're dealing with.
 */
function detectCsvType(headers: string[]): CsvParseResult['csvType'] {
  const lowerHeaders = headers.map((h) => h.toLowerCase())

  // Check for endpoint list patterns
  const hasEndpointHeaders = ENDPOINT_HEADERS.some((h) => lowerHeaders.includes(h))
  if (hasEndpointHeaders) {
    return 'endpoint-list'
  }

  // Check for schema definition patterns
  const hasSchemaHeaders = SCHEMA_HEADERS.some((h) => lowerHeaders.includes(h))
  if (hasSchemaHeaders) {
    return 'schema-definition'
  }

  // If neither, treat as data sample
  return 'data-sample'
}

/**
 * Generate a human-readable text representation of the CSV.
 */
function generateTextRepresentation(
  data: Record<string, string>[],
  headers: string[],
  csvType: CsvParseResult['csvType']
): string {
  const lines: string[] = []

  lines.push(`CSV Structure Type: ${csvType}`)
  lines.push(`Columns (${headers.length}): ${headers.join(', ')}`)
  lines.push(`Rows: ${data.length}`)
  lines.push('')

  // Provide context based on detected type
  switch (csvType) {
    case 'endpoint-list':
      lines.push('This CSV appears to define API endpoints.')
      lines.push('Each row likely represents an API endpoint with method, path, and other details.')
      break
    case 'schema-definition':
      lines.push('This CSV appears to define data schemas or models.')
      lines.push('Each row likely represents a field/property with its type and constraints.')
      break
    case 'data-sample':
      lines.push('This CSV appears to contain sample data.')
      lines.push('Use this to infer the data schema for API responses.')
      break
    default:
      lines.push('CSV type could not be determined.')
  }

  lines.push('')
  lines.push('Data:')
  lines.push('')

  // Include all rows up to a reasonable limit
  const MAX_ROWS = 100
  const rowsToShow = data.slice(0, MAX_ROWS)

  // Format as a table
  lines.push('| ' + headers.join(' | ') + ' |')
  lines.push('| ' + headers.map(() => '---').join(' | ') + ' |')

  for (const row of rowsToShow) {
    const values = headers.map((h) => row[h] || '')
    lines.push('| ' + values.join(' | ') + ' |')
  }

  if (data.length > MAX_ROWS) {
    lines.push('')
    lines.push(`... and ${data.length - MAX_ROWS} more rows`)
  }

  return lines.join('\n')
}

/**
 * Extract endpoints from a CSV that appears to be an endpoint list.
 */
export function extractEndpointsFromCsv(data: Record<string, string>[]): Array<{ method: string; path: string; description?: string }> {
  const endpoints: Array<{ method: string; path: string; description?: string }> = []

  for (const row of data) {
    // Find method column
    const methodKey = Object.keys(row).find((k) =>
      ['method', 'http_method', 'api_method', 'verb'].includes(k.toLowerCase())
    )

    // Find path column
    const pathKey = Object.keys(row).find((k) =>
      ['path', 'endpoint', 'url', 'route', 'uri'].includes(k.toLowerCase())
    )

    // Find description column
    const descKey = Object.keys(row).find((k) =>
      ['description', 'desc', 'summary', 'name', 'title'].includes(k.toLowerCase())
    )

    if (methodKey && pathKey && row[methodKey] && row[pathKey]) {
      endpoints.push({
        method: row[methodKey].toUpperCase(),
        path: row[pathKey],
        description: descKey ? row[descKey] : undefined,
      })
    }
  }

  return endpoints
}
