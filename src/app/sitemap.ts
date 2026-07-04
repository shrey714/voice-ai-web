import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { SITE_URL } from '@/lib/site'

export const revalidate = 3600 // regenerate hourly — catalog changes don't need to be instant here

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: shops } = await supabase
    .from('online_shops')
    .select('shop_slug, updated_at')
    .eq('is_enabled', true)

  const shopEntries: MetadataRoute.Sitemap = (shops ?? []).map(s => ({
    url: `${SITE_URL}/${s.shop_slug}`,
    lastModified: s.updated_at ?? undefined,
    changeFrequency: 'hourly',
    priority: 0.8,
  }))

  const { data: products } = await supabase
    .from('online_products')
    .select('product_id, shop_id, is_visible, online_shops!inner(shop_slug, is_enabled)')
    .eq('is_visible', true)
    .eq('online_shops.is_enabled', true)

  const productEntries: MetadataRoute.Sitemap = (products ?? []).map(p => {
    const shop = p.online_shops as unknown as { shop_slug: string }
    return {
      url: `${SITE_URL}/${shop.shop_slug}/product/${p.product_id}`,
      changeFrequency: 'daily',
      priority: 0.6,
    }
  })

  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    ...shopEntries,
    ...productEntries,
  ]
}
