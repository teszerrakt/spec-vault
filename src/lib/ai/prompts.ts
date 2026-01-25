import type { ImportSourceType } from '@/types/import'

/**
 * System prompt that instructs the AI on how to generate OpenAPI specs.
 */
export const SYSTEM_PROMPT = `You are an expert API documentation specialist who converts various data formats into valid OpenAPI 3.1 specifications.

Your task is to analyze the provided input and generate a complete, valid OpenAPI 3.1 YAML specification.

Guidelines:
1. Always output valid OpenAPI 3.1 YAML format
2. Include all standard sections: openapi, info, servers, paths, components
3. For info section:
   - Generate a meaningful title based on the API content
   - Use version "1.0.0" unless specified otherwise
   - Include a descriptive summary
4. For paths:
   - Include operationId for each operation
   - Add descriptions for endpoints, parameters, and responses
   - Define request bodies where applicable
   - Include common response codes (200, 400, 401, 404, 500)
5. For schemas:
   - Define reusable schemas in components/schemas
   - Use appropriate data types and formats
   - Include examples where helpful
6. For security:
   - Define security schemes if authentication is mentioned
   - Apply security requirements to endpoints as needed

Output ONLY the YAML content, no explanations or markdown code blocks.`

/**
 * Get the appropriate user prompt for a given source type.
 * Now simplified: 'image' for vision processing, 'text' for everything else.
 */
export function getUserPrompt(sourceType: ImportSourceType, content: string): string {
  if (sourceType === 'image') {
    return getImagePrompt()
  }
  // All text-based inputs (JSON, CSV, plain text, markdown) use the same prompt
  return getTextPrompt(content)
}

/**
 * Prompt for image input (screenshots of API docs, diagrams, etc.).
 */
function getImagePrompt(): string {
  return `Analyze this image which contains API documentation or diagrams.

The image may show:
- Screenshots of API documentation
- API endpoint tables or lists
- Data flow diagrams
- Request/response examples

Extract all API information and convert it into an OpenAPI 3.1 specification.`
}

/**
 * Prompt for text input (handles all text formats: JSON, CSV, plain text, markdown).
 * The AI will automatically detect and handle the format.
 */
function getTextPrompt(content: string): string {
  return `Convert the following content into an OpenAPI 3.1 specification.

The content may be in any format:
- JSON (API responses, schemas, or partial OpenAPI specs)
- CSV (endpoint lists, schema definitions)
- Plain text (informal API descriptions)
- Markdown (documentation)

Analyze the structure and format, then create appropriate endpoints, schemas, and documentation.

Input:
${content}`
}

/**
 * Prompt for refining/improving an existing OpenAPI spec.
 */
export function getRefinementPrompt(currentSpec: string, feedback: string): string {
  return `Improve the following OpenAPI 3.1 specification based on the user's feedback.

Current Specification:
${currentSpec}

User Feedback:
${feedback}

Apply the requested changes while maintaining spec validity. Output only the updated YAML.`
}

/**
 * Prompt for extracting text from an image for further processing.
 */
export function getImageExtractionPrompt(): string {
  return `Extract all text content from this image that relates to API documentation.

Focus on:
- Endpoint definitions (HTTP methods, paths, descriptions)
- Parameter names and types
- Request/response examples
- Authentication details
- Any data schemas or models

Return the extracted information in a structured format that clearly separates different API elements.`
}
