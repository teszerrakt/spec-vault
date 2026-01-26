'use client'

import { useMachine } from '@xstate/react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getContractFolders, type SaveResult } from '@/actions/contracts'
import { SaveDialog } from '@/components/contracts'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  getStepName,
  getStepNumber,
  getTotalSteps,
  importWizardMachine,
} from '@/machines/import-wizard'
import { ProcessingIndicator } from './processing-indicator'
import { SpecPreview } from './spec-preview'
import { UnifiedInput } from './unified-input'

export function ImportWizard() {
  const router = useRouter()
  const [state, send] = useMachine(importWizardMachine)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [folders, setFolders] = useState<string[]>(['/'])
  const processingStartTimeRef = useRef<number | null>(null)

  // Fetch available folders on mount
  useEffect(() => {
    getContractFolders()
      .then(setFolders)
      .catch(() => setFolders(['/']))
  }, [])

  // Track elapsed time during processing and validating
  const isProcessing = state.matches('processing') || state.matches('validating')

  useEffect(() => {
    if (!isProcessing) {
      processingStartTimeRef.current = null
      return
    }

    // Set start time when processing begins
    if (processingStartTimeRef.current === null) {
      processingStartTimeRef.current = Date.now()
    }

    const interval = setInterval(() => {
      if (processingStartTimeRef.current !== null) {
        setElapsedTime(Date.now() - processingStartTimeRef.current)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isProcessing])

  // Show toast notifications on state transitions
  const prevStateRef = useRef<string>('')
  useEffect(() => {
    const currentState = state.value as string
    const prevState = prevStateRef.current

    // Transition to preview = success
    if (currentState === 'preview' && (prevState === 'processing' || prevState === 'validating')) {
      toast.success('OpenAPI spec generated', {
        description: state.context.isValid
          ? 'Your specification is valid and ready to save'
          : 'Generated with validation warnings - please review',
      })
    }

    // Transition to error = failure
    if (currentState === 'error' && (prevState === 'processing' || prevState === 'validating')) {
      toast.error('Conversion failed', {
        description: state.context.errorMessage || 'Unable to process your input',
      })
    }

    prevStateRef.current = currentState
  }, [state.value, state.context.isValid, state.context.errorMessage])

  // Event handlers
  const handleFileSelect = useCallback(
    (file: File) => {
      send({ type: 'UPLOAD_FILE', file })
    },
    [send]
  )

  const handleFileClear = useCallback(() => {
    send({ type: 'CLEAR_FILE' })
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

  const handleSave = useCallback(() => {
    setSaveDialogOpen(true)
  }, [])

  const handleSaveSuccess = useCallback(
    (result: SaveResult) => {
      const targetPath = result.filePath || state.context.targetPath
      if (targetPath) {
        router.push(`/contracts/${encodeURIComponent(targetPath)}`)
      }
    },
    [router, state.context.targetPath]
  )

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
    state.matches('inputContent') &&
    (state.context.file !== null || state.context.textContent.trim().length > 0)

  const canGoBack = state.matches('preview') || state.matches('editing') || state.matches('error')

  // Determine processing stage for indicator
  const getProcessingStage = (): 'parsing' | 'analyzing' | 'generating' | 'validating' => {
    if (state.matches('validating')) return 'validating'
    if (state.context.streamingYaml.length > 0) return 'generating'
    if (elapsedTime < 2000) return 'parsing'
    return 'analyzing'
  }

  return (
    <>
      {/* Save Dialog */}
      <SaveDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        content={state.context.generatedYaml}
        onSaveSuccess={handleSaveSuccess}
        isNew={true}
        folders={folders}
        suggestedFileName={state.context.suggestedFileName}
      />

      <div className="w-full flex justify-center">
        <div className="w-full max-w-5xl space-y-6">
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
              {/* Input - Unified 2-column layout */}
              {state.matches('inputContent') && (
                <UnifiedInput
                  textContent={state.context.textContent}
                  onTextChange={handleTextChange}
                  selectedFile={state.context.file}
                  onFileSelect={handleFileSelect}
                  onFileClear={handleFileClear}
                  onProcess={handleProcess}
                  canProcess={canProcess}
                />
              )}

              {/* Processing (with streaming preview) */}
              {state.matches('processing') && (
                <ProcessingIndicator
                  stage={getProcessingStage()}
                  elapsedMs={elapsedTime}
                  streamingYaml={state.context.streamingYaml}
                />
              )}

              {/* Validating */}
              {state.matches('validating') && (
                <ProcessingIndicator
                  stage="validating"
                  elapsedMs={elapsedTime}
                  streamingYaml={state.context.streamingYaml}
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
                  disabled={saveDialogOpen}
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
          {!state.matches('processing') &&
            !state.matches('validating') &&
            !state.matches('saving') &&
            !state.matches('error') &&
            !state.matches('inputContent') && (
              <div className="flex justify-between">
                <Button variant="outline" onClick={handleBack} disabled={!canGoBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <div className="flex gap-2">
                  {(state.matches('preview') || state.matches('editing')) && (
                    <Button variant="outline" onClick={handleRetry}>
                      Regenerate
                    </Button>
                  )}
                </div>
              </div>
            )}

          {/* Cancel button on input screen */}
          {state.matches('inputContent') && (
            <div className="flex justify-start">
              <Button variant="outline" onClick={() => router.push('/contracts')}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
