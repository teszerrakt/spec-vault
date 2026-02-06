import { assign, fromCallback, fromPromise, setup } from 'xstate'
import { cleanYamlOutput } from '@/lib/ai/converter'
import { detectSourceType } from '@/lib/import'
import { extractFileNameFromSpec } from '@/lib/openapi/parser'
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
  /** Suggested file name extracted from info.title (without extension) */
  suggestedFileName: string
  /** Number of AI refinement attempts */
  refineAttempts: number
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
  | { type: 'RESET' }
  | { type: 'RETRY' }
  | { type: 'STREAM_CHUNK'; chunk: string }
  | { type: 'STREAM_COMPLETE'; yaml: string; processingTimeMs: number }
  | { type: 'STREAM_ERROR'; error: string }
  | { type: 'REFINE' }
  | { type: 'REFINE_CHUNK'; chunk: string }
  | { type: 'REFINE_COMPLETE'; yaml: string }
  | { type: 'REFINE_ERROR'; error: string }

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
  suggestedFileName: '',
  refineAttempts: 0,
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
 * Streaming refine actor - calls streaming API route to fix validation errors.
 * Uses fromCallback to send streaming events back to the machine.
 */
const streamingRefineActor = fromCallback<
  ImportWizardEvent,
  { currentSpec: string; errors: string[] }
>(({ sendBack, input }) => {
  const controller = new AbortController()
  let accumulatedYaml = ''

  const processStream = async () => {
    try {
      const response = await fetch('/api/generate/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSpec: input.currentSpec,
          errors: input.errors,
        }),
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

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        accumulatedYaml += chunk
        sendBack({ type: 'REFINE_CHUNK', chunk: accumulatedYaml })
      }

      const cleanedYaml = cleanYamlOutput(accumulatedYaml)
      sendBack({ type: 'REFINE_COMPLETE', yaml: cleanedYaml })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      sendBack({
        type: 'REFINE_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      })
    }
  }

  processStream()

  return () => {
    controller.abort()
  }
})

/**
 * Validation actor - validates the generated YAML and extracts suggested filename.
 */
const validateActor = fromPromise<
  { isValid: boolean; errors: string[]; suggestedFileName: string },
  { yaml: string }
>(async ({ input }) => {
  const result = await validateOpenAPI(input.yaml)
  const suggestedFileName = extractFileNameFromSpec(input.yaml)
  return {
    isValid: result.isValid,
    errors: result.errors?.map((e) => e.message) || [],
    suggestedFileName,
  }
})

/**
 * Import wizard state machine.
 *
 * Simplified flow with streaming:
 * inputContent → processing (streaming) → validating → preview → (refining) → [Open in Editor]
 *                          ↘ error
 *
 * After preview, user clicks "Open in Editor" which navigates to /edit/new
 * where the full EditorWizard takes over for section-by-section editing and saving.
 */
export const importWizardMachine = setup({
  types: {
    context: {} as ImportWizardContext,
    events: {} as ImportWizardEvent,
  },
  actors: {
    streamingProcess: streamingProcessActor,
    streamingRefine: streamingRefineActor,
    validate: validateActor,
  },
  guards: {
    hasFile: ({ context }) => context.file !== null,
    hasTextContent: ({ context }) => context.textContent.trim().length > 0,
    hasContent: ({ context }) => context.file !== null || context.textContent.trim().length > 0,
    isValid: ({ context }) => context.isValid,
    canRefine: ({ context }) => !context.isValid && context.errors.length > 0,
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
            suggestedFileName: ({ event }) => event.output.suggestedFileName,
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
        REFINE: {
          target: 'refining',
          guard: 'canRefine',
          actions: assign({
            refineAttempts: ({ context }) => context.refineAttempts + 1,
            streamingYaml: '',
            errorMessage: null,
          }),
        },
      },
    },

    refining: {
      invoke: {
        id: 'streamingRefine',
        src: 'streamingRefine',
        input: ({ context }) => ({
          currentSpec: context.generatedYaml,
          errors: context.errors,
        }),
      },
      on: {
        REFINE_CHUNK: {
          actions: assign({
            streamingYaml: ({ event }) => event.chunk,
          }),
        },
        REFINE_COMPLETE: {
          target: 'validating',
          actions: assign({
            generatedYaml: ({ event }) => event.yaml,
            streamingYaml: ({ event }) => event.yaml,
          }),
        },
        REFINE_ERROR: {
          target: 'preview',
          actions: assign({
            errorMessage: ({ event }) => event.error,
          }),
        },
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
  | 'refining'
  | 'error'

/**
 * Get human-readable step name.
 */
export function getStepName(state: ImportWizardState): string {
  switch (state) {
    case 'inputContent':
      return 'Input'
    case 'processing':
    case 'validating':
      return 'Processing'
    case 'refining':
      return 'Refining'
    case 'preview':
      return 'Preview'
    case 'error':
      return 'Error'
    default:
      return 'Unknown'
  }
}

/**
 * Get step number (1-indexed).
 * Note: 'validating' and 'refining' are part of step 2 (Processing) from user's perspective.
 */
export function getStepNumber(state: ImportWizardState): number {
  switch (state) {
    case 'inputContent':
      return 1
    case 'processing':
    case 'validating':
    case 'refining':
      return 2
    case 'preview':
      return 3
    default:
      return 0
  }
}

/**
 * Get total number of steps.
 */
export function getTotalSteps(): number {
  return 3 // Input → Processing → Preview
}
