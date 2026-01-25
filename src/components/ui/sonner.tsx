'use client'

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: 'group toast',
          success:
            '!bg-emerald-50 !border-emerald-200 !text-emerald-900 dark:!bg-emerald-950 dark:!border-emerald-800 dark:!text-emerald-100',
          error:
            '!bg-red-50 !border-red-200 !text-red-900 dark:!bg-red-950 dark:!border-red-800 dark:!text-red-100',
          warning:
            '!bg-amber-50 !border-amber-200 !text-amber-900 dark:!bg-amber-950 dark:!border-amber-800 dark:!text-amber-100',
          description: '!text-inherit opacity-80',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
