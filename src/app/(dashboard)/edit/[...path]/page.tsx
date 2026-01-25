import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getContract } from '@/actions/contracts'
import { EditorWizard } from '@/components/editor/editor-wizard'

interface EditContractPageProps {
  params: Promise<{ path: string[] }>
}

export async function generateMetadata({ params }: EditContractPageProps) {
  const { path } = await params
  const filePath = path.join('/')

  try {
    const contract = await getContract(filePath)
    return {
      title: `Edit ${contract.name} | Spec Vault`,
      description: `Edit ${contract.name} API contract`,
    }
  } catch {
    return {
      title: 'Contract Not Found | Spec Vault',
    }
  }
}

export default async function EditContractPage({ params }: EditContractPageProps) {
  const { path } = await params
  const filePath = path.join('/')

  let contract
  try {
    contract = await getContract(filePath)
  } catch {
    notFound()
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
          <Link
            href={`/contracts/${filePath}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {contract.name}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm">Edit</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Edit {contract.name}</h1>
        <p className="text-muted-foreground">
          Make changes to your API specification using the guided editor.
        </p>
      </div>

      {/* Editor Wizard */}
      <EditorWizard
        filePath={filePath}
        initialSpec={contract.spec}
        initialYaml={contract.rawYaml}
        isNew={false}
      />
    </div>
  )
}
