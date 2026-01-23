'use client'

import { FileJson, FileSpreadsheet, FileText, Image } from 'lucide-react'
import type { ImportSourceType } from '@/types/import'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SourceSelectorProps {
  /** Currently selected source type */
  selectedType: ImportSourceType | null
  /** Callback when a source type is selected */
  onSelect: (type: ImportSourceType) => void
  /** Whether the selector is disabled */
  disabled?: boolean
}

interface SourceOption {
  type: ImportSourceType
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  accept: string
}

const sourceOptions: SourceOption[] = [
  {
    type: 'json',
    title: 'JSON',
    description: 'API responses, schemas, or partial OpenAPI specs',
    icon: FileJson,
    accept: '.json,application/json',
  },
  {
    type: 'csv',
    title: 'CSV',
    description: 'Endpoint lists, schema definitions, or data samples',
    icon: FileSpreadsheet,
    accept: '.csv,text/csv',
  },
  {
    type: 'excel',
    title: 'Excel',
    description: 'Spreadsheets with API documentation',
    icon: FileSpreadsheet,
    accept: '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  {
    type: 'image',
    title: 'Image',
    description: 'Screenshots of API docs or diagrams',
    icon: Image,
    accept: '.jpg,.jpeg,.png,.gif,.webp,image/*',
  },
  {
    type: 'text',
    title: 'Text',
    description: 'Informal API descriptions or requirements',
    icon: FileText,
    accept: '.txt,.md,text/plain,text/markdown',
  },
]

export function SourceSelector({ selectedType, onSelect, disabled = false }: SourceSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Select Source Type</h2>
        <p className="text-sm text-muted-foreground">Choose the format of your API documentation</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sourceOptions.map((option) => (
          <SourceCard
            key={option.type}
            option={option}
            isSelected={selectedType === option.type}
            onSelect={() => onSelect(option.type)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}

interface SourceCardProps {
  option: SourceOption
  isSelected: boolean
  onSelect: () => void
  disabled: boolean
}

function SourceCard({ option, isSelected, onSelect, disabled }: SourceCardProps) {
  const Icon = option.icon

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50 hover:shadow-md',
        isSelected && 'border-primary bg-primary/5 ring-2 ring-primary',
        disabled && 'cursor-not-allowed opacity-50'
      )}
      onClick={() => !disabled && onSelect()}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg bg-muted',
              isSelected && 'bg-primary/10'
            )}
          >
            <Icon className={cn('h-5 w-5', isSelected && 'text-primary')} />
          </div>
          <CardTitle className="text-base">{option.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm">{option.description}</CardDescription>
      </CardContent>
    </Card>
  )
}

/**
 * Get the accepted file types string for a source type.
 */
export function getAcceptedTypes(sourceType: ImportSourceType): string {
  const option = sourceOptions.find((o) => o.type === sourceType)
  return option?.accept || '*/*'
}

/**
 * Get source type info by type.
 */
export function getSourceTypeInfo(type: ImportSourceType): SourceOption | undefined {
  return sourceOptions.find((o) => o.type === type)
}
