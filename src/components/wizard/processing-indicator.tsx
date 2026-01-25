'use client'

import { CheckCircle, FileCode, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface ProcessingIndicatorProps {
  /** Optional processing stage message */
  stage?: 'parsing' | 'analyzing' | 'generating' | 'validating'
  /** Optional elapsed time in milliseconds */
  elapsedMs?: number
  /** Whether processing is complete */
  isComplete?: boolean
  /** Streaming YAML content (partial output during generation) */
  streamingYaml?: string
}

const stages = {
  parsing: {
    title: 'Parsing Input',
    description: 'Reading and parsing your file...',
    icon: FileCode,
    progress: 15,
  },
  analyzing: {
    title: 'Analyzing Content',
    description: 'AI is analyzing your API documentation...',
    icon: Sparkles,
    progress: 25,
  },
  generating: {
    title: 'Generating OpenAPI',
    description: 'Creating your OpenAPI specification...',
    icon: Sparkles,
    progress: 50,
  },
  validating: {
    title: 'Validating Spec',
    description: 'Checking the generated specification...',
    icon: CheckCircle,
    progress: 90,
  },
}

export function ProcessingIndicator({
  stage = 'analyzing',
  elapsedMs,
  isComplete = false,
  streamingYaml = '',
}: ProcessingIndicatorProps) {
  const [animatedProgress, setAnimatedProgress] = useState(() => (isComplete ? 100 : 0))
  const [dots, setDots] = useState('')
  const previewRef = useRef<HTMLPreElement>(null)

  const currentStage = stages[stage]
  const hasStreamingContent = streamingYaml.length > 0

  // Calculate target progress based on state and streaming content
  const targetProgress = useMemo(() => {
    if (isComplete) return 100
    if (hasStreamingContent) {
      // Progress based on content length (rough estimate: ~4000 chars for full spec)
      const contentProgress = Math.min(streamingYaml.length / 4000, 0.85) * 100
      return Math.max(currentStage.progress, Math.round(contentProgress))
    }
    return currentStage.progress
  }, [isComplete, currentStage.progress, hasStreamingContent, streamingYaml.length])

  // Animate progress bar
  useEffect(() => {
    if (animatedProgress >= targetProgress) return

    const interval = setInterval(() => {
      setAnimatedProgress((prev) => {
        if (prev >= targetProgress) return prev
        return prev + 1
      })
    }, 50)

    return () => clearInterval(interval)
  }, [targetProgress, animatedProgress])

  // Animate dots
  useEffect(() => {
    if (isComplete) return

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : `${prev}.`))
    }, 500)

    return () => clearInterval(interval)
  }, [isComplete])

  // Auto-scroll to bottom of preview when content changes
  const contentLength = streamingYaml.length
  useEffect(() => {
    if (previewRef.current && contentLength > 0) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight
    }
  }, [contentLength])

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          {isComplete ? (
            <CheckCircle className="h-8 w-8 text-primary" />
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          )}
        </div>
        <CardTitle className="text-lg">
          {isComplete ? 'Processing Complete!' : currentStage.title + dots}
        </CardTitle>
        <CardDescription>
          {isComplete ? 'Your OpenAPI specification is ready' : currentStage.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={animatedProgress} className="h-2" />

        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{animatedProgress}%</span>
          {elapsedMs !== undefined && <span>Elapsed: {formatTime(elapsedMs)}</span>}
        </div>

        {/* Streaming YAML Preview */}
        {hasStreamingContent && !isComplete && (
          <div className="mt-4 rounded-lg border bg-muted/50 overflow-hidden">
            <div className="px-3 py-2 border-b bg-muted/80 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Live Preview</span>
              <span className="text-xs text-muted-foreground">
                {streamingYaml.length.toLocaleString()} chars
              </span>
            </div>
            <pre
              ref={previewRef}
              className="p-3 text-xs font-mono overflow-auto max-h-64 text-foreground/80"
            >
              {streamingYaml}
              <span className="animate-pulse">▌</span>
            </pre>
          </div>
        )}

        {!isComplete && !hasStreamingContent && (
          <div className="text-center text-sm text-muted-foreground">
            <p>This may take up to 60 seconds depending on the complexity of your input.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface ProcessingStepsProps {
  currentStep: number
  totalSteps?: number
}

/**
 * Shows processing steps with progress.
 */
export function ProcessingSteps({ currentStep, totalSteps = 4 }: ProcessingStepsProps) {
  const steps = [
    { label: 'Parse', description: 'Reading input' },
    { label: 'Analyze', description: 'AI analysis' },
    { label: 'Generate', description: 'Create spec' },
    { label: 'Validate', description: 'Check spec' },
  ]

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.slice(0, totalSteps).map((step, index) => (
        <div key={step.label} className="flex items-center">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors',
              index < currentStep && 'bg-primary text-primary-foreground',
              index === currentStep && 'bg-primary/20 text-primary ring-2 ring-primary',
              index > currentStep && 'bg-muted text-muted-foreground'
            )}
          >
            {index < currentStep ? (
              <CheckCircle className="h-4 w-4" />
            ) : index === currentStep ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              index + 1
            )}
          </div>
          {index < totalSteps - 1 && (
            <div
              className={cn(
                'mx-2 h-0.5 w-8 transition-colors',
                index < currentStep ? 'bg-primary' : 'bg-muted'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
