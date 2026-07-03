import { Store } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Branded full-screen loading state — pulsing logo with a spinning ring. */
export function BrandLoader({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('min-h-screen bg-background flex items-center justify-center', className)}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative size-16 flex items-center justify-center">
          <span className="absolute inset-0 rounded-2xl border-2 border-primary/20 border-t-primary animate-spin-slow" />
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-float animate-pulse-live">
            <Store size={22} />
          </span>
        </div>
        <div className="text-center">
          <p className="font-black text-foreground tracking-tight">ShopNear</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  )
}
