import { type DBSchema, type IDBPDatabase, openDB } from 'idb'

const DB_NAME = 'spec-vault-imports'
const DB_VERSION = 1
const STORE_NAME = 'imported-specs'
const EXPIRATION_MS = 60 * 60 * 1000 // 1 hour

/**
 * Schema for the imported specs IndexedDB store
 */
interface ImportedSpec {
  token: string
  yaml: string
  suggestedFileName?: string
  expiresAt: number
}

interface ImportDBSchema extends DBSchema {
  [STORE_NAME]: {
    key: string
    value: ImportedSpec
    indexes: {
      'by-expiration': number
    }
  }
}

/**
 * Get or create the IndexedDB database
 */
async function getDB(): Promise<IDBPDatabase<ImportDBSchema>> {
  return openDB<ImportDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'token' })
        store.createIndex('by-expiration', 'expiresAt')
      }
    },
  })
}

/**
 * Store an imported spec in IndexedDB and return a token for retrieval.
 *
 * @param yaml - The OpenAPI YAML content
 * @param suggestedFileName - Optional suggested file name for saving
 * @returns A unique token to retrieve the spec
 */
export async function storeImportedSpec(yaml: string, suggestedFileName?: string): Promise<string> {
  const db = await getDB()
  const token = crypto.randomUUID()
  const expiresAt = Date.now() + EXPIRATION_MS

  await db.put(STORE_NAME, {
    token,
    yaml,
    suggestedFileName,
    expiresAt,
  })

  return token
}

/**
 * Retrieve an imported spec by token.
 *
 * Returns null if the token is not found or the spec has expired.
 * Does NOT delete the spec - call deleteImportedSpec after successful save.
 *
 * @param token - The token from the URL
 * @returns The spec data or null if not found/expired
 */
export async function getImportedSpec(
  token: string
): Promise<{ yaml: string; suggestedFileName?: string } | null> {
  const db = await getDB()
  const spec = await db.get(STORE_NAME, token)

  if (!spec) {
    return null
  }

  // Check if expired
  if (spec.expiresAt < Date.now()) {
    // Clean up expired entry
    await db.delete(STORE_NAME, token)
    return null
  }

  return {
    yaml: spec.yaml,
    suggestedFileName: spec.suggestedFileName,
  }
}

/**
 * Delete an imported spec after successful save.
 *
 * @param token - The token to delete
 */
export async function deleteImportedSpec(token: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, token)
}

/**
 * Clean up all expired specs from IndexedDB.
 *
 * Call this on app load to garbage collect old entries.
 */
export async function cleanupExpiredSpecs(): Promise<void> {
  const db = await getDB()
  const now = Date.now()

  // Use a cursor to iterate through expired entries
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const index = tx.store.index('by-expiration')

  // Get all entries where expiresAt < now
  let cursor = await index.openCursor(IDBKeyRange.upperBound(now))

  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }

  await tx.done
}
