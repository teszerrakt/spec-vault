/**
 * Supported import source types.
 * Simplified: AI handles all text formats, 'image' for vision processing.
 */
export type ImportSourceType = 'image' | 'text'

/**
 * Import source - ephemeral, stored only in wizard state during import flow.
 */
export interface ImportSource {
  /** Type of the source file */
  type: ImportSourceType
  /** Original file name */
  fileName?: string
  /** File content - string for text formats, ArrayBuffer for binary */
  content: string | ArrayBuffer
  /** MIME type of the file */
  mimeType?: string
}

/**
 * Result of parsing an import source.
 */
export interface ParsedImportSource {
  /** The original import source */
  source: ImportSource
  /** Extracted text content for AI processing */
  textContent: string
  /** Structured data if applicable (e.g., parsed JSON, CSV rows) */
  structuredData?: unknown
}

/**
 * Import processing status.
 */
export type ImportStatus =
  | 'idle'
  | 'uploading'
  | 'parsing'
  | 'converting'
  | 'validating'
  | 'complete'
  | 'error'

/**
 * Result of the AI conversion process.
 */
export interface ConversionResult {
  /** Generated OpenAPI YAML */
  yaml: string
  /** Whether the generated spec is valid */
  isValid: boolean
  /** Validation errors if any */
  errors?: string[]
  /** AI model used for conversion */
  model: string
  /** Processing time in milliseconds */
  processingTimeMs: number
}
