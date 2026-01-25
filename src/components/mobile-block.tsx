/**
 * Mobile block screen shown on devices with screen width < 1024px (lg breakpoint).
 * Uses pure CSS - no JavaScript needed.
 */
export function MobileBlock() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-8 text-center lg:hidden">
      <MonitorIcon className="h-16 w-16 text-muted-foreground" />
      <h1 className="mt-6 text-2xl font-bold">Desktop Required</h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        Spec Vault is designed for desktop browsers. Please open this application
        on a device with a larger screen.
      </p>
    </div>
  )
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}
