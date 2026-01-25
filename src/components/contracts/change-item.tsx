'use client'

import { AlertTriangle, ArrowRight, Minus, Pencil, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getCategoryLabel } from '@/lib/changelog/formatter'
import { cn } from '@/lib/utils'
import type { Change, ChangeCategory, ChangeType } from '@/types'

interface ChangeItemProps {
  /** The change to display */
  change: Change
  /** Optional additional class name */
  className?: string
}

/**
 * Get the icon for a change type.
 */
function getChangeIcon(type: ChangeType, breaking: boolean) {
  if (breaking) {
    return <AlertTriangle className="h-4 w-4 text-destructive" />
  }

  switch (type) {
    case 'added':
      return <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
    case 'removed':
      return <Minus className="h-4 w-4 text-red-600 dark:text-red-400" />
    case 'modified':
      return <Pencil className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
    case 'deprecated':
      return <ArrowRight className="h-4 w-4 text-orange-600 dark:text-orange-400" />
  }
}

/**
 * Get the background color class for a change type.
 */
function getChangeBgClass(type: ChangeType, breaking: boolean): string {
  if (breaking) {
    return 'bg-destructive/10 border-destructive/20'
  }

  switch (type) {
    case 'added':
      return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
    case 'removed':
      return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
    case 'modified':
      return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900'
    case 'deprecated':
      return 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900'
  }
}

/**
 * Get badge variant for category.
 */
function getCategoryVariant(category: ChangeCategory): 'default' | 'secondary' | 'outline' {
  switch (category) {
    case 'endpoint':
      return 'default'
    case 'schema':
      return 'secondary'
    default:
      return 'outline'
  }
}

/**
 * Display a single change from a changelog.
 */
export function ChangeItem({ change, className }: ChangeItemProps) {
  const icon = getChangeIcon(change.type, change.breaking)
  const bgClass = getChangeBgClass(change.type, change.breaking)

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 transition-colors',
        bgClass,
        className
      )}
    >
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={getCategoryVariant(change.category)} className="text-xs">
            {getCategoryLabel(change.category)}
          </Badge>
          {change.breaking && (
            <Badge variant="destructive" className="text-xs">
              Breaking
            </Badge>
          )}
          <Badge variant="outline" className="text-xs capitalize">
            {change.type}
          </Badge>
        </div>
        <p className="text-sm">{change.description}</p>
        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded block truncate">
          {change.path}
        </code>
      </div>
    </div>
  )
}
