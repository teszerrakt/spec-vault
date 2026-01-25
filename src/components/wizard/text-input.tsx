'use client'

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface TextInputProps {
  /** Current text value */
  value: string
  /** Callback when text changes */
  onChange: (text: string) => void
  /** Whether the input is disabled */
  disabled?: boolean
  /** Placeholder text */
  placeholder?: string
}

const DEFAULT_PLACEHOLDER = `Paste your API description here...

Examples of what you can paste:
• JSON API responses or schemas
• CSV data with endpoints (method, path, description)
• Plain text descriptions of your API
• Markdown documentation

The AI will analyze your content and generate an OpenAPI specification.`

const HINT =
  'Paste any format - JSON, CSV, plain text, or markdown. The AI will handle the conversion.'

export function TextInput({ value, onChange, disabled = false, placeholder }: TextInputProps) {
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

  const effectivePlaceholder = placeholder || DEFAULT_PLACEHOLDER

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="text-input">Content</Label>
          <span className="text-sm text-muted-foreground">
            {charCount.toLocaleString()} characters
          </span>
        </div>
        <Textarea
          id="text-input"
          value={value}
          onChange={handleChange}
          placeholder={effectivePlaceholder}
          disabled={disabled}
          className="min-h-[300px] font-mono text-sm"
        />
        <p className="text-sm text-muted-foreground">{HINT}</p>
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
