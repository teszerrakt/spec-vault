'use client'

import { useCallback, useState } from 'react'
import { Upload, File, X, AlertCircle } from 'lucide-react'
import type { ImportSourceType } from '@/types/import'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { getAcceptedTypes } from './source-selector'
import { FILE_SIZE_LIMITS } from '@/lib/import'

interface FileUploaderProps {
  /** Source type for file filtering */
  sourceType: ImportSourceType
  /** Callback when a file is uploaded */
  onFileSelect: (file: File) => void
  /** Currently selected file */
  selectedFile: File | null
  /** Callback to clear the selected file */
  onClear?: () => void
  /** Whether the uploader is disabled */
  disabled?: boolean
}

export function FileUploader({
  sourceType,
  onFileSelect,
  selectedFile,
  onClear,
  disabled = false,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const acceptedTypes = getAcceptedTypes(sourceType)
  const maxSize = FILE_SIZE_LIMITS[sourceType]
  const maxSizeMB = maxSize / (1024 * 1024)

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file size
      if (file.size > maxSize) {
        return `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum (${maxSizeMB}MB)`
      }

      // Basic type validation - could be more sophisticated
      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
      const acceptedExtensions = acceptedTypes.split(',').filter((t) => t.startsWith('.'))

      if (acceptedExtensions.length > 0 && !acceptedExtensions.some((ext) => extension === ext.toLowerCase())) {
        return `File type not supported. Accepted: ${acceptedExtensions.join(', ')}`
      }

      return null
    },
    [acceptedTypes, maxSize, maxSizeMB]
  )

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
            <p className="text-sm text-muted-foreground">or click to browse (max {maxSizeMB}MB)</p>
          </div>

          <label>
            <input
              type="file"
              accept={acceptedTypes}
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
