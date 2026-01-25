import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { ImportWizard } from '@/components/wizard/import-wizard'

export const metadata: Metadata = {
  title: 'Import API | API Contract Platform',
  description: 'Import and convert API documentation to OpenAPI specification',
}

interface ImportPageProps {
  searchParams: Promise<{
    type?: string
  }>
}

export default async function ImportPage({ searchParams }: ImportPageProps) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const params = await searchParams
  const sourceType = params.type as 'json' | 'csv' | 'excel' | 'image' | 'text' | undefined

  return <ImportWizard initialSourceType={sourceType} />
}
