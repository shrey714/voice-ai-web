import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { fetchShop, fetchProducts } from '@/lib/shop'
import { Button } from '@/components/ui/button'
import { ProductDetailClient } from './ProductDetailClient'

// Product data is per-request (stock/price can change) — no static caching.
export const dynamic = 'force-dynamic'

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; productId: string }>
}) {
  const { slug, productId } = await params

  const shop = await fetchShop(slug)
  const products = shop ? await fetchProducts(shop.id) : []
  const product = products.find(p => p.product_id === productId)

  if (!shop || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <AlertCircle size={32} className="text-muted-foreground mx-auto" />
          <p className="font-bold text-foreground">Product not found</p>
          <p className="text-sm text-muted-foreground">This product may have been removed or is unavailable.</p>
          <Button asChild variant="secondary" size="sm">
            <Link href={shop ? `/${slug}` : '/'}>{shop ? 'Back to shop' : 'Back to shops'}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ProductDetailClient slug={slug} shop={shop} product={product} allProducts={products} />
  )
}
