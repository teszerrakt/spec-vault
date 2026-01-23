import type { ContractRepository } from './types'
import { LocalContractRepository } from './local'
import { GitHubContractRepository } from './github'

export type { ContractRepository, ListContractsOptions, SaveResult, PROptions, PullRequestResult } from './types'
export { LocalContractRepository } from './local'
export { GitHubContractRepository } from './github'

interface RepositoryOptions {
  /** GitHub access token (required for GitHub repository) */
  accessToken?: string
  /** GitHub repository owner */
  owner?: string
  /** GitHub repository name */
  repo?: string
  /** Default branch name */
  defaultBranch?: string
  /** Path prefix for contracts */
  contractsPath?: string
  /** Force local mode even if GitHub credentials are available */
  forceLocal?: boolean
}

/**
 * Create a contract repository based on environment and options.
 * Returns GitHub repository if credentials are available, otherwise local.
 */
export function createRepository(options: RepositoryOptions = {}): ContractRepository {
  const {
    accessToken,
    owner,
    repo,
    defaultBranch = 'main',
    contractsPath = 'contracts',
    forceLocal = false,
  } = options

  // Use environment variables as fallback
  const resolvedOwner = owner || process.env.GITHUB_OWNER
  const resolvedRepo = repo || process.env.GITHUB_REPO
  const resolvedToken = accessToken

  // Use local repository if forced or if GitHub credentials are missing
  if (forceLocal || !resolvedToken || !resolvedOwner || !resolvedRepo) {
    return new LocalContractRepository(contractsPath)
  }

  return new GitHubContractRepository({
    accessToken: resolvedToken,
    owner: resolvedOwner,
    repo: resolvedRepo,
    defaultBranch,
    contractsPath,
  })
}

/**
 * Check if we're in development mode (using local repository).
 */
export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === 'development' && !process.env.GITHUB_OWNER
}
