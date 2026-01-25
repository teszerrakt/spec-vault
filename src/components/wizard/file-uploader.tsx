'use client'

import { AlertCircle, File, Upload, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE } from '@/lib/import'
import { cn } from '@/lib/utils'

interface FileUploaderProps {
  /** Callback when a file is uploaded */
  onFileSelect: (file: File) => void
  /** Currently selected file */
  selectedFile: File | null
  /** Callback to clear the selected file */
  onClear?: () => void
  /** Whether the uploader is disabled */
  disabled?: boolean
}

const MAX_SIZE_MB = MAX_FILE_SIZE / (1024 * 1024)

export function FileUploader({
  onFileSelect,
  selectedFile,
  onClear,
  disabled = false,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum (${MAX_SIZE_MB}MB)`
    }

    // Basic extension validation
    const extension = `.${file.name.split('.').pop()?.toLowerCase()}`
    const acceptedList = ACCEPTED_EXTENSIONS.split(',')

    if (!acceptedList.some((ext) => extension === ext.toLowerCase())) {
      return `File type not supported. Accepted: ${ACCEPTED_EXTENSIONS}`
    }

    return null
  }, [])

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }

      setError(null)
      onFileSelect(file)
    },
    [validateFile, onFileSelect]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled) return

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [disabled, handleFile]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (!disabled) {
        setIsDragging(true)
      }
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
      // Reset input so the same file can be selected again
      e.target.value = ''
    },
    [handleFile]
  )

  const handleClear = useCallback(() => {
    setError(null)
    onClear?.()
  }, [onClear])

  if (selectedFile) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <File className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClear} disabled={disabled}>
            <X className="h-4 w-4" />
            <span className="sr-only">Remove file</span>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          'cursor-pointer border-dashed transition-all',
          isDragging && 'border-primary bg-primary/5',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="flex flex-col items-center justify-center gap-4 p-8">
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full bg-muted',
              isDragging && 'bg-primary/10'
            )}
          >
            <Upload className={cn('h-8 w-8 text-muted-foreground', isDragging && 'text-primary')} />
          </div>

          <div className="text-center">
            <p className="font-medium">
              {isDragging ? 'Drop your file here' : 'Drag and drop your file here'}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse (max {MAX_SIZE_MB}MB)
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Supported: .json, .csv, .txt, .md, .png, .jpg, .gif, .webp
          </p>

          <label>
            <input
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={handleInputChange}
              disabled={disabled}
              className="hidden"
            />
            <Button variant="secondary" disabled={disabled} asChild>
              <span>Choose File</span>
            </Button>
          </label>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
