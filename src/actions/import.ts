'use server'

import { auth } from '@/auth'
import { checkAIAvailability, convertToOpenAPI, refineOpenAPISpec } from '@/lib/ai/converter'
import { createImportSourceFromText, processImport, validateFileSize } from '@/lib/import'
import { arrayBufferToBase64 } from '@/lib/import/image-processor'
import type { ConversionResult, ImportSourceType } from '@/types/import'

/**
 * Process import data - handles the server-side import processing.
 *
 * Note: File uploads are handled client-side first due to Next.js Server Action
 * limitations with file streams. The client reads the file and sends content.
 */
export async function processImportAction(
  sourceType: ImportSourceType,
  content: string,
  fileName?: string
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

  try {
    const source = createImportSourceFromText(content, sourceType)
    if (fileName) {
      source.fileName = fileName
    }

    return await processImport(source)
  } catch (error) {
    return {
      yaml: '',
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      model: 'none',
      processingTimeMs: 0,
    }
  }
}

/**
 * Process an image import - receives base64 encoded image data.
 */
export async function processImageImportAction(
  base64Data: string,
  mimeType: string,
  _fileName?: string
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

  try {
    // Validate size (base64 is ~33% larger than binary)
    const approximateSize = (base64Data.length * 3) / 4
    const sizeValidation = validateFileSize(approximateSize, 'image')
    if (!sizeValidation.valid) {
      return {
        yaml: '',
        isValid: false,
        errors: [sizeValidation.error!],
        model: 'none',
        processingTimeMs: 0,
      }
    }

    return await convertToOpenAPI({
      sourceType: 'image',
      imageData: base64Data,
      imageMimeType: mimeType,
    })
  } catch (error) {
    return {
      yaml: '',
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      model: 'none',
      processingTimeMs: 0,
    }
  }
}

/**
 * Refine an existing OpenAPI spec based on user feedback.
 */
export async function refineSpecAction(
  currentSpec: string,
  feedback: string
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

  try {
    return await refineOpenAPISpec(currentSpec, feedback)
  } catch (error) {
    return {
      yaml: currentSpec,
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      model: 'none',
      processingTimeMs: 0,
    }
  }
}

/**
 * Check if AI service is available.
 */
export async function checkAIServiceAction(): Promise<{ available: boolean; error?: string }> {
  const session = await auth()
  if (!session) {
    return { available: false, error: 'Unauthorized - please sign in' }
  }

  return checkAIAvailability()
}

/**
 * Process a file uploaded via FormData.
 * This is an alternative to the content-based approach for larger files.
 */
export async function processFileImportAction(formData: FormData): Promise<ConversionResult> {
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

  try {
    const file = formData.get('file') as File | null
    const sourceType = formData.get('sourceType') as ImportSourceType | null

    if (!file) {
      return {
        yaml: '',
        isValid: false,
        errors: ['No file provided'],
        model: 'none',
        processingTimeMs: 0,
      }
    }

    if (!sourceType) {
      return {
        yaml: '',
        isValid: false,
        errors: ['Source type not specified'],
        model: 'none',
        processingTimeMs: 0,
      }
    }

    // Validate file size
    const sizeValidation = validateFileSize(file.size, sourceType)
    if (!sizeValidation.valid) {
      return {
        yaml: '',
        isValid: false,
        errors: [sizeValidation.error!],
        model: 'none',
        processingTimeMs: 0,
      }
    }

    // Handle image files specially
    if (sourceType === 'image') {
      const buffer = await file.arrayBuffer()
      const base64Data = arrayBufferToBase64(buffer)

      return await convertToOpenAPI({
        sourceType: 'image',
        imageData: base64Data,
        imageMimeType: file.type,
      })
    }

    // For text-based files, read as text
    const content = await file.text()
    const source = createImportSourceFromText(content, sourceType)
    source.fileName = file.name
    source.mimeType = file.type

    return await processImport(source)
  } catch (error) {
    return {
      yaml: '',
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      model: 'none',
      processingTimeMs: 0,
    }
  }
}
