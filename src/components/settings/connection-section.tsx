'use client'

import { CheckCircle2Icon, FileTextIcon, Loader2Icon, XCircleIcon } from 'lucide-react'
import { useState, useTransition } from 'react'
import { validateRepositoryConnection } from '@/actions/github'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface ConnectionSectionProps {
  initialStatus?: {
    canRead: boolean
    canWrite: boolean
    contractsCount?: number
  }
}

export function ConnectionSection({ initialStatus }: ConnectionSectionProps) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState(initialStatus)
  const [error, setError] = useState<string | null>(null)

  const handleTest = () => {
    setError(null)
    startTransition(async () => {
      const result = await validateRepositoryConnection()
      if (result.success) {
        setStatus({
          canRead: result.canRead,
          canWrite: result.canWrite,
          contractsCount: result.contractsCount,
        })
      } else {
        setError(result.error || 'Connection test failed.')
      }
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status indicators */}
      {status && (
        <div className="flex flex-wrap gap-6">
          {/* Read Access */}
          <div className="flex items-center gap-2">
            {status.canRead ? (
              <CheckCircle2Icon className="h-5 w-5 text-green-500" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-destructive" />
            )}
            <span className="text-sm">Read Access</span>
          </div>

          {/* Write Access */}
          <div className="flex items-center gap-2">
            {status.canWrite ? (
              <CheckCircle2Icon className="h-5 w-5 text-green-500" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-destructive" />
            )}
            <span className="text-sm">Write Access</span>
          </div>

          {/* Contracts Count */}
          {status.contractsCount !== undefined && (
            <div className="flex items-center gap-2">
              <FileTextIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">
                {status.contractsCount} Contract{status.contractsCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {!status && !isPending && (
        <p className="text-sm text-muted-foreground">
          Click &quot;Test Connection&quot; to verify your repository access.
        </p>
      )}

      {/* Test button */}
      <div className="pt-2">
        <Button variant="outline" onClick={handleTest} disabled={isPending}>
          {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          Test Connection
        </Button>
      </div>
    </div>
  )
}
