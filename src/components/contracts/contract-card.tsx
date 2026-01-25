import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { APIContract } from '@/types'

interface ContractCardProps {
  contract: APIContract
  className?: string
}

export function ContractCard({ contract, className }: ContractCardProps) {
  const href = `/contracts/${contract.filePath}`

  return (
    <Link href={href}>
      <Card
        className={cn('transition-colors hover:border-primary/50 hover:bg-muted/50', className)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-medium leading-tight">{contract.name}</CardTitle>
            <ContractStatusBadge isValid={contract.isValid} />
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            {contract.filePath}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {contract.description && (
            <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
              {contract.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>v{contract.version}</span>
            <span>Updated {formatRelativeDate(contract.lastModified)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function ContractStatusBadge({ isValid }: { isValid: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        isValid
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      )}
    >
      {isValid ? 'Valid' : 'Invalid'}
    </span>
  )
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}
