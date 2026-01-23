import type { APIContract, ContractVersion, OpenAPIObject } from '@/types'

/**
 * Result of saving a contract.
 */
export interface SaveResult {
  /** Path to the saved file */
  filePath: string
  /** Git commit SHA (if using GitHub repository) */
  commitSha?: string
  /** Branch the file was saved to */
  branch: string
}

/**
 * Options for creating a pull request.
 */
export interface PROptions {
  /** PR title */
  title: string
  /** PR body/description */
  body?: string
  /** Source branch name */
  head: string
  /** Target branch name */
  base: string
}

/**
 * Result of creating a pull request.
 */
export interface PullRequestResult {
  /** PR number */
  number: number
  /** PR URL */
  url: string
}

/**
 * Options for listing contracts.
 */
export interface ListContractsOptions {
  /** Filter by path prefix */
  path?: string
  /** Include validation status */
  includeValidation?: boolean
}

/**
 * Contract repository interface.
 * Abstracts contract persistence - GitHub (production) or Local filesystem (development).
 */
export interface ContractRepository {
  /** Repository type identifier */
  readonly type: 'github' | 'local'

  /**
   * List all contracts in the repository.
   * @param options - Optional filtering options
   * @returns Array of contracts
   */
  listContracts(options?: ListContractsOptions): Promise<APIContract[]>

  /**
   * Get a single contract by file path.
   * @param filePath - Path to the contract file
   * @returns The contract
   * @throws Error if contract not found
   */
  getContract(filePath: string): Promise<APIContract>

  /**
   * Save a contract to the repository.
   * @param filePath - Path to save the contract
   * @param spec - OpenAPI specification object
   * @param message - Commit message
   * @returns Save result with commit info
   */
  saveContract(filePath: string, spec: OpenAPIObject, message: string): Promise<SaveResult>

  /**
   * Delete a contract from the repository.
   * @param filePath - Path to the contract file
   * @param message - Commit message
   */
  deleteContract(filePath: string, message: string): Promise<void>

  /**
   * Get version history for a contract.
   * @param filePath - Path to the contract file
   * @returns Array of versions (newest first)
   */
  getHistory(filePath: string): Promise<ContractVersion[]>

  /**
   * Create a pull request (optional - only available for GitHub repository).
   * @param options - PR options
   * @returns PR result with URL
   */
  createPullRequest?(options: PROptions): Promise<PullRequestResult>
}
