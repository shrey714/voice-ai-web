'use client'
import { useEffect, useState } from 'react'
import { isShopOpen } from './shop'
import { Shop } from './types'

/**
 * Same as isShopOpen, but re-evaluates periodically so a shop that closes
 * (schedule boundary, or the owner flips manual_override) updates for anyone
 * who already has the page open, instead of only refreshing on next load.
 * A stale "open" here is what let closed-shop checkouts through before.
 *
 * Split into its own client-only module — src/lib/shop.ts is also imported
 * by Server Components (product/[productId]/page.tsx etc.), and a hook
 * using useState/useEffect can't live there without breaking that boundary.
 */
export function useIsShopOpen(shop: Shop | null | undefined): boolean {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])
  return !!shop && isShopOpen(shop)
}
