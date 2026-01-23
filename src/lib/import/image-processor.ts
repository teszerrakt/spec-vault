import type { ParsedImportSource, ImportSource } from '@/types/import'

/**
 * Supported image MIME types.
 */
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const

export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number]

/**
 * Result of image processing.
 */
export interface ImageProcessResult {
  /** Base64 encoded image data */
  base64Data: string
  /** MIME type of the image */
  mimeType: SupportedImageType
  /** File name */
  fileName?: string
  /** Image size in bytes */
  sizeBytes: number
  /** Text content placeholder for non-vision processing */
  textContent: string
}

/**
 * Maximum image size (10MB as per spec).
 */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024

/**
 * Process an image file for AI vision processing.
 */
export function processImage(buffer: ArrayBuffer, mimeType: string, fileName?: string): ImageProcessResult {
  // Validate size
  if (buffer.byteLength > MAX_IMAGE_SIZE) {
    throw new Error(`Image size (${(buffer.byteLength / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (10MB)`)
  }

  // Validate MIME type
  if (!SUPPORTED_IMAGE_TYPES.includes(mimeType as SupportedImageType)) {
    throw new Error(`Unsupported image type: ${mimeType}. Supported types: ${SUPPORTED_IMAGE_TYPES.join(', ')}`)
  }

  // Convert to base64
  const base64Data = arrayBufferToBase64(buffer)

  return {
    base64Data,
    mimeType: mimeType as SupportedImageType,
    fileName,
    sizeBytes: buffer.byteLength,
    textContent: `[Image: ${fileName || 'uploaded image'}] (${mimeType}, ${(buffer.byteLength / 1024).toFixed(2)}KB)`,
  }
}

/**
 * Process an image import source.
 */
export function processImageSource(source: ImportSource): ParsedImportSource {
  const buffer = typeof source.content === 'string' ? base64ToArrayBuffer(source.content) : source.content

  const mimeType = source.mimeType || detectImageMimeType(buffer)

  try {
    const result = processImage(buffer, mimeType, source.fileName)

    return {
      source,
      textContent: result.textContent,
      structuredData: {
        base64Data: result.base64Data,
        mimeType: result.mimeType,
        sizeBytes: result.sizeBytes,
      },
    }
  } catch (error) {
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Convert ArrayBuffer to base64 string.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert base64 string to ArrayBuffer.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Detect image MIME type from magic bytes.
 */
export function detectImageMimeType(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer.slice(0, 12))

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png'
  }

  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return 'image/gif'
  }

  // WebP: 52 49 46 46 ... 57 45 42 50
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp'
  }

  return 'application/octet-stream'
}

/**
 * Check if a MIME type is a supported image type.
 */
export function isSupportedImageType(mimeType: string): mimeType is SupportedImageType {
  return SUPPORTED_IMAGE_TYPES.includes(mimeType as SupportedImageType)
}

/**
 * Get the file extension for a MIME type.
 */
export function getImageExtension(mimeType: SupportedImageType): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/gif':
      return 'gif'
    case 'image/webp':
      return 'webp'
    default:
      return 'bin'
  }
}
