'use client'

import { useEffect, useCallback, useState } from 'react'
import { useMachine } from '@xstate/react'
import { useRouter } from 'next/navigation'
import { Check, FileCode2, Server, Route, Database, Shield, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { editorWizardMachine, type EditorSection, getSectionName, getAllSections } from '@/machines/editor-wizard'
import { InfoEditor } from './info-editor'
import { ServersEditor } from './servers-editor'
import { PathsEditor } from './paths-editor'
import { SchemasEditor } from './schemas-editor'
import { SecurityEditor } from './security-editor'
import { ReviewPanel } from './review-panel'
import { RawYamlViewer } from './raw-yaml-viewer'
import { ValidationErrorsBadge } from './validation-errors'
import { SaveDialog } from '@/components/contracts/save-dialog'
import { parseOpenAPI, serializeOpenAPI } from '@/lib/openapi/parser'
import type { OpenAPIObject } from '@/types'
import type { SaveResult } from '@/actions/contracts'

interface EditorWizardProps {
  /** File path of the contract being edited */
  filePath?: string
  /** Initial spec (for editing existing contracts) */
  initialSpec?: OpenAPIObject
  /** Initial YAML (for editing existing contracts or from import) */
  initialYaml?: string
  /** Whether this is a new spec (from import wizard) */
  isNew?: boolean
}

const SECTION_ICONS: Record<EditorSection, React.ElementType> = {
  info: FileCode2,
  servers: Server,
  paths: Route,
  schemas: Database,
  security: Shield,
  review: Eye,
}

export function EditorWizard({
  filePath,
  initialSpec,
  initialYaml,
  isNew = false,
}: EditorWizardProps) {
  const router = useRouter()
  const [state, send] = useMachine(editorWizardMachine)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)

  const { spec, yaml, currentSection, isValid, validationErrors, commitMessage, isDirty } =
    state.context

  // Initialize the machine with the provided data
  useEffect(() => {
    if (state.matches('idle')) {
      if (isNew && initialYaml) {
        send({ type: 'LOAD_NEW', yaml: initialYaml })
      } else if (initialSpec && initialYaml && filePath) {
        send({ type: 'LOAD', filePath, spec: initialSpec, yaml: initialYaml })
      }
    }
  }, [state, send, isNew, initialYaml, initialSpec, filePath])

  // Parse YAML to spec when YAML changes
  useEffect(() => {
    if (yaml && !spec) {
      try {
        const parsed = parseOpenAPI(yaml) as OpenAPIObject
        send({ type: 'UPDATE_SPEC', spec: parsed })
      } catch (e) {
        // Invalid YAML, will be caught by validation
      }
    }
  }, [yaml, spec, send])

  // Update YAML when spec changes (from form edits)
  const handleSpecChange = useCallback(
    (updates: Partial<OpenAPIObject>) => {
      send({ type: 'UPDATE_SPEC', spec: updates })
      // Also update the YAML
      if (spec) {
        const newSpec = { ...spec, ...updates } as OpenAPIObject
        try {
          const newYaml = serializeOpenAPI(newSpec)
          send({ type: 'UPDATE_YAML', yaml: newYaml })
        } catch (e) {
          console.error('Failed to serialize spec:', e)
        }
      }
    },
    [send, spec]
  )

  // Handle YAML changes from raw editor
  const handleYamlChange = useCallback(
    (newYaml: string) => {
      send({ type: 'UPDATE_YAML', yaml: newYaml })
      try {
        const parsed = parseOpenAPI(newYaml) as OpenAPIObject
        send({ type: 'UPDATE_SPEC', spec: parsed })
      } catch (e) {
        // Invalid YAML, will be caught by validation
      }
    },
    [send]
  )

  // Navigation handlers
  const handleNavigate = useCallback(
    (section: EditorSection) => {
      send({ type: 'NAVIGATE', section })
    },
    [send]
  )

  const handleNext = useCallback(() => {
    send({ type: 'NEXT' })
  }, [send])

  const handleBack = useCallback(() => {
    send({ type: 'BACK' })
  }, [send])

  // Validation and save handlers
  const handleValidate = useCallback(() => {
    send({ type: 'VALIDATE' })
  }, [send])

  const handleSave = useCallback(() => {
    // Open the save dialog instead of directly saving
    setSaveDialogOpen(true)
  }, [])

  const handleSaveSuccess = useCallback(
    (result: SaveResult) => {
      // Navigate to the saved contract
      const targetPath = result.filePath || filePath
      if (targetPath) {
        router.push(`/contracts/${targetPath}`)
      }
    },
    [router, filePath]
  )

  const handleCommitMessageChange = useCallback(
    (message: string) => {
      send({ type: 'SET_COMMIT_MESSAGE', message })
    },
    [send]
  )

  // Handle completion
  useEffect(() => {
    if (state.matches('complete') && filePath) {
      router.push(`/contracts/${filePath}`)
    }
  }, [state, router, filePath])

  // Loading state
  if (state.matches('idle')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (state.matches('error')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600">Error</h2>
          <p className="mt-2 text-muted-foreground">{state.context.errorMessage}</p>
        </div>
        <Button onClick={() => send({ type: 'BACK' })} variant="outline">
          Go Back
        </Button>
      </div>
    )
  }

  const sections = getAllSections()
  const currentIndex = sections.indexOf(currentSection)
  const isSaving = state.matches({ editing: 'validating' }) || state.matches('saving')

  return (
    <div className="space-y-6">
      {/* Save Dialog */}
      <SaveDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        filePath={filePath}
        content={yaml}
        onSaveSuccess={handleSaveSuccess}
        isNew={isNew}
      />

      {/* Section Navigation */}
      <div className="border-b">
        <div className="flex items-center overflow-x-auto pb-2">
          {sections.map((section, index) => {
            const Icon = SECTION_ICONS[section]
            const isActive = section === currentSection
            const isCompleted = index < currentIndex

            return (
              <button
                key={section}
                onClick={() => handleNavigate(section)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : isCompleted
                      ? 'border-transparent text-muted-foreground hover:text-foreground'
                      : 'border-transparent text-muted-foreground/60 hover:text-muted-foreground'
                }`}
              >
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{getSectionName(section)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Validation Errors Banner */}
      {validationErrors.length > 0 && currentSection !== 'review' && (
        <ValidationErrorsBadge errors={validationErrors} />
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Panel */}
        <div className="lg:col-span-2">
          <Tabs value={currentSection} onValueChange={(v) => handleNavigate(v as EditorSection)}>
            <TabsContent value="info" className="mt-0">
              <InfoEditor spec={spec} onChange={handleSpecChange} />
            </TabsContent>

            <TabsContent value="servers" className="mt-0">
              <ServersEditor spec={spec} onChange={handleSpecChange} />
            </TabsContent>

            <TabsContent value="paths" className="mt-0">
              <PathsEditor spec={spec} onChange={handleSpecChange} />
            </TabsContent>

            <TabsContent value="schemas" className="mt-0">
              <SchemasEditor spec={spec} onChange={handleSpecChange} />
            </TabsContent>

            <TabsContent value="security" className="mt-0">
              <SecurityEditor spec={spec} onChange={handleSpecChange} />
            </TabsContent>

            <TabsContent value="review" className="mt-0">
              <ReviewPanel
                spec={spec}
                yaml={yaml}
                isValid={isValid}
                validationErrors={validationErrors}
                commitMessage={commitMessage}
                onCommitMessageChange={handleCommitMessageChange}
                onValidate={handleValidate}
                onSave={handleSave}
                isSaving={isSaving}
                isDirty={isDirty}
              />
            </TabsContent>
          </Tabs>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentIndex === 0}
            >
              Previous
            </Button>

            {currentSection !== 'review' ? (
              <Button onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={!isValid || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Specification'}
              </Button>
            )}
          </div>
        </div>

        {/* YAML Preview Panel */}
        <div className="lg:col-span-1">
          <RawYamlViewer
            yaml={yaml}
            onChange={handleYamlChange}
            readOnly={false}
          />
        </div>
      </div>
    </div>
  )
}
