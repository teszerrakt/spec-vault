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
  /** Original content before changes (for updates) */
  originalContent?: string
}

/**
 * Calculated diff between original and new spec.
 */
interface SpecDiff {
  versionChanged: boolean
  oldVersion: string
  newVersion: string
  addedPaths: string[]
  removedPaths: string[]
  addedSchemas: string[]
  removedSchemas: string[]
  breakingChanges: string[]
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
// Diff Calculation
// =============================================================================

/**
 * Calculate the diff between original and new spec.
 */
function calculateSpecDiff(
  oldSpec: SpecInfo,
  newSpec: SpecInfo
): SpecDiff {
  const addedPaths = newSpec.paths.filter((p) => !oldSpec.paths.includes(p))
  const removedPaths = oldSpec.paths.filter((p) => !newSpec.paths.includes(p))
  const addedSchemas = newSpec.schemas.filter((s) => !oldSpec.schemas.includes(s))
  const removedSchemas = oldSpec.schemas.filter((s) => !newSpec.schemas.includes(s))

  // Detect breaking changes
  const breakingChanges: string[] = []

  // Removed endpoints = breaking
  removedPaths.forEach((p) => {
    breakingChanges.push(`Removed endpoint: ${p}`)
  })

  // Removed schemas = potentially breaking
  removedSchemas.forEach((s) => {
    breakingChanges.push(`Removed schema: ${s}`)
  })

  // Auth added where none existed = potentially breaking
  if (!oldSpec.hasAuth && newSpec.hasAuth) {
    breakingChanges.push('Added authentication requirement')
  }

  return {
    versionChanged: oldSpec.version !== newSpec.version,
    oldVersion: oldSpec.version,
    newVersion: newSpec.version,
    addedPaths,
    removedPaths,
    addedSchemas,
    removedSchemas,
    breakingChanges,
  }
}

/**
 * Create a simple line-based diff for AI context.
 * Not a full git diff, just enough to show what changed.
 */
function createSimpleDiff(oldContent: string, newContent: string): string {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')

  const MAX_DIFF_LINES = 100
  const changes: string[] = []
  let changeCount = 0

  // Create sets for faster lookup
  const oldLineSet = new Set(oldLines.map((l) => l.trim()).filter((l) => l))
  const newLineSet = new Set(newLines.map((l) => l.trim()).filter((l) => l))

  // Find removed lines (in old but not in new)
  for (const line of oldLines) {
    const trimmed = line.trim()
    if (trimmed && !newLineSet.has(trimmed)) {
      changes.push(`- ${line}`)
      changeCount++
      if (changeCount >= MAX_DIFF_LINES) break
    }
  }

  // Find added lines (in new but not in old)
  if (changeCount < MAX_DIFF_LINES) {
    for (const line of newLines) {
      const trimmed = line.trim()
      if (trimmed && !oldLineSet.has(trimmed)) {
        changes.push(`+ ${line}`)
        changeCount++
        if (changeCount >= MAX_DIFF_LINES) break
      }
    }
  }

  if (changes.length === 0) {
    return 'No significant line-level changes detected (may be formatting/whitespace only)'
  }

  const truncated = changeCount >= MAX_DIFF_LINES ? '\n... (diff truncated)' : ''
  return changes.join('\n') + truncated
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
  const { filePath, content, isNew = false, originalContent } = options
  const specInfo = extractSpecInfo(content)
  const originalSpecInfo = originalContent ? extractSpecInfo(originalContent) : null

  // Determine which prompt to use
  const isUpdate = !isNew && originalContent && originalSpecInfo
  const prompt = isUpdate
    ? buildUpdateContractPrompt(
        filePath,
        specInfo,
        originalSpecInfo,
        calculateSpecDiff(originalSpecInfo, specInfo),
        createSimpleDiff(originalContent, content)
      )
    : buildNewContractPrompt(filePath, specInfo)

  try {
    const openai = getOpenAI()
    const result = await generateObject({
      model: openai(PR_MODEL),
      schema: prContentSchema,
      prompt,
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
      description: generateFallbackDescription(filePath, specInfo, isNew, originalSpecInfo),
    }
  }
}

// =============================================================================
// Prompt Builders
// =============================================================================

/**
 * Build prompt for NEW contract PRs - provides full summary.
 */
function buildNewContractPrompt(filePath: string, specInfo: SpecInfo): string {
  return `Generate a GitHub Pull Request title and description for a NEW API contract.

## Context
- **File path**: ${filePath}
- **Operation**: Adding new contract

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

## Instructions
1. **title**: Concise PR title (max 72 chars)
   - Start with "Add"
   - Include the API name
   - Include version if significant (e.g., "Add Payment API v2.0")

2. **description**: Markdown-formatted PR description including:
   - Brief summary (1-2 sentences) of what this API does
   - Key endpoints or resources covered (bullet list)
   - Notable features (authentication, pagination, etc.)`
}

/**
 * Build prompt for UPDATE contract PRs - focuses on changes only.
 */
function buildUpdateContractPrompt(
  filePath: string,
  specInfo: SpecInfo,
  originalSpecInfo: SpecInfo,
  diff: SpecDiff,
  yamlDiff: string
): string {
  return `Generate a GitHub Pull Request title and description for an API contract UPDATE.

## Context
- **File path**: ${filePath}
- **API Title**: ${specInfo.title}
- **Operation**: Updating existing contract

## Version Change
${diff.versionChanged ? `${diff.oldVersion} → ${diff.newVersion}` : `No version change (${specInfo.version})`}

## Summary of Changes
- **Endpoints**: ${originalSpecInfo.pathCount} → ${specInfo.pathCount}
- **Schemas**: ${originalSpecInfo.schemaCount} → ${specInfo.schemaCount}
- **Added endpoints**: ${diff.addedPaths.length}
- **Removed endpoints**: ${diff.removedPaths.length}
- **Added schemas**: ${diff.addedSchemas.length}
- **Removed schemas**: ${diff.removedSchemas.length}

## Added Endpoints
${formatList(diff.addedPaths, 'None')}

## Removed Endpoints
${formatList(diff.removedPaths, 'None')}

## Added Schemas
${formatList(diff.addedSchemas, 'None')}

## Removed Schemas
${formatList(diff.removedSchemas, 'None')}

## Breaking Changes
${diff.breakingChanges.length > 0 ? formatList(diff.breakingChanges, '') : 'None detected'}

## YAML Diff
\`\`\`diff
${yamlDiff}
\`\`\`

## Instructions
1. **title**: Concise PR title (max 72 chars)
   - Start with "Update"
   - Focus on the MAIN change (most significant)
   - Examples: "Update Payment API: add refund endpoint", "Update User API to v2.1.0"

2. **description**: Markdown-formatted PR description including:
   - Brief summary of what changed (1-2 sentences)
   - List added/removed endpoints (if any)
   - List added/removed schemas (if any)
   - **IMPORTANT**: If there are breaking changes, highlight them prominently with a ⚠️ warning section
   - DO NOT summarize the entire API - focus ONLY on what changed`
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
  isNew: boolean,
  originalSpecInfo: SpecInfo | null
): string {
  // For new contracts - full summary
  if (isNew || !originalSpecInfo) {
    return generateNewContractFallbackDescription(filePath, specInfo)
  }

  // For updates - focused on changes
  return generateUpdateContractFallbackDescription(filePath, specInfo, originalSpecInfo)
}

/**
 * Generate fallback description for new contracts.
 */
function generateNewContractFallbackDescription(
  filePath: string,
  specInfo: SpecInfo
): string {
  const lines: string[] = []

  lines.push(`This PR adds a new API contract at \`${filePath}\`.`)
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
 * Generate fallback description for contract updates - focused on changes.
 */
function generateUpdateContractFallbackDescription(
  filePath: string,
  specInfo: SpecInfo,
  originalSpecInfo: SpecInfo
): string {
  const lines: string[] = []

  lines.push(`This PR updates the API contract at \`${filePath}\`.`)
  lines.push('')

  // Calculate diff
  const addedPaths = specInfo.paths.filter((p) => !originalSpecInfo.paths.includes(p))
  const removedPaths = originalSpecInfo.paths.filter((p) => !specInfo.paths.includes(p))
  const addedSchemas = specInfo.schemas.filter((s) => !originalSpecInfo.schemas.includes(s))
  const removedSchemas = originalSpecInfo.schemas.filter((s) => !specInfo.schemas.includes(s))

  // Breaking changes warning
  if (removedPaths.length > 0 || removedSchemas.length > 0) {
    lines.push('## ⚠️ Breaking Changes')
    removedPaths.forEach((p) => lines.push(`- Removed endpoint: \`${p}\``))
    removedSchemas.forEach((s) => lines.push(`- Removed schema: \`${s}\``))
    lines.push('')
  }

  if (addedPaths.length > 0) {
    lines.push('## Added Endpoints')
    addedPaths.forEach((p) => lines.push(`- \`${p}\``))
    lines.push('')
  }

  if (addedSchemas.length > 0) {
    lines.push('## Added Schemas')
    addedSchemas.forEach((s) => lines.push(`- \`${s}\``))
    lines.push('')
  }

  // If no structural changes detected
  if (
    addedPaths.length === 0 &&
    removedPaths.length === 0 &&
    addedSchemas.length === 0 &&
    removedSchemas.length === 0
  ) {
    lines.push('Minor updates to existing definitions.')
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
