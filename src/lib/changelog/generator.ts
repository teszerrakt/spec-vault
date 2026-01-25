import type { Change, ChangelogEntry } from '@/types'
import {
  categorizeChange,
  formatChangeDescription,
  formatChangeSummary,
  mapActionToChangeType,
} from './formatter'

/**
 * Result from diffing two OpenAPI specs.
 */
interface DiffResult {
  type: 'breaking' | 'non-breaking' | 'unclassified'
  action: 'add' | 'remove'
  code: string
  entity: string
  sourceSpecEntityDetails: Array<{ location: string; value?: unknown }>
  destinationSpecEntityDetails: Array<{ location: string; value?: unknown }>
}

/**
 * Lazily load openapi-diff to reduce initial bundle size.
 * This library is only needed when comparing spec versions.
 */
async function getOpenApiDiff() {
  const { default: openapiDiff } = await import('openapi-diff')
  return openapiDiff
}

/**
 * Compare two OpenAPI specifications and generate a changelog.
 *
 * @param fromYaml - The source/older specification (YAML or JSON string)
 * @param toYaml - The destination/newer specification (YAML or JSON string)
 * @param contractPath - Path to the contract file
 * @param fromVersion - Source version identifier (commit SHA)
 * @param toVersion - Destination version identifier (commit SHA)
 * @returns ChangelogEntry with all detected changes
 */
export async function generateChangelog(
  fromYaml: string,
  toYaml: string,
  contractPath: string,
  fromVersion: string,
  toVersion: string
): Promise<ChangelogEntry> {
  try {
    const openapiDiff = await getOpenApiDiff()
    const diffResult = await openapiDiff.diffSpecs({
      sourceSpec: {
        content: fromYaml,
        location: `${contractPath}@${fromVersion.slice(0, 7)}`,
        format: 'openapi3',
      },
      destinationSpec: {
        content: toYaml,
        location: `${contractPath}@${toVersion.slice(0, 7)}`,
        format: 'openapi3',
      },
    })

    // Handle failure case
    if (!diffResult.breakingDifferencesFound && diffResult.breakingDifferencesFound !== false) {
      // This means diffSpecs returned an error/invalid result
      return {
        fromVersion,
        toVersion,
        contractPath,
        changes: [],
        summary: 'Unable to generate changelog: Invalid diff result',
        breakingChanges: false,
      }
    }

    // Collect all changes
    const changes: Change[] = []

    // Process breaking differences
    if (diffResult.breakingDifferencesFound && 'breakingDifferences' in diffResult) {
      for (const diff of diffResult.breakingDifferences) {
        changes.push(mapDiffToChange(diff as DiffResult, true))
      }
    }

    // Process non-breaking differences
    if ('nonBreakingDifferences' in diffResult) {
      for (const diff of diffResult.nonBreakingDifferences) {
        changes.push(mapDiffToChange(diff as DiffResult, false))
      }
    }

    // Process unclassified differences (treat as non-breaking by default)
    if ('unclassifiedDifferences' in diffResult) {
      for (const diff of diffResult.unclassifiedDifferences) {
        changes.push(mapDiffToChange(diff as DiffResult, false))
      }
    }

    // Generate summary
    const summary = formatChangeSummary(changes)
    const breakingChanges = diffResult.breakingDifferencesFound

    return {
      fromVersion,
      toVersion,
      contractPath,
      changes,
      summary,
      breakingChanges,
    }
  } catch (error) {
    // If openapi-diff fails, return empty changelog with error info
    console.error('openapi-diff error:', error)
    return {
      fromVersion,
      toVersion,
      contractPath,
      changes: [],
      summary: `Unable to generate changelog: ${error instanceof Error ? error.message : 'Unknown error'}`,
      breakingChanges: false,
    }
  }
}

/**
 * Map an openapi-diff result to our Change type.
 */
function mapDiffToChange(diff: DiffResult, breaking: boolean): Change {
  // Get location from source or destination details
  const location =
    diff.sourceSpecEntityDetails[0]?.location ||
    diff.destinationSpecEntityDetails[0]?.location ||
    'unknown'

  const category = categorizeChange(diff.entity)
  const type = mapActionToChangeType(diff.action, breaking)
  const description = formatChangeDescription(diff.code, diff.action, location, diff.entity)

  return {
    type,
    category,
    path: location,
    description,
    breaking,
  }
}

/**
 * Quick check if two specs have any differences.
 * Useful for determining if a changelog should be shown.
 */
export async function hasChanges(fromYaml: string, toYaml: string): Promise<boolean> {
  try {
    const openapiDiff = await getOpenApiDiff()
    const diffResult = await openapiDiff.diffSpecs({
      sourceSpec: {
        content: fromYaml,
        location: 'source',
        format: 'openapi3',
      },
      destinationSpec: {
        content: toYaml,
        location: 'destination',
        format: 'openapi3',
      },
    })

    // Check if there are any differences
    const hasBreaking = diffResult.breakingDifferencesFound
    const hasNonBreaking =
      'nonBreakingDifferences' in diffResult && diffResult.nonBreakingDifferences.length > 0
    const hasUnclassified =
      'unclassifiedDifferences' in diffResult && diffResult.unclassifiedDifferences.length > 0

    return hasBreaking || hasNonBreaking || hasUnclassified
  } catch {
    // If we can't diff, assume there are changes
    return true
  }
}
