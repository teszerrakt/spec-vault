'use server'

import { auth } from '@/auth'
import { createRepository } from '@/lib/repository'
import { generatePRContent } from '@/lib/ai/pr-generator'
import type { ContractVersion } from '@/types'
import type { PullRequestResult } from '@/lib/repository/types'

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

  const repo = createRepository({
    accessToken: session?.accessToken,
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
  })

  return repo.getHistory(filePath)
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

  const repo = createRepository({
    accessToken: session.accessToken,
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
  })

  // Check if repository supports PR creation
  if (!repo.createPullRequest || !repo.createBranch) {
    return {
      success: false,
      error: 'Pull request creation is only supported with GitHub repositories.',
    }
  }

  try {
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

  const repo = createRepository({
    accessToken: session.accessToken,
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
  })

  if (!repo.createPullRequest) {
    return {
      success: false,
      error: 'Pull request creation is only supported with GitHub repositories.',
    }
  }

  try {
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
 * @returns Generated title and description
 */
export async function generatePRContentAction(
  filePath: string,
  content: string,
  isNew: boolean = false
): Promise<GeneratePRContentResult> {
  try {
    const result = await generatePRContent({
      filePath,
      content,
      isNew,
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
