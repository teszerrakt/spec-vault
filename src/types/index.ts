import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types'

/**
 * Unified OpenAPI object type supporting both 3.0 and 3.1 specs.
 */
export type OpenAPIObject = OpenAPIV3.Document | OpenAPIV3_1.Document

/**
 * Validation error returned by OpenAPI parser.
 */
export interface ValidationError {
  /** JSON path to error location (e.g., "/paths/~1users/get/responses/200") */
  path: string
  /** Human-readable error message */
  message: string
  /** Severity level */
  severity: 'error' | 'warning'
}

/**
 * The central entity representing a complete OpenAPI specification.
 */
export interface APIContract {
  /** Unique identifier - file path within repository (e.g., "contracts/payments/api.yaml") */
  filePath: string
  /** API name from info.title */
  name: string
  /** API version from info.version */
  version: string
  /** API description from info.description */
  description?: string
  /** Full parsed OpenAPI 3.0+ specification */
  spec: OpenAPIObject
  /** Original YAML string */
  rawYaml: string
  /** Last modification timestamp from Git commit */
  lastModified: Date
  /** Last modifier from Git commit author */
  lastModifiedBy: string
  /** Current HEAD commit SHA */
  commitSha: string
  /** Whether the spec passes validation */
  isValid: boolean
  /** Validation errors if any */
  validationErrors?: ValidationError[]
}

/**
 * A point-in-time snapshot retrieved from Git history.
 */
export interface ContractVersion {
  /** Path to the contract file */
  contractPath: string
  /** Git commit SHA */
  commitSha: string
  /** Commit timestamp */
  timestamp: Date
  /** Commit author */
  author: string
  /** Commit message */
  message: string
}

/**
 * Type of change detected between contract versions.
 */
export type ChangeType = 'added' | 'removed' | 'modified' | 'deprecated'

/**
 * Category of the changed element.
 */
export type ChangeCategory = 'endpoint' | 'parameter' | 'schema' | 'response' | 'security' | 'info'

/**
 * A single change detected between two contract versions.
 */
export interface Change {
  /** Type of change */
  type: ChangeType
  /** Category of the changed element */
  category: ChangeCategory
  /** JSON path to the changed element */
  path: string
  /** Human-readable description of the change */
  description: string
  /** Whether this change is breaking */
  breaking: boolean
}

/**
 * Generated changelog entry comparing two contract versions.
 */
export interface ChangelogEntry {
  /** Source version commit SHA */
  fromVersion: string
  /** Target version commit SHA */
  toVersion: string
  /** Path to the contract file */
  contractPath: string
  /** List of detected changes */
  changes: Change[]
  /** Human-readable summary */
  summary: string
  /** Whether any changes are breaking */
  breakingChanges: boolean
}

/**
 * User's selected GitHub repository configuration.
 */
export interface RepositoryConfig {
  /** GitHub organization or user */
  owner: string
  /** Repository name */
  repo: string
  /** Default branch name */
  defaultBranch: string
  /** Path prefix for contract files (default: "contracts/") */
  contractsPath: string
}

/**
 * Platform configuration stored in the connected GitHub repository.
 * Stored at `.api-platform/config.json`.
 */
export interface PlatformConfig {
  /** Config schema version (currently 1) */
  version: number
  /** Path prefix for contract files */
  contractsPath: string
  /** Default branch name */
  defaultBranch: string
}

/**
 * GitHub repository permission levels.
 */
export type GitHubPermission = 'admin' | 'maintain' | 'write' | 'triage' | 'read'

/**
 * Result of checking a user's repository permission.
 */
export interface PermissionCheckResult {
  /** User's permission level */
  permission: GitHubPermission
  /** Whether the user has admin access */
  isAdmin: boolean
  /** GitHub username */
  username: string
}
