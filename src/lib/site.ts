/**
 * Canonical site URL — used for metadataBase, canonical links, sitemap,
 * robots.txt and Open Graph/JSON-LD absolute URLs.
 *
 * Set NEXT_PUBLIC_SITE_URL in Vercel's project env vars to your real
 * production domain (e.g. https://shopnear.app). Falls back to Vercel's
 * auto-injected preview URL, then localhost for local dev.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  ?? 'http://localhost:3000'
).replace(/\/+$/, '')

export const SITE_NAME = 'ShopNear'
