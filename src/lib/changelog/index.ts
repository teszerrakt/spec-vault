/**
 * Client-safe exports from changelog module.
 * 
 * NOTE: Do NOT export from './generator' here!
 * The generator uses 'openapi-diff' which has Node.js dependencies (fs, convict)
 * and cannot be bundled for client components.
 * 
 * Server actions should import directly from './generator':
 *   import { generateChangelog } from '@/lib/changelog/generator'
 */
export {
  formatChangeSummary,
  formatChangeDescription,
  groupChangesByCategory,
  getCategoryLabel,
  categorizeChange,
  mapActionToChangeType,
} from './formatter'
