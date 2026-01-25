'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { GitCompare, Loader2, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ChangelogViewer } from './changelog-viewer'
import { generateChangelogAction } from '@/actions/contracts'
import type { ContractVersion, ChangelogEntry } from '@/types'

interface VersionCompareProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Contract file path */
  contractPath: string
  /** Available versions to compare */
  versions: ContractVersion[]
  /** Initial "from" version (older version to compare) */
  initialFromVersion?: ContractVersion
  /** Initial "to" version (newer version to compare) - defaults to latest */
  initialToVersion?: ContractVersion
}

/**
 * Dialog for comparing two versions of a contract and viewing the changelog.
 */
export function VersionCompare({
  open,
  onOpenChange,
  contractPath,
  versions,
  initialFromVersion,
  initialToVersion,
}: VersionCompareProps) {
  const latestVersion = versions[0]
  const defaultFromVersion = initialFromVersion || versions[1] || versions[0]
  const defaultToVersion = initialToVersion || latestVersion

  const [fromSha, setFromSha] = useState(defaultFromVersion?.commitSha || '')
  const [toSha, setToSha] = useState(defaultToVersion?.commitSha || '')
  const [changelog, setChangelog] = useState<ChangelogEntry | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track if we should auto-compare on open
  const hasAutoCompared = useRef(false)

  const handleCompare = useCallback(async (from: string, to: string) => {
    if (!from || !to) return
    if (from === to) {
      setError('Please select different versions to compare')
      return
    }

    setIsLoading(true)
    setError(null)
    setChangelog(null)

    try {
      const result = await generateChangelogAction(contractPath, from, to)
      setChangelog(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate changelog')
    } finally {
      setIsLoading(false)
    }
  }, [contractPath])

  // Auto-compare when dialog opens with initialFromVersion
  useEffect(() => {
    if (open && initialFromVersion && !hasAutoCompared.current) {
      const from = initialFromVersion.commitSha
      const to = defaultToVersion?.commitSha || ''
      if (from && to && from !== to) {
        hasAutoCompared.current = true
        setFromSha(from)
        setToSha(to)
        handleCompare(from, to)
      }
    }
    if (!open) {
      hasAutoCompared.current = false
    }
  }, [open, initialFromVersion, defaultToVersion, handleCompare])

  // Reset state when dialog opens
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        // Reset to defaults when opening
        setFromSha(defaultFromVersion?.commitSha || '')
        setToSha(defaultToVersion?.commitSha || '')
        setChangelog(null)
        setError(null)
      }
      onOpenChange(newOpen)
    },
    [onOpenChange, defaultFromVersion, defaultToVersion]
  )

  // Format version label for select - truncated version
  const formatVersionLabel = (version: ContractVersion, isLatest: boolean) => {
    const shortSha = version.commitSha.slice(0, 7)
    const suffix = isLatest ? ' (Latest)' : ''
    const maxMsgLength = 25
    let message = version.message.split('\n')[0]
    if (message.length > maxMsgLength) {
      message = message.slice(0, maxMsgLength) + '...'
    }
    return `${shortSha} - ${message}${suffix}`
  }

  // Get truncated display value for selected item
  const getSelectedLabel = (sha: string) => {
    const version = versions.find((v) => v.commitSha === sha)
    if (!version) return 'Select version'
    return formatVersionLabel(version, version.commitSha === latestVersion?.commitSha)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Compare Versions
          </DialogTitle>
          <DialogDescription>
            Compare two versions of this contract to see what changed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Version selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from-version">From (older)</Label>
              <Select value={fromSha} onValueChange={setFromSha}>
                <SelectTrigger id="from-version" className="truncate">
                  <span className="truncate">{getSelectedLabel(fromSha)}</span>
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v, i) => (
                    <SelectItem key={v.commitSha} value={v.commitSha}>
                      {formatVersionLabel(v, i === 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="to-version">To (newer)</Label>
              <Select value={toSha} onValueChange={setToSha}>
                <SelectTrigger id="to-version" className="truncate">
                  <span className="truncate">{getSelectedLabel(toSha)}</span>
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v, i) => (
                    <SelectItem key={v.commitSha} value={v.commitSha}>
                      {formatVersionLabel(v, i === 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Compare button */}
          <Button
            onClick={() => handleCompare(fromSha, toSha)}
            disabled={isLoading || !fromSha || !toSha || fromSha === toSha}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating changelog...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Compare Versions
              </>
            )}
          </Button>

          {/* Error message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
              {error}
            </div>
          )}
        </div>

        {/* Changelog results */}
        {changelog && (
          <div className="flex-1 overflow-y-auto mt-4 -mx-6 px-6">
            <ChangelogViewer changelog={changelog} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
