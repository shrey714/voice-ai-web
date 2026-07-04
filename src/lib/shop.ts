import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { supabase } from './supabase';
import { Shop, OnlineProduct } from './types';

export function isShopOpen(shop: Shop): boolean {
  if (shop.manual_override === 'open') return true;
  if (shop.manual_override === 'closed') return false;
  const now = new Date();
  const day = now.getDay();
  const slot = shop.schedule.find(s => s.day === day);
  if (!slot) return false;
  const [oh, om] = slot.open.split(':').map(Number);
  const [ch, cm] = slot.close.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= oh * 60 + om && mins < ch * 60 + cm;
}

// Wrapped in React's cache() so a single request (e.g. generateMetadata +
// the page component both needing the same shop) only hits Supabase once.
export const fetchShop = cache(async (slug: string): Promise<Shop | null> => {
  const { data, error } = await supabase
    .from('online_shops')
    .select('*')
    .eq('shop_slug', slug)
    .single();
  if (error) console.error('[fetchShop]', error);
  return data ?? null;
});

export const fetchProducts = cache(async (shopId: string): Promise<OnlineProduct[]> => {
  const { data, error } = await supabase
    .from('online_products')
    .select('*')
    .eq('shop_id', shopId)
    .eq('is_visible', true);
  if (error) console.error('[fetchProducts]', error);
  return (data ?? []) as OnlineProduct[];
});

/**
 * Server-persisted, cross-request cache for the two browsing pages (shop
 * catalog + product detail). Plain `fetch()` defaults to no-store in this
 * Next.js version, and supabase-js's internal fetches don't opt in, so
 * `export const revalidate` alone does nothing here — `unstable_cache` is
 * the documented way to cache non-fetch data sources like a Supabase query.
 *
 * Checkout intentionally keeps using the raw `fetchShop`/`fetchProducts`
 * above instead of these — price/stock must be authoritative at checkout,
 * not up to 5s stale.
 *
 * Kept short (5s, not 30s) because this cache also holds `manual_override` —
 * a shopkeeper toggling their shop closed needs that to reach customers
 * fast, not just eventually. A stale "Open" is worse than stale stock counts:
 * it lets a customer order from a shop that just closed.
 */
export const getCachedShop = unstable_cache(
  (slug: string) => fetchShop(slug),
  ['shop-by-slug'],
  { revalidate: 5 },
);

export const getCachedProducts = unstable_cache(
  (shopId: string) => fetchProducts(shopId),
  ['products-by-shop'],
  { revalidate: 5 },
);
