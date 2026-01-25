import { Suspense } from 'react'
import { getRepositorySettings, validateRepositoryConnection, getBranches } from '@/actions/github'
import { RepositorySettings } from '@/components/settings/repository-settings'
import { ConnectionSection } from '@/components/settings/connection-section'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Settings | Spec Vault',
  description: 'Configure your GitHub repository connection',
}

async function SettingsContent() {
  const [settings, connection, branchesResult] = await Promise.all([
    getRepositorySettings(),
    validateRepositoryConnection(),
    getBranches(),
  ])

  if (!settings.success) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Configuration Error</AlertTitle>
        <AlertDescription>{settings.error}</AlertDescription>
      </Alert>
    )
  }

  const { config, userPermission } = settings

  if (!config || !userPermission) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Configuration Error</AlertTitle>
        <AlertDescription>Failed to load repository settings.</AlertDescription>
      </Alert>
    )
  }

  const branches = branchesResult.success ? branchesResult.branches ?? [] : []

  return (
    <div className="space-y-6">
      {/* Repository Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Repository Settings</CardTitle>
          <CardDescription>
            Configure where API contracts are stored in your GitHub repository.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RepositorySettings
            config={config}
            isAdmin={userPermission.isAdmin}
            branches={branches}
          />
        </CardContent>
      </Card>

      {/* Connection Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>Connection Status</CardTitle>
            <CardDescription>
              Verify your access to the connected repository.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ConnectionSection
            initialStatus={
              connection.success
                ? {
                    canRead: connection.canRead,
                    canWrite: connection.canWrite,
                    contractsCount: connection.contractsCount,
                  }
                : undefined
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Repository Settings Card Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Connection Status Card Skeleton */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-24" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your GitHub repository connection and platform configuration.
        </p>
      </div>

      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent />
      </Suspense>
    </div>
  )
}
