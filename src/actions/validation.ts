'use server'

import { validateOpenAPI, validateOpenAPIObject } from '@/lib/openapi/validator'
import type { ValidationError } from '@/types'

/**
 * Result of spec validation.
 */
export interface ValidateSpecResult {
  success: boolean
  isValid: boolean
  errors: ValidationError[]
}

/**
 * Validate an OpenAPI spec from YAML string.
 */
export async function validateSpec(yaml: string): Promise<ValidateSpecResult> {
  try {
    const result = await validateOpenAPI(yaml)
    return {
      success: true,
      isValid: result.isValid,
      errors: result.errors || [],
    }
  } catch (error) {
    return {
      success: false,
      isValid: false,
      errors: [
        {
          path: '/',
          message: error instanceof Error ? error.message : 'Validation failed',
          severity: 'error',
        },
      ],
    }
  }
}

/**
 * Validate an OpenAPI spec object.
 */
export async function validateSpecObject(spec: unknown): Promise<ValidateSpecResult> {
  try {
    const result = await validateOpenAPIObject(spec)
    return {
      success: true,
      isValid: result.isValid,
      errors: result.errors || [],
    }
  } catch (error) {
    return {
      success: false,
      isValid: false,
      errors: [
        {
          path: '/',
          message: error instanceof Error ? error.message : 'Validation failed',
          severity: 'error',
        },
      ],
    }
  }
}

/**
 * Validate a specific section of an OpenAPI spec.
 * Returns only errors relevant to that section.
 */
export async function validateSection(
  yaml: string,
  section: 'info' | 'servers' | 'paths' | 'schemas' | 'security'
): Promise<ValidateSpecResult> {
  const result = await validateSpec(yaml)

  // Filter errors to only those relevant to the section
  const sectionPathPrefixes: Record<string, string[]> = {
    info: ['/info', '/openapi'],
    servers: ['/servers'],
    paths: ['/paths'],
    schemas: ['/components/schemas', '/definitions'],
    security: ['/security', '/components/securitySchemes', '/securityDefinitions'],
  }

  const prefixes = sectionPathPrefixes[section] || []
  const filteredErrors = result.errors.filter((error) =>
    prefixes.some((prefix) => error.path.startsWith(prefix))
  )

  return {
    success: result.success,
    isValid: filteredErrors.length === 0,
    errors: filteredErrors,
  }
}
