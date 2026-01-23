import * as XLSX from 'xlsx'
import type { ParsedImportSource, ImportSource } from '@/types/import'

/**
 * Result of Excel parsing with metadata.
 */
export interface ExcelParseResult {
  /** Parsed sheets with their data */
  sheets: ExcelSheet[]
  /** Total number of sheets */
  sheetCount: number
  /** Human-readable representation for AI */
  textRepresentation: string
}

/**
 * Parsed Excel sheet.
 */
export interface ExcelSheet {
  /** Sheet name */
  name: string
  /** Parsed rows as objects (first row as headers) */
  data: Record<string, unknown>[]
  /** Column headers */
  headers: string[]
  /** Number of rows (excluding header) */
  rowCount: number
  /** Detected sheet type */
  sheetType: 'endpoint-list' | 'schema-definition' | 'data-sample' | 'unknown'
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
 * Parse Excel content and analyze its structure.
 */
export function parseExcelContent(buffer: ArrayBuffer): ExcelParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheets: ExcelSheet[] = []

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: '',
      raw: false,
    })

    // Get headers from the first row
    const headers = jsonData.length > 0 ? Object.keys(jsonData[0]).map((h) => h.toLowerCase().trim()) : []

    const sheetType = detectSheetType(headers)

    sheets.push({
      name: sheetName,
      data: jsonData,
      headers,
      rowCount: jsonData.length,
      sheetType,
    })
  }

  return {
    sheets,
    sheetCount: sheets.length,
    textRepresentation: generateTextRepresentation(sheets),
  }
}

/**
 * Parse an Excel import source.
 */
export function parseExcelSource(source: ImportSource): ParsedImportSource {
  const buffer = typeof source.content === 'string' ? new TextEncoder().encode(source.content).buffer : source.content

  try {
    const result = parseExcelContent(buffer)

    return {
      source,
      textContent: result.textRepresentation,
      structuredData: {
        sheets: result.sheets,
        sheetCount: result.sheetCount,
      },
    }
  } catch (error) {
    throw new Error(`Failed to parse Excel: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Detect what type of data a sheet contains.
 */
function detectSheetType(headers: string[]): ExcelSheet['sheetType'] {
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

  return 'data-sample'
}

/**
 * Generate a human-readable text representation of the Excel workbook.
 */
function generateTextRepresentation(sheets: ExcelSheet[]): string {
  const lines: string[] = []

  lines.push(`Excel Workbook with ${sheets.length} sheet(s)`)
  lines.push('')

  for (const sheet of sheets) {
    lines.push(`## Sheet: ${sheet.name}`)
    lines.push(`Type: ${sheet.sheetType}`)
    lines.push(`Columns (${sheet.headers.length}): ${sheet.headers.join(', ')}`)
    lines.push(`Rows: ${sheet.rowCount}`)
    lines.push('')

    // Provide context based on detected type
    switch (sheet.sheetType) {
      case 'endpoint-list':
        lines.push('This sheet appears to define API endpoints.')
        break
      case 'schema-definition':
        lines.push('This sheet appears to define data schemas or models.')
        break
      case 'data-sample':
        lines.push('This sheet appears to contain sample data.')
        break
      default:
        lines.push('Sheet type could not be determined.')
    }

    lines.push('')
    lines.push('Data:')
    lines.push('')

    // Include rows up to a reasonable limit
    const MAX_ROWS = 50
    const rowsToShow = sheet.data.slice(0, MAX_ROWS)

    // Format as a table
    if (sheet.headers.length > 0) {
      lines.push('| ' + sheet.headers.join(' | ') + ' |')
      lines.push('| ' + sheet.headers.map(() => '---').join(' | ') + ' |')

      for (const row of rowsToShow) {
        const values = sheet.headers.map((h) => String(row[h] ?? ''))
        lines.push('| ' + values.join(' | ') + ' |')
      }
    }

    if (sheet.rowCount > MAX_ROWS) {
      lines.push('')
      lines.push(`... and ${sheet.rowCount - MAX_ROWS} more rows`)
    }

    lines.push('')
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Extract endpoints from an Excel sheet that appears to be an endpoint list.
 */
export function extractEndpointsFromExcel(sheet: ExcelSheet): Array<{ method: string; path: string; description?: string }> {
  const endpoints: Array<{ method: string; path: string; description?: string }> = []

  for (const row of sheet.data) {
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
        method: String(row[methodKey]).toUpperCase(),
        path: String(row[pathKey]),
        description: descKey ? String(row[descKey]) : undefined,
      })
    }
  }

  return endpoints
}
