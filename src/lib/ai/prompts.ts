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
 */
export function getUserPrompt(sourceType: ImportSourceType, content: string): string {
  switch (sourceType) {
    case 'json':
      return getJsonPrompt(content)
    case 'csv':
      return getCsvPrompt(content)
    case 'excel':
      return getExcelPrompt(content)
    case 'image':
      return getImagePrompt()
    case 'text':
      return getTextPrompt(content)
    default:
      return getTextPrompt(content)
  }
}

/**
 * Prompt for JSON input (could be API responses, schemas, or partial specs).
 */
function getJsonPrompt(content: string): string {
  return `Convert the following JSON data into an OpenAPI 3.1 specification.

The JSON may represent:
- API response examples
- Request/response schemas
- A partial OpenAPI specification
- Sample API data

Analyze the structure and create appropriate endpoints, schemas, and documentation.

JSON Input:
${content}`
}

/**
 * Prompt for CSV input (typically endpoint lists or data tables).
 */
function getCsvPrompt(content: string): string {
  return `Convert the following CSV data into an OpenAPI 3.1 specification.

The CSV likely contains:
- API endpoint definitions (method, path, description)
- Data schema definitions (field names, types)
- Parameter specifications

Analyze the columns and rows to create appropriate API documentation.

CSV Input:
${content}`
}

/**
 * Prompt for Excel data (similar to CSV but potentially more structured).
 */
function getExcelPrompt(content: string): string {
  return `Convert the following spreadsheet data into an OpenAPI 3.1 specification.

The spreadsheet data may contain:
- Multiple sheets with different API sections
- Endpoint definitions with methods, paths, and descriptions
- Schema definitions with field specifications
- Parameter and response documentation

Analyze the structure to create comprehensive API documentation.

Spreadsheet Data:
${content}`
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
 * Prompt for plain text input (informal API descriptions).
 */
function getTextPrompt(content: string): string {
  return `Convert the following text description into an OpenAPI 3.1 specification.

The text describes an API and may include:
- Informal endpoint descriptions
- API requirements or specifications
- Documentation in various formats (markdown, plain text)
- Technical requirements

Extract all API-related information and create proper OpenAPI documentation.

Text Input:
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
