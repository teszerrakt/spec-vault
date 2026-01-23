'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { OpenAPIObject } from '@/types'

interface InfoEditorProps {
  spec: OpenAPIObject | null
  onChange: (updates: Partial<OpenAPIObject>) => void
}

export function InfoEditor({ spec, onChange }: InfoEditorProps) {
  const info = spec?.info || { title: '', version: '', description: '' }

  const updateInfo = (field: string, value: string) => {
    onChange({
      info: {
        ...info,
        [field]: value,
      },
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Define the core metadata for your API specification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">API Title *</Label>
            <Input
              id="title"
              value={info.title || ''}
              onChange={(e) => updateInfo('title', e.target.value)}
              placeholder="My API"
            />
            <p className="text-sm text-muted-foreground">
              A descriptive name for your API.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="version">Version *</Label>
            <Input
              id="version"
              value={info.version || ''}
              onChange={(e) => updateInfo('version', e.target.value)}
              placeholder="1.0.0"
            />
            <p className="text-sm text-muted-foreground">
              The semantic version of your API (e.g., 1.0.0, 2.1.0).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={info.description || ''}
              onChange={(e) => updateInfo('description', e.target.value)}
              placeholder="A detailed description of your API..."
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
              Markdown is supported for rich formatting.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>
            Optional contact details for API support.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-name">Contact Name</Label>
            <Input
              id="contact-name"
              value={info.contact?.name || ''}
              onChange={(e) =>
                onChange({
                  info: {
                    ...info,
                    contact: { ...info.contact, name: e.target.value },
                  },
                })
              }
              placeholder="API Support Team"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">Contact Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={info.contact?.email || ''}
              onChange={(e) =>
                onChange({
                  info: {
                    ...info,
                    contact: { ...info.contact, email: e.target.value },
                  },
                })
              }
              placeholder="api-support@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-url">Contact URL</Label>
            <Input
              id="contact-url"
              type="url"
              value={info.contact?.url || ''}
              onChange={(e) =>
                onChange({
                  info: {
                    ...info,
                    contact: { ...info.contact, url: e.target.value },
                  },
                })
              }
              placeholder="https://example.com/support"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>License</CardTitle>
          <CardDescription>
            Specify the license for your API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="license-name">License Name</Label>
            <Input
              id="license-name"
              value={info.license?.name || ''}
              onChange={(e) =>
                onChange({
                  info: {
                    ...info,
                    license: e.target.value ? { ...info.license, name: e.target.value } : undefined,
                  },
                })
              }
              placeholder="MIT"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="license-url">License URL</Label>
            <Input
              id="license-url"
              type="url"
              value={info.license?.url || ''}
              onChange={(e) =>
                onChange({
                  info: {
                    ...info,
                    license: info.license?.name 
                      ? { ...info.license, url: e.target.value || undefined }
                      : undefined,
                  },
                })
              }
              placeholder="https://opensource.org/licenses/MIT"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>External Documentation</CardTitle>
          <CardDescription>
            Link to additional documentation resources.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="external-docs-url">Documentation URL</Label>
            <Input
              id="external-docs-url"
              type="url"
              value={spec?.externalDocs?.url || ''}
              onChange={(e) =>
                onChange({
                  externalDocs: e.target.value 
                    ? { ...spec?.externalDocs, url: e.target.value }
                    : undefined,
                })
              }
              placeholder="https://example.com/docs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="external-docs-desc">Documentation Description</Label>
            <Input
              id="external-docs-desc"
              value={spec?.externalDocs?.description || ''}
              onChange={(e) =>
                onChange({
                  externalDocs: spec?.externalDocs?.url
                    ? { ...spec?.externalDocs, description: e.target.value || undefined }
                    : undefined,
                })
              }
              placeholder="Find more info here"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
