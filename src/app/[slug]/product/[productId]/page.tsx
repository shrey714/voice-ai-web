import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCachedShop, getCachedProducts } from '@/lib/shop'
import { SITE_URL } from '@/lib/site'
import { ProductDetailClient } from './ProductDetailClient'

async function loadProduct(slug: string, productId: string) {
  const shop = await getCachedShop(slug)
  const products = shop ? await getCachedProducts(shop.id) : []
  const product = products.find(p => p.product_id === productId) ?? null
  return { shop, products, product }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; productId: string }>
}): Promise<Metadata> {
  const { slug, productId } = await params
  const { shop, product } = await loadProduct(slug, productId)
  if (!shop || !product) return { title: 'Product not found' }

  const price = product.online_price ?? product.store_price ?? 0
  const description = `${product.name} — ${price > 0 ? `₹${price}` : 'available'} at ${shop.shop_name}. Order online for fast local delivery.`
  const url = `/${slug}/product/${productId}`

  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: product.name,
      description,
      url,
      type: 'website',
      images: product.image_url ? [{ url: product.image_url }] : undefined,
    },
    twitter: {
      card: product.image_url ? 'summary_large_image' : 'summary',
      title: product.name,
      description,
      images: product.image_url ? [product.image_url] : undefined,
    },
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; productId: string }>
}) {
  const { slug, productId } = await params
  const { shop, products, product } = await loadProduct(slug, productId)

  if (!shop || !product) notFound()

  const price = product.online_price ?? product.store_price ?? 0
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image_url || undefined,
    description: `${product.name} available at ${shop.shop_name}`,
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: 'INR',
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.quantity > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/${slug}/product/${productId}`,
      seller: { '@type': 'LocalBusiness', name: shop.shop_name },
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <ProductDetailClient slug={slug} shop={shop} product={product} allProducts={products} />
    </>
  )
}
