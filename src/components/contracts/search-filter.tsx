'use client'

import { useCallback, useRef, useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { getMetaKeyDisplay, useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'
import { cn } from '@/lib/utils'

interface SearchFilterProps {
  onSearch: (query: string) => void
  placeholder?: string
  className?: string
}

export function SearchFilter({
  onSearch,
  placeholder = 'Search contracts...',
  className,
}: SearchFilterProps) {
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setQuery(value)

      // Debounce search with transition
      startTransition(() => {
        onSearch(value)
      })
    },
    [onSearch]
  )

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  useKeyboardShortcut({
    key: 'k',
    modifiers: ['meta'],
    onTrigger: () => inputRef.current?.focus(),
  })

  return (
    <div className={cn('relative', className)}>
      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        className={cn('pl-9 pr-10', isPending && 'opacity-70')}
      />
      {isPending ? (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      ) : (
        <Kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {getMetaKeyDisplay()}K
        </Kbd>
      )}
    </div>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}
