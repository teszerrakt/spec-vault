'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ContractList, SearchFilter } from '@/components/contracts'
import type { APIContract } from '@/types'

interface ContractsPageClientProps {
  initialContracts: APIContract[]
}

export function ContractsPageClient({ initialContracts }: ContractsPageClientProps) {
  const [filteredContracts, setFilteredContracts] = useState(initialContracts)

  const handleSearch = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setFilteredContracts(initialContracts)
        return
      }

      const lowerQuery = query.toLowerCase()
      const filtered = initialContracts.filter(
        (contract) =>
          contract.name.toLowerCase().includes(lowerQuery) ||
          contract.description?.toLowerCase().includes(lowerQuery) ||
          contract.filePath.toLowerCase().includes(lowerQuery)
      )
      setFilteredContracts(filtered)
    },
    [initialContracts]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <SearchFilter onSearch={handleSearch} className="max-w-sm flex-1" />
        <Button asChild>
          <Link href="/import">Import API</Link>
        </Button>
      </div>

      <ContractList
        contracts={filteredContracts}
        emptyMessage={
          filteredContracts.length === 0 && initialContracts.length > 0
            ? 'No contracts match your search.'
            : undefined
        }
      />

      {initialContracts.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Showing {filteredContracts.length} of {initialContracts.length} contracts
        </p>
      )}
    </div>
  )
}
