import { Suspense } from 'react'
import { listContractsPaginated } from '@/actions/contracts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ContractsPageClient } from './contracts-client'

export const metadata = {
  title: 'Contracts | Spec Vault',
  description: 'Browse and manage API contracts',
}

interface ContractsPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function ContractsPage({ searchParams }: ContractsPageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Contracts</h1>
          <p className="text-muted-foreground">Browse and manage your OpenAPI specifications</p>
        </div>
      </div>

      <Suspense fallback={<ContractsListSkeleton />}>
        <ContractsContent page={page} />
      </Suspense>
    </div>
  )
}

async function ContractsContent({ page }: { page: number }) {
  const result = await listContractsPaginated({
    includeValidation: true,
    page,
    limit: 20,
  })

  return <ContractsPageClient paginatedResult={result} />
}

/**
 * Skeleton loading state for contracts list.
 * Matches the layout: search bar, import button, and grid of contract cards.
 */
function ContractsListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Search bar + Import button */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 max-w-sm flex-1" />
        <Button disabled className="gap-2">
          Import API
        </Button>
      </div>

      {/* Contract cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ContractCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton for a single contract card.
 */
function ContractCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          {/* Title */}
          <Skeleton className="h-5 w-32" />
          {/* Status badge */}
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        {/* File path */}
        <Skeleton className="mt-1 h-3 w-40" />
      </CardHeader>
      <CardContent className="pt-0">
        {/* Description */}
        <Skeleton className="mb-3 h-4 w-full" />
        <Skeleton className="mb-3 h-4 w-3/4" />
        {/* Version + date */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}
