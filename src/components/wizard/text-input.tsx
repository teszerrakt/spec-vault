'use client'

import { useState, useCallback } from 'react'
import type { ImportSourceType } from '@/types/import'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface TextInputProps {
  /** Source type for context hints */
  sourceType: ImportSourceType
  /** Current text value */
  value: string
  /** Callback when text changes */
  onChange: (text: string) => void
  /** Whether the input is disabled */
  disabled?: boolean
  /** Placeholder text */
  placeholder?: string
}

const placeholders: Record<ImportSourceType, string> = {
  json: `{
  "endpoints": [
    {
      "method": "GET",
      "path": "/users",
      "description": "Get all users"
    }
  ]
}`,
  csv: `method,path,description
GET,/users,Get all users
POST,/users,Create a new user
GET,/users/:id,Get user by ID`,
  excel: 'Paste your spreadsheet data here...',
  image: 'Images must be uploaded using the file uploader.',
  text: `Describe your API here...

For example:
- The Users API has endpoints for managing user accounts
- GET /users returns a list of all users with pagination
- POST /users creates a new user with name and email
- GET /users/:id returns a specific user by ID
- Authentication is done via Bearer token`,
}

const hints: Record<ImportSourceType, string> = {
  json: 'Paste JSON containing API responses, schemas, or partial OpenAPI specs',
  csv: 'Paste CSV data with columns like method, path, description',
  excel: 'For Excel files, use the file uploader instead',
  image: 'For images, use the file uploader instead',
  text: 'Describe your API in natural language - include endpoints, methods, parameters, and responses',
}

export function TextInput({
  sourceType,
  value,
  onChange,
  disabled = false,
  placeholder,
}: TextInputProps) {
  const [charCount, setCharCount] = useState(value.length)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      setCharCount(newValue.length)
      onChange(newValue)
    },
    [onChange]
  )

  const handleClear = useCallback(() => {
    setCharCount(0)
    onChange('')
  }, [onChange])

  const effectivePlaceholder = placeholder || placeholders[sourceType]
  const hint = hints[sourceType]

  // For image source type, show a message to use file uploader
  if (sourceType === 'image') {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Image Upload Required</CardTitle>
          <CardDescription>
            Images cannot be pasted as text. Please use the file uploader to select an image file.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="text-input">Content</Label>
          <span className="text-sm text-muted-foreground">{charCount.toLocaleString()} characters</span>
        </div>
        <Textarea
          id="text-input"
          value={value}
          onChange={handleChange}
          placeholder={effectivePlaceholder}
          disabled={disabled}
          className="min-h-[300px] font-mono text-sm"
        />
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>

      {value.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleClear} disabled={disabled}>
            Clear
          </Button>
        </div>
      )}
    </div>
  )
}

interface TextInputWithTabsProps {
  sourceType: ImportSourceType
  value: string
  onChange: (text: string) => void
  disabled?: boolean
}

/**
 * Combined input that shows either file uploader or text input based on source type.
 */
export function ContentInput({
  sourceType,
  value,
  onChange,
  disabled = false,
}: TextInputWithTabsProps) {
  // For binary formats (excel, image), only show file uploader
  if (sourceType === 'excel' || sourceType === 'image') {
    return null // File uploader will be shown separately
  }

  // For text formats (json, csv, text), show text input
  return <TextInput sourceType={sourceType} value={value} onChange={onChange} disabled={disabled} />
}
