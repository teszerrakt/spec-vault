'use server'

import { auth } from '@/auth'
import { createConfiguredRepository } from '@/lib/repository'
import type { APIContract } from '@/types'

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
