'use client'

import { useCallback, useEffect } from 'react'

export type KeyModifier = 'meta' | 'ctrl' | 'alt' | 'shift'

export interface KeyboardShortcut {
  /** The key to press (e.g., 's', 'Enter', 'Escape') */
  key: string
  /** Modifiers required (meta = Cmd on Mac, Ctrl on Windows) */
  modifiers?: KeyModifier[]
  /** Callback when shortcut is triggered */
  onTrigger: () => void
  /** Whether the shortcut is currently enabled (default: true) */
  enabled?: boolean
  /** Prevent default browser behavior (default: true) */
  preventDefault?: boolean
}

/**
 * Hook to register keyboard shortcuts
 *
 * @example
 * ```tsx
 * useKeyboardShortcut({
 *   key: 's',
 *   modifiers: ['meta'],
 *   onTrigger: handleSave,
 * })
 * ```
 */
export function useKeyboardShortcut(shortcut: KeyboardShortcut) {
  const { key, modifiers = [], onTrigger, enabled = true, preventDefault = true } = shortcut

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Check if the key matches (case-insensitive for letters)
      const keyMatches = event.key.toLowerCase() === key.toLowerCase() || event.code === key

      if (!keyMatches) return

      // Check modifiers
      const metaRequired = modifiers.includes('meta')
      const ctrlRequired = modifiers.includes('ctrl')
      const altRequired = modifiers.includes('alt')
      const shiftRequired = modifiers.includes('shift')

      // Meta key is Cmd on Mac, Ctrl on Windows/Linux
      const metaPressed = event.metaKey || event.ctrlKey
      const altPressed = event.altKey
      const shiftPressed = event.shiftKey

      // For 'meta' modifier, accept either metaKey or ctrlKey
      const _metaMatch = metaRequired
        ? metaPressed
        : (!event.metaKey && !event.ctrlKey) || ctrlRequired
      const ctrlMatch = ctrlRequired ? event.ctrlKey : true
      const altMatch = altRequired === altPressed
      const shiftMatch = shiftRequired === shiftPressed

      // Special handling: if only meta is required, don't require exact ctrl match
      const modifiersMatch = metaRequired
        ? metaPressed && altMatch && shiftMatch
        : ctrlMatch && altMatch && shiftMatch && !event.metaKey

      if (!modifiersMatch && modifiers.length > 0) return
      if (modifiers.length === 0 && (event.metaKey || event.ctrlKey || event.altKey)) return

      // Don't trigger if user is typing in an input field (unless Escape)
      const target = event.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      if (isInput && key.toLowerCase() !== 'escape') return

      if (preventDefault) {
        event.preventDefault()
      }

      onTrigger()
    },
    [key, modifiers, onTrigger, enabled, preventDefault]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])
}

/**
 * Hook to register multiple keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handlers = shortcuts.map(
      ({ key, modifiers = [], onTrigger, enabled = true, preventDefault = true }) => {
        const handler = (event: KeyboardEvent) => {
          if (!enabled) return

          const keyMatches = event.key.toLowerCase() === key.toLowerCase() || event.code === key

          if (!keyMatches) return

          const metaRequired = modifiers.includes('meta')
          const altRequired = modifiers.includes('alt')
          const shiftRequired = modifiers.includes('shift')

          const metaPressed = event.metaKey || event.ctrlKey
          const altPressed = event.altKey
          const shiftPressed = event.shiftKey

          const modifiersMatch = metaRequired
            ? metaPressed && altRequired === altPressed && shiftRequired === shiftPressed
            : !metaPressed && altRequired === altPressed && shiftRequired === shiftPressed

          if (!modifiersMatch && modifiers.length > 0) return
          if (modifiers.length === 0 && (event.metaKey || event.ctrlKey || event.altKey)) return

          const target = event.target as HTMLElement
          const isInput =
            target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

          if (isInput && key.toLowerCase() !== 'escape') return

          if (preventDefault) {
            event.preventDefault()
          }

          onTrigger()
        }

        window.addEventListener('keydown', handler)
        return handler
      }
    )

    return () => {
      handlers.forEach((handler) => {
        window.removeEventListener('keydown', handler)
      })
    }
  }, [shortcuts])
}

/**
 * Get the display key for the current platform
 * Returns '⌘' for Mac, 'Ctrl' for Windows/Linux
 */
export function getMetaKeyDisplay(): string {
  if (typeof window === 'undefined') return '⌘'
  return navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'
}

/**
 * Format a shortcut for display
 */
export function formatShortcut(key: string, modifiers: KeyModifier[] = []): string {
  const parts: string[] = []

  if (modifiers.includes('meta')) {
    parts.push(getMetaKeyDisplay())
  }
  if (modifiers.includes('ctrl') && !modifiers.includes('meta')) {
    parts.push('Ctrl')
  }
  if (modifiers.includes('alt')) {
    parts.push('Alt')
  }
  if (modifiers.includes('shift')) {
    parts.push('Shift')
  }

  // Format special keys
  const keyDisplay = key === 'Enter' ? '↵' : key === 'Escape' ? 'Esc' : key.toUpperCase()
  parts.push(keyDisplay)

  return parts.join('+')
}
