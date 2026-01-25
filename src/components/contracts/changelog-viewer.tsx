'use client'

import { AlertTriangle, ArrowRight, FileText } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { getCategoryLabel, groupChangesByCategory } from '@/lib/changelog/formatter'
import type { ChangeCategory, ChangelogEntry } from '@/types'
import { ChangeItem } from './change-item'

interface ChangelogViewerProps {
  /** The changelog entry to display */
  changelog: ChangelogEntry
  /** Optional class name */
  className?: string
}

/**
 * Display a complete changelog comparing two versions.
 */
export function ChangelogViewer({ changelog, className }: ChangelogViewerProps) {
  const groupedChanges = groupChangesByCategory(changelog.changes)

  // Get categories that have changes
  const nonEmptyCategories = (Object.keys(groupedChanges) as ChangeCategory[]).filter(
    (category) => groupedChanges[category].length > 0
  )

  const breakingCount = changelog.changes.filter((c) => c.breaking).length

  return (
    <div className={className}>
      {/* Version comparison header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <code className="bg-muted px-2 py-1 rounded">{changelog.fromVersion.slice(0, 7)}</code>
        <ArrowRight className="h-4 w-4" />
        <code className="bg-muted px-2 py-1 rounded">{changelog.toVersion.slice(0, 7)}</code>
      </div>

      {/* Breaking changes alert */}
      {changelog.breakingChanges && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Breaking Changes Detected</AlertTitle>
          <AlertDescription>
            This update contains {breakingCount} breaking change{breakingCount === 1 ? '' : 's'}{' '}
            that may affect API consumers. Please review carefully before deploying.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{changelog.summary}</p>
        </CardContent>
      </Card>

      {/* No changes state */}
      {changelog.changes.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No changes detected between these versions.</p>
        </div>
      )}

      {/* Grouped changes */}
      {nonEmptyCategories.map((category, index) => (
        <div key={category} className="mb-6">
          {index > 0 && <Separator className="mb-6" />}
          <h3 className="text-sm font-medium mb-3">{getCategoryLabel(category)}</h3>
          <div className="space-y-2">
            {groupedChanges[category].map((change, changeIndex) => (
              <ChangeItem key={`${change.path}-${changeIndex}`} change={change} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
