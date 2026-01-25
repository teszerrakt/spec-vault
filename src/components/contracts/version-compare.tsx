'use client'

import { GitCompare, Loader2, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { generateChangelogAction } from '@/actions/contracts'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/kbd'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { getMetaKeyDisplay, useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'
import type { ChangelogEntry, ContractVersion } from '@/types'
import { ChangelogViewer } from './changelog-viewer'

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
  /** Whether to auto-compare when dialog opens (default: true) */
  autoCompare?: boolean
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
  autoCompare = true,
}: VersionCompareProps) {
  const latestVersion = versions[0]

  const [fromSha, setFromSha] = useState('')
  const [toSha, setToSha] = useState('')
  const [changelog, setChangelog] = useState<ChangelogEntry | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track the previous open state to detect open transitions
  const prevOpenRef = useRef(false)

  const handleCompare = useCallback(
    async (from: string, to: string) => {
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
        const message = err instanceof Error ? err.message : 'Failed to generate changelog'
        setError(message)
        toast.error('Comparison failed', { description: message })
      } finally {
        setIsLoading(false)
      }
    },
    [contractPath]
  )

  // Keyboard shortcut: Cmd/Ctrl + Enter to compare
  useKeyboardShortcut({
    key: 'Enter',
    modifiers: ['meta'],
    onTrigger: () => handleCompare(fromSha, toSha),
    enabled: open && !isLoading && !!fromSha && !!toSha && fromSha !== toSha,
  })

  // Initialize state and optionally auto-compare when dialog opens
  useEffect(() => {
    // Detect transition from closed to open
    if (open && !prevOpenRef.current) {
      // Calculate defaults
      const defaultFrom = initialFromVersion || versions[1] || versions[0]
      const defaultTo = initialToVersion || latestVersion

      // Set initial values
      const from = defaultFrom?.commitSha || ''
      const to = defaultTo?.commitSha || ''
      setFromSha(from)
      setToSha(to)
      setChangelog(null)
      setError(null)

      // Auto-compare if enabled and versions are different
      if (autoCompare && from && to && from !== to) {
        handleCompare(from, to)
      }
    }
    prevOpenRef.current = open
  }, [
    open,
    initialFromVersion,
    initialToVersion,
    versions,
    latestVersion,
    autoCompare,
    handleCompare,
  ])

  // Format version label for select - truncated version
  const formatVersionLabel = (version: ContractVersion, isLatest: boolean) => {
    const shortSha = version.commitSha.slice(0, 7)
    const suffix = isLatest ? ' (Latest)' : ''
    const maxMsgLength = 25
    let message = version.message.split('\n')[0]
    if (message.length > maxMsgLength) {
      message = `${message.slice(0, maxMsgLength)}...`
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                <SelectTrigger id="from-version" className="w-full">
                  <span className="truncate">{getSelectedLabel(fromSha)}</span>
                </SelectTrigger>
                <SelectContent position="popper" className="z-[100]">
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
                <SelectTrigger id="to-version" className="w-full">
                  <span className="truncate">{getSelectedLabel(toSha)}</span>
                </SelectTrigger>
                <SelectContent position="popper" className="z-[100]">
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
                <Kbd className="ml-2">{getMetaKeyDisplay()}↵</Kbd>
              </>
            )}
          </Button>

          {/* Error message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</div>
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
