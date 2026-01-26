'use client'

import { FolderPlus, GitPullRequest, Loader2, Save } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { type SaveResult, saveContract } from '@/actions/contracts'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getMetaKeyDisplay, useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'
import { PRDialog } from './pr-dialog'

/** Special value for "Create new folder" option */
const CREATE_NEW_FOLDER = '__create_new__'

/**
 * Sanitize file name to be safe for use in file paths.
 * Removes extension if present (we add .yaml automatically).
 */
function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/\.ya?ml$/i, '') // Remove yaml extension if present
    .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace invalid chars with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, '') // Trim leading/trailing hyphens
    .toLowerCase()
}

/**
 * Sanitize folder path to be safe for use in file paths.
 */
function sanitizeFolderPath(path: string): string {
  if (path === '/') return ''
  return path
    .trim()
    .split('/')
    .filter(Boolean)
    .map((part) =>
      part
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase()
    )
    .join('/')
}

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
  /** Available folder paths for the dropdown */
  folders?: string[]
  /** Suggested file name (auto-generated from info.title) */
  suggestedFileName?: string
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
  folders = ['/'],
  suggestedFileName = '',
}: SaveDialogProps) {
  // For new contracts: use folder + fileName; for existing: use initialFilePath
  const [selectedFolder, setSelectedFolder] = useState('/')
  const [fileName, setFileName] = useState(suggestedFileName)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderPath, setNewFolderPath] = useState('')

  const [commitMessage, setCommitMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  // Default to 'review' mode since direct save is hidden
  const [saveMode, setSaveMode] = useState<SaveMode>('review')
  const [showPRDialog, setShowPRDialog] = useState(false)

  // Reset state when dialog opens/closes or suggestedFileName changes
  useEffect(() => {
    if (open && isNew) {
      setFileName(suggestedFileName)
      setSelectedFolder('/')
      setIsCreatingFolder(false)
      setNewFolderPath('')
    }
  }, [open, isNew, suggestedFileName])

  // Compute the final file path
  const finalPath = useMemo(() => {
    if (!isNew) return initialFilePath || ''

    const folder = isCreatingFolder
      ? sanitizeFolderPath(newFolderPath)
      : sanitizeFolderPath(selectedFolder)
    const sanitizedName = sanitizeFileName(fileName)

    if (!sanitizedName) return ''

    const folderPart = folder ? `${folder}/` : ''
    return `${folderPart}${sanitizedName}.yaml`
  }, [isNew, initialFilePath, selectedFolder, fileName, isCreatingFolder, newFolderPath])

  const targetPath = isNew ? finalPath : initialFilePath

  // Handle folder selection change
  const handleFolderChange = useCallback((value: string) => {
    if (value === CREATE_NEW_FOLDER) {
      setIsCreatingFolder(true)
      setNewFolderPath('')
    } else {
      setIsCreatingFolder(false)
      setSelectedFolder(value)
    }
  }, [])

  // ============================================================================
  // Direct Save Handler
  // TODO: This functionality is preserved for future role-based settings.
  // When enabled, users with appropriate permissions can save directly to main.
  // ============================================================================
  const handleSave = useCallback(async () => {
    if (!targetPath?.trim()) {
      toast.error('Please enter a file name')
      return
    }

    if (!commitMessage.trim()) {
      toast.error('Please enter a commit message')
      return
    }

    setIsSaving(true)

    try {
      const result = await saveContract(targetPath, content, commitMessage.trim())

      if (result.success) {
        toast.success('Contract saved successfully', {
          description: result.commitSha ? `Commit: ${result.commitSha.slice(0, 7)}` : undefined,
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
      toast.error('Please enter a file name')
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

  // Check if we can proceed (have a valid file path)
  const canProceed = !!targetPath?.trim()

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
              <>
                {/* Folder Selection */}
                <div className="space-y-2">
                  <Label htmlFor="folder">Folder</Label>
                  {isCreatingFolder ? (
                    <div className="flex gap-2">
                      <Input
                        id="newFolder"
                        placeholder="e.g., flight/demand"
                        value={newFolderPath}
                        onChange={(e) => setNewFolderPath(e.target.value)}
                        disabled={isSaving}
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsCreatingFolder(false)
                          setSelectedFolder('/')
                        }}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={selectedFolder}
                      onValueChange={handleFolderChange}
                      disabled={isSaving}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select folder" />
                      </SelectTrigger>
                      <SelectContent>
                        {folders.map((folder) => (
                          <SelectItem key={folder} value={folder}>
                            {folder === '/' ? '/ (root)' : folder}
                          </SelectItem>
                        ))}
                        <SelectSeparator />
                        <SelectItem value={CREATE_NEW_FOLDER}>
                          <span className="flex items-center gap-2">
                            <FolderPlus className="h-4 w-4" />
                            Create new folder
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {isCreatingFolder
                      ? 'Enter folder path (e.g., flight/demand)'
                      : 'Select an existing folder or create a new one'}
                  </p>
                </div>

                {/* File Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="fileName">File Name</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="fileName"
                      placeholder="e.g., search-result"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      disabled={isSaving}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">.yaml</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Auto-generated from API title, you can edit if needed
                  </p>
                </div>

                {/* Path Preview */}
                {finalPath && (
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground mb-1">File will be saved as:</p>
                    <code className="text-sm font-medium">contracts/{finalPath}</code>
                  </div>
                )}
              </>
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
            {(saveMode === 'review' || !showDirectSaveOption) && !isNew && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">
                  Your changes will be submitted as a pull request for team review. AI will help
                  generate a descriptive title and summary.
                </p>
              </div>
            )}

            {/* Info for new contracts in review mode */}
            {(saveMode === 'review' || !showDirectSaveOption) && isNew && finalPath && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">
                  This contract will be submitted as a pull request for team review.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            {saveMode === 'direct' && showDirectSaveOption ? (
              <Button
                onClick={handleSave}
                disabled={isSaving || !commitMessage.trim() || !canProceed}
              >
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
              <Button onClick={handleSubmitForReview} disabled={!canProceed} className="gap-2">
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
