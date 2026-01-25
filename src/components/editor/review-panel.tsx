'use client'

import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { OpenAPIObject, ValidationError } from '@/types'

interface ReviewPanelProps {
  spec: OpenAPIObject | null
  isValid: boolean
  validationErrors: ValidationError[]
  onValidate: () => void
  isDirty?: boolean
}

export function ReviewPanel({
  spec,
  isValid,
  validationErrors,
  onValidate,
}: ReviewPanelProps) {
  const info = spec?.info
  const paths = spec?.paths || {}
  const schemas = spec?.components?.schemas || {}
  const securitySchemes = spec?.components?.securitySchemes || {}
  const servers = spec?.servers || []

  const pathCount = Object.keys(paths).length
  const operationCount = Object.values(paths).reduce((acc, pathItem) => {
    const item = pathItem as Record<string, unknown>
    return (
      acc +
      ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].filter((m) => item[m]).length
    )
  }, 0)
  const schemaCount = Object.keys(schemas).length
  const securityCount = Object.keys(securitySchemes).length
  const serverCount = servers.length

  const errorCount = validationErrors.filter((e) => e.severity === 'error').length
  const warningCount = validationErrors.filter((e) => e.severity === 'warning').length

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Review & Save</h3>
        <p className="text-sm text-muted-foreground">
          Review your changes and save the specification.
        </p>
      </div>

      {/* Spec Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Specification Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Title</span>
                <p className="font-medium">{info?.title || 'Untitled'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Version</span>
                <p className="font-medium">{info?.version || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold">{serverCount}</p>
                <p className="text-xs text-muted-foreground">Servers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{pathCount}</p>
                <p className="text-xs text-muted-foreground">Paths</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{operationCount}</p>
                <p className="text-xs text-muted-foreground">Operations</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{schemaCount}</p>
                <p className="text-xs text-muted-foreground">Schemas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{securityCount}</p>
                <p className="text-xs text-muted-foreground">Security</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Validation Status
            {isValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : errorCount > 0 ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
          </CardTitle>
          <CardDescription>
            {isValid
              ? 'Your specification is valid and ready to save.'
              : `Found ${errorCount} error(s) and ${warningCount} warning(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {validationErrors.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {validationErrors.slice(0, 10).map((error, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 p-2 rounded text-sm ${
                    error.severity === 'error'
                      ? 'bg-red-500/10 text-red-600'
                      : 'bg-yellow-500/10 text-yellow-600'
                  }`}
                >
                  {error.severity === 'error' ? (
                    <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <code className="text-xs">{error.path}</code>
                    <p>{error.message}</p>
                  </div>
                </div>
              ))}
              {validationErrors.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  And {validationErrors.length - 10} more...
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click &quot;Validate&quot; to check your specification.
            </p>
          )}

          <Button onClick={onValidate} variant="outline" className="mt-4 w-full">
            {validationErrors.length > 0 ? 'Re-validate' : 'Validate Specification'}
          </Button>

          {!isValid && validationErrors.length > 0 && (
            <p className="text-sm text-red-500 text-center mt-2">
              Please fix validation errors before saving.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
