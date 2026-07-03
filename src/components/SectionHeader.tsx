import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  /** small count/badge shown next to the title */
  badge?: React.ReactNode
  /** right-aligned action (e.g. a "See all" link/button) */
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  badge,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between gap-3 mb-4', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {Icon && (
            <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Icon size={14} strokeWidth={2.25} />
            </span>
          )}
          <h2 className="text-lg font-bold tracking-tight text-foreground truncate">{title}</h2>
          {badge}
        </div>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
