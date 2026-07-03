import Link from 'next/link'
import { Store } from 'lucide-react'
import { fetchShop, fetchProducts } from '@/lib/shop'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { ShopClient } from './ShopClient'

// Catalog is per-request (stock/price/visibility change) — no static caching.
export const dynamic = 'force-dynamic'

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const shop = await fetchShop(slug)
  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <EmptyState
          icon={Store}
          title="Shop not found"
          description="This link is invalid or the shop has been removed."
          action={
            <Button asChild variant="secondary">
              <Link href="/">← Back to Shops</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const products = await fetchProducts(shop.id)

  return <ShopClient slug={slug} shop={shop} products={products} />
}
