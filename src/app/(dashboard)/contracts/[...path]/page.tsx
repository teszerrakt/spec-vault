import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getContract } from '@/actions/contracts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ContractDetailPageProps {
  params: Promise<{ path: string[] }>
}

export async function generateMetadata({ params }: ContractDetailPageProps) {
  const { path } = await params
  const filePath = path.join('/')

  try {
    const contract = await getContract(filePath)
    return {
      title: `${contract.name} | Spec Vault`,
      description: contract.description || `View ${contract.name} API contract`,
    }
  } catch {
    return {
      title: 'Contract Not Found | Spec Vault',
    }
  }
}

export default async function ContractDetailPage({ params }: ContractDetailPageProps) {
  const { path } = await params
  const filePath = path.join('/')

  let contract
  try {
    contract = await getContract(filePath)
  } catch {
    notFound()
  }

  const spec = contract.spec

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Link
              href="/contracts"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Contracts
            </Link>
            <span className="text-muted-foreground">/</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{contract.name}</h1>
          <p className="text-muted-foreground">{contract.filePath}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/edit/${filePath}`}>Edit</Link>
          </Button>
        </div>
      </div>

      {/* Validation Status */}
      {!contract.isValid && contract.validationErrors && (
        <Alert variant="destructive">
          <AlertTitle>Validation Errors</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {contract.validationErrors.map((error, index) => (
                <li key={index} className="text-sm">
                  <code className="text-xs">{error.path}</code>: {error.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Contract Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Version</CardDescription>
            <CardTitle className="text-xl">{contract.version}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Last Modified</CardDescription>
            <CardTitle className="text-xl">
              {new Date(contract.lastModified).toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">by {contract.lastModifiedBy}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-xl">
              <span
                className={
                  contract.isValid
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }
              >
                {contract.isValid ? 'Valid' : 'Invalid'}
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="schemas">Schemas</TabsTrigger>
          <TabsTrigger value="raw">Raw YAML</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {contract.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {contract.description}
                </p>
              </CardContent>
            </Card>
          )}

          {'servers' in spec && spec.servers && spec.servers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Servers</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {spec.servers.map((server, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <code className="rounded bg-muted px-2 py-1 text-sm">
                        {server.url}
                      </code>
                      {server.description && (
                        <span className="text-sm text-muted-foreground">
                          - {server.description}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Endpoints</CardTitle>
              <CardDescription>
                {Object.keys(spec.paths || {}).length} paths defined
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(spec.paths || {}).map(([path, methods]) => (
                  <div key={path} className="rounded-lg border p-3">
                    <code className="font-medium">{path}</code>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.keys(methods || {})
                        .filter((m) => ['get', 'post', 'put', 'patch', 'delete'].includes(m))
                        .map((method) => (
                          <span
                            key={method}
                            className={`inline-flex rounded px-2 py-0.5 text-xs font-medium uppercase ${getMethodColor(method)}`}
                          >
                            {method}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schemas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schemas</CardTitle>
              <CardDescription>
                {'components' in spec &&
                  spec.components?.schemas &&
                  `${Object.keys(spec.components.schemas).length} schemas defined`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {'components' in spec && spec.components?.schemas ? (
                <div className="space-y-2">
                  {Object.keys(spec.components.schemas).map((name) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <code className="font-medium">{name}</code>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No schemas defined</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw">
          <Card>
            <CardHeader>
              <CardTitle>Raw YAML</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[600px] overflow-auto rounded-lg bg-muted p-4 text-sm">
                <code>{contract.rawYaml}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    get: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    post: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    put: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    patch: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }
  return colors[method] || 'bg-gray-100 text-gray-800'
}
