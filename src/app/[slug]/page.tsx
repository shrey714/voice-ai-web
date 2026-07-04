import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCachedShop, getCachedProducts } from '@/lib/shop'
import { SITE_URL } from '@/lib/site'
import { ShopClient } from './ShopClient'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const shop = await getCachedShop(slug)
  if (!shop) return { title: 'Shop not found' }

  const description = shop.description?.trim() || `Order from ${shop.shop_name} — fresh, fast, and delivered to your door.`
  return {
    title: shop.shop_name,
    description,
    alternates: { canonical: `/${slug}` },
    openGraph: { title: shop.shop_name, description, url: `/${slug}`, type: 'website' },
    twitter: { card: 'summary', title: shop.shop_name, description },
  }
}

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const shop = await getCachedShop(slug)
  if (!shop) notFound()

  const products = await getCachedProducts(shop.id)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: shop.shop_name,
    description: shop.description || undefined,
    url: `${SITE_URL}/${slug}`,
    address: shop.address_text ? { '@type': 'PostalAddress', streetAddress: shop.address_text } : undefined,
    geo: shop.latitude != null && shop.longitude != null
      ? { '@type': 'GeoCoordinates', latitude: shop.latitude, longitude: shop.longitude }
      : undefined,
  }

  return (
    <>
      {/* Escape "<" so a shop name/description containing "</script>" can't break out of the tag. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <ShopClient slug={slug} shop={shop} products={products} />
    </>
  )
}
