'use client'

import { useState, useCallback } from 'react'
import { Loader2, Save, GitPullRequest } from 'lucide-react'
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
import { Kbd } from '@/components/ui/kbd'
import { useKeyboardShortcut, getMetaKeyDisplay } from '@/hooks/use-keyboard-shortcut'
import { saveContract, type SaveResult } from '@/actions/contracts'
import { PRDialog } from './pr-dialog'

// NOTE: Save modes for future role-based settings implementation
// 'direct' - Save directly to main branch (hidden for now)
// 'review' - Submit for review via PR (default)
type SaveMode = 'direct' | 'review'

interface SaveDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** File path for the contract (can be empty for new contracts) */
  filePath?: string
  /** YAML content to save */
  content: string
  /** Callback when save succeeds */
  onSaveSuccess?: (result: SaveResult) => void
  /** Whether this is a new contract (show file path input) */
  isNew?: boolean
  /**
   * Whether to show the "Save Directly" option.
   * 
   * TODO: This option is currently hidden pending role-based settings implementation.
   * When settings are available (Phase 9 - US7), this can be conditionally shown
   * based on user role (e.g., admins can save directly, others must submit for review).
   * 
   * @default false - Hidden until role-based settings are implemented
   */
  showDirectSaveOption?: boolean
  /** Original content before changes (for updates) */
  originalContent?: string
}

export function SaveDialog({
  open,
  onOpenChange,
  filePath: initialFilePath,
  content,
  onSaveSuccess,
  isNew = false,
  // TODO: Enable when role-based settings are implemented (Phase 9 - US7)
  // For now, always hide the direct save option - all saves go through PR review
  showDirectSaveOption = false,
  originalContent,
}: SaveDialogProps) {
  const [filePath, setFilePath] = useState(initialFilePath || '')
  const [commitMessage, setCommitMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  // Default to 'review' mode since direct save is hidden
  const [saveMode, setSaveMode] = useState<SaveMode>('review')
  const [showPRDialog, setShowPRDialog] = useState(false)

  const targetPath = isNew ? filePath : initialFilePath

  // ============================================================================
  // Direct Save Handler
  // TODO: This functionality is preserved for future role-based settings.
  // When enabled, users with appropriate permissions can save directly to main.
  // ============================================================================
  const handleSave = useCallback(async () => {
    if (!targetPath?.trim()) {
      toast.error('Please enter a file path')
      return
    }

    if (!commitMessage.trim()) {
      toast.error('Please enter a commit message')
      return
    }

    setIsSaving(true)

    try {
      const result = await saveContract(targetPath.trim(), content, commitMessage.trim())

      if (result.success) {
        toast.success('Contract saved successfully', {
          description: result.commitSha
            ? `Commit: ${result.commitSha.slice(0, 7)}`
            : undefined,
        })
        onOpenChange(false)
        setCommitMessage('')
        onSaveSuccess?.(result)
      } else {
        toast.error('Failed to save contract', {
          description: result.error,
        })
      }
    } catch (error) {
      toast.error('An unexpected error occurred', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSaving(false)
    }
  }, [targetPath, commitMessage, content, onOpenChange, onSaveSuccess])

  const handleSubmitForReview = useCallback(() => {
    if (!targetPath?.trim()) {
      toast.error('Please enter a file path')
      return
    }
    // Close save dialog and open PR dialog
    onOpenChange(false)
    setShowPRDialog(true)
  }, [targetPath, onOpenChange])

  const handlePRSuccess = useCallback(() => {
    // Don't close dialog - let user see success state with "Open PR on GitHub" button
    // User will close manually after viewing the PR link
    setCommitMessage('')
  }, [])

  // Keyboard shortcut: Cmd/Ctrl + Enter to submit
  useKeyboardShortcut({
    key: 'Enter',
    modifiers: ['meta'],
    onTrigger: () => {
      if (saveMode === 'direct' && showDirectSaveOption) {
        handleSave()
      } else {
        handleSubmitForReview()
      }
    },
    enabled: open && !isSaving && !!targetPath?.trim(),
  })

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitPullRequest className="h-5 w-5" />
              Save Contract
            </DialogTitle>
            <DialogDescription>
              {isNew
                ? 'Save this new contract and submit it for review.'
                : `Save changes to ${initialFilePath} and submit for review.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isNew && (
              <div className="space-y-2">
                <Label htmlFor="filePath">File Path</Label>
                <Input
                  id="filePath"
                  placeholder="e.g., payments/api.yaml"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  Path within the contracts directory (must end in .yaml or .yml)
                </p>
              </div>
            )}

            {/* ================================================================
                Save Mode Selection (Hidden)
                
                TODO: Re-enable when role-based settings are implemented.
                This allows users to choose between saving directly to main
                or submitting for review via PR.
                
                To re-enable:
                1. Set showDirectSaveOption prop to true (or conditionally based on user role)
                2. The UI below will automatically show the mode selection
                
                See: Phase 9 (US7) for settings implementation
            ================================================================ */}
            {showDirectSaveOption && (
              <div className="space-y-2">
                <Label>Save Method</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={saveMode === 'direct' ? 'default' : 'outline'}
                    className="justify-start h-auto py-3 px-4"
                    onClick={() => setSaveMode('direct')}
                    disabled={isSaving}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        <span className="font-medium">Save Directly</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-normal">
                        Commit to main branch
                      </span>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant={saveMode === 'review' ? 'default' : 'outline'}
                    className="justify-start h-auto py-3 px-4"
                    onClick={() => setSaveMode('review')}
                    disabled={isSaving}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <GitPullRequest className="h-4 w-4" />
                        <span className="font-medium">Submit for Review</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-normal">
                        Create a pull request
                      </span>
                    </div>
                  </Button>
                </div>
              </div>
            )}

            {/* Commit message - only show for direct save mode when enabled */}
            {saveMode === 'direct' && showDirectSaveOption && (
              <div className="space-y-2">
                <Label htmlFor="commitMessage">Commit Message</Label>
                <Textarea
                  id="commitMessage"
                  placeholder="Describe the changes you made..."
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  disabled={isSaving}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  A clear commit message helps track changes in version history
                </p>
              </div>
            )}

            {/* Info for review mode (default when direct save is hidden) */}
            {(saveMode === 'review' || !showDirectSaveOption) && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">
                  Your changes will be submitted as a pull request for team review.
                  AI will help generate a descriptive title and summary.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            {saveMode === 'direct' && showDirectSaveOption ? (
              <Button onClick={handleSave} disabled={isSaving || !commitMessage.trim()}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleSubmitForReview} disabled={!targetPath?.trim()} className="gap-2">
                <GitPullRequest className="h-4 w-4" />
                Continue
                <Kbd className="ml-1">{getMetaKeyDisplay()}↵</Kbd>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PR Dialog - opens when user proceeds with review */}
      {targetPath && (
        <PRDialog
          open={showPRDialog}
          onOpenChange={setShowPRDialog}
          filePath={targetPath}
          content={content}
          onSuccess={handlePRSuccess}
          isNew={isNew}
          originalContent={originalContent}
        />
      )}
    </>
  )
}
