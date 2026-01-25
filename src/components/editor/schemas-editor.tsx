'use client'

import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { OpenAPIObject } from '@/types'

const SCHEMA_TYPES = ['object', 'array', 'string', 'number', 'integer', 'boolean'] as const
type _SchemaType = (typeof SCHEMA_TYPES)[number]

const STRING_FORMATS = ['', 'date', 'date-time', 'email', 'uri', 'uuid', 'hostname', 'ipv4', 'ipv6']
const _NUMBER_FORMATS = ['', 'float', 'double']
const _INTEGER_FORMATS = ['', 'int32', 'int64']

interface SchemasEditorProps {
  spec: OpenAPIObject | null
  onChange: (updates: Partial<OpenAPIObject>) => void
}

export function SchemasEditor({ spec, onChange }: SchemasEditorProps) {
  const components = spec?.components || {}
  const schemas = (components.schemas || {}) as Record<string, Record<string, unknown>>
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set())

  const updateSchemas = (newSchemas: Record<string, unknown>) => {
    onChange({
      components: {
        ...components,
        schemas: newSchemas,
      },
    } as Partial<OpenAPIObject>)
  }

  const addSchema = () => {
    const name = prompt('Schema name (e.g., User, Product):')
    if (name && !schemas[name]) {
      updateSchemas({
        ...schemas,
        [name]: {
          type: 'object',
          properties: {},
        },
      })
      setExpandedSchemas(new Set([...expandedSchemas, name]))
    }
  }

  const removeSchema = (name: string) => {
    const { [name]: _, ...newSchemas } = schemas
    updateSchemas(newSchemas)
  }

  const _renameSchema = (oldName: string, newName: string) => {
    if (newName && newName !== oldName && !schemas[newName]) {
      const { [oldName]: schema, ...rest } = schemas
      updateSchemas({ ...rest, [newName]: schema })
    }
  }

  const updateSchema = (name: string, updates: Record<string, unknown>) => {
    updateSchemas({
      ...schemas,
      [name]: {
        ...(schemas[name] as Record<string, unknown>),
        ...updates,
      },
    })
  }

  const addProperty = (schemaName: string) => {
    const propName = prompt('Property name:')
    if (propName) {
      const schema = schemas[schemaName] as Record<string, unknown>
      const properties = (schema.properties || {}) as Record<string, unknown>
      if (!properties[propName]) {
        updateSchema(schemaName, {
          properties: {
            ...properties,
            [propName]: { type: 'string' },
          },
        })
      }
    }
  }

  const removeProperty = (schemaName: string, propName: string) => {
    const schema = schemas[schemaName] as Record<string, unknown>
    const properties = (schema.properties || {}) as Record<string, unknown>
    const { [propName]: _, ...newProperties } = properties
    updateSchema(schemaName, { properties: newProperties })
  }

  const updateProperty = (
    schemaName: string,
    propName: string,
    updates: Record<string, unknown>
  ) => {
    const schema = schemas[schemaName] as Record<string, unknown>
    const properties = (schema.properties || {}) as Record<string, unknown>
    updateSchema(schemaName, {
      properties: {
        ...properties,
        [propName]: {
          ...(properties[propName] as Record<string, unknown>),
          ...updates,
        },
      },
    })
  }

  const toggleSchema = (name: string) => {
    const newExpanded = new Set(expandedSchemas)
    if (newExpanded.has(name)) {
      newExpanded.delete(name)
    } else {
      newExpanded.add(name)
    }
    setExpandedSchemas(newExpanded)
  }

  const schemaEntries = Object.entries(schemas).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Data Schemas</h3>
          <p className="text-sm text-muted-foreground">Define reusable data models for your API.</p>
        </div>
        <Button onClick={addSchema} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Schema
        </Button>
      </div>

      {schemaEntries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No schemas defined yet.</p>
            <Button onClick={addSchema} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Schema
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schemaEntries.map(([name, schemaValue]) => {
            const schema = schemaValue as Record<string, unknown>
            const isExpanded = expandedSchemas.has(name)
            const properties = (schema.properties || {}) as Record<string, Record<string, unknown>>
            const propertyCount = Object.keys(properties).length

            return (
              <Card key={name}>
                <div className="flex items-center gap-2 p-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleSchema(name)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <span className="font-mono font-medium">{name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({(schema.type as string) || 'object'})
                  </span>
                  <span className="flex-1 text-sm text-muted-foreground">
                    {propertyCount} {propertyCount === 1 ? 'property' : 'properties'}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => removeSchema(name)}
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
                          value={(schema.type as string) || 'object'}
                          onValueChange={(value) => updateSchema(name, { type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SCHEMA_TYPES.map((type) => (
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
                          value={(schema.description as string) || ''}
                          onChange={(e) => updateSchema(name, { description: e.target.value })}
                          placeholder="Schema description"
                        />
                      </div>
                    </div>

                    {/* Properties (for object type) */}
                    {(schema.type === 'object' || !schema.type) && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Properties</Label>
                          <Button variant="ghost" size="sm" onClick={() => addProperty(name)}>
                            <Plus className="mr-1 h-3 w-3" />
                            Add Property
                          </Button>
                        </div>

                        {Object.entries(properties).length > 0 ? (
                          <div className="space-y-2">
                            {Object.entries(properties).map(([propName, propValue]) => (
                              <div
                                key={propName}
                                className="flex items-start gap-2 p-3 rounded-md border bg-muted/30"
                              >
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <code className="font-mono text-sm font-medium">
                                      {propName}
                                    </code>
                                    <span className="text-xs text-muted-foreground">
                                      ({(propValue.type as string) || 'string'})
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <Select
                                      value={(propValue.type as string) || 'string'}
                                      onValueChange={(value) =>
                                        updateProperty(name, propName, { type: value })
                                      }
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {SCHEMA_TYPES.map((type) => (
                                          <SelectItem key={type} value={type}>
                                            {type}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    {propValue.type === 'string' && (
                                      <Select
                                        value={(propValue.format as string) || ''}
                                        onValueChange={(value) =>
                                          updateProperty(name, propName, {
                                            format: value || undefined,
                                          })
                                        }
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue placeholder="Format" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {STRING_FORMATS.map((format) => (
                                            <SelectItem
                                              key={format || 'none'}
                                              value={format || 'none'}
                                            >
                                              {format || 'None'}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}

                                    <Input
                                      className="h-8"
                                      placeholder="Description"
                                      value={(propValue.description as string) || ''}
                                      onChange={(e) =>
                                        updateProperty(name, propName, {
                                          description: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => removeProperty(name, propName)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No properties defined. Add properties to define the schema structure.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Array items */}
                    {schema.type === 'array' && (
                      <div className="space-y-2">
                        <Label>Array Item Type</Label>
                        <Select
                          value={
                            ((schema.items as Record<string, unknown>)?.type as string) || 'string'
                          }
                          onValueChange={(value) => updateSchema(name, { items: { type: value } })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SCHEMA_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
