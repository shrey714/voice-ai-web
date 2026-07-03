import { cn } from '@/lib/utils'

/**
 * Decorative blurred color blobs + subtle dot texture for hero/section
 * backgrounds. Purely cosmetic and non-interactive (aria-hidden).
 */
export function DecorativeBlobs({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('bg-aurora pointer-events-none absolute inset-0 overflow-hidden z-0', className)}>
      <div className="bg-dots bg-fade-mask absolute inset-0 opacity-70" />
      <div className="blob size-72 -left-16 -top-24" style={{ background: 'var(--primary)' }} />
      <div className="blob size-64 right-[-10%] top-[-20%]" style={{ background: 'var(--chart-2)' }} />
      <div className="blob size-56 left-[40%] top-[30%]" style={{ background: 'color-mix(in oklch, var(--chart-1), transparent 20%)' }} />
    </div>
  )
}
