'use client'

import { useState, useTransition } from 'react'
import { ExternalLinkIcon, Loader2Icon, AlertTriangleIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { saveRepositorySettings } from '@/actions/github'
import type { PlatformConfig, RepositoryConfig } from '@/types'

interface GitHubBranch {
  name: string
  protected: boolean
}

interface RepositorySettingsProps {
  config: RepositoryConfig & PlatformConfig
  isAdmin: boolean
  branches: GitHubBranch[]
}

export function RepositorySettings({ config, isAdmin, branches }: RepositorySettingsProps) {
  const [isPending, startTransition] = useTransition()
  const [defaultBranch, setDefaultBranch] = useState(config.defaultBranch)
  const [contractsPath, setContractsPath] = useState(config.contractsPath)

  const hasChanges =
    defaultBranch !== config.defaultBranch || contractsPath !== config.contractsPath

  // Check if configured branch exists
  const branchExists = branches.some((b) => b.name === config.defaultBranch)
  const selectedBranchExists = branches.some((b) => b.name === defaultBranch)

  const handleReset = () => {
    setDefaultBranch(config.defaultBranch)
    setContractsPath(config.contractsPath)
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveRepositorySettings({
        defaultBranch,
        contractsPath,
      })

      if (result.success) {
        toast.success('Settings saved successfully')
      } else {
        toast.error('Failed to save settings', {
          description: result.error,
        })
      }
    })
  }

  const repoUrl = `https://github.com/${config.owner}/${config.repo}`

  return (
    <div className="space-y-6">
      {!isAdmin && (
        <Alert>
          <AlertDescription>
            You have read-only access. Only repository administrators can modify these settings.
          </AlertDescription>
        </Alert>
      )}

      {/* Warning if configured branch doesn't exist */}
      {!branchExists && branches.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            The configured branch &quot;{config.defaultBranch}&quot; no longer exists. 
            Please select a valid branch.
          </AlertDescription>
        </Alert>
      )}

      {/* Connected Repository - Read Only */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Connected Repository</Label>
        <div className="flex items-center gap-2">
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-sm text-primary hover:underline"
          >
            {config.owner}/{config.repo}
            <ExternalLinkIcon className="h-3 w-3" />
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          Set via GITHUB_OWNER and GITHUB_REPO environment variables.
        </p>
      </div>

      {/* Default Branch */}
      <div className="space-y-2">
        <Label htmlFor="defaultBranch" className="text-sm font-medium">
          Default Branch
        </Label>
        {branches.length > 0 ? (
          <Select
            value={selectedBranchExists ? defaultBranch : ''}
            onValueChange={setDefaultBranch}
            disabled={!isAdmin || isPending}
          >
            <SelectTrigger id="defaultBranch">
              <SelectValue placeholder="Select a branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.name} value={branch.name}>
                  <span className="flex items-center gap-2">
                    {branch.name}
                    {branch.protected && (
                      <Badge variant="secondary" className="text-xs">
                        protected
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="defaultBranch"
            value={defaultBranch}
            onChange={(e) => setDefaultBranch(e.target.value)}
            disabled={!isAdmin || isPending}
            placeholder="main"
          />
        )}
        <p className="text-xs text-muted-foreground">
          The branch to use when reading and saving contracts.
        </p>
      </div>

      {/* Contracts Path */}
      <div className="space-y-2">
        <Label htmlFor="contractsPath" className="text-sm font-medium">
          Contracts Path
        </Label>
        <Input
          id="contractsPath"
          value={contractsPath}
          onChange={(e) => setContractsPath(e.target.value)}
          disabled={!isAdmin || isPending}
          placeholder="contracts"
        />
        <p className="text-xs text-muted-foreground">
          Directory where contract files are stored in the repository.
        </p>
      </div>

      {/* Actions */}
      {isAdmin && (
        <div className="flex items-center justify-end gap-2 border-t pt-6">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || isPending}
          >
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isPending}>
            {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      )}
    </div>
  )
}
