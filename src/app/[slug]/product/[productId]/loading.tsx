import { Skeleton } from '@/components/ui/skeleton'

/**
 * Suspense fallback while the server fetches product data. The gallery box
 * carries `view-transition-name: product-hero`, so a card→detail View
 * Transition always has a landing target even before the data streams in.
 */
export default function LoadingProduct() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 w-40" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Gallery — shared morph target */}
        <div className="md:sticky md:top-20 md:self-start">
          <Skeleton
            className="aspect-square w-full rounded-3xl"
            style={{ viewTransitionName: 'product-hero' } as React.CSSProperties}
          />
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="rounded-2xl border border-border p-4 space-y-3">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="hidden md:flex gap-4">
            <Skeleton className="h-12 w-32 rounded-xl" />
            <Skeleton className="h-12 flex-1 rounded-xl" />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        </div>
      </div>
    </div>
  )
}
