'use client'

import { useCallback, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMachine } from '@xstate/react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { importWizardMachine, getStepName, getStepNumber, getTotalSteps } from '@/machines/import-wizard'
import type { ImportSourceType } from '@/types/import'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SourceSelector } from './source-selector'
import { FileUploader } from './file-uploader'
import { TextInput } from './text-input'
import { ProcessingIndicator } from './processing-indicator'
import { SpecPreview } from './spec-preview'
import { saveContract } from '@/actions/contracts'
import { toast } from 'sonner'

interface ImportWizardProps {
  /** Initial source type if pre-selected */
  initialSourceType?: ImportSourceType
}

export function ImportWizard({ initialSourceType }: ImportWizardProps) {
  const router = useRouter()
  const [state, send] = useMachine(importWizardMachine)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize with source type if provided
  useEffect(() => {
    if (initialSourceType && state.matches('idle')) {
      send({ type: 'SELECT_SOURCE', sourceType: initialSourceType })
    }
  }, [initialSourceType, state, send])

  // Track elapsed time during processing
  useEffect(() => {
    if (!state.matches('processing')) {
      setElapsedTime(0)
      return
    }

    const startTime = Date.now()
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime)
    }, 100)

    return () => clearInterval(interval)
  }, [state])

  // Event handlers
  const handleSourceSelect = useCallback(
    (sourceType: ImportSourceType) => {
      send({ type: 'SELECT_SOURCE', sourceType })
    },
    [send]
  )

  const handleFileSelect = useCallback(
    (file: File) => {
      send({ type: 'UPLOAD_FILE', file })
    },
    [send]
  )

  const handleFileClear = useCallback(() => {
    send({ type: 'UPLOAD_FILE', file: null as unknown as File })
  }, [send])

  const handleTextChange = useCallback(
    (text: string) => {
      send({ type: 'ENTER_TEXT', text })
    },
    [send]
  )

  const handleProcess = useCallback(() => {
    send({ type: 'PROCESS' })
  }, [send])

  const handleBack = useCallback(() => {
    send({ type: 'BACK' })
  }, [send])

  const handleEditSpec = useCallback(
    (yaml: string) => {
      send({ type: 'EDIT_SPEC', yaml })
    },
    [send]
  )

  const handleTargetPathChange = useCallback(
    (path: string) => {
      send({ type: 'SET_TARGET_PATH', path })
    },
    [send]
  )

  const handleSave = useCallback(async () => {
    if (!state.context.targetPath || !state.context.generatedYaml) return

    setIsSaving(true)
    try {
      const result = await saveContract(
        state.context.targetPath,
        state.context.generatedYaml,
        `Import new contract from ${state.context.sourceType} source`
      )

      if (result.success) {
        toast.success('Contract saved successfully')
        router.push(`/contracts/${encodeURIComponent(state.context.targetPath)}`)
      } else {
        toast.error(result.error || 'Failed to save contract')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save contract')
    } finally {
      setIsSaving(false)
    }
  }, [state.context, router])

  const handleRetry = useCallback(() => {
    send({ type: 'RETRY' })
  }, [send])

  // Get current state info
  const currentState = state.value as string
  const stepNumber = getStepNumber(currentState as Parameters<typeof getStepNumber>[0])
  const stepName = getStepName(currentState as Parameters<typeof getStepName>[0])
  const totalSteps = getTotalSteps()

  // Determine if we can proceed
  const canProcess =
    (state.matches('inputContent') || state.matches('selectSource')) &&
    (state.context.file !== null || state.context.textContent.trim().length > 0)

  const canGoBack =
    state.matches('selectSource') ||
    state.matches('inputContent') ||
    state.matches('preview') ||
    state.matches('editing') ||
    state.matches('error')

  // Check if source type requires file upload only
  const requiresFileUpload =
    state.context.sourceType === 'excel' || state.context.sourceType === 'image'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import API Description</h1>
          <p className="text-muted-foreground">
            Convert your API documentation to OpenAPI specification
          </p>
        </div>
        {stepNumber > 0 && (
          <div className="text-sm text-muted-foreground">
            Step {stepNumber} of {totalSteps}: {stepName}
          </div>
        )}
      </div>

      {/* Main content based on state */}
      <Card>
        <CardContent className="p-6">
          {/* Idle / Select Source */}
          {(state.matches('idle') || state.matches('selectSource')) && (
            <SourceSelector
              selectedType={state.context.sourceType}
              onSelect={handleSourceSelect}
            />
          )}

          {/* Input Content */}
          {state.matches('inputContent') && state.context.sourceType && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold">Upload or Enter Content</h2>
                <p className="text-sm text-muted-foreground">
                  {requiresFileUpload
                    ? 'Upload a file to convert'
                    : 'Upload a file or paste content directly'}
                </p>
              </div>

              {/* File Uploader */}
              <FileUploader
                sourceType={state.context.sourceType}
                onFileSelect={handleFileSelect}
                selectedFile={state.context.file}
                onClear={handleFileClear}
              />

              {/* Text Input (for non-binary formats) */}
              {!requiresFileUpload && !state.context.file && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or paste content</span>
                    </div>
                  </div>
                  <TextInput
                    sourceType={state.context.sourceType}
                    value={state.context.textContent}
                    onChange={handleTextChange}
                  />
                </>
              )}
            </div>
          )}

          {/* Processing */}
          {state.matches('processing') && (
            <ProcessingIndicator
              stage={elapsedTime < 2000 ? 'parsing' : elapsedTime < 5000 ? 'analyzing' : 'generating'}
              elapsedMs={elapsedTime}
            />
          )}

          {/* Preview / Editing */}
          {(state.matches('preview') || state.matches('editing')) && (
            <SpecPreview
              yaml={state.context.generatedYaml}
              errors={state.context.errors}
              isValid={state.context.isValid}
              model={state.context.model}
              processingTimeMs={state.context.processingTimeMs}
              onEdit={handleEditSpec}
              onSave={handleSave}
              targetPath={state.context.targetPath}
              onTargetPathChange={handleTargetPathChange}
              disabled={isSaving}
            />
          )}

          {/* Saving */}
          {state.matches('saving') && (
            <div className="flex flex-col items-center justify-center py-12">
              <ProcessingIndicator stage="validating" isComplete={false} />
              <p className="mt-4 text-muted-foreground">Saving contract...</p>
            </div>
          )}

          {/* Error */}
          {state.matches('error') && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <span className="text-4xl">!</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-destructive">Processing Failed</h2>
                <p className="mt-2 text-muted-foreground">{state.context.errorMessage}</p>
              </div>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={handleBack}>
                  Go Back
                </Button>
                <Button onClick={handleRetry}>Retry</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      {!state.matches('processing') && !state.matches('saving') && !state.matches('error') && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={!canGoBack || state.matches('idle')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex gap-2">
            {state.matches('idle') && (
              <Button variant="outline" onClick={() => router.push('/contracts')}>
                Cancel
              </Button>
            )}

            {(state.matches('selectSource') || state.matches('inputContent')) && (
              <Button onClick={handleProcess} disabled={!canProcess}>
                Convert to OpenAPI
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            {(state.matches('preview') || state.matches('editing')) && (
              <>
                <Button variant="outline" onClick={handleRetry}>
                  Regenerate
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
