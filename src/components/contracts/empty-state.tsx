import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  title?: string
  message?: string
  showImportButton?: boolean
}

export function EmptyState({
  title = 'No contracts found',
  message = 'Get started by importing an API description or creating a new contract.',
  showImportButton = true,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
      <div className="mb-4 text-6xl text-muted-foreground/50">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">{message}</p>
      {showImportButton && (
        <Button asChild>
          <Link href="/import">Import API</Link>
        </Button>
      )}
    </div>
  )
}
