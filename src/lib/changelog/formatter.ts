import type { Change, ChangeCategory, ChangeType } from '@/types'

/**
 * Map openapi-diff entity to our ChangeCategory.
 */
export function categorizeChange(entity: string): ChangeCategory {
  // openapi-diff entities: path, method, request.body.scope, response.body.scope, etc.
  const entityLower = entity.toLowerCase()

  if (entityLower.includes('path') || entityLower.includes('method')) {
    return 'endpoint'
  }
  if (entityLower.includes('request') && entityLower.includes('body')) {
    return 'schema'
  }
  if (entityLower.includes('response')) {
    return 'response'
  }
  if (
    entityLower.includes('parameter') ||
    entityLower.includes('query') ||
    entityLower.includes('header')
  ) {
    return 'parameter'
  }
  if (entityLower.includes('security') || entityLower.includes('auth')) {
    return 'security'
  }
  if (
    entityLower.includes('info') ||
    entityLower.includes('title') ||
    entityLower.includes('version')
  ) {
    return 'info'
  }
  // Default to schema for body/property changes
  if (entityLower.includes('property') || entityLower.includes('schema')) {
    return 'schema'
  }

  return 'schema'
}

/**
 * Map openapi-diff action to our ChangeType.
 */
export function mapActionToChangeType(action: 'add' | 'remove', isBreaking: boolean): ChangeType {
  if (action === 'add') {
    return 'added'
  }
  if (action === 'remove') {
    // Removals are typically breaking, mark as deprecated if it's not flagged as breaking
    return isBreaking ? 'removed' : 'deprecated'
  }
  return 'modified'
}

/**
 * Format a human-readable description for a change.
 */
export function formatChangeDescription(
  code: string,
  action: 'add' | 'remove',
  location: string,
  entity: string
): string {
  // Extract meaningful path from location
  // e.g., "paths./users/{userId}.get.responses.200" -> "/users/{userId} GET 200"
  const cleanPath = formatPath(location)

  // Common patterns
  const actionVerb = action === 'add' ? 'Added' : 'Removed'

  // Handle specific codes
  switch (code) {
    case 'path.add':
      return `Added new endpoint: ${cleanPath}`
    case 'path.remove':
      return `Removed endpoint: ${cleanPath}`
    case 'method.add':
      return `Added new operation: ${cleanPath}`
    case 'method.remove':
      return `Removed operation: ${cleanPath}`
    default:
      // Generic description
      return `${actionVerb} ${formatEntity(entity)} at ${cleanPath}`
  }
}

/**
 * Format a path location to be more readable.
 */
function formatPath(location: string): string {
  // Remove "paths." prefix
  let path = location.replace(/^paths\./, '')

  // Replace escaped slashes
  path = path.replace(/~1/g, '/')

  // Split by dots to extract method and other parts
  const parts = path.split('.')

  // If it looks like a path with method, format nicely
  if (parts.length >= 2) {
    const endpoint = parts[0]
    const method = parts[1]?.toUpperCase()
    if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(method)) {
      const rest = parts.slice(2).join(' > ')
      return rest ? `${method} ${endpoint} (${rest})` : `${method} ${endpoint}`
    }
  }

  return path
}

/**
 * Format entity name to be more readable.
 */
function formatEntity(entity: string): string {
  // Convert camelCase/dot notation to readable text
  return entity
    .replace(/\./g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
}

/**
 * Generate a summary of changes.
 */
export function formatChangeSummary(changes: Change[]): string {
  if (changes.length === 0) {
    return 'No changes detected.'
  }

  const breakingCount = changes.filter((c) => c.breaking).length
  const addedCount = changes.filter((c) => c.type === 'added').length
  const removedCount = changes.filter((c) => c.type === 'removed').length
  const modifiedCount = changes.filter((c) => c.type === 'modified').length
  const deprecatedCount = changes.filter((c) => c.type === 'deprecated').length

  const parts: string[] = []

  if (breakingCount > 0) {
    parts.push(`${breakingCount} breaking change${breakingCount === 1 ? '' : 's'}`)
  }
  if (addedCount > 0) {
    parts.push(`${addedCount} addition${addedCount === 1 ? '' : 's'}`)
  }
  if (removedCount > 0) {
    parts.push(`${removedCount} removal${removedCount === 1 ? '' : 's'}`)
  }
  if (modifiedCount > 0) {
    parts.push(`${modifiedCount} modification${modifiedCount === 1 ? '' : 's'}`)
  }
  if (deprecatedCount > 0) {
    parts.push(`${deprecatedCount} deprecation${deprecatedCount === 1 ? '' : 's'}`)
  }

  if (parts.length === 0) {
    return `${changes.length} change${changes.length === 1 ? '' : 's'} detected.`
  }

  return `${parts.join(', ')}.`
}

/**
 * Group changes by category for display.
 */
export function groupChangesByCategory(changes: Change[]): Record<ChangeCategory, Change[]> {
  const grouped: Record<ChangeCategory, Change[]> = {
    endpoint: [],
    parameter: [],
    schema: [],
    response: [],
    security: [],
    info: [],
  }

  for (const change of changes) {
    grouped[change.category].push(change)
  }

  return grouped
}

/**
 * Get a human-readable label for a change category.
 */
export function getCategoryLabel(category: ChangeCategory): string {
  const labels: Record<ChangeCategory, string> = {
    endpoint: 'Endpoints',
    parameter: 'Parameters',
    schema: 'Schemas',
    response: 'Responses',
    security: 'Security',
    info: 'API Info',
  }
  return labels[category]
}
