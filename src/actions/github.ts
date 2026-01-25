'use server'

import { auth } from '@/auth'
import { generatePRContent } from '@/lib/ai/pr-generator'
import { createConfiguredRepository } from '@/lib/repository'
import {
  checkUserPermission,
  type GitHubBranch,
  getPlatformConfig,
  isAdminPermission,
  listBranches,
  savePlatformConfig,
  validateRepository,
} from '@/lib/repository/github'
import type { PullRequestResult } from '@/lib/repository/types'
import type {
  ContractVersion,
  PermissionCheckResult,
  PlatformConfig,
  RepositoryConfig,
} from '@/types'

/**
 * Result of the submit for review action.
 */
export interface SubmitForReviewResult {
  success: boolean
  error?: string
  pr?: PullRequestResult
  branchName?: string
}

/**
 * Options for submitting a contract for review.
 */
export interface SubmitForReviewOptions {
  /** File path of the contract */
  filePath: string
  /** YAML content of the contract */
  content: string
  /** PR title */
  title: string
  /** PR description */
  description?: string
  /** Custom branch name (optional - auto-generated if not provided) */
  branchName?: string
}

/**
 * Result of PR content generation.
 */
export interface GeneratePRContentResult {
  success: boolean
  error?: string
  title?: string
  description?: string
}

/**
 * Get version history for a contract.
 * @param filePath - Path to the contract file
 * @returns Array of versions (newest first)
 */
export async function getContractHistory(filePath: string): Promise<ContractVersion[]> {
  const session = await auth()

  if (!session?.accessToken) {
    return []
  }

  try {
    const repo = await createConfiguredRepository(session.accessToken)
    const history = await repo.getHistory(filePath)
    return history
  } catch (error) {
    console.error('Failed to get contract history:', error)
    return []
  }
}

/**
 * Generate a unique branch name for a PR.
 */
function generateBranchName(filePath: string): string {
  const timestamp = Date.now()
  const sanitizedPath = filePath
    .replace(/\.ya?ml$/i, '')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 30)

  return `contract/${sanitizedPath}-${timestamp}`
}

/**
 * Submit a contract change for review via GitHub Pull Request.
 *
 * This action:
 * 1. Creates a new branch from the default branch
 * 2. Commits the contract changes to the new branch
 * 3. Creates a Pull Request from the new branch to the default branch
 * 4. Returns the PR URL for redirect
 */
export async function submitForReview(
  options: SubmitForReviewOptions
): Promise<SubmitForReviewResult> {
  const session = await auth()

  if (!session?.accessToken) {
    return {
      success: false,
      error: 'Not authenticated. Please sign in with GitHub.',
    }
  }

  try {
    const repo = await createConfiguredRepository(session.accessToken)

    // Check if repository supports PR creation
    if (!repo.createPullRequest || !repo.createBranch) {
      return {
        success: false,
        error: 'Pull request creation is only supported with GitHub repositories.',
      }
    }

    // Generate branch name
    const branchName = options.branchName || generateBranchName(options.filePath)

    // Create a new branch
    await repo.createBranch(branchName)

    // Save the contract to the new branch
    await repo.saveContract(
      options.filePath,
      options.content,
      options.title, // Use PR title as commit message
      branchName
    )

    // Get default branch for PR base
    const baseBranch = repo.getDefaultBranch?.() || 'main'

    // Create the Pull Request
    const pr = await repo.createPullRequest({
      title: options.title,
      body: options.description || `Updates to contract: ${options.filePath}`,
      head: branchName,
      base: baseBranch,
    })

    return {
      success: true,
      pr,
      branchName,
    }
  } catch (error) {
    console.error('Failed to submit for review:', error)

    // Handle specific GitHub errors
    if (error instanceof Error) {
      if (error.message.includes('Reference already exists')) {
        return {
          success: false,
          error: 'A branch with this name already exists. Please try again.',
        }
      }
      if (error.message.includes('pull request already exists')) {
        return {
          success: false,
          error: 'A pull request for this branch already exists.',
        }
      }
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: false,
      error: 'An unexpected error occurred while creating the pull request.',
    }
  }
}

/**
 * Create a pull request for contract changes.
 * Lower-level function if you need more control over the PR creation process.
 */
export async function createPullRequest(
  title: string,
  body: string,
  headBranch: string,
  baseBranch?: string
): Promise<{ success: boolean; error?: string; pr?: PullRequestResult }> {
  const session = await auth()

  if (!session?.accessToken) {
    return {
      success: false,
      error: 'Not authenticated. Please sign in with GitHub.',
    }
  }

  try {
    const repo = await createConfiguredRepository(session.accessToken)

    if (!repo.createPullRequest) {
      return {
        success: false,
        error: 'Pull request creation is only supported with GitHub repositories.',
      }
    }

    const base = baseBranch || repo.getDefaultBranch?.() || 'main'
    const pr = await repo.createPullRequest({
      title,
      body,
      head: headBranch,
      base,
    })

    return {
      success: true,
      pr,
    }
  } catch (error) {
    console.error('Failed to create pull request:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create pull request',
    }
  }
}

/**
 * Generate AI-powered PR title and description for a contract.
 *
 * @param filePath - Path to the contract file
 * @param content - YAML content of the contract
 * @param isNew - Whether this is a new contract (vs update)
 * @param originalContent - Original content before changes (for updates)
 * @returns Generated title and description
 */
export async function generatePRContentAction(
  filePath: string,
  content: string,
  isNew: boolean = false,
  originalContent?: string
): Promise<GeneratePRContentResult> {
  try {
    const result = await generatePRContent({
      filePath,
      content,
      isNew,
      originalContent,
    })

    return {
      success: true,
      title: result.title,
      description: result.description,
    }
  } catch (error) {
    console.error('Failed to generate PR content:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate PR content',
    }
  }
}

// ============================================================================
// Settings & Configuration Server Actions
// ============================================================================

/**
 * Result of getting repository settings.
 */
export interface GetSettingsResult {
  success: boolean
  error?: string
  config?: RepositoryConfig & PlatformConfig
  userPermission?: PermissionCheckResult
  repoInfo?: {
    fullName: string
    defaultBranch: string
  }
}

/**
 * Get the current repository configuration and user permissions.
 * Used by the Settings page to display current config and determine edit access.
 */
export async function getRepositorySettings(): Promise<GetSettingsResult> {
  const session = await auth()

  if (!session?.accessToken) {
    return {
      success: false,
      error: 'Not authenticated. Please sign in with GitHub.',
    }
  }

  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO

  if (!owner || !repo) {
    return {
      success: false,
      error: 'Repository not configured. Set GITHUB_OWNER and GITHUB_REPO environment variables.',
    }
  }

  try {
    // Validate the repository exists and is accessible
    const validation = await validateRepository(session.accessToken, owner, repo)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      }
    }

    // Get user's GitHub username from session
    const username = session.user?.username
    if (!username) {
      return {
        success: false,
        error: 'Could not determine GitHub username. Please sign out and sign in again.',
      }
    }

    // Check user's permission level
    const permission = await checkUserPermission(session.accessToken, owner, repo, username)

    // Get platform config from repository
    const platformConfig = await getPlatformConfig(session.accessToken, owner, repo)

    // Combine env vars with stored config
    const config: RepositoryConfig & PlatformConfig = {
      owner,
      repo,
      defaultBranch: platformConfig.defaultBranch || process.env.GITHUB_DEFAULT_BRANCH || 'main',
      contractsPath:
        platformConfig.contractsPath || process.env.GITHUB_CONTRACTS_PATH || 'contracts',
      version: platformConfig.version,
    }

    return {
      success: true,
      config,
      userPermission: {
        permission,
        isAdmin: isAdminPermission(permission),
        username,
      },
      repoInfo: {
        fullName: validation.fullName || `${owner}/${repo}`,
        defaultBranch: validation.defaultBranch || 'main',
      },
    }
  } catch (error) {
    console.error('Failed to get repository settings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get repository settings',
    }
  }
}

/**
 * Result of saving repository settings.
 */
export interface SaveSettingsResult {
  success: boolean
  error?: string
  commitSha?: string
}

/**
 * Save repository configuration.
 * Only users with admin permission on the repository can save settings.
 */
export async function saveRepositorySettings(
  settings: Partial<Pick<PlatformConfig, 'contractsPath' | 'defaultBranch'>>
): Promise<SaveSettingsResult> {
  const session = await auth()

  if (!session?.accessToken) {
    return {
      success: false,
      error: 'Not authenticated. Please sign in with GitHub.',
    }
  }

  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO

  if (!owner || !repo) {
    return {
      success: false,
      error: 'Repository not configured. Set GITHUB_OWNER and GITHUB_REPO environment variables.',
    }
  }

  try {
    // Get user's GitHub username from session
    const username = session.user?.username
    if (!username) {
      return {
        success: false,
        error: 'Could not determine GitHub username. Please sign out and sign in again.',
      }
    }

    // Check user's permission level
    const permission = await checkUserPermission(session.accessToken, owner, repo, username)

    if (!isAdminPermission(permission)) {
      return {
        success: false,
        error: `You need admin access to this repository to change settings. Your current permission level is "${permission}".`,
      }
    }

    // Save the config
    const commitSha = await savePlatformConfig(session.accessToken, owner, repo, settings)

    return {
      success: true,
      commitSha,
    }
  } catch (error) {
    console.error('Failed to save repository settings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save repository settings',
    }
  }
}

/**
 * Result of validating repository connection.
 */
export interface ValidateConnectionResult {
  success: boolean
  error?: string
  canRead: boolean
  canWrite: boolean
  contractsCount?: number
}

/**
 * Validate the repository connection by testing read and write access.
 */
export async function validateRepositoryConnection(): Promise<ValidateConnectionResult> {
  const session = await auth()

  if (!session?.accessToken) {
    return {
      success: false,
      error: 'Not authenticated. Please sign in with GitHub.',
      canRead: false,
      canWrite: false,
    }
  }

  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO

  if (!owner || !repo) {
    return {
      success: false,
      error: 'Repository not configured.',
      canRead: false,
      canWrite: false,
    }
  }

  try {
    // Validate the repository
    const validation = await validateRepository(session.accessToken, owner, repo)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        canRead: false,
        canWrite: false,
      }
    }

    // Check user's permission level
    const username = session.user?.username
    if (!username) {
      return {
        success: false,
        error: 'Could not determine GitHub username.',
        canRead: false,
        canWrite: false,
      }
    }

    const permission = await checkUserPermission(session.accessToken, owner, repo, username)

    const canRead = ['admin', 'maintain', 'write', 'triage', 'read'].includes(permission)
    const canWrite = ['admin', 'maintain', 'write'].includes(permission)

    // Try to list contracts to verify read access works
    let contractsCount = 0
    if (canRead) {
      try {
        const repository = await createConfiguredRepository(session.accessToken)
        const contracts = await repository.listContracts()
        contractsCount = contracts.length
      } catch {
        // Ignore - we'll just not show the count
      }
    }

    return {
      success: true,
      canRead,
      canWrite,
      contractsCount,
    }
  } catch (error) {
    console.error('Failed to validate repository connection:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate connection',
      canRead: false,
      canWrite: false,
    }
  }
}

// ============================================================================
// Branches Server Actions
// ============================================================================

/**
 * Result of getting branches.
 */
export interface GetBranchesResult {
  success: boolean
  error?: string
  branches?: GitHubBranch[]
}

/**
 * Get all branches from the connected repository.
 */
export async function getBranches(): Promise<GetBranchesResult> {
  const session = await auth()

  if (!session?.accessToken) {
    return {
      success: false,
      error: 'Not authenticated. Please sign in with GitHub.',
    }
  }

  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO

  if (!owner || !repo) {
    return {
      success: false,
      error: 'Repository not configured.',
    }
  }

  try {
    const branches = await listBranches(session.accessToken, owner, repo)
    return {
      success: true,
      branches,
    }
  } catch (error) {
    console.error('Failed to fetch branches:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch branches',
    }
  }
}
