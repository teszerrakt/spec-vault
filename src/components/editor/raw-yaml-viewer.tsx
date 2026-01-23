'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

interface RawYamlViewerProps {
  yaml: string
  onChange?: (yaml: string) => void
  readOnly?: boolean
}

export function RawYamlViewer({ yaml, onChange, readOnly = false }: RawYamlViewerProps) {
  const [copied, setCopied] = useState(false)
  const [localYaml, setLocalYaml] = useState(yaml)

  useEffect(() => {
    setLocalYaml(yaml)
  }, [yaml])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localYaml)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([localYaml], { type: 'application/x-yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'openapi.yaml'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleChange = (value: string) => {
    setLocalYaml(value)
    onChange?.(value)
  }

  const lineCount = localYaml.split('\n').length

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Raw YAML</CardTitle>
            <CardDescription>
              {readOnly ? 'View' : 'View and edit'} the raw OpenAPI specification.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Line numbers */}
          <div className="absolute left-0 top-0 bottom-0 w-10 bg-muted/50 rounded-l-md border-r flex flex-col items-end pr-2 pt-2 text-xs text-muted-foreground font-mono select-none overflow-hidden">
            {Array.from({ length: Math.min(lineCount, 100) }, (_, i) => (
              <div key={i} className="leading-5">
                {i + 1}
              </div>
            ))}
            {lineCount > 100 && <div className="leading-5">...</div>}
          </div>

          <Textarea
            value={localYaml}
            onChange={(e) => handleChange(e.target.value)}
            readOnly={readOnly}
            className="font-mono text-sm min-h-[400px] pl-12 resize-y leading-5"
            style={{ tabSize: 2 }}
          />
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{lineCount} lines</span>
          <span>{new Blob([localYaml]).size.toLocaleString()} bytes</span>
        </div>
      </CardContent>
    </Card>
  )
}
