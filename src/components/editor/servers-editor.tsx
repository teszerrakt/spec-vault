'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { OpenAPIObject } from '@/types'

interface Server {
  url: string
  description?: string
  variables?: Record<string, ServerVariable>
}

interface ServerVariable {
  default: string
  description?: string
  enum?: string[]
}

interface ServersEditorProps {
  spec: OpenAPIObject | null
  onChange: (updates: Partial<OpenAPIObject>) => void
}

export function ServersEditor({ spec, onChange }: ServersEditorProps) {
  const servers: Server[] = (spec?.servers || []) as Server[]
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const updateServers = (newServers: Server[]) => {
    onChange({ servers: newServers } as Partial<OpenAPIObject>)
  }

  const addServer = () => {
    updateServers([...servers, { url: 'https://api.example.com', description: '' }])
    setExpandedIndex(servers.length)
  }

  const removeServer = (index: number) => {
    const newServers = servers.filter((_, i) => i !== index)
    updateServers(newServers)
    if (expandedIndex === index) {
      setExpandedIndex(null)
    }
  }

  const updateServer = (index: number, updates: Partial<Server>) => {
    const newServers = servers.map((server, i) =>
      i === index ? { ...server, ...updates } : server
    )
    updateServers(newServers)
  }

  const addVariable = (serverIndex: number, variableName: string) => {
    const server = servers[serverIndex]
    const newVariables: Record<string, ServerVariable> = {
      ...(server.variables || {}),
      [variableName]: { default: '', description: '' },
    }
    updateServer(serverIndex, { variables: newVariables })
  }

  const removeVariable = (serverIndex: number, variableName: string) => {
    const server = servers[serverIndex]
    const { [variableName]: _, ...newVariables } = server.variables || {}
    updateServer(serverIndex, {
      variables: Object.keys(newVariables).length > 0 ? newVariables : undefined,
    })
  }

  const updateVariable = (
    serverIndex: number,
    variableName: string,
    updates: Partial<ServerVariable>
  ) => {
    const server = servers[serverIndex]
    const existingVar = server.variables?.[variableName]
    const newVariables: Record<string, ServerVariable> = {
      ...(server.variables || {}),
      [variableName]: {
        default: existingVar?.default || '',
        description: existingVar?.description,
        enum: existingVar?.enum,
        ...updates,
      },
    }
    updateServer(serverIndex, { variables: newVariables })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Server Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Define the base URLs where your API is hosted.
          </p>
        </div>
        <Button onClick={addServer} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Server
        </Button>
      </div>

      {servers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No servers defined yet.</p>
            <Button onClick={addServer} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Server
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {servers.map((server, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Server {index + 1}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeServer(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription className="font-mono text-xs truncate">
                  {server.url}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>URL *</Label>
                  <Input
                    value={server.url}
                    onChange={(e) => updateServer(index, { url: e.target.value })}
                    placeholder="https://api.example.com/v1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {'{variable}'} for URL variables (e.g., https://{'{environment}'}.api.example.com)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={server.description || ''}
                    onChange={(e) => updateServer(index, { description: e.target.value })}
                    placeholder="Production server"
                  />
                </div>

                {/* Server Variables */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>URL Variables</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const name = prompt('Variable name:')
                        if (name) addVariable(index, name)
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add Variable
                    </Button>
                  </div>

                  {server.variables && Object.keys(server.variables).length > 0 && (
                    <div className="space-y-3 rounded-md border p-3">
                      {Object.entries(server.variables).map(([varName, variable]) => (
                        <div key={varName} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="font-mono text-sm">{varName}</Label>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeVariable(index, varName)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Default value"
                              value={variable.default}
                              onChange={(e) =>
                                updateVariable(index, varName, { default: e.target.value })
                              }
                            />
                            <Input
                              placeholder="Description"
                              value={variable.description || ''}
                              onChange={(e) =>
                                updateVariable(index, varName, { description: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Common server configurations include:
          </p>
          <ul className="mt-2 list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Production: https://api.example.com</li>
            <li>Staging: https://staging-api.example.com</li>
            <li>Local: http://localhost:3000</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
