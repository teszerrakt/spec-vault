import Link from 'next/link'
import { auth, signOut } from '@/auth'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/contracts" className="mr-6 flex items-center space-x-2">
              <span className="font-bold">Spec Vault</span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link
                href="/contracts"
                className="text-foreground/60 transition-colors hover:text-foreground"
              >
                Contracts
              </Link>
              <Link
                href="/import"
                className="text-foreground/60 transition-colors hover:text-foreground"
              >
                Import
              </Link>
              <Link
                href="/settings"
                className="text-foreground/60 transition-colors hover:text-foreground"
              >
                Settings
              </Link>
            </nav>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              {session.user.name || session.user.email}
            </span>
            <form
              action={async () => {
                'use server'
                await signOut({ redirectTo: '/login' })
              }}
            >
              <Button variant="ghost" size="sm" type="submit">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">{children}</main>
    </div>
  )
}
