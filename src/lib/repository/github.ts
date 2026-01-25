import { RequestError } from '@octokit/request-error'
import { Octokit } from '@octokit/rest'
import { parseYaml, serializeYaml } from '@/lib/openapi/parser'
import { validateOpenAPI } from '@/lib/openapi/validator'
import type {
  APIContract,
  ContractVersion,
  GitHubPermission,
  OpenAPIObject,
  PlatformConfig,
} from '@/types'
import type {
  ContractRepository,
  ListContractsOptions,
  PROptions,
  PullRequestResult,
  SaveResult,
} from './types'

/** Path to the platform configuration file in the repository */
const CONFIG_FILE_PATH = '.api-platform/config.json'

/** Default platform configuration */
const DEFAULT_CONFIG: PlatformConfig = {
  version: 1,
  contractsPath: 'contracts',
  defaultBranch: 'main',
}

interface GitHubConfig {
  owner: string
  repo: string
  accessToken: string
  defaultBranch?: string
  contractsPath?: string
}

/**
 * GitHub implementation of ContractRepository.
 * Uses Octokit to interact with GitHub API.
 */
export class GitHubContractRepository implements ContractRepository {
  readonly type = 'github' as const
  private readonly octokit: Octokit
  private readonly owner: string
  private readonly repo: string
  private readonly defaultBranch: string
  private readonly contractsPath: string

  constructor(config: GitHubConfig) {
    this.octokit = new Octokit({ auth: config.accessToken })
    this.owner = config.owner
    this.repo = config.repo
    this.defaultBranch = config.defaultBranch || 'main'
    this.contractsPath = config.contractsPath || 'contracts'
  }

  async listContracts(options?: ListContractsOptions): Promise<APIContract[]> {
    const searchPath = options?.path ? `${this.contractsPath}/${options.path}` : this.contractsPath

    try {
      const contracts: APIContract[] = []
      await this.findYamlFiles(searchPath, contracts, options?.includeValidation ?? false)
      return contracts
    } catch (error) {
      // If directory doesn't exist, return empty array
      if (this.isNotFoundError(error)) {
        return []
      }
      throw error
    }
  }

  private async findYamlFiles(
    dirPath: string,
    contracts: APIContract[],
    includeValidation: boolean
  ): Promise<void> {
    const { data: contents } = await this.octokit.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path: dirPath,
      ref: this.defaultBranch,
    })

    if (!Array.isArray(contents)) {
      return
    }

    for (const item of contents) {
      if (item.type === 'dir') {
        await this.findYamlFiles(item.path, contracts, includeValidation)
      } else if (
        item.type === 'file' &&
        (item.name.endsWith('.yaml') || item.name.endsWith('.yml'))
      ) {
        try {
          const contract = await this.loadContract(item.path, includeValidation)
          contracts.push(contract)
        } catch (error) {
          console.warn(`Failed to load contract at ${item.path}:`, error)
        }
      }
    }
  }

  private async loadContract(filePath: string, validate: boolean): Promise<APIContract> {
    // Get file content
    const { data: fileData } = await this.octokit.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path: filePath,
      ref: this.defaultBranch,
    })

    if (Array.isArray(fileData) || fileData.type !== 'file') {
      throw new Error(`Expected file at ${filePath}`)
    }

    const rawYaml = Buffer.from(fileData.content, 'base64').toString('utf-8')
    const spec = parseYaml(rawYaml) as OpenAPIObject

    // Get commit info for this file
    const { data: commits } = await this.octokit.repos.listCommits({
      owner: this.owner,
      repo: this.repo,
      path: filePath,
      per_page: 1,
    })

    const lastCommit = commits[0]
    const relativePath = filePath.startsWith(`${this.contractsPath}/`)
      ? filePath.slice(this.contractsPath.length + 1)
      : filePath

    let isValid = true
    let validationErrors

    if (validate) {
      const validation = await validateOpenAPI(rawYaml)
      isValid = validation.isValid
      validationErrors = validation.errors
    }

    return {
      filePath: relativePath,
      name: spec.info?.title || 'Untitled',
      version: spec.info?.version || '0.0.0',
      description: spec.info?.description,
      spec,
      rawYaml,
      lastModified: new Date(lastCommit?.commit.author?.date || Date.now()),
      lastModifiedBy: lastCommit?.commit.author?.name || 'unknown',
      commitSha: lastCommit?.sha || '',
      isValid,
      validationErrors,
    }
  }

  async getContract(filePath: string): Promise<APIContract> {
    const fullPath = `${this.contractsPath}/${filePath}`

    try {
      return await this.loadContract(fullPath, true)
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new Error(`Contract not found: ${filePath}`)
      }
      throw error
    }
  }

  async saveContract(
    filePath: string,
    specOrYaml: OpenAPIObject | string,
    message: string,
    branch?: string
  ): Promise<SaveResult> {
    const targetBranch = branch || this.defaultBranch
    const fullPath = `${this.contractsPath}/${filePath}`
    const yaml = typeof specOrYaml === 'string' ? specOrYaml : serializeYaml(specOrYaml)
    const content = Buffer.from(yaml).toString('base64')

    // Check if file exists to get current SHA
    let sha: string | undefined
    try {
      const { data: existingFile } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: fullPath,
        ref: targetBranch,
      })

      if (!Array.isArray(existingFile) && existingFile.type === 'file') {
        sha = existingFile.sha
      }
    } catch (error) {
      // File doesn't exist, that's fine for new files
      if (!this.isNotFoundError(error)) {
        throw error
      }
    }

    // Create or update file
    const { data: result } = await this.octokit.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: fullPath,
      message,
      content,
      sha,
      branch: targetBranch,
    })

    return {
      filePath,
      commitSha: result.commit.sha,
      branch: targetBranch,
    }
  }

  async deleteContract(filePath: string, message: string): Promise<void> {
    const fullPath = `${this.contractsPath}/${filePath}`

    // Get current SHA
    const { data: existingFile } = await this.octokit.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path: fullPath,
      ref: this.defaultBranch,
    })

    if (Array.isArray(existingFile) || existingFile.type !== 'file') {
      throw new Error(`Expected file at ${filePath}`)
    }

    await this.octokit.repos.deleteFile({
      owner: this.owner,
      repo: this.repo,
      path: fullPath,
      message,
      sha: existingFile.sha,
      branch: this.defaultBranch,
    })
  }

  async getHistory(filePath: string): Promise<ContractVersion[]> {
    const fullPath = `${this.contractsPath}/${filePath}`

    const { data: commits } = await this.octokit.repos.listCommits({
      owner: this.owner,
      repo: this.repo,
      path: fullPath,
      sha: this.defaultBranch,
      per_page: 50,
    })

    return commits.map((commit) => ({
      contractPath: filePath,
      commitSha: commit.sha,
      timestamp: new Date(commit.commit.author?.date || Date.now()),
      author: commit.commit.author?.name || 'unknown',
      message: commit.commit.message,
    }))
  }

  async createPullRequest(options: PROptions): Promise<PullRequestResult> {
    const { data: pr } = await this.octokit.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title: options.title,
      body: options.body,
      head: options.head,
      base: options.base,
    })

    return {
      number: pr.number,
      url: pr.html_url,
    }
  }

  /**
   * Create a new branch from the default branch.
   */
  async createBranch(branchName: string): Promise<string> {
    // Get the SHA of the default branch
    const { data: ref } = await this.octokit.git.getRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${this.defaultBranch}`,
    })

    // Create new branch
    await this.octokit.git.createRef({
      owner: this.owner,
      repo: this.repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha,
    })

    return branchName
  }

  /**
   * Get the default branch name.
   */
  getDefaultBranch(): string {
    return this.defaultBranch
  }

  /**
   * Get contract content at a specific commit.
   * Used for comparing versions and generating changelogs.
   */
  async getContractAtCommit(filePath: string, commitSha: string): Promise<string> {
    const fullPath = `${this.contractsPath}/${filePath}`

    try {
      const { data: fileData } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: fullPath,
        ref: commitSha,
      })

      if (Array.isArray(fileData) || fileData.type !== 'file') {
        throw new Error(`Expected file at ${fullPath}`)
      }

      return Buffer.from(fileData.content, 'base64').toString('utf-8')
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new Error(`Contract not found at commit ${commitSha.slice(0, 7)}: ${filePath}`)
      }
      throw error
    }
  }

  private isNotFoundError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      (error as { status: number }).status === 404
    )
  }
}

/**
 * Check a user's permission level on a GitHub repository.
 * @param accessToken - GitHub access token
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param username - GitHub username to check
 * @returns User's permission level
 */
export async function checkUserPermission(
  accessToken: string,
  owner: string,
  repo: string,
  username: string
): Promise<GitHubPermission> {
  const octokit = new Octokit({ auth: accessToken })

  try {
    const { data } = await octokit.repos.getCollaboratorPermissionLevel({
      owner,
      repo,
      username,
    })

    return data.permission as GitHubPermission
  } catch (error) {
    // If user is not a collaborator, they have no access
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      (error as { status: number }).status === 404
    ) {
      return 'read'
    }
    throw error
  }
}

/**
 * Check if a permission level grants admin access.
 * @param permission - Permission level to check
 * @returns True if the permission grants admin access
 */
export function isAdminPermission(permission: GitHubPermission): boolean {
  return permission === 'admin'
}

/**
 * Get the platform configuration from the repository.
 * @param accessToken - GitHub access token
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Platform configuration (from repo or defaults)
 */
export async function getPlatformConfig(
  accessToken: string,
  owner: string,
  repo: string
): Promise<PlatformConfig> {
  // Use native fetch to avoid Next.js dev server error logging on 404
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(CONFIG_FILE_PATH)}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  })

  // If file doesn't exist, return defaults (no error thrown)
  if (response.status === 404) {
    return DEFAULT_CONFIG
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch platform config: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  if (Array.isArray(data) || data.type !== 'file') {
    return DEFAULT_CONFIG
  }

  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  const config = JSON.parse(content) as PlatformConfig

  // Merge with defaults to ensure all fields exist
  return {
    ...DEFAULT_CONFIG,
    ...config,
  }
}

/**
 * Save the platform configuration to the repository.
 * @param accessToken - GitHub access token
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param config - Platform configuration to save
 * @returns The commit SHA of the saved config
 */
export async function savePlatformConfig(
  accessToken: string,
  owner: string,
  repo: string,
  config: Partial<PlatformConfig>
): Promise<string> {
  const octokit = new Octokit({ auth: accessToken })

  // Get current config to merge with
  const currentConfig = await getPlatformConfig(accessToken, owner, repo)
  const newConfig: PlatformConfig = {
    ...currentConfig,
    ...config,
    version: 1, // Always use current schema version
  }

  const content = Buffer.from(JSON.stringify(newConfig, null, 2)).toString('base64')

  // Check if file exists to get current SHA
  let sha: string | undefined
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: CONFIG_FILE_PATH,
    })

    if (!Array.isArray(data) && data.type === 'file') {
      sha = data.sha
    }
  } catch {
    // File doesn't exist, that's fine for new configs
  }

  const { data: result } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: CONFIG_FILE_PATH,
    message: 'Update platform configuration',
    content,
    sha,
  })

  return result.commit.sha || ''
}

/**
 * Validate that the repository exists and is accessible.
 * @param accessToken - GitHub access token
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Repository information if accessible
 */
export async function validateRepository(
  accessToken: string,
  owner: string,
  repo: string
): Promise<{
  valid: boolean
  error?: string
  defaultBranch?: string
  fullName?: string
}> {
  const octokit = new Octokit({ auth: accessToken })

  try {
    const { data } = await octokit.repos.get({
      owner,
      repo,
    })

    return {
      valid: true,
      defaultBranch: data.default_branch,
      fullName: data.full_name,
    }
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const status = (error as { status: number }).status
      if (status === 404) {
        return {
          valid: false,
          error: 'Repository not found. Check the owner and repository name.',
        }
      }
      if (status === 403) {
        return {
          valid: false,
          error: 'Access denied. You may not have permission to access this repository.',
        }
      }
    }

    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate repository',
    }
  }
}

/**
 * GitHub branch information.
 */
export interface GitHubBranch {
  /** Branch name */
  name: string
  /** Whether the branch is protected */
  protected: boolean
}

/**
 * List all branches in a repository.
 * @param accessToken - GitHub access token
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Array of branches
 */
export async function listBranches(
  accessToken: string,
  owner: string,
  repo: string
): Promise<GitHubBranch[]> {
  const octokit = new Octokit({ auth: accessToken })

  try {
    const { data } = await octokit.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    })

    return data.map((branch) => ({
      name: branch.name,
      protected: branch.protected,
    }))
  } catch (error) {
    if (error instanceof RequestError && error.status === 404) {
      return []
    }
    throw error
  }
}
