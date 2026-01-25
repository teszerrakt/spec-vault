'use client'

import { GitBranch, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface BranchSelectorProps {
  /** Current branch name value */
  value: string
  /** Callback when branch name changes */
  onChange: (branchName: string) => void
  /** File path used to generate default branch name */
  filePath: string
  /** Whether the input is disabled */
  disabled?: boolean
  /** Show validation error */
  error?: string
}

/**
 * Generate a unique branch name based on file path and timestamp.
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
 * Validate branch name format.
 */
function validateBranchName(name: string): string | null {
  if (!name.trim()) {
    return 'Branch name is required'
  }

  if (name.length < 3) {
    return 'Branch name must be at least 3 characters'
  }

  if (name.length > 100) {
    return 'Branch name must be less than 100 characters'
  }

  // Git branch name rules
  if (/^[.-]/.test(name) || /[.-]$/.test(name)) {
    return 'Branch name cannot start or end with . or -'
  }

  if (/\.\./.test(name)) {
    return 'Branch name cannot contain ..'
  }

  if (/[\s~^:?*[\]\\]/.test(name)) {
    return 'Branch name contains invalid characters'
  }

  if (name.includes('@{')) {
    return 'Branch name cannot contain @{'
  }

  return null
}

export function BranchSelector({
  value,
  onChange,
  filePath,
  disabled = false,
  error: externalError,
}: BranchSelectorProps) {
  const [internalError, setInternalError] = useState<string | null>(null)

  // Generate initial branch name if empty
  useEffect(() => {
    if (!value && filePath) {
      onChange(generateBranchName(filePath))
    }
  }, [value, filePath, onChange])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      onChange(newValue)
      setInternalError(validateBranchName(newValue))
    },
    [onChange]
  )

  const handleRegenerate = useCallback(() => {
    const newName = generateBranchName(filePath)
    onChange(newName)
    setInternalError(null)
  }, [filePath, onChange])

  const displayError = externalError || internalError

  return (
    <div className="space-y-2">
      <Label htmlFor="branchName" className="flex items-center gap-2">
        <GitBranch className="h-4 w-4" />
        Branch Name
      </Label>
      <div className="flex gap-2">
        <Input
          id="branchName"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder="e.g., contract/payments-api-update"
          className={displayError ? 'border-destructive' : ''}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleRegenerate}
          disabled={disabled}
          title="Generate new branch name"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {displayError ? (
        <p className="text-xs text-destructive">{displayError}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          A new branch will be created for this pull request
        </p>
      )}
    </div>
  )
}
