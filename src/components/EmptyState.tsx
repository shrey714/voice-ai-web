import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  /** subtle = smaller padding for in-card use */
  size?: 'default' | 'sm'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = 'default',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center animate-fade-in',
        size === 'default' ? 'py-20' : 'py-10',
        className,
      )}
    >
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full bg-muted mb-5',
          size === 'default' ? 'size-20' : 'size-14',
        )}
      >
        <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse-live" />
        <Icon
          className={cn('text-muted-foreground relative', size === 'default' ? 'size-8' : 'size-6')}
          strokeWidth={1.75}
        />
      </div>
      <h3 className={cn('font-semibold text-foreground', size === 'default' ? 'text-lg' : 'text-base')}>
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
