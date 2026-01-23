import yaml from 'js-yaml'
import type { OpenAPIObject } from '@/types'

/**
 * Parse a YAML string into an OpenAPI object.
 * @param yamlString - Raw YAML content
 * @returns Parsed OpenAPI object
 * @throws Error if YAML is invalid
 */
export function parseYaml(yamlString: string): OpenAPIObject {
  try {
    const parsed = yaml.load(yamlString)
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid YAML: expected an object')
    }
    return parsed as OpenAPIObject
  } catch (error) {
    if (error instanceof yaml.YAMLException) {
      throw new Error(`YAML parse error: ${error.message}`)
    }
    throw error
  }
}

/**
 * Serialize an OpenAPI object to YAML string.
 * @param spec - OpenAPI object
 * @returns YAML string
 */
export function serializeYaml(spec: OpenAPIObject): string {
  return yaml.dump(spec, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
    quotingType: '"',
    forceQuotes: false,
  })
}

/**
 * Parse a JSON string into an OpenAPI object.
 * @param jsonString - Raw JSON content
 * @returns Parsed OpenAPI object
 * @throws Error if JSON is invalid
 */
export function parseJson(jsonString: string): OpenAPIObject {
  try {
    const parsed = JSON.parse(jsonString)
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON: expected an object')
    }
    return parsed as OpenAPIObject
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`JSON parse error: ${error.message}`)
    }
    throw error
  }
}

/**
 * Serialize an OpenAPI object to JSON string.
 * @param spec - OpenAPI object
 * @param pretty - Whether to format with indentation (default: true)
 * @returns JSON string
 */
export function serializeJson(spec: OpenAPIObject, pretty = true): string {
  return JSON.stringify(spec, null, pretty ? 2 : 0)
}

/**
 * Detect whether a string is YAML or JSON.
 * @param content - Raw content string
 * @returns 'yaml' or 'json'
 */
export function detectFormat(content: string): 'yaml' | 'json' {
  const trimmed = content.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json'
  }
  return 'yaml'
}

/**
 * Parse content as either YAML or JSON based on auto-detection.
 * @param content - Raw content string
 * @returns Parsed OpenAPI object
 */
export function parseOpenAPI(content: string): OpenAPIObject {
  const format = detectFormat(content)
  return format === 'json' ? parseJson(content) : parseYaml(content)
}
