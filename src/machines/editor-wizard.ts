import { assign, fromPromise, setup } from 'xstate'
import type { OpenAPIObject, ValidationError } from '@/types'

/**
 * Editor section type - each section of the OpenAPI spec that can be edited.
 */
export type EditorSection = 'info' | 'servers' | 'paths' | 'schemas' | 'security' | 'review'

/**
 * Editor wizard context - all state data.
 */
export interface EditorWizardContext {
  /** Contract file path */
  filePath: string
  /** Original spec (for comparison/reset) */
  originalSpec: OpenAPIObject | null
  /** Current working spec */
  spec: OpenAPIObject | null
  /** Current YAML string */
  yaml: string
  /** Whether the spec has unsaved changes */
  isDirty: boolean
  /** Current editor section */
  currentSection: EditorSection
  /** Validation errors */
  validationErrors: ValidationError[]
  /** Whether the spec is valid */
  isValid: boolean
  /** Error message if failed */
  errorMessage: string | null
  /** Whether we're creating a new spec (no original) */
  isNew: boolean
}

/**
 * Editor wizard events.
 */
export type EditorWizardEvent =
  | { type: 'LOAD'; filePath: string; spec: OpenAPIObject; yaml: string }
  | { type: 'LOAD_NEW'; yaml: string }
  | { type: 'UPDATE_SPEC'; spec: Partial<OpenAPIObject> }
  | { type: 'UPDATE_YAML'; yaml: string }
  | { type: 'NAVIGATE'; section: EditorSection }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'VALIDATE' }
  | { type: 'RESET' }
  | { type: 'DISCARD_CHANGES' }

/**
 * Initial context for the wizard.
 */
const initialContext: EditorWizardContext = {
  filePath: '',
  originalSpec: null,
  spec: null,
  yaml: '',
  isDirty: false,
  currentSection: 'info',
  validationErrors: [],
  isValid: false,
  errorMessage: null,
  isNew: false,
}

/**
 * Validate spec actor - performs validation.
 */
const validateSpecActor = fromPromise<
  { isValid: boolean; errors: ValidationError[] },
  { yaml: string }
>(async ({ input }) => {
  const { validateOpenAPI } = await import('@/lib/openapi/validator')
  const result = await validateOpenAPI(input.yaml)
  return {
    isValid: result.isValid,
    errors: result.errors || [],
  }
})

/**
 * Section order for navigation.
 */
const SECTION_ORDER: EditorSection[] = ['info', 'servers', 'paths', 'schemas', 'security', 'review']

/**
 * Get next section in order.
 */
function getNextSection(current: EditorSection): EditorSection {
  const index = SECTION_ORDER.indexOf(current)
  return index < SECTION_ORDER.length - 1 ? SECTION_ORDER[index + 1] : current
}

/**
 * Get previous section in order.
 */
function getPreviousSection(current: EditorSection): EditorSection {
  const index = SECTION_ORDER.indexOf(current)
  return index > 0 ? SECTION_ORDER[index - 1] : current
}

/**
 * Editor wizard state machine.
 *
 * Flow:
 * idle → loading → editing (info → servers → paths → schemas → security → review) → validating → saving → complete
 *                                                                                            ↘ error
 */
export const editorWizardMachine = setup({
  types: {
    context: {} as EditorWizardContext,
    events: {} as EditorWizardEvent,
  },
  actors: {
    validateSpec: validateSpecActor,
  },
  guards: {
    isDirty: ({ context }) => context.isDirty,
    isValid: ({ context }) => context.isValid,
    canGoNext: ({ context }) => {
      const index = SECTION_ORDER.indexOf(context.currentSection)
      return index < SECTION_ORDER.length - 1
    },
    canGoBack: ({ context }) => {
      const index = SECTION_ORDER.indexOf(context.currentSection)
      return index > 0
    },
    isReviewSection: ({ context }) => context.currentSection === 'review',
  },
}).createMachine({
  id: 'editorWizard',
  initial: 'idle',
  context: initialContext,
  states: {
    idle: {
      on: {
        LOAD: {
          target: 'editing',
          actions: assign({
            filePath: ({ event }) => event.filePath,
            originalSpec: ({ event }) => event.spec,
            spec: ({ event }) => event.spec,
            yaml: ({ event }) => event.yaml,
            isDirty: false,
            isNew: false,
            currentSection: 'info' as EditorSection,
            validationErrors: [],
            errorMessage: null,
          }),
        },
        LOAD_NEW: {
          target: 'editing',
          actions: assign({
            filePath: '',
            originalSpec: null,
            spec: null,
            yaml: ({ event }) => event.yaml,
            isDirty: true,
            isNew: true,
            currentSection: 'info' as EditorSection,
            validationErrors: [],
            errorMessage: null,
          }),
        },
      },
    },

    editing: {
      initial: 'active',
      states: {
        active: {
          on: {
            UPDATE_SPEC: {
              actions: assign({
                spec: ({ context, event }) =>
                  ({
                    ...context.spec,
                    ...event.spec,
                  }) as OpenAPIObject,
                isDirty: true,
              }),
            },
            UPDATE_YAML: {
              actions: assign({
                yaml: ({ event }) => event.yaml,
                isDirty: true,
              }),
            },
            NAVIGATE: {
              actions: assign({
                currentSection: ({ event }) => event.section,
              }),
            },
            NEXT: {
              actions: assign({
                currentSection: ({ context }) => getNextSection(context.currentSection),
              }),
              guard: 'canGoNext',
            },
            BACK: {
              actions: assign({
                currentSection: ({ context }) => getPreviousSection(context.currentSection),
              }),
              guard: 'canGoBack',
            },
            VALIDATE: {
              target: 'validating',
            },
            DISCARD_CHANGES: {
              actions: assign({
                spec: ({ context }) => context.originalSpec,
                yaml: '', // Will need to regenerate from originalSpec
                isDirty: false,
                validationErrors: [],
              }),
            },
          },
        },
        validating: {
          invoke: {
            id: 'validateSpec',
            src: 'validateSpec',
            input: ({ context }) => ({ yaml: context.yaml }),
            onDone: {
              target: 'active',
              actions: assign({
                isValid: ({ event }) => event.output.isValid,
                validationErrors: ({ event }) => event.output.errors,
              }),
            },
            onError: {
              target: 'active',
              actions: assign({
                isValid: false,
                validationErrors: ({ event }) => [
                  {
                    path: '/',
                    message:
                      event.error instanceof Error ? event.error.message : 'Validation failed',
                    severity: 'error' as const,
                  },
                ],
              }),
            },
          },
        },
      },
    },

    error: {
      on: {
        BACK: {
          target: 'editing',
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
export type EditorWizardState = 'idle' | 'editing' | 'error' | 'complete'

/**
 * Get human-readable section name.
 */
export function getSectionName(section: EditorSection): string {
  switch (section) {
    case 'info':
      return 'API Info'
    case 'servers':
      return 'Servers'
    case 'paths':
      return 'Endpoints'
    case 'schemas':
      return 'Schemas'
    case 'security':
      return 'Security'
    case 'review':
      return 'Review'
    default:
      return 'Unknown'
  }
}

/**
 * Get section number (1-indexed).
 */
export function getSectionNumber(section: EditorSection): number {
  const index = SECTION_ORDER.indexOf(section)
  return index === -1 ? 0 : index + 1
}

/**
 * Get total number of sections.
 */
export function getTotalSections(): number {
  return SECTION_ORDER.length
}

/**
 * Get all sections in order.
 */
export function getAllSections(): EditorSection[] {
  return [...SECTION_ORDER]
}
