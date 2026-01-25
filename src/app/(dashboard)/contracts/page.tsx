import { Suspense } from 'react'
import { listContractsPaginated } from '@/actions/contracts'
import { ContractsPageClient } from './contracts-client'
import { PageLoading } from '@/components/ui/loading'

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
          <p className="text-muted-foreground">
            Browse and manage your OpenAPI specifications
          </p>
        </div>
      </div>

      <Suspense fallback={<PageLoading />}>
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
