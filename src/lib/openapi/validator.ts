import SwaggerParser from '@apidevtools/swagger-parser'
import type { ValidationError } from '@/types'
import { parseOpenAPI } from './parser'

/**
 * Result of OpenAPI validation.
 */
export interface ValidationResult {
  /** Whether the spec is valid */
  isValid: boolean
  /** List of validation errors */
  errors?: ValidationError[]
  /** Dereferenced spec (with resolved $refs) */
  dereferencedSpec?: unknown
}

/**
 * Validate an OpenAPI specification.
 * @param content - YAML or JSON string containing the spec
 * @returns Validation result
 */
export async function validateOpenAPI(content: string): Promise<ValidationResult> {
  try {
    // Parse the content first
    const spec = parseOpenAPI(content)

    // Validate and dereference using swagger-parser
    const dereferencedSpec = await SwaggerParser.validate(spec as never)

    return {
      isValid: true,
      dereferencedSpec,
    }
  } catch (error) {
    const errors = parseValidationError(error)
    return {
      isValid: false,
      errors,
    }
  }
}

/**
 * Validate an already-parsed OpenAPI object.
 * @param spec - Parsed OpenAPI object
 * @returns Validation result
 */
export async function validateOpenAPIObject(spec: unknown): Promise<ValidationResult> {
  try {
    const dereferencedSpec = await SwaggerParser.validate(spec as never)
    return {
      isValid: true,
      dereferencedSpec,
    }
  } catch (error) {
    const errors = parseValidationError(error)
    return {
      isValid: false,
      errors,
    }
  }
}

/**
 * Parse validation error into structured format.
 */
function parseValidationError(error: unknown): ValidationError[] {
  if (error instanceof Error) {
    // swagger-parser errors often contain path info
    const message = error.message

    // Try to extract path from error message
    // Common format: "Error at path /paths/~1users/get: ..."
    const pathMatch = message.match(/at (?:path )?([/\w~-]+)/i)
    const path = pathMatch ? pathMatch[1] : '/'

    return [
      {
        path,
        message: message.replace(/^Error:?\s*/i, ''),
        severity: 'error',
      },
    ]
  }

  return [
    {
      path: '/',
      message: String(error),
      severity: 'error',
    },
  ]
}

/**
 * Quick check if content looks like a valid OpenAPI spec.
 * Does not perform full validation, just checks for required fields.
 * @param content - YAML or JSON string
 * @returns Whether it looks like an OpenAPI spec
 */
export function looksLikeOpenAPI(content: string): boolean {
  try {
    const spec = parseOpenAPI(content)
    // Check for required OpenAPI 3.x fields
    return (
      typeof spec === 'object' &&
      spec !== null &&
      ('openapi' in spec || 'swagger' in spec) &&
      'info' in spec &&
      typeof spec.info === 'object'
    )
  } catch {
    return false
  }
}
