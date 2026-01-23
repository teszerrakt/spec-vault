'use client'

import { useState, useCallback } from 'react'
import { Loader2, Save } from 'lucide-react'
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
import { saveContract, type SaveResult } from '@/actions/contracts'

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
}

export function SaveDialog({
  open,
  onOpenChange,
  filePath: initialFilePath,
  content,
  onSaveSuccess,
  isNew = false,
}: SaveDialogProps) {
  const [filePath, setFilePath] = useState(initialFilePath || '')
  const [commitMessage, setCommitMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = useCallback(async () => {
    const targetPath = isNew ? filePath : initialFilePath
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
  }, [isNew, filePath, initialFilePath, commitMessage, content, onOpenChange, onSaveSuccess])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.metaKey) {
        e.preventDefault()
        handleSave()
      }
    },
    [handleSave]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save Contract
          </DialogTitle>
          <DialogDescription>
            {isNew
              ? 'Save this new contract to the repository.'
              : `Save changes to ${initialFilePath}`}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
