'use client'

import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUploader } from './file-uploader'
import { TextInput } from './text-input'

interface UnifiedInputProps {
  /** Current text content */
  textContent: string
  /** Callback when text changes */
  onTextChange: (text: string) => void
  /** Currently selected file */
  selectedFile: File | null
  /** Callback when a file is selected */
  onFileSelect: (file: File) => void
  /** Callback to clear the selected file */
  onFileClear: () => void
  /** Callback when user wants to process */
  onProcess: () => void
  /** Whether processing can proceed */
  canProcess: boolean
  /** Whether inputs are disabled */
  disabled?: boolean
}

/**
 * Unified input component with 2-column layout.
 * Left: Text input for pasting content
 * Right: File upload for images or text files
 *
 * Responsive: stacks vertically on mobile.
 */
export function UnifiedInput({
  textContent,
  onTextChange,
  selectedFile,
  onFileSelect,
  onFileClear,
  onProcess,
  canProcess,
  disabled = false,
}: UnifiedInputProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Import Your API Description</h2>
        <p className="text-sm text-muted-foreground">
          Paste content or upload a file - the AI will convert it to OpenAPI
        </p>
      </div>

      {/* 2-column layout on desktop, stack on mobile */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left column: Text input */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Paste Content</CardTitle>
            <CardDescription>JSON, CSV, plain text, or markdown</CardDescription>
          </CardHeader>
          <CardContent>
            <TextInput
              value={textContent}
              onChange={onTextChange}
              disabled={disabled || selectedFile !== null}
              placeholder={selectedFile ? 'Clear the file to paste text instead' : undefined}
            />
            {!selectedFile && textContent.trim().length > 0 && (
              <div className="mt-4 flex justify-end">
                <Button onClick={onProcess} disabled={!canProcess || disabled}>
                  Convert
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: File upload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upload File</CardTitle>
            <CardDescription>Images, JSON, CSV, or text files</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploader
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
              onClear={onFileClear}
              disabled={disabled || textContent.trim().length > 0}
            />
            {selectedFile && (
              <div className="mt-4 flex justify-end">
                <Button onClick={onProcess} disabled={!canProcess || disabled}>
                  Convert
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hint when neither input has content */}
      {!selectedFile && textContent.trim().length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Choose either option above to get started
        </p>
      )}
    </div>
  )
}
