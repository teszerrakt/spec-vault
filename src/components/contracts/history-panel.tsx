'use client'

import { useEffect, useState, useCallback } from 'react'
import { History, Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VersionList } from './version-list'
import { getContractHistory } from '@/actions/github'
import type { ContractVersion } from '@/types'

interface HistoryPanelProps {
  /** File path of the contract */
  filePath: string
  /** Callback when a version is selected */
  onSelectVersion?: (version: ContractVersion) => void
}

export function HistoryPanel({ filePath, onSelectVersion }: HistoryPanelProps) {
  const [versions, setVersions] = useState<ContractVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSha, setSelectedSha] = useState<string | undefined>()

  const fetchHistory = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const history = await getContractHistory(filePath)
      setVersions(history)
      // Auto-select the latest version
      if (history.length > 0 && !selectedSha) {
        setSelectedSha(history[0].commitSha)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setIsLoading(false)
    }
  }, [filePath, selectedSha])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleSelectVersion = useCallback(
    (version: ContractVersion) => {
      setSelectedSha(version.commitSha)
      onSelectVersion?.(version)
    },
    [onSelectVersion]
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5" />
              Version History
            </CardTitle>
            <CardDescription>
              {versions.length > 0
                ? `${versions.length} version${versions.length === 1 ? '' : 's'} found`
                : 'View previous versions of this contract'}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchHistory}
            disabled={isLoading}
            title="Refresh history"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && versions.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchHistory}>
              Try Again
            </Button>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto pr-1">
            <VersionList
              versions={versions}
              onSelectVersion={handleSelectVersion}
              selectedSha={selectedSha}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
