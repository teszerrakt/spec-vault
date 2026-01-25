import { assign, fromPromise, setup } from 'xstate'
import { processImageImportAction, processImportAction } from '@/actions/import'
import type { ConversionResult, ImportSourceType } from '@/types/import'

/**
 * Import wizard context - all state data.
 */
export interface ImportWizardContext {
  /** Selected source type */
  sourceType: ImportSourceType | null
  /** File object if uploaded */
  file: File | null
  /** Text content if entered manually */
  textContent: string
  /** Generated OpenAPI YAML */
  generatedYaml: string
  /** Validation errors */
  errors: string[]
  /** Whether the generated spec is valid */
  isValid: boolean
  /** AI model used */
  model: string
  /** Processing time in ms */
  processingTimeMs: number
  /** Error message if failed */
  errorMessage: string | null
  /** Target file path for saving */
  targetPath: string
}

/**
 * Import wizard events.
 */
export type ImportWizardEvent =
  | { type: 'SELECT_SOURCE'; sourceType: ImportSourceType }
  | { type: 'UPLOAD_FILE'; file: File }
  | { type: 'ENTER_TEXT'; text: string }
  | { type: 'PROCESS' }
  | { type: 'BACK' }
  | { type: 'EDIT_SPEC'; yaml: string }
  | { type: 'SAVE' }
  | { type: 'SET_TARGET_PATH'; path: string }
  | { type: 'RESET' }
  | { type: 'RETRY' }

/**
 * Initial context for the wizard.
 */
const initialContext: ImportWizardContext = {
  sourceType: null,
  file: null,
  textContent: '',
  generatedYaml: '',
  errors: [],
  isValid: false,
  model: '',
  processingTimeMs: 0,
  errorMessage: null,
  targetPath: '',
}

/**
 * Read file as text content.
 */
async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

/**
 * Read file as base64.
 */
async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Process import actor - calls Server Actions for AI conversion.
 */
const processImportActor = fromPromise<
  ConversionResult,
  { sourceType: ImportSourceType; file: File | null; textContent: string }
>(async ({ input }) => {
  // Handle image files - need base64 encoding
  if (input.sourceType === 'image' && input.file) {
    const base64Data = await readFileAsBase64(input.file)
    return processImageImportAction(base64Data, input.file.type, input.file.name)
  }

  // Handle file uploads - read as text and send to Server Action
  if (input.file) {
    const content = await readFileAsText(input.file)
    return processImportAction(input.sourceType, content, input.file.name)
  }

  // Handle text input
  if (input.textContent) {
    return processImportAction(input.sourceType, input.textContent)
  }

  throw new Error('No file or text content provided')
})

/**
 * Import wizard state machine.
 *
 * Flow:
 * idle → selectSource → inputContent → processing → preview → (editing) → saving → complete
 *                                                  ↘ error
 */
export const importWizardMachine = setup({
  types: {
    context: {} as ImportWizardContext,
    events: {} as ImportWizardEvent,
  },
  actors: {
    processImport: processImportActor,
  },
  guards: {
    hasFile: ({ context }) => context.file !== null,
    hasTextContent: ({ context }) => context.textContent.trim().length > 0,
    hasContent: ({ context }) => context.file !== null || context.textContent.trim().length > 0,
    isValid: ({ context }) => context.isValid,
    hasTargetPath: ({ context }) => context.targetPath.trim().length > 0,
  },
}).createMachine({
  id: 'importWizard',
  initial: 'idle',
  context: initialContext,
  states: {
    idle: {
      on: {
        SELECT_SOURCE: {
          target: 'selectSource',
          actions: assign({
            sourceType: ({ event }) => event.sourceType,
          }),
        },
      },
    },

    selectSource: {
      on: {
        SELECT_SOURCE: {
          actions: assign({
            sourceType: ({ event }) => event.sourceType,
            // Clear previous content when changing source type
            file: null,
            textContent: '',
          }),
        },
        UPLOAD_FILE: {
          actions: assign({
            file: ({ event }) => event.file,
          }),
        },
        ENTER_TEXT: {
          actions: assign({
            textContent: ({ event }) => event.text,
          }),
        },
        PROCESS: {
          target: 'processing',
          guard: 'hasContent',
        },
        BACK: {
          target: 'idle',
          actions: assign({
            sourceType: null,
          }),
        },
      },
    },

    inputContent: {
      on: {
        UPLOAD_FILE: {
          actions: assign({
            file: ({ event }) => event.file,
            textContent: '', // Clear text if file is uploaded
          }),
        },
        ENTER_TEXT: {
          actions: assign({
            textContent: ({ event }) => event.text,
            file: null, // Clear file if text is entered
          }),
        },
        PROCESS: {
          target: 'processing',
          guard: 'hasContent',
        },
        BACK: {
          target: 'selectSource',
          actions: assign({
            file: null,
            textContent: '',
          }),
        },
      },
    },

    processing: {
      invoke: {
        id: 'processImport',
        src: 'processImport',
        input: ({ context }) => ({
          sourceType: context.sourceType!,
          file: context.file,
          textContent: context.textContent,
        }),
        onDone: {
          target: 'preview',
          actions: assign({
            generatedYaml: ({ event }) => event.output.yaml,
            isValid: ({ event }) => event.output.isValid,
            errors: ({ event }) => event.output.errors || [],
            model: ({ event }) => event.output.model,
            processingTimeMs: ({ event }) => event.output.processingTimeMs,
            errorMessage: null,
          }),
        },
        onError: {
          target: 'error',
          actions: assign({
            errorMessage: ({ event }) =>
              event.error instanceof Error ? event.error.message : 'Unknown error occurred',
          }),
        },
      },
    },

    preview: {
      on: {
        EDIT_SPEC: {
          target: 'editing',
          actions: assign({
            generatedYaml: ({ event }) => event.yaml,
          }),
        },
        SET_TARGET_PATH: {
          actions: assign({
            targetPath: ({ event }) => event.path,
          }),
        },
        SAVE: {
          target: 'saving',
          guard: 'hasTargetPath',
        },
        BACK: {
          target: 'inputContent',
          actions: assign({
            generatedYaml: '',
            isValid: false,
            errors: [],
          }),
        },
        RETRY: {
          target: 'processing',
        },
      },
    },

    editing: {
      on: {
        EDIT_SPEC: {
          actions: assign({
            generatedYaml: ({ event }) => event.yaml,
          }),
        },
        BACK: {
          target: 'preview',
        },
        SET_TARGET_PATH: {
          actions: assign({
            targetPath: ({ event }) => event.path,
          }),
        },
        SAVE: {
          target: 'saving',
          guard: 'hasTargetPath',
        },
      },
    },

    saving: {
      // Saving is handled by the parent component via Server Action
      // This state exists to show saving indicator
      on: {
        // SaveContract action is handled externally
        // On success, redirect to contract page
        // On error, return to preview with error message
      },
    },

    error: {
      on: {
        RETRY: {
          target: 'processing',
        },
        BACK: {
          target: 'inputContent',
          actions: assign({
            errorMessage: null,
          }),
        },
        RESET: {
          target: 'idle',
          actions: assign(initialContext),
        },
      },
    },

    complete: {
      type: 'final',
    },
  },
  on: {
    RESET: {
      target: '.idle',
      actions: assign(initialContext),
    },
  },
})

/**
 * Type helper for the state value.
 */
export type ImportWizardState =
  | 'idle'
  | 'selectSource'
  | 'inputContent'
  | 'processing'
  | 'preview'
  | 'editing'
  | 'saving'
  | 'error'
  | 'complete'

/**
 * Get human-readable step name.
 */
export function getStepName(state: ImportWizardState): string {
  switch (state) {
    case 'idle':
      return 'Start'
    case 'selectSource':
      return 'Select Source'
    case 'inputContent':
      return 'Upload Content'
    case 'processing':
      return 'Processing'
    case 'preview':
      return 'Preview'
    case 'editing':
      return 'Edit Spec'
    case 'saving':
      return 'Saving'
    case 'error':
      return 'Error'
    case 'complete':
      return 'Complete'
    default:
      return 'Unknown'
  }
}

/**
 * Get step number (1-indexed).
 */
export function getStepNumber(state: ImportWizardState): number {
  const steps: ImportWizardState[] = [
    'selectSource',
    'inputContent',
    'processing',
    'preview',
    'saving',
  ]
  const index = steps.indexOf(state)
  return index === -1 ? 0 : index + 1
}

/**
 * Get total number of steps.
 */
export function getTotalSteps(): number {
  return 5
}
