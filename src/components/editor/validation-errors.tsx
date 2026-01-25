'use client'

import { AlertCircle, ChevronRight, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ValidationError } from '@/types'

interface ValidationErrorsProps {
  errors: ValidationError[]
  onNavigate?: (path: string) => void
}

export function ValidationErrors({ errors, onNavigate }: ValidationErrorsProps) {
  if (errors.length === 0) {
    return null
  }

  const errorCount = errors.filter((e) => e.severity === 'error').length
  const warningCount = errors.filter((e) => e.severity === 'warning').length

  // Group errors by path prefix
  const groupedErrors = errors.reduce(
    (acc, error) => {
      const section = getSection(error.path)
      if (!acc[section]) {
        acc[section] = []
      }
      acc[section].push(error)
      return acc
    },
    {} as Record<string, ValidationError[]>
  )

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-red-700">
          <XCircle className="h-5 w-5" />
          Validation Issues
        </CardTitle>
        <CardDescription className="text-red-600">
          {errorCount > 0 && `${errorCount} error${errorCount !== 1 ? 's' : ''}`}
          {errorCount > 0 && warningCount > 0 && ', '}
          {warningCount > 0 && `${warningCount} warning${warningCount !== 1 ? 's' : ''}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(groupedErrors).map(([section, sectionErrors]) => (
          <div key={section}>
            <h4 className="text-sm font-medium text-red-700 mb-2 capitalize">{section}</h4>
            <div className="space-y-2">
              {sectionErrors.map((error, i) => (
                <button
                  type="button"
                  key={i}
                  className={`flex items-start gap-2 p-2 rounded text-sm cursor-pointer hover:bg-red-100/50 transition-colors w-full text-left ${
                    error.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                  }`}
                  onClick={() => onNavigate?.(error.path)}
                >
                  {error.severity === 'error' ? (
                    <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <code className="text-xs bg-red-100 px-1 rounded">{error.path}</code>
                    <p className="mt-1 text-sm">{error.message}</p>
                  </div>
                  {onNavigate && <ChevronRight className="h-4 w-4 shrink-0 text-red-400" />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/**
 * Get the section name from a JSON path.
 */
function getSection(path: string): string {
  if (path.startsWith('/info') || path.startsWith('/openapi')) {
    return 'info'
  }
  if (path.startsWith('/servers')) {
    return 'servers'
  }
  if (path.startsWith('/paths')) {
    return 'paths'
  }
  if (path.startsWith('/components/schemas') || path.startsWith('/definitions')) {
    return 'schemas'
  }
  if (
    path.startsWith('/security') ||
    path.startsWith('/components/securitySchemes') ||
    path.startsWith('/securityDefinitions')
  ) {
    return 'security'
  }
  return 'general'
}

/**
 * Compact version for inline display.
 */
export function ValidationErrorsBadge({ errors }: { errors: ValidationError[] }) {
  const errorCount = errors.filter((e) => e.severity === 'error').length
  const warningCount = errors.filter((e) => e.severity === 'warning').length

  if (errors.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      {errorCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle className="h-3 w-3" />
          {errorCount}
        </span>
      )}
      {warningCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <AlertCircle className="h-3 w-3" />
          {warningCount}
        </span>
      )}
    </div>
  )
}
