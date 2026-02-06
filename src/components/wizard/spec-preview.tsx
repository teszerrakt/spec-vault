'use client'

import { AlertCircle, Check, CheckCircle, Copy, Download, ExternalLink, Wand2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface SpecPreviewProps {
  /** Generated OpenAPI YAML */
  yaml: string
  /** Validation errors if any */
  errors?: string[]
  /** Whether the spec is valid */
  isValid: boolean
  /** AI model used */
  model?: string
  /** Processing time in ms */
  processingTimeMs?: number
  /** Callback when refinement is triggered */
  onRefine?: () => void
  /** Callback when "Open in Editor" is triggered */
  onOpenEditor?: () => void
  /** Whether refinement is in progress */
  isRefining?: boolean
  /** Whether actions are disabled */
  disabled?: boolean
}

export function SpecPreview({
  yaml,
  errors = [],
  isValid,
  model,
  processingTimeMs,
  onRefine,
  onOpenEditor,
  isRefining = false,
  disabled = false,
}: SpecPreviewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(yaml)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [yaml])

  const handleDownload = useCallback(() => {
    const blob = new Blob([yaml], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'openapi.yaml'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [yaml])

  // Count lines for line numbers
  const lineCount = yaml.split('\n').length

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      {isValid ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Valid OpenAPI Specification</AlertTitle>
          <AlertDescription className="text-green-700">
            The generated specification passes validation.
            {processingTimeMs && ` Generated in ${(processingTimeMs / 1000).toFixed(1)}s`}
            {model && ` using ${model}.`}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Validation Errors</AlertTitle>
          <AlertDescription>
            <p>The generated specification has {errors.length} error(s):</p>
            <ul className="mt-2 list-inside list-disc">
              {errors.slice(0, 5).map((error, i) => (
                <li key={i} className="text-sm">
                  {error}
                </li>
              ))}
              {errors.length > 5 && <li className="text-sm">... and {errors.length - 5} more</li>}
            </ul>
            {onRefine && (
              <Button
                onClick={onRefine}
                disabled={disabled || isRefining}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                <Wand2 className="mr-2 h-4 w-4" />
                {isRefining ? 'Fixing...' : 'Fix with AI'}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Spec Preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base">Generated OpenAPI Specification</CardTitle>
            <CardDescription>{lineCount} lines</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={disabled}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={disabled}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-auto rounded-lg bg-muted p-4">
            <pre className="font-mono text-sm">
              <code>{yaml}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Open in Editor Section */}
      {onOpenEditor && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Continue Editing</CardTitle>
            <CardDescription>
              Open the full editor to refine your specification with section-by-section navigation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onOpenEditor} disabled={disabled}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in Editor
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface SpecComparisonProps {
  originalYaml: string
  modifiedYaml: string
}

/**
 * Side-by-side comparison view (for future use in editing flow).
 */
export function SpecComparison({ originalYaml, modifiedYaml }: SpecComparisonProps) {
  return (
    <Tabs defaultValue="modified" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="original">Original</TabsTrigger>
        <TabsTrigger value="modified">Modified</TabsTrigger>
      </TabsList>
      <TabsContent value="original">
        <div className="max-h-[400px] overflow-auto rounded-lg bg-muted p-4">
          <pre className="font-mono text-sm">
            <code>{originalYaml}</code>
          </pre>
        </div>
      </TabsContent>
      <TabsContent value="modified">
        <div className="max-h-[400px] overflow-auto rounded-lg bg-muted p-4">
          <pre className="font-mono text-sm">
            <code>{modifiedYaml}</code>
          </pre>
        </div>
      </TabsContent>
    </Tabs>
  )
}
