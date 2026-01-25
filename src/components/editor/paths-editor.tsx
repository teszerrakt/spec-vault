'use client'

import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { OpenAPIObject } from '@/types'

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const
type HttpMethod = (typeof HTTP_METHODS)[number]

const METHOD_COLORS: Record<HttpMethod, string> = {
  get: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  post: 'bg-green-500/10 text-green-600 border-green-500/20',
  put: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  patch: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  delete: 'bg-red-500/10 text-red-600 border-red-500/20',
  options: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  head: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
}

interface PathsEditorProps {
  spec: OpenAPIObject | null
  onChange: (updates: Partial<OpenAPIObject>) => void
}

export function PathsEditor({ spec, onChange }: PathsEditorProps) {
  const paths = spec?.paths || {}
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set())

  const updatePaths = (newPaths: typeof paths) => {
    onChange({ paths: newPaths })
  }

  const addPath = () => {
    const newPath = prompt('Enter path (e.g., /users/{id}):')
    if (newPath && !paths[newPath]) {
      updatePaths({
        ...paths,
        [newPath]: {},
      })
      setExpandedPaths(new Set([...expandedPaths, newPath]))
    }
  }

  const removePath = (path: string) => {
    const { [path]: _, ...newPaths } = paths
    updatePaths(newPaths)
  }

  const _renamePath = (oldPath: string, newPath: string) => {
    if (newPath && newPath !== oldPath && !paths[newPath]) {
      const { [oldPath]: pathItem, ...rest } = paths
      updatePaths({ ...rest, [newPath]: pathItem })
    }
  }

  const addOperation = (path: string, method: HttpMethod) => {
    const pathItem = paths[path] || {}
    if (!pathItem[method]) {
      updatePaths({
        ...paths,
        [path]: {
          ...pathItem,
          [method]: {
            summary: '',
            description: '',
            operationId: `${method}${path.replace(/[/{}-]/g, '_')}`,
            responses: {
              '200': { description: 'Successful response' },
            },
          },
        },
      })
      setExpandedOperations(new Set([...expandedOperations, `${path}-${method}`]))
    }
  }

  const removeOperation = (path: string, method: HttpMethod) => {
    const pathItem = paths[path]
    if (pathItem) {
      const { [method]: _, ...newPathItem } = pathItem
      updatePaths({
        ...paths,
        [path]: newPathItem,
      })
    }
  }

  const updateOperation = (path: string, method: HttpMethod, updates: Record<string, unknown>) => {
    const pathItem = paths[path]
    if (pathItem) {
      updatePaths({
        ...paths,
        [path]: {
          ...pathItem,
          [method]: {
            ...pathItem[method],
            ...updates,
          },
        },
      })
    }
  }

  const togglePath = (path: string) => {
    const newExpanded = new Set(expandedPaths)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedPaths(newExpanded)
  }

  const toggleOperation = (key: string) => {
    const newExpanded = new Set(expandedOperations)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedOperations(newExpanded)
  }

  const pathEntries = Object.entries(paths).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">API Endpoints</h3>
          <p className="text-sm text-muted-foreground">
            Define the paths and operations for your API.
          </p>
        </div>
        <Button onClick={addPath} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Path
        </Button>
      </div>

      {pathEntries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No endpoints defined yet.</p>
            <Button onClick={addPath} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Endpoint
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pathEntries.map(([path, pathItem]) => {
            if (!pathItem) return null
            const isExpanded = expandedPaths.has(path)
            const operations = HTTP_METHODS.filter((m) => pathItem[m])
            const availableMethods = HTTP_METHODS.filter((m) => !pathItem[m])

            return (
              <Card key={path}>
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => togglePath(path)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <code className="flex-1 font-mono text-sm font-medium">{path}</code>
                    <div className="flex gap-1">
                      {operations.map((method) => (
                        <span
                          key={method}
                          className={`rounded px-1.5 py-0.5 text-xs font-medium uppercase border ${METHOD_COLORS[method]}`}
                        >
                          {method}
                        </span>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => removePath(path)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    {/* Add operation */}
                    {availableMethods.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Select
                          onValueChange={(method) => addOperation(path, method as HttpMethod)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Add operation..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableMethods.map((method) => (
                              <SelectItem key={method} value={method}>
                                <span className="uppercase">{method}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Operations */}
                    {operations.map((method) => {
                      const operation = pathItem[method] as Record<string, unknown>
                      const opKey = `${path}-${method}`
                      const isOpExpanded = expandedOperations.has(opKey)

                      return (
                        <div
                          key={method}
                          className={`rounded-md border p-3 ${METHOD_COLORS[method]}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleOperation(opKey)}
                            >
                              {isOpExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                            <span className="font-mono text-sm font-bold uppercase">{method}</span>
                            <span className="flex-1 text-sm truncate">
                              {(operation.summary as string) || 'No summary'}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeOperation(path, method)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {isOpExpanded && (
                            <div className="space-y-3 mt-3 pt-3 border-t">
                              <div className="space-y-2">
                                <Label>Summary</Label>
                                <Input
                                  value={(operation.summary as string) || ''}
                                  onChange={(e) =>
                                    updateOperation(path, method, { summary: e.target.value })
                                  }
                                  placeholder="Brief description of the operation"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Operation ID</Label>
                                <Input
                                  value={(operation.operationId as string) || ''}
                                  onChange={(e) =>
                                    updateOperation(path, method, { operationId: e.target.value })
                                  }
                                  placeholder="uniqueOperationId"
                                  className="font-mono"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                  value={(operation.description as string) || ''}
                                  onChange={(e) =>
                                    updateOperation(path, method, { description: e.target.value })
                                  }
                                  placeholder="Detailed description..."
                                  rows={3}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Tags</Label>
                                <Input
                                  value={((operation.tags as string[]) || []).join(', ')}
                                  onChange={(e) =>
                                    updateOperation(path, method, {
                                      tags: e.target.value
                                        .split(',')
                                        .map((t) => t.trim())
                                        .filter(Boolean),
                                    })
                                  }
                                  placeholder="users, authentication"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Comma-separated list of tags for grouping operations.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
