import * as fs from 'fs/promises'
import * as path from 'path'
import type { APIContract, ContractVersion, OpenAPIObject } from '@/types'
import type { ContractRepository, ListContractsOptions, SaveResult } from './types'
import { parseYaml, serializeYaml } from '@/lib/openapi/parser'
import { validateOpenAPI } from '@/lib/openapi/validator'

/**
 * Local filesystem implementation of ContractRepository.
 * Used for development and testing without GitHub.
 */
export class LocalContractRepository implements ContractRepository {
  readonly type = 'local' as const
  private readonly basePath: string

  constructor(basePath?: string) {
    this.basePath = basePath || path.join(process.cwd(), 'contracts')
  }

  async listContracts(options?: ListContractsOptions): Promise<APIContract[]> {
    const searchPath = options?.path
      ? path.join(this.basePath, options.path)
      : this.basePath

    try {
      await fs.access(searchPath)
    } catch {
      // Directory doesn't exist, return empty array
      return []
    }

    const contracts: APIContract[] = []
    await this.findYamlFiles(searchPath, contracts, options?.includeValidation ?? false)
    return contracts
  }

  private async findYamlFiles(
    dir: string,
    contracts: APIContract[],
    includeValidation: boolean
  ): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        await this.findYamlFiles(fullPath, contracts, includeValidation)
      } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
        try {
          const contract = await this.loadContract(fullPath, includeValidation)
          contracts.push(contract)
        } catch (error) {
          console.warn(`Failed to load contract at ${fullPath}:`, error)
        }
      }
    }
  }

  private async loadContract(fullPath: string, validate: boolean): Promise<APIContract> {
    const rawYaml = await fs.readFile(fullPath, 'utf-8')
    const spec = parseYaml(rawYaml) as OpenAPIObject
    const stat = await fs.stat(fullPath)
    const filePath = path.relative(this.basePath, fullPath)

    let isValid = true
    let validationErrors

    if (validate) {
      const validation = await validateOpenAPI(rawYaml)
      isValid = validation.isValid
      validationErrors = validation.errors
    }

    return {
      filePath,
      name: spec.info?.title || 'Untitled',
      version: spec.info?.version || '0.0.0',
      description: spec.info?.description,
      spec,
      rawYaml,
      lastModified: stat.mtime,
      lastModifiedBy: 'local',
      commitSha: 'local',
      isValid,
      validationErrors,
    }
  }

  async getContract(filePath: string): Promise<APIContract> {
    const fullPath = path.join(this.basePath, filePath)

    try {
      await fs.access(fullPath)
    } catch {
      throw new Error(`Contract not found: ${filePath}`)
    }

    return this.loadContract(fullPath, true)
  }

  async saveContract(
    filePath: string,
    spec: OpenAPIObject,
    _message: string
  ): Promise<SaveResult> {
    const fullPath = path.join(this.basePath, filePath)
    const dir = path.dirname(fullPath)

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true })

    // Serialize and write
    const yaml = serializeYaml(spec)
    await fs.writeFile(fullPath, yaml, 'utf-8')

    return {
      filePath,
      branch: 'local',
    }
  }

  async deleteContract(filePath: string, _message: string): Promise<void> {
    const fullPath = path.join(this.basePath, filePath)

    try {
      await fs.unlink(fullPath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }

  async getHistory(_filePath: string): Promise<ContractVersion[]> {
    // Local filesystem doesn't track history
    return []
  }

  // createPullRequest is not implemented for local repository
}
