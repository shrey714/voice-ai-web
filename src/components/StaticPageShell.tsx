'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Shared chrome for lightweight content pages (About/Help/Terms/Privacy) —
 * same header pattern as the other simple pages (Orders/Wishlist), so these
 * don't feel bolted-on next to the rest of the app.
 *
 * `icon` takes an already-rendered element (`<Store />`), not a component
 * reference — the page files stay Server Components (they export
 * `metadata`, which requires it), and a bare component reference is a
 * function, which can't cross the server→client boundary into this 'use
 * client' shell. A rendered element is a plain serializable React node, so
 * it's fine. */
export function StaticPageShell({
  title, icon, children,
}: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 liquid-glass-strong liquid-edge border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
          {/* Explicit destination, not router.back() — these pages are
              routinely opened directly (search engines, footer links opened
              in a new tab) with no history to return to. */}
          <Button variant="ghost" size="icon-sm" onClick={() => router.push('/')} className="text-muted-foreground -ml-1" aria-label="Back to home">
            <ArrowLeft size={18} />
          </Button>
          <div className="flex items-center gap-2">
            {icon}
            <h1 className="font-bold text-base text-foreground">{title}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="relative liquid-surface rounded-2xl border border-border p-5 sm:p-7 space-y-6 animate-fade-in">
          {children}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          Have a question we didn&apos;t cover? <Link href="/help" className="text-primary font-semibold hover:underline">Visit our Help Center</Link>.
        </p>
      </main>
    </div>
  )
}

export function StaticSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-bold text-[15px] text-foreground">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2.5">{children}</div>
    </section>
  )
}
