'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { ContractList, SearchFilter } from '@/components/contracts'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { getMetaKeyDisplay, useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'
import type { PaginatedResult } from '@/lib/repository/types'
import type { APIContract } from '@/types'

interface ContractsPageClientProps {
  paginatedResult: PaginatedResult<APIContract>
}

export function ContractsPageClient({ paginatedResult }: ContractsPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { items, total, page, totalPages } = paginatedResult
  const [filteredContracts, setFilteredContracts] = useState(items)
  const [searchQuery, setSearchQuery] = useState('')

  // Keyboard shortcut: Cmd/Ctrl + I to go to import
  useKeyboardShortcut({
    key: 'i',
    modifiers: ['meta'],
    onTrigger: () => router.push('/import'),
  })

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query)
      if (!query.trim()) {
        setFilteredContracts(items)
        return
      }

      const lowerQuery = query.toLowerCase()
      const filtered = items.filter(
        (contract) =>
          contract.name.toLowerCase().includes(lowerQuery) ||
          contract.description?.toLowerCase().includes(lowerQuery) ||
          contract.filePath.toLowerCase().includes(lowerQuery)
      )
      setFilteredContracts(filtered)
    },
    [items]
  )

  const createPageUrl = (pageNum: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', pageNum.toString())
    return `?${params.toString()}`
  }

  // Generate page numbers to show
  const getVisiblePages = () => {
    const pages: (number | 'ellipsis')[] = []
    const showPages = 5 // Number of page buttons to show

    if (totalPages <= showPages) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (page > 3) {
        pages.push('ellipsis')
      }

      // Show pages around current
      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (page < totalPages - 2) {
        pages.push('ellipsis')
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  const isSearching = searchQuery.trim().length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <SearchFilter onSearch={handleSearch} className="max-w-sm flex-1" />
        <Button asChild className="gap-2">
          <Link href="/import">
            Import API
            <Kbd className="ml-1">{getMetaKeyDisplay()}I</Kbd>
          </Link>
        </Button>
      </div>

      <ContractList
        contracts={filteredContracts}
        emptyMessage={
          filteredContracts.length === 0 && items.length > 0
            ? 'No contracts match your search.'
            : undefined
        }
      />

      {/* Pagination - only show when not searching and more than one page */}
      {!isSearching && totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={page > 1 ? createPageUrl(page - 1) : undefined}
                aria-disabled={page <= 1}
                className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>

            {getVisiblePages().map((pageNum, index) =>
              pageNum === 'ellipsis' ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={pageNum}>
                  <PaginationLink href={createPageUrl(pageNum)} isActive={pageNum === page}>
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                href={page < totalPages ? createPageUrl(page + 1) : undefined}
                aria-disabled={page >= totalPages}
                className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Show count */}
      {total > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          {isSearching ? (
            <>
              Showing {filteredContracts.length} of {items.length} contracts on this page
            </>
          ) : (
            <>
              Showing {(page - 1) * paginatedResult.limit + 1}-
              {Math.min(page * paginatedResult.limit, total)} of {total} contracts
            </>
          )}
        </p>
      )}
    </div>
  )
}
