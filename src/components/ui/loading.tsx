'use client'

import { cn } from '@/lib/utils'

interface SpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
}

export function Spinner({ className, size = 'md' }: SpinnerProps) {
  return (
    <svg
      className={cn('animate-spin text-muted-foreground', sizeClasses[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

interface LoadingProps {
  className?: string
  message?: string
}

export function Loading({ className, message = 'Loading...' }: LoadingProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 p-8', className)}>
      <Spinner size="lg" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Loading message="Loading page..." />
    </div>
  )
}

export function CardLoading() {
  return (
    <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
      <Spinner />
    </div>
  )
}
