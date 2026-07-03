import { Skeleton } from '@/components/ui/skeleton'

function ProductCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <Skeleton className="w-full aspect-square rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-8 w-16 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

/** Suspense fallback while the server fetches the shop + catalog. */
export default function LoadingShop() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-14">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="size-9 rounded-xl" />
            <Skeleton className="h-4 w-40" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-xl" />
            </div>
          </div>
          <div className="pb-3">
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex gap-0 lg:gap-6 py-4">
        <aside className="hidden lg:block w-52 xl:w-56 shrink-0 space-y-4">
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </aside>
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
