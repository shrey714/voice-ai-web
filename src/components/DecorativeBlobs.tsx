import { cn } from '@/lib/utils'

/**
 * Global backdrop — dotted texture + soft color blobs, fixed to the
 * viewport (not the page) so it reads as one continuous "material" behind
 * every screen instead of a hero-only flourish. Rendered once from the
 * root layout; individual pages don't add their own copy. Purely
 * cosmetic and non-interactive (aria-hidden, pointer-events-none), and
 * sits at a negative z-index behind the normal document flow — every
 * opaque or liquid-glass surface in the app paints on top of it, so it
 * only ever shows through in the actual background gaps and through
 * glass surfaces' own translucency, the same texture everywhere.
 */
export function DecorativeBlobs({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('fixed inset-0 -z-10 bg-background bg-aurora pointer-events-none overflow-hidden', className)}>
      <div className="bg-dots bg-fade-mask absolute inset-0 opacity-70" />
      <div className="blob size-72 -left-16 -top-24" style={{ background: 'var(--primary)' }} />
      <div className="blob size-64 right-[-10%] top-[-20%]" style={{ background: 'var(--chart-2)' }} />
      <div className="blob size-56 left-[40%] top-[30%]" style={{ background: 'color-mix(in oklch, var(--chart-1), transparent 20%)' }} />
    </div>
  )
}
