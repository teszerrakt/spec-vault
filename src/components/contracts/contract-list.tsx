import { ContractCard } from './contract-card'
import { EmptyState } from './empty-state'
import type { APIContract } from '@/types'

interface ContractListProps {
  contracts: APIContract[]
  emptyMessage?: string
}

export function ContractList({ contracts, emptyMessage }: ContractListProps) {
  if (contracts.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {contracts.map((contract) => (
        <ContractCard key={contract.filePath} contract={contract} />
      ))}
    </div>
  )
}
