import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { parseOpenAPI } from '@/lib/openapi/parser'

// =============================================================================
// Types
// =============================================================================

/**
 * Generated PR content from AI.
 */
export interface PRContent {
  title: string
  description: string
}

/**
 * Options for generating PR content.
 */
export interface GeneratePRContentOptions {
  /** File path of the contract */
  filePath: string
  /** YAML content of the contract */
  content: string
  /** Whether this is a new contract (vs update) */
  isNew?: boolean
}

// =============================================================================
// Constants & Schema
// =============================================================================

const PR_MODEL = 'gpt-4o-mini'

/**
 * Zod schema for PR content - used by generateObject for structured output.
 */
const prContentSchema = z.object({
  title: z
    .string()
    .max(72)
    .describe('Concise PR title (max 72 chars). Start with action verb: Add, Update, Fix, etc.'),
  description: z
    .string()
    .describe('Markdown-formatted PR description with summary, endpoints, and notable features'),
})

// =============================================================================
// OpenAI Provider
// =============================================================================

/**
 * Create OpenAI provider with explicit API key configuration.
 */
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set. ' +
        'Please add it to your .env.local file.'
    )
  }
  return createOpenAI({ apiKey })
}

// =============================================================================
// Spec Info Extraction
// =============================================================================

interface SpecInfo {
  title: string
  version: string
  description: string
  pathCount: number
  paths: string[]
  schemaCount: number
  schemas: string[]
  hasAuth: boolean
}

/**
 * Extract key information from an OpenAPI spec for the prompt.
 */
function extractSpecInfo(content: string): SpecInfo {
  try {
    const spec = parseOpenAPI(content)

    const paths = Object.keys(spec.paths || {})
    const schemas = spec.components?.schemas ? Object.keys(spec.components.schemas) : []
    const securitySchemes = spec.components?.securitySchemes

    return {
      title: spec.info?.title || 'Untitled API',
      version: spec.info?.version || '1.0.0',
      description: spec.info?.description || '',
      pathCount: paths.length,
      paths,
      schemaCount: schemas.length,
      schemas,
      hasAuth: !!securitySchemes && Object.keys(securitySchemes).length > 0,
    }
  } catch {
    return {
      title: 'API Contract',
      version: '1.0.0',
      description: '',
      pathCount: 0,
      paths: [],
      schemaCount: 0,
      schemas: [],
      hasAuth: false,
    }
  }
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Generate a PR title and description using AI.
 */
export async function generatePRContent(
  options: GeneratePRContentOptions
): Promise<PRContent> {
  const { filePath, content, isNew = false } = options
  const specInfo = extractSpecInfo(content)

  try {
    const openai = getOpenAI()
    const result = await generateObject({
      model: openai(PR_MODEL),
      schema: prContentSchema,
      prompt: buildPRPrompt(filePath, content, specInfo, isNew),
      temperature: 0.3,
    })

    return {
      title: result.object.title,
      description: result.object.description,
    }
  } catch (error) {
    console.error('AI PR generation failed:', error)
    return {
      title: generateFallbackTitle(filePath, specInfo, isNew),
      description: generateFallbackDescription(filePath, specInfo, isNew),
    }
  }
}

// =============================================================================
// Prompt Builder
// =============================================================================

/**
 * Build the prompt for PR content generation.
 */
function buildPRPrompt(
  filePath: string,
  content: string,
  specInfo: SpecInfo,
  isNew: boolean
): string {
  const operation = isNew ? 'Adding new contract' : 'Updating existing contract'

  return `Generate a GitHub Pull Request title and description for an API contract change.

## Context
- **File path**: ${filePath}
- **Operation**: ${operation}

## OpenAPI Specification Info
- **API Title**: ${specInfo.title}
- **Version**: ${specInfo.version}
- **Description**: ${specInfo.description || 'No description provided'}
- **Endpoints**: ${specInfo.pathCount} paths
- **Schemas**: ${specInfo.schemaCount} schemas
- **Authentication**: ${specInfo.hasAuth ? 'Yes' : 'No'}

## Paths
${formatList(specInfo.paths, 'No paths defined')}

## Schemas
${formatList(specInfo.schemas, 'No schemas defined')}

## Full Specification
\`\`\`yaml
${content}
\`\`\`

## Instructions
1. **title**: Concise PR title (max 72 characters)
   - Start with action verb: "Add", "Update", "Fix", "Refactor", etc.
   - Include the API name
   - Include version if significant

2. **description**: Markdown-formatted PR description including:
   - Brief summary (1-2 sentences) of what this API does
   - Key endpoints or resources covered (bullet list)
   - Notable features (authentication, pagination, etc.)
   - For updates: what changed (if detectable)`
}

/**
 * Format a list of items for the prompt.
 */
function formatList(items: string[], emptyMessage: string): string {
  if (items.length === 0) return emptyMessage
  return items.map((item) => `- ${item}`).join('\n')
}

// =============================================================================
// Fallback Generators
// =============================================================================

/**
 * Generate a fallback title when AI fails.
 */
function generateFallbackTitle(
  filePath: string,
  specInfo: SpecInfo,
  isNew: boolean
): string {
  const action = isNew ? 'Add' : 'Update'
  const apiName = specInfo.title !== 'API Contract' ? specInfo.title : extractNameFromPath(filePath)

  const title = `${action} ${apiName}`

  // Add version for new contracts if available
  if (isNew && specInfo.version !== '1.0.0') {
    const withVersion = `${title} v${specInfo.version}`
    if (withVersion.length <= 72) {
      return withVersion
    }
  }

  return title.slice(0, 72)
}

/**
 * Generate a fallback description when AI fails.
 */
function generateFallbackDescription(
  filePath: string,
  specInfo: SpecInfo,
  isNew: boolean
): string {
  const action = isNew ? 'adds a new' : 'updates the'
  const lines: string[] = []

  lines.push(`This PR ${action} API contract at \`${filePath}\`.`)
  lines.push('')

  if (specInfo.description) {
    lines.push('## Summary')
    lines.push(specInfo.description)
    lines.push('')
  }

  if (specInfo.pathCount > 0) {
    lines.push('## Endpoints')
    lines.push(`This contract defines ${specInfo.pathCount} endpoint(s):`)
    specInfo.paths.slice(0, 10).forEach((path) => {
      lines.push(`- \`${path}\``)
    })
    if (specInfo.paths.length > 10) {
      lines.push(`- ... and ${specInfo.paths.length - 10} more`)
    }
    lines.push('')
  }

  if (specInfo.schemaCount > 0) {
    lines.push('## Schemas')
    const schemaList = specInfo.schemas.slice(0, 5).map((s) => `\`${s}\``).join(', ')
    const suffix = specInfo.schemas.length > 5 ? `, and ${specInfo.schemas.length - 5} more` : ''
    lines.push(`Defines ${specInfo.schemaCount} schema(s): ${schemaList}${suffix}`)
  }

  return lines.join('\n').trim()
}

/**
 * Extract a readable name from a file path.
 */
function extractNameFromPath(filePath: string): string {
  const fileName = filePath.split('/').pop() || filePath
  const nameWithoutExt = fileName.replace(/\.ya?ml$/i, '')

  // Convert kebab-case or snake_case to Title Case
  return nameWithoutExt
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
