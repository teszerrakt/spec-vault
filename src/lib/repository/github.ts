import { Octokit } from '@octokit/rest'
import type { APIContract, ContractVersion, OpenAPIObject } from '@/types'
import type {
  ContractRepository,
  ListContractsOptions,
  PROptions,
  PullRequestResult,
  SaveResult,
} from './types'
import { parseYaml, serializeYaml } from '@/lib/openapi/parser'
import { validateOpenAPI } from '@/lib/openapi/validator'

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
    const searchPath = options?.path
      ? `${this.contractsPath}/${options.path}`
      : this.contractsPath

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
      } else if (item.type === 'file' && (item.name.endsWith('.yaml') || item.name.endsWith('.yml'))) {
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
    const relativePath = filePath.startsWith(this.contractsPath + '/')
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
    spec: OpenAPIObject,
    message: string
  ): Promise<SaveResult> {
    const fullPath = `${this.contractsPath}/${filePath}`
    const yaml = serializeYaml(spec)
    const content = Buffer.from(yaml).toString('base64')

    // Check if file exists to get current SHA
    let sha: string | undefined
    try {
      const { data: existingFile } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: fullPath,
        ref: this.defaultBranch,
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
      branch: this.defaultBranch,
    })

    return {
      filePath,
      commitSha: result.commit.sha,
      branch: this.defaultBranch,
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

  private isNotFoundError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      (error as { status: number }).status === 404
    )
  }
}
