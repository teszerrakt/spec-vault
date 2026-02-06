'use client'

import { useMachine } from '@xstate/react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { storeImportedSpec } from '@/lib/import-db'
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
  const processingStartTimeRef = useRef<number | null>(null)

  // Track elapsed time during processing, validating, and refining
  const isProcessing =
    state.matches('processing') || state.matches('validating') || state.matches('refining')

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
    if (
      currentState === 'preview' &&
      (prevState === 'processing' || prevState === 'validating' || prevState === 'refining')
    ) {
      if (prevState === 'refining' || prevState === 'validating') {
        // After refining, show different message based on result
        toast.success(state.context.isValid ? 'Spec fixed successfully' : 'Refinement complete', {
          description: state.context.isValid
            ? 'Your specification is now valid and ready to edit'
            : 'Some issues remain - you can try again or fix in the editor',
        })
      } else {
        toast.success('OpenAPI spec generated', {
          description: state.context.isValid
            ? 'Your specification is valid and ready to edit'
            : 'Generated with validation warnings - please review',
        })
      }
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

  const handleOpenEditor = useCallback(async () => {
    // Store the generated YAML in IndexedDB and get a token
    const token = await storeImportedSpec(
      state.context.generatedYaml,
      state.context.suggestedFileName
    )

    // Navigate to the new contract editor with the token
    router.push(`/edit/new?token=${token}`)
  }, [router, state.context.generatedYaml, state.context.suggestedFileName])

  const handleRetry = useCallback(() => {
    send({ type: 'RETRY' })
  }, [send])

  const handleRefine = useCallback(() => {
    if (state.context.refineAttempts >= 3) {
      toast.warning('Multiple refinement attempts', {
        description: 'Consider fixing the spec manually in the editor.',
      })
    }
    send({ type: 'REFINE' })
  }, [send, state.context.refineAttempts])

  // Get current state info
  const currentState = state.value as string
  const stepNumber = getStepNumber(currentState as Parameters<typeof getStepNumber>[0])
  const stepName = getStepName(currentState as Parameters<typeof getStepName>[0])
  const totalSteps = getTotalSteps()

  // Determine if we can proceed
  const canProcess =
    state.matches('inputContent') &&
    (state.context.file !== null || state.context.textContent.trim().length > 0)

  const canGoBack = state.matches('preview') || state.matches('error')

  // Determine processing stage for indicator
  const getProcessingStage = (): 'parsing' | 'analyzing' | 'generating' | 'validating' => {
    if (state.matches('validating')) return 'validating'
    if (state.context.streamingYaml.length > 0) return 'generating'
    if (elapsedTime < 2000) return 'parsing'
    return 'analyzing'
  }

  return (
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

            {/* Refining */}
            {state.matches('refining') && (
              <ProcessingIndicator
                stage="generating"
                elapsedMs={elapsedTime}
                streamingYaml={state.context.streamingYaml}
              />
            )}

            {/* Preview */}
            {state.matches('preview') && (
              <SpecPreview
                yaml={state.context.generatedYaml}
                errors={state.context.errors}
                isValid={state.context.isValid}
                model={state.context.model}
                processingTimeMs={state.context.processingTimeMs}
                onRefine={handleRefine}
                onOpenEditor={handleOpenEditor}
                isRefining={false}
              />
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
          !state.matches('refining') &&
          !state.matches('error') &&
          !state.matches('inputContent') && (
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack} disabled={!canGoBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <div className="flex gap-2">
                {state.matches('preview') && (
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
  )
}
