import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Signed-in-only / no-index-value pages — keep crawl budget on shop & product pages.
        disallow: ['/auth', '/orders', '/addresses', '/wishlist', '/*/checkout', '/*/order/*'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
