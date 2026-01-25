'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Loader2, GitPullRequest, ExternalLink, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  submitForReview,
  generatePRContentAction,
  type SubmitForReviewResult,
} from '@/actions/github'

interface PRDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** File path for the contract */
  filePath: string
  /** YAML content to submit */
  content: string
  /** Callback when PR is created successfully */
  onSuccess?: (result: SubmitForReviewResult) => void
  /** Whether this is a new contract (vs update) */
  isNew?: boolean
  /** Original content before changes (for updates) */
  originalContent?: string
}

export function PRDialog({
  open,
  onOpenChange,
  filePath,
  content,
  onSuccess,
  isNew = false,
  originalContent,
}: PRDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [prUrl, setPrUrl] = useState<string | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // Cache key for storing generated content
  const cacheKeyRef = useRef<string>('')
  const cachedContentRef = useRef<{ title: string; description: string } | null>(null)

  // Generate a cache key based on content hash
  const getCacheKey = useCallback(() => {
    // Simple hash based on content length and first/last chars
    const hash = `${filePath}-${content.length}-${content.slice(0, 50)}-${isNew}-${originalContent?.length || 0}`
    return hash
  }, [filePath, content, isNew, originalContent])

  // Generate PR content using AI
  const generateContent = useCallback(
    async (forceRegenerate = false) => {
      const currentCacheKey = getCacheKey()

      // Use cached content if available and not forcing regenerate
      if (!forceRegenerate && cachedContentRef.current && cacheKeyRef.current === currentCacheKey) {
        setTitle(cachedContentRef.current.title)
        setDescription(cachedContentRef.current.description)
        return
      }

      setIsGenerating(true)
      setGenerationError(null)

      try {
        const result = await generatePRContentAction(filePath, content, isNew, originalContent)

        if (result.success && result.title && result.description) {
          setTitle(result.title)
          setDescription(result.description)

          // Cache the result
          cacheKeyRef.current = currentCacheKey
          cachedContentRef.current = {
            title: result.title,
            description: result.description,
          }
        } else {
          // Use fallback
          const fallbackTitle = isNew
            ? `Add new contract: ${filePath}`
            : `Update contract: ${filePath}`
          setTitle(fallbackTitle)
          setDescription('')
          setGenerationError(result.error || 'Failed to generate content')

          if (result.error) {
            toast.error('AI generation failed', {
              description: 'Using default values. You can edit them manually.',
            })
          }
        }
      } catch (error) {
        console.error('Failed to generate PR content:', error)
        const fallbackTitle = isNew
          ? `Add new contract: ${filePath}`
          : `Update contract: ${filePath}`
        setTitle(fallbackTitle)
        setDescription('')
        setGenerationError(error instanceof Error ? error.message : 'Unknown error')

        toast.error('AI generation failed', {
          description: 'Using default values. You can edit them manually.',
        })
      } finally {
        setIsGenerating(false)
      }
    },
    [filePath, content, isNew, originalContent, getCacheKey]
  )

  // Generate content when dialog opens
  useEffect(() => {
    if (open && !prUrl) {
      generateContent()
    }
  }, [open, prUrl, generateContent])

  const handleRegenerate = useCallback(() => {
    generateContent(true) // Force regenerate
  }, [generateContent])

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      toast.error('Please enter a PR title')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await submitForReview({
        filePath,
        content,
        title: title.trim(),
        description: description.trim() || undefined,
      })

      if (result.success && result.pr) {
        toast.success('Pull request created!', {
          description: `PR #${result.pr.number} is ready for review`,
        })
        setPrUrl(result.pr.url)
        onSuccess?.(result)
      } else {
        toast.error('Failed to create pull request', {
          description: result.error,
        })
      }
    } catch (error) {
      toast.error('An unexpected error occurred', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [filePath, content, title, description, onSuccess])

  const handleOpenPR = useCallback(() => {
    if (prUrl) {
      window.open(prUrl, '_blank', 'noopener,noreferrer')
    }
  }, [prUrl])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    // Reset state after dialog closes (but keep cache)
    setTimeout(() => {
      setPrUrl(null)
      setGenerationError(null)
    }, 200)
  }, [onOpenChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.metaKey && !prUrl && !isGenerating) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit, prUrl, isGenerating]
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitPullRequest className="h-5 w-5" />
            {prUrl ? 'Pull Request Created' : 'Submit for Review'}
          </DialogTitle>
          <DialogDescription>
            {prUrl
              ? 'Your changes have been submitted for review.'
              : 'Create a pull request for these contract changes.'}
          </DialogDescription>
        </DialogHeader>

        {prUrl ? (
          // Success state - show PR link
          <div className="py-6">
            <div className="rounded-lg border bg-muted/50 p-4 text-center">
              <GitPullRequest className="mx-auto h-12 w-12 text-green-600 mb-3" />
              <p className="font-medium mb-1">Pull Request Ready</p>
              <p className="text-sm text-muted-foreground mb-4">
                Click the button below to view and review your changes on GitHub.
              </p>
              <Button onClick={handleOpenPR} className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Pull Request on GitHub
              </Button>
            </div>
          </div>
        ) : isGenerating ? (
          // Loading state - AI is generating content
          <div className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="relative">
                <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <p className="mt-4 font-medium">Generating PR content...</p>
              <p className="mt-1 text-sm text-muted-foreground">
                AI is analyzing your contract to create a helpful description
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                This may take a few seconds
              </div>
            </div>
          </div>
        ) : (
          // Form state
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="prTitle">Pull Request Title</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={isSubmitting}
                  className="h-7 text-xs"
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Regenerate
                </Button>
              </div>
              <Input
                id="prTitle"
                placeholder="e.g., Add new payment endpoints"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
              />
              {generationError && (
                <p className="text-xs text-amber-600">
                  AI generation failed. You can edit the content manually.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="prDescription">Description</Label>
              <Textarea
                id="prDescription"
                placeholder="Describe the changes you made and why..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                rows={10}
                className="resize-none font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                This will be included in the pull request description on GitHub.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">
                <strong>What happens next:</strong>
              </p>
              <ol className="text-sm text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
                <li>A new branch will be created with your changes</li>
                <li>A pull request will be opened for review</li>
                <li>You&apos;ll be redirected to GitHub to complete the review</li>
              </ol>
            </div>
          </div>
        )}

        <DialogFooter>
          {prUrl ? (
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting || isGenerating}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || isGenerating || !title.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating PR...
                  </>
                ) : (
                  <>
                    <GitPullRequest className="mr-2 h-4 w-4" />
                    Create Pull Request
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
