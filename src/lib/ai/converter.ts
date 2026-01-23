import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { ImportSourceType, ConversionResult } from '@/types/import'
import { SYSTEM_PROMPT, getUserPrompt, getRefinementPrompt, getImageExtractionPrompt } from './prompts'
import { validateOpenAPI } from '@/lib/openapi/validator'

/**
 * Options for the AI conversion process.
 */
export interface ConversionOptions {
  /** Source type of the input */
  sourceType: ImportSourceType
  /** Text content to convert (for non-image sources) */
  textContent?: string
  /** Base64 encoded image data (for image sources) */
  imageData?: string
  /** Image MIME type */
  imageMimeType?: string
  /** OpenAI model to use */
  model?: string
  /** Maximum tokens for response */
  maxTokens?: number
}

const DEFAULT_MODEL = 'gpt-4o'
const DEFAULT_MAX_TOKENS = 4096

/**
 * Convert input content to an OpenAPI specification using AI.
 */
export async function convertToOpenAPI(options: ConversionOptions): Promise<ConversionResult> {
  const startTime = Date.now()
  const model = options.model ?? DEFAULT_MODEL
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS

  try {
    let yaml: string

    if (options.sourceType === 'image' && options.imageData) {
      yaml = await convertImageToOpenAPI(options.imageData, options.imageMimeType, model, maxTokens)
    } else if (options.textContent) {
      yaml = await convertTextToOpenAPI(options.sourceType, options.textContent, model, maxTokens)
    } else {
      throw new Error('Either textContent or imageData must be provided')
    }

    // Validate the generated spec
    const validationResult = await validateOpenAPI(yaml)

    return {
      yaml,
      isValid: validationResult.isValid,
      errors: validationResult.errors?.map((e) => e.message),
      model,
      processingTimeMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      yaml: '',
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown error during conversion'],
      model,
      processingTimeMs: Date.now() - startTime,
    }
  }
}

/**
 * Convert text content to OpenAPI spec.
 */
async function convertTextToOpenAPI(
  sourceType: ImportSourceType,
  textContent: string,
  model: string,
  maxTokens: number
): Promise<string> {
  const userPrompt = getUserPrompt(sourceType, textContent)

  const result = await generateText({
    model: openai(model),
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    maxOutputTokens: maxTokens,
    temperature: 0.2, // Lower temperature for more consistent output
  })

  return cleanYamlOutput(result.text)
}

/**
 * Convert image to OpenAPI spec using vision capabilities.
 */
async function convertImageToOpenAPI(
  imageData: string,
  mimeType: string | undefined,
  model: string,
  maxTokens: number
): Promise<string> {
  // First, extract text content from the image
  const extractionResult = await generateText({
    model: openai(model),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: imageData,
            mediaType: mimeType,
          },
          {
            type: 'text',
            text: getImageExtractionPrompt(),
          },
        ],
      },
    ],
    maxOutputTokens: 2048,
    temperature: 0.1,
  })

  // Then convert the extracted text to OpenAPI
  const result = await generateText({
    model: openai(model),
    system: SYSTEM_PROMPT,
    prompt: getUserPrompt('text', extractionResult.text),
    maxOutputTokens: maxTokens,
    temperature: 0.2,
  })

  return cleanYamlOutput(result.text)
}

/**
 * Refine an existing OpenAPI spec based on user feedback.
 */
export async function refineOpenAPISpec(
  currentSpec: string,
  feedback: string,
  model?: string
): Promise<ConversionResult> {
  const startTime = Date.now()
  const modelName = model ?? DEFAULT_MODEL

  try {
    const result = await generateText({
      model: openai(modelName),
      system: SYSTEM_PROMPT,
      prompt: getRefinementPrompt(currentSpec, feedback),
      maxOutputTokens: DEFAULT_MAX_TOKENS,
      temperature: 0.2,
    })

    const yaml = cleanYamlOutput(result.text)
    const validationResult = await validateOpenAPI(yaml)

    return {
      yaml,
      isValid: validationResult.isValid,
      errors: validationResult.errors?.map((e) => e.message),
      model: modelName,
      processingTimeMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      yaml: currentSpec, // Return original on error
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown error during refinement'],
      model: modelName,
      processingTimeMs: Date.now() - startTime,
    }
  }
}

/**
 * Clean up YAML output by removing markdown code blocks if present.
 */
function cleanYamlOutput(text: string): string {
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

/**
 * Check if the OpenAI API is configured and accessible.
 */
export async function checkAIAvailability(): Promise<{ available: boolean; error?: string }> {
  try {
    // Simple test to check if the API key works
    await generateText({
      model: openai('gpt-4o-mini'),
      prompt: 'Say "ok"',
      maxOutputTokens: 5,
    })
    return { available: true }
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
