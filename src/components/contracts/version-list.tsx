'use client'

import { formatDistanceToNow } from 'date-fns'
import { GitCommit, User, Clock, GitCompare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ContractVersion } from '@/types'

interface VersionListProps {
  /** Array of contract versions */
  versions: ContractVersion[]
  /** Callback when a version is selected */
  onSelectVersion?: (version: ContractVersion) => void
  /** Callback when compare is clicked for a version */
  onCompareVersion?: (version: ContractVersion) => void
  /** Currently selected version SHA */
  selectedSha?: string
}

export function VersionList({
  versions,
  onSelectVersion,
  onCompareVersion,
  selectedSha,
}: VersionListProps) {
  if (versions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <GitCommit className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No version history available</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {versions.map((version, index) => {
        const isSelected = selectedSha === version.commitSha
        const isLatest = index === 0
        const showCompare = !isLatest && onCompareVersion && versions.length > 1

        return (
          <div
            key={version.commitSha}
            className={`rounded-lg border p-3 transition-colors ${
              isSelected ? 'border-primary bg-accent' : 'border-border hover:bg-accent/50'
            }`}
          >
            <button
              onClick={() => onSelectVersion?.(version)}
              className="w-full text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                      {version.commitSha.slice(0, 7)}
                    </code>
                    {isLatest && (
                      <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded">
                        Latest
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate" title={version.message}>
                    {version.message.split('\n')[0]}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {version.author}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(version.timestamp), { addSuffix: true })}
                </span>
              </div>
            </button>

            {/* Compare button for non-latest versions */}
            {showCompare && (
              <div className="mt-2 pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs w-full justify-start"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCompareVersion(version)
                  }}
                >
                  <GitCompare className="h-3 w-3 mr-1.5" />
                  Compare with Latest
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
