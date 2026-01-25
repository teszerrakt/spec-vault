import { convertToOpenAPI } from '@/lib/ai/converter'
import type {
  ConversionResult,
  ImportSource,
  ImportSourceType,
  ParsedImportSource,
} from '@/types/import'
import { parseCsvSource } from './csv-parser'
import { parseExcelSource } from './excel-parser'
import { arrayBufferToBase64, processImageSource } from './image-processor'
import { parseJsonSource } from './json-parser'

/**
 * File size limits per type (in bytes).
 */
export const FILE_SIZE_LIMITS: Record<ImportSourceType, number> = {
  json: 10 * 1024 * 1024, // 10MB
  csv: 10 * 1024 * 1024, // 10MB
  excel: 25 * 1024 * 1024, // 25MB
  image: 10 * 1024 * 1024, // 10MB
  text: 10 * 1024 * 1024, // 10MB
}

/**
 * MIME type to source type mapping.
 */
export const MIME_TYPE_MAP: Record<string, ImportSourceType> = {
  'application/json': 'json',
  'text/csv': 'csv',
  'application/vnd.ms-excel': 'excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'text/plain': 'text',
}

/**
 * File extension to source type mapping.
 */
export const EXTENSION_MAP: Record<string, ImportSourceType> = {
  '.json': 'json',
  '.csv': 'csv',
  '.xls': 'excel',
  '.xlsx': 'excel',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
  '.gif': 'image',
  '.webp': 'image',
  '.txt': 'text',
  '.md': 'text',
}

/**
 * Detect source type from file name or MIME type.
 */
export function detectSourceType(fileName?: string, mimeType?: string): ImportSourceType | null {
  // Try MIME type first
  if (mimeType && mimeType in MIME_TYPE_MAP) {
    return MIME_TYPE_MAP[mimeType]
  }

  // Fall back to file extension
  if (fileName) {
    const ext = `.${fileName.split('.').pop()?.toLowerCase()}`
    if (ext in EXTENSION_MAP) {
      return EXTENSION_MAP[ext]
    }
  }

  return null
}

/**
 * Validate file size against limits.
 */
export function validateFileSize(
  size: number,
  sourceType: ImportSourceType
): { valid: boolean; error?: string } {
  const limit = FILE_SIZE_LIMITS[sourceType]

  if (size > limit) {
    const limitMB = limit / (1024 * 1024)
    const sizeMB = (size / (1024 * 1024)).toFixed(2)
    return {
      valid: false,
      error: `File size (${sizeMB}MB) exceeds maximum allowed size for ${sourceType} files (${limitMB}MB)`,
    }
  }

  return { valid: true }
}

/**
 * Parse an import source based on its type.
 */
export function parseImportSource(source: ImportSource): ParsedImportSource {
  switch (source.type) {
    case 'json':
      return parseJsonSource(source)
    case 'csv':
      return parseCsvSource(source)
    case 'excel':
      return parseExcelSource(source)
    case 'image':
      return processImageSource(source)
    case 'text':
      return parseTextSource(source)
    default:
      throw new Error(`Unsupported source type: ${source.type}`)
  }
}

/**
 * Parse plain text source.
 */
function parseTextSource(source: ImportSource): ParsedImportSource {
  const content =
    typeof source.content === 'string' ? source.content : new TextDecoder().decode(source.content)

  return {
    source,
    textContent: content,
    structuredData: null,
  }
}

/**
 * Process an import source and convert to OpenAPI.
 */
export async function processImport(source: ImportSource): Promise<ConversionResult> {
  // Validate file size
  const contentSize =
    typeof source.content === 'string'
      ? new TextEncoder().encode(source.content).length
      : source.content.byteLength

  const sizeValidation = validateFileSize(contentSize, source.type)
  if (!sizeValidation.valid) {
    return {
      yaml: '',
      isValid: false,
      errors: [sizeValidation.error!],
      model: 'none',
      processingTimeMs: 0,
    }
  }

  // Parse the source
  const parsed = parseImportSource(source)

  // Handle image sources differently - need base64 for vision
  if (source.type === 'image') {
    const buffer = typeof source.content === 'string' ? null : source.content
    if (!buffer) {
      return {
        yaml: '',
        isValid: false,
        errors: ['Image content must be provided as ArrayBuffer'],
        model: 'none',
        processingTimeMs: 0,
      }
    }

    return convertToOpenAPI({
      sourceType: 'image',
      imageData: arrayBufferToBase64(buffer),
      imageMimeType: source.mimeType,
    })
  }

  // For all other types, use text content
  return convertToOpenAPI({
    sourceType: source.type,
    textContent: parsed.textContent,
  })
}

/**
 * Create an ImportSource from a File object.
 */
export async function createImportSourceFromFile(file: File): Promise<ImportSource> {
  const sourceType = detectSourceType(file.name, file.type)

  if (!sourceType) {
    throw new Error(`Unsupported file type: ${file.type || file.name}`)
  }

  // Read file content
  const buffer = await file.arrayBuffer()

  // For text-based formats, convert to string
  const isTextBased = ['json', 'csv', 'text'].includes(sourceType)
  const content = isTextBased ? new TextDecoder().decode(buffer) : buffer

  return {
    type: sourceType,
    fileName: file.name,
    content,
    mimeType: file.type,
  }
}

/**
 * Create an ImportSource from plain text.
 */
export function createImportSourceFromText(
  text: string,
  sourceType: ImportSourceType = 'text'
): ImportSource {
  return {
    type: sourceType,
    content: text,
  }
}

/**
 * Get human-readable description of a source type.
 */
export function getSourceTypeDescription(type: ImportSourceType): string {
  switch (type) {
    case 'json':
      return 'JSON file (API responses, schemas, or partial OpenAPI specs)'
    case 'csv':
      return 'CSV file (endpoint lists, schema definitions, or data samples)'
    case 'excel':
      return 'Excel file (spreadsheets with API documentation)'
    case 'image':
      return 'Image file (screenshots of API docs, diagrams)'
    case 'text':
      return 'Plain text (informal API descriptions, requirements)'
    default:
      return 'Unknown file type'
  }
}

/**
 * Get accepted MIME types for file input.
 */
export function getAcceptedMimeTypes(): string {
  return Object.keys(MIME_TYPE_MAP).join(',')
}

/**
 * Get accepted file extensions for file input.
 */
export function getAcceptedExtensions(): string {
  return Object.keys(EXTENSION_MAP).join(',')
}
