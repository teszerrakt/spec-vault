'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { OpenAPIObject } from '@/types'

const SECURITY_SCHEME_TYPES = ['apiKey', 'http', 'oauth2', 'openIdConnect'] as const
type SecuritySchemeType = (typeof SECURITY_SCHEME_TYPES)[number]

const API_KEY_LOCATIONS = ['header', 'query', 'cookie'] as const
const HTTP_SCHEMES = ['bearer', 'basic'] as const

interface SecurityEditorProps {
  spec: OpenAPIObject | null
  onChange: (updates: Partial<OpenAPIObject>) => void
}

export function SecurityEditor({ spec, onChange }: SecurityEditorProps) {
  const components = spec?.components || {}
  const securitySchemes = (components.securitySchemes || {}) as unknown as Record<string, Record<string, unknown>>
  const globalSecurity = (spec?.security || []) as Array<Record<string, string[]>>
  const [expandedSchemes, setExpandedSchemes] = useState<Set<string>>(new Set())

  const updateSecuritySchemes = (newSchemes: Record<string, unknown>) => {
    onChange({
      components: {
        ...components,
        securitySchemes: newSchemes,
      },
    } as Partial<OpenAPIObject>)
  }

  const updateGlobalSecurity = (newSecurity: Array<Record<string, string[]>>) => {
    onChange({ security: newSecurity } as Partial<OpenAPIObject>)
  }

  const addSecurityScheme = () => {
    const name = prompt('Security scheme name (e.g., bearerAuth, apiKey):')
    if (name && !securitySchemes[name]) {
      updateSecuritySchemes({
        ...securitySchemes,
        [name]: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      })
      setExpandedSchemes(new Set([...expandedSchemes, name]))
    }
  }

  const removeSecurityScheme = (name: string) => {
    const { [name]: _, ...newSchemes } = securitySchemes
    updateSecuritySchemes(newSchemes)
    // Also remove from global security
    updateGlobalSecurity(globalSecurity.filter((s) => !s[name]))
  }

  const updateSecurityScheme = (name: string, updates: Record<string, unknown>) => {
    updateSecuritySchemes({
      ...securitySchemes,
      [name]: {
        ...securitySchemes[name],
        ...updates,
      },
    })
  }

  const toggleGlobalSecurity = (schemeName: string) => {
    const isEnabled = globalSecurity.some((s) => s[schemeName])
    if (isEnabled) {
      updateGlobalSecurity(globalSecurity.filter((s) => !s[schemeName]))
    } else {
      updateGlobalSecurity([...globalSecurity, { [schemeName]: [] }])
    }
  }

  const toggleScheme = (name: string) => {
    const newExpanded = new Set(expandedSchemes)
    if (newExpanded.has(name)) {
      newExpanded.delete(name)
    } else {
      newExpanded.add(name)
    }
    setExpandedSchemes(newExpanded)
  }

  const schemeEntries = Object.entries(securitySchemes).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Security Schemes</h3>
          <p className="text-sm text-muted-foreground">
            Define authentication methods for your API.
          </p>
        </div>
        <Button onClick={addSecurityScheme} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Scheme
        </Button>
      </div>

      {schemeEntries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No security schemes defined yet.</p>
            <Button onClick={addSecurityScheme} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Security Scheme
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schemeEntries.map(([name, scheme]) => {
            const isExpanded = expandedSchemes.has(name)
            const isGloballyEnabled = globalSecurity.some((s) => s[name])

            return (
              <Card key={name}>
                <div className="flex items-center gap-2 p-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleScheme(name)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <span className="font-mono font-medium">{name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({scheme.type as string})
                  </span>
                  <div className="flex-1" />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isGloballyEnabled}
                      onChange={() => toggleGlobalSecurity(name)}
                      className="rounded border-gray-300"
                    />
                    Global
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => removeSecurityScheme(name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-4 border-t">
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={scheme.type as string}
                          onValueChange={(value) => {
                            const updates: Record<string, unknown> = { type: value }
                            // Set default values based on type
                            if (value === 'http') {
                              updates.scheme = 'bearer'
                            } else if (value === 'apiKey') {
                              updates.in = 'header'
                              updates.name = 'X-API-Key'
                            }
                            updateSecurityScheme(name, updates)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SECURITY_SCHEME_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={(scheme.description as string) || ''}
                          onChange={(e) =>
                            updateSecurityScheme(name, { description: e.target.value })
                          }
                          placeholder="Authentication description"
                        />
                      </div>
                    </div>

                    {/* HTTP Auth */}
                    {scheme.type === 'http' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Scheme</Label>
                          <Select
                            value={(scheme.scheme as string) || 'bearer'}
                            onValueChange={(value) =>
                              updateSecurityScheme(name, { scheme: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {HTTP_SCHEMES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {scheme.scheme === 'bearer' && (
                          <div className="space-y-2">
                            <Label>Bearer Format</Label>
                            <Input
                              value={(scheme.bearerFormat as string) || ''}
                              onChange={(e) =>
                                updateSecurityScheme(name, { bearerFormat: e.target.value })
                              }
                              placeholder="JWT"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* API Key */}
                    {scheme.type === 'apiKey' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Location</Label>
                          <Select
                            value={(scheme.in as string) || 'header'}
                            onValueChange={(value) =>
                              updateSecurityScheme(name, { in: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {API_KEY_LOCATIONS.map((loc) => (
                                <SelectItem key={loc} value={loc}>
                                  {loc}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Parameter Name</Label>
                          <Input
                            value={(scheme.name as string) || ''}
                            onChange={(e) =>
                              updateSecurityScheme(name, { name: e.target.value })
                            }
                            placeholder="X-API-Key"
                          />
                        </div>
                      </div>
                    )}

                    {/* OpenID Connect */}
                    {scheme.type === 'openIdConnect' && (
                      <div className="space-y-2">
                        <Label>OpenID Connect URL</Label>
                        <Input
                          value={(scheme.openIdConnectUrl as string) || ''}
                          onChange={(e) =>
                            updateSecurityScheme(name, { openIdConnectUrl: e.target.value })
                          }
                          placeholder="https://example.com/.well-known/openid-configuration"
                        />
                      </div>
                    )}

                    {/* OAuth2 - simplified */}
                    {scheme.type === 'oauth2' && (
                      <div className="space-y-2">
                        <Label>OAuth2 Flows</Label>
                        <Textarea
                          value={JSON.stringify(scheme.flows || {}, null, 2)}
                          onChange={(e) => {
                            try {
                              const flows = JSON.parse(e.target.value)
                              updateSecurityScheme(name, { flows })
                            } catch {
                              // Invalid JSON, ignore
                            }
                          }}
                          placeholder='{"implicit": {"authorizationUrl": "...", "scopes": {...}}}'
                          rows={6}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          Edit OAuth2 flows as JSON. Supports: implicit, password, clientCredentials, authorizationCode.
                        </p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Enable &quot;Global&quot; to apply the security scheme to all operations by default.
            Individual operations can override this.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
