'use client'

import { CheckCircle, FileCode, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
}

const stages = {
  parsing: {
    title: 'Parsing Input',
    description: 'Reading and parsing your file...',
    icon: FileCode,
    progress: 25,
  },
  analyzing: {
    title: 'Analyzing Content',
    description: 'AI is analyzing your API documentation...',
    icon: Sparkles,
    progress: 50,
  },
  generating: {
    title: 'Generating OpenAPI',
    description: 'Creating your OpenAPI specification...',
    icon: Sparkles,
    progress: 75,
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
}: ProcessingIndicatorProps) {
  const [animatedProgress, setAnimatedProgress] = useState(() => (isComplete ? 100 : 0))
  const [dots, setDots] = useState('')

  const currentStage = stages[stage]

  // Calculate target progress based on state
  const targetProgress = useMemo(
    () => (isComplete ? 100 : currentStage.progress),
    [isComplete, currentStage.progress]
  )

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

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="text-center">
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

        {!isComplete && (
          <div className="text-center text-sm text-muted-foreground">
            <p>This may take up to 30 seconds depending on the complexity of your input.</p>
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
