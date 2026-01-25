import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { ImportWizard } from '@/components/wizard/import-wizard'

export const metadata: Metadata = {
  title: 'Import API | API Contract Platform',
  description: 'Import and convert API documentation to OpenAPI specification',
}

export default async function ImportPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return <ImportWizard />
}
