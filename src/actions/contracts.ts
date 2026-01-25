'use server'

import { auth } from '@/auth'
import { createConfiguredRepository } from '@/lib/repository'
// Import directly from generator (server-only, uses Node.js modules)
import { generateChangelog as generateChangelogFromSpecs } from '@/lib/changelog/generator'
import type { APIContract, ChangelogEntry } from '@/types'
import type { PaginatedResult } from '@/lib/repository/types'

/** Default number of contracts per page */
const DEFAULT_PAGE_SIZE = 20

/**
 * List all contracts in the repository.
 * @param options - Optional filtering options
 * @returns Array of contracts
 */
export async function listContracts(options?: {
  path?: string
  includeValidation?: boolean
}): Promise<APIContract[]> {
  const session = await auth()

  if (!session?.accessToken) {
    return []
  }

  try {
    const repo = await createConfiguredRepository(session.accessToken)

    return repo.listContracts({
      path: options?.path,
      includeValidation: options?.includeValidation ?? false,
    })
  } catch (error) {
    console.error('Failed to list contracts:', error)
    return []
  }
}

/**
 * List contracts with pagination support.
 * @param options - Filtering and pagination options
 * @returns Paginated result with contracts
 */
export async function listContractsPaginated(options?: {
  path?: string
  includeValidation?: boolean
  page?: number
  limit?: number
}): Promise<PaginatedResult<APIContract>> {
  const session = await auth()
  const page = options?.page ?? 1
  const limit = options?.limit ?? DEFAULT_PAGE_SIZE

  if (!session?.accessToken) {
    return {
      items: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    }
  }

  try {
    const repo = await createConfiguredRepository(session.accessToken)

    // Get all contracts (repository doesn't support native pagination)
    const allContracts = await repo.listContracts({
      path: options?.path,
      includeValidation: options?.includeValidation ?? false,
    })

    // Calculate pagination
    const total = allContracts.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const items = allContracts.slice(startIndex, endIndex)

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    }
  } catch (error) {
    console.error('Failed to list contracts:', error)
    return {
      items: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    }
  }
}

/**
 * Get a single contract by file path.
 * @param filePath - Path to the contract file
 * @returns The contract
 */
export async function getContract(filePath: string): Promise<APIContract> {
  const session = await auth()

  if (!session?.accessToken) {
    throw new Error('Unauthorized - please sign in')
  }

  const repo = await createConfiguredRepository(session.accessToken)

  return repo.getContract(filePath)
}

/**
 * Search contracts by name or description.
 * @param query - Search query
 * @returns Filtered contracts
 */
export async function searchContracts(query: string): Promise<APIContract[]> {
  const contracts = await listContracts({ includeValidation: false })

  if (!query.trim()) {
    return contracts
  }

  const lowerQuery = query.toLowerCase()

  return contracts.filter(
    (contract) =>
      contract.name.toLowerCase().includes(lowerQuery) ||
      contract.description?.toLowerCase().includes(lowerQuery) ||
      contract.filePath.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Result of a save operation.
 */
export interface SaveResult {
  success: boolean
  filePath?: string
  commitSha?: string
  error?: string
}

/**
 * Save a contract to the repository.
 * @param filePath - Path where to save the contract
 * @param content - YAML content of the OpenAPI spec
 * @param commitMessage - Commit message
 * @returns Save result
 */
export async function saveContract(
  filePath: string,
  content: string,
  commitMessage: string
): Promise<SaveResult> {
  const session = await auth()
  if (!session?.accessToken) {
    return { success: false, error: 'Unauthorized - please sign in' }
  }

  try {
    const repo = await createConfiguredRepository(session.accessToken)

    const result = await repo.saveContract(filePath, content, commitMessage)

    return {
      success: true,
      filePath: result.filePath,
      commitSha: result.commitSha,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Delete a contract from the repository.
 * @param filePath - Path to the contract to delete
 * @param commitMessage - Commit message
 * @returns Delete result
 */
export async function deleteContract(
  filePath: string,
  commitMessage: string
): Promise<SaveResult> {
  const session = await auth()
  if (!session?.accessToken) {
    return { success: false, error: 'Unauthorized - please sign in' }
  }

  try {
    const repo = await createConfiguredRepository(session.accessToken)

    await repo.deleteContract(filePath, commitMessage)

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate a changelog comparing two versions of a contract.
 * @param contractPath - Path to the contract file
 * @param fromCommitSha - Source/older version commit SHA
 * @param toCommitSha - Destination/newer version commit SHA
 * @returns Changelog entry with all detected changes
 */
export async function generateChangelogAction(
  contractPath: string,
  fromCommitSha: string,
  toCommitSha: string
): Promise<ChangelogEntry> {
  const session = await auth()

  if (!session?.accessToken) {
    throw new Error('Unauthorized - please sign in')
  }

  const repo = await createConfiguredRepository(session.accessToken)

  // Fetch content at both commits
  if (!repo.getContractAtCommit) {
    throw new Error('Repository does not support version comparison')
  }

  const [fromYaml, toYaml] = await Promise.all([
    repo.getContractAtCommit(contractPath, fromCommitSha),
    repo.getContractAtCommit(contractPath, toCommitSha),
  ])

  // Generate the changelog
  return generateChangelogFromSpecs(fromYaml, toYaml, contractPath, fromCommitSha, toCommitSha)
}
