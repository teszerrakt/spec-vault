import { convertToOpenAPI } from '@/lib/ai/converter'
import type {
  ConversionResult,
  ImportSource,
  ImportSourceType,
  ParsedImportSource,
} from '@/types/import'
import { arrayBufferToBase64, processImageSource } from './image-processor'

/**
 * Accepted file extensions for upload.
 * No Excel due to multi-tab complexity - AI handles text formats directly.
 */
export const ACCEPTED_EXTENSIONS = '.json,.csv,.png,.jpg,.jpeg,.gif,.webp,.txt,.md'

/**
 * Maximum file size (10MB for all types).
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * MIME types that should be treated as images.
 */
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

/**
 * File extensions that should be treated as images.
 */
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp'])

/**
 * Detect if content is an image based on file name or MIME type.
 */
export function isImageSource(fileName?: string, mimeType?: string): boolean {
  if (mimeType && IMAGE_MIME_TYPES.has(mimeType)) {
    return true
  }

  if (fileName) {
    const ext = `.${fileName.split('.').pop()?.toLowerCase()}`
    if (IMAGE_EXTENSIONS.has(ext)) {
      return true
    }
  }

  return false
}

/**
 * Detect source type from file name or MIME type.
 * Returns 'image' for image files, 'text' for everything else.
 */
export function detectSourceType(fileName?: string, mimeType?: string): ImportSourceType {
  return isImageSource(fileName, mimeType) ? 'image' : 'text'
}

/**
 * Validate file size.
 */
export function validateFileSize(
  size: number,
  _sourceType?: ImportSourceType
): { valid: boolean; error?: string } {
  if (size > MAX_FILE_SIZE) {
    const sizeMB = (size / (1024 * 1024)).toFixed(2)
    const limitMB = MAX_FILE_SIZE / (1024 * 1024)
    return {
      valid: false,
      error: `File size (${sizeMB}MB) exceeds maximum allowed size (${limitMB}MB)`,
    }
  }

  return { valid: true }
}

/**
 * Parse an import source based on its type.
 */
export function parseImportSource(source: ImportSource): ParsedImportSource {
  if (source.type === 'image') {
    return processImageSource(source)
  }

  // For text, just pass through
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

  const sizeValidation = validateFileSize(contentSize)
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

  // Handle image sources - need base64 for vision
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

  // For text, send to AI directly
  return convertToOpenAPI({
    sourceType: 'text',
    textContent: parsed.textContent,
  })
}

/**
 * Create an ImportSource from a File object.
 */
export async function createImportSourceFromFile(file: File): Promise<ImportSource> {
  const sourceType = detectSourceType(file.name, file.type)

  // Read file content
  const buffer = await file.arrayBuffer()

  // For text formats, convert to string
  const content = sourceType === 'text' ? new TextDecoder().decode(buffer) : buffer

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
 * Get accepted MIME types for file input.
 */
export function getAcceptedMimeTypes(): string {
  return 'application/json,text/csv,text/plain,text/markdown,image/jpeg,image/png,image/gif,image/webp'
}

/**
 * Get accepted file extensions for file input.
 */
export function getAcceptedExtensions(): string {
  return ACCEPTED_EXTENSIONS
}
