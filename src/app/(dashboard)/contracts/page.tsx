import { Suspense } from 'react'
import { listContracts } from '@/actions/contracts'
import { ContractList } from '@/components/contracts'
import { ContractsPageClient } from './contracts-client'
import { PageLoading } from '@/components/ui/loading'

export const metadata = {
  title: 'Contracts | Spec Vault',
  description: 'Browse and manage API contracts',
}

export default async function ContractsPage() {
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
        <ContractsContent />
      </Suspense>
    </div>
  )
}

async function ContractsContent() {
  const contracts = await listContracts({ includeValidation: true })

  return <ContractsPageClient initialContracts={contracts} />
}
