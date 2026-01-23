'use server'

import { auth } from '@/auth'
import { createRepository } from '@/lib/repository'
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

  const repo = createRepository({
    accessToken: session?.accessToken,
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
  })

  return repo.listContracts({
    path: options?.path,
    includeValidation: options?.includeValidation ?? false,
  })
}

/**
 * Get a single contract by file path.
 * @param filePath - Path to the contract file
 * @returns The contract
 */
export async function getContract(filePath: string): Promise<APIContract> {
  const session = await auth()

  const repo = createRepository({
    accessToken: session?.accessToken,
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
  })

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
