'use server'

import { auth } from '@/auth'
import { createRepository } from '@/lib/repository'
import type { ContractVersion } from '@/types'

/**
 * Get version history for a contract.
 * @param filePath - Path to the contract file
 * @returns Array of versions (newest first)
 */
export async function getContractHistory(filePath: string): Promise<ContractVersion[]> {
  const session = await auth()

  const repo = createRepository({
    accessToken: session?.accessToken,
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
  })

  return repo.getHistory(filePath)
}
