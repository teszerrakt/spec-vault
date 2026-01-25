import { assign, fromCallback, fromPromise, setup } from 'xstate'
import { cleanYamlOutput } from '@/lib/ai/converter'
import { detectSourceType } from '@/lib/import'
import { validateOpenAPI } from '@/lib/openapi/validator'
import type { ImportSourceType } from '@/types/import'

/**
 * Import wizard context - all state data.
 */
export interface ImportWizardContext {
  /** Detected source type (auto-detected from file or defaults to 'text') */
  sourceType: ImportSourceType
  /** File object if uploaded */
  file: File | null
  /** Text content if entered manually */
  textContent: string
  /** Generated OpenAPI YAML */
  generatedYaml: string
  /** Streaming YAML content (partial, during generation) */
  streamingYaml: string
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
  | { type: 'UPLOAD_FILE'; file: File }
  | { type: 'ENTER_TEXT'; text: string }
  | { type: 'CLEAR_FILE' }
  | { type: 'PROCESS' }
  | { type: 'BACK' }
  | { type: 'EDIT_SPEC'; yaml: string }
  | { type: 'SAVE' }
  | { type: 'SET_TARGET_PATH'; path: string }
  | { type: 'RESET' }
  | { type: 'RETRY' }
  | { type: 'STREAM_CHUNK'; chunk: string }
  | { type: 'STREAM_COMPLETE'; yaml: string; processingTimeMs: number }
  | { type: 'STREAM_ERROR'; error: string }

/**
 * Initial context for the wizard.
 */
const initialContext: ImportWizardContext = {
  sourceType: 'text',
  file: null,
  textContent: '',
  generatedYaml: '',
  streamingYaml: '',
  errors: [],
  isValid: false,
  model: 'gpt-4o',
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
 * Streaming process import actor - calls streaming API routes for AI conversion.
 * Uses fromCallback to send streaming events back to the machine.
 *
 * The API routes use toTextStreamResponse() which returns plain text chunks.
 */
const streamingProcessActor = fromCallback<
  ImportWizardEvent,
  { sourceType: ImportSourceType; file: File | null; textContent: string }
>(({ sendBack, input }) => {
  const controller = new AbortController()
  const startTime = Date.now()
  let accumulatedYaml = ''

  const processStream = async () => {
    try {
      let endpoint: string
      let body: string

      // Determine endpoint and prepare body based on source type
      if (input.sourceType === 'image' && input.file) {
        const base64Data = await readFileAsBase64(input.file)
        endpoint = '/api/generate/image'
        body = JSON.stringify({
          imageData: base64Data,
          mimeType: input.file.type,
        })
      } else {
        // Text content - either from file or textarea
        let content = input.textContent
        if (input.file) {
          content = await readFileAsText(input.file)
        }
        endpoint = '/api/generate'
        body = JSON.stringify({
          sourceType: input.sourceType,
          content,
        })
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()

      // Read text stream (plain text chunks from toTextStreamResponse)
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        accumulatedYaml += chunk
        sendBack({ type: 'STREAM_CHUNK', chunk: accumulatedYaml })
      }

      // Clean and send complete event
      const cleanedYaml = cleanYamlOutput(accumulatedYaml)
      sendBack({
        type: 'STREAM_COMPLETE',
        yaml: cleanedYaml,
        processingTimeMs: Date.now() - startTime,
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return // Ignore abort errors
      }
      sendBack({
        type: 'STREAM_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      })
    }
  }

  processStream()

  // Cleanup function - abort fetch on cancel
  return () => {
    controller.abort()
  }
})

/**
 * Validation actor - validates the generated YAML.
 */
const validateActor = fromPromise<{ isValid: boolean; errors: string[] }, { yaml: string }>(
  async ({ input }) => {
    const result = await validateOpenAPI(input.yaml)
    return {
      isValid: result.isValid,
      errors: result.errors?.map((e) => e.message) || [],
    }
  }
)

/**
 * Import wizard state machine.
 *
 * Simplified 3-step flow with streaming:
 * inputContent → processing (streaming) → validating → preview → (editing) → saving → complete
 *                          ↘ error
 */
export const importWizardMachine = setup({
  types: {
    context: {} as ImportWizardContext,
    events: {} as ImportWizardEvent,
  },
  actors: {
    streamingProcess: streamingProcessActor,
    validate: validateActor,
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
  initial: 'inputContent',
  context: initialContext,
  states: {
    inputContent: {
      on: {
        UPLOAD_FILE: {
          actions: assign({
            file: ({ event }) => event.file,
            textContent: '', // Clear text if file is uploaded
            sourceType: ({ event }) => detectSourceType(event.file.name, event.file.type),
          }),
        },
        CLEAR_FILE: {
          actions: assign({
            file: null,
            sourceType: 'text',
          }),
        },
        ENTER_TEXT: {
          actions: assign({
            textContent: ({ event }) => event.text,
            file: null, // Clear file if text is entered
            sourceType: 'text',
          }),
        },
        PROCESS: {
          target: 'processing',
          guard: 'hasContent',
          actions: assign({
            streamingYaml: '', // Reset streaming content
            generatedYaml: '',
            errors: [],
            errorMessage: null,
          }),
        },
      },
    },

    processing: {
      invoke: {
        id: 'streamingProcess',
        src: 'streamingProcess',
        input: ({ context }) => ({
          sourceType: context.sourceType,
          file: context.file,
          textContent: context.textContent,
        }),
      },
      on: {
        STREAM_CHUNK: {
          actions: assign({
            streamingYaml: ({ event }) => event.chunk,
          }),
        },
        STREAM_COMPLETE: {
          target: 'validating',
          actions: assign({
            generatedYaml: ({ event }) => event.yaml,
            streamingYaml: ({ event }) => event.yaml,
            processingTimeMs: ({ event }) => event.processingTimeMs,
          }),
        },
        STREAM_ERROR: {
          target: 'error',
          actions: assign({
            errorMessage: ({ event }) => event.error,
          }),
        },
      },
    },

    validating: {
      invoke: {
        id: 'validate',
        src: 'validate',
        input: ({ context }) => ({ yaml: context.generatedYaml }),
        onDone: {
          target: 'preview',
          actions: assign({
            isValid: ({ event }) => event.output.isValid,
            errors: ({ event }) => event.output.errors,
            errorMessage: null,
          }),
        },
        onError: {
          target: 'preview',
          actions: assign({
            isValid: false,
            errors: ({ event }) => [
              event.error instanceof Error ? event.error.message : 'Validation failed',
            ],
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
            streamingYaml: '',
            isValid: false,
            errors: [],
          }),
        },
        RETRY: {
          target: 'processing',
          actions: assign({
            streamingYaml: '',
            generatedYaml: '',
            errors: [],
          }),
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
          actions: assign({
            streamingYaml: '',
            generatedYaml: '',
            errors: [],
          }),
        },
        BACK: {
          target: 'inputContent',
          actions: assign({
            errorMessage: null,
            streamingYaml: '',
          }),
        },
        RESET: {
          target: 'inputContent',
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
      target: '.inputContent',
      actions: assign(initialContext),
    },
  },
})

/**
 * Type helper for the state value.
 */
export type ImportWizardState =
  | 'inputContent'
  | 'processing'
  | 'validating'
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
    case 'inputContent':
      return 'Input'
    case 'processing':
      return 'Generating'
    case 'validating':
      return 'Validating'
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
    'inputContent',
    'processing',
    'validating',
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
  return 3 // Input → Processing → Preview/Save
}
