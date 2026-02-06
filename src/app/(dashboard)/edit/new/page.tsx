'use client'

import { FileCode2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { EditorWizard } from '@/components/editor/editor-wizard'
import { getImportedSpec } from '@/lib/import-db'

/**
 * Page for creating a new API contract from imported/generated YAML.
 *
 * This page reads the token from URL search params and fetches the YAML
 * from IndexedDB (set by import wizard).
 *
 * If no token is provided or the spec is not found/expired, redirects to import.
 */
export default function NewContractPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [initialYaml, setInitialYaml] = useState<string | null>(null)
  const [suggestedFileName, setSuggestedFileName] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadSpec() {
      // No token in URL, redirect to import
      if (!token) {
        router.replace('/import')
        return
      }

      // Fetch spec from IndexedDB
      const imported = await getImportedSpec(token)

      if (!imported) {
        // Token not found or expired, redirect to import
        router.replace('/import')
        return
      }

      // Set the YAML (don't delete yet - wait for save)
      setInitialYaml(imported.yaml)
      setSuggestedFileName(imported.suggestedFileName)
      setIsLoading(false)
    }

    loadSpec()
  }, [router, token])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    )
  }

  // Should not happen, but handle edge case
  if (!initialYaml) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <Link href="/contracts" className="text-sm text-muted-foreground hover:text-foreground">
            Contracts
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm">New</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileCode2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">New API Contract</h1>
            <p className="text-muted-foreground">
              Review and refine your generated specification before saving.
            </p>
          </div>
        </div>
      </div>

      {/* Editor Wizard */}
      <EditorWizard
        isNew={true}
        initialYaml={initialYaml}
        suggestedFileName={suggestedFileName}
        importToken={token ?? undefined}
      />
    </div>
  )
}
