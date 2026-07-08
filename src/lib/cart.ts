'use client'
import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { CartItem } from './types'

/**
 * Global cart store — one entry per shop (keyed by slug), persisted to
 * localStorage and shared across every component/tab. `useCart(slug)` keeps
 * the exact same public API as before, so consumers don't change.
 *
 * Multiple shops can have items sitting in their own basket at the same
 * time (no single-active-cart lock) — `shopNames` just remembers each
 * shop's display name so other pages can surface "N items waiting at X"
 * without an extra fetch.
 */
interface CartState {
  carts: Record<string, CartItem[]>
  shopNames: Record<string, string>
  addItem: (shopId: string, shopName: string, item: Omit<CartItem, 'quantity'>, qty?: number) => void
  updateQty: (shopId: string, productId: string, qty: number) => void
  clearCart: (shopId: string) => void
}

const useCartStore = create<CartState>()(
  persist(
    set => ({
      carts: {},
      shopNames: {},
      addItem: (shopId, shopName, item, qty = 1) => set(state => {
        const cur = state.carts[shopId] ?? []
        const existing = cur.find(i => i.productId === item.productId)
        const next = existing
          ? cur.map(i => i.productId === item.productId ? { ...i, quantity: i.quantity + qty } : i)
          : [...cur, { ...item, quantity: qty }]
        return {
          carts: { ...state.carts, [shopId]: next },
          shopNames: shopName ? { ...state.shopNames, [shopId]: shopName } : state.shopNames,
        }
      }),
      updateQty: (shopId, productId, qty) => set(state => {
        const cur = state.carts[shopId] ?? []
        const next = qty <= 0
          ? cur.filter(i => i.productId !== productId)
          : cur.map(i => i.productId === productId ? { ...i, quantity: qty } : i)
        return { carts: { ...state.carts, [shopId]: next } }
      }),
      clearCart: shopId => set(state => ({ carts: { ...state.carts, [shopId]: [] } })),
    }),
    {
      name: 'sk-cart',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // rehydrate on the client (avoids SSR mismatch)
    },
  ),
)

const EMPTY: CartItem[] = []

export function useCart(shopId: string, shopName = '') {
  // Load persisted state after the first client render (no hydration mismatch).
  useEffect(() => { useCartStore.persist.rehydrate() }, [])

  const items = useCartStore(s => s.carts[shopId] ?? EMPTY)
  const addItem = useCartStore(s => s.addItem)
  const updateQty = useCartStore(s => s.updateQty)
  const clearCart = useCartStore(s => s.clearCart)

  const total = useMemo(() => items.reduce((s, i) => s + i.price * i.quantity, 0), [items])
  const count = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items])

  return {
    items,
    addItem: (item: Omit<CartItem, 'quantity'>, qty = 1) => addItem(shopId, shopName, item, qty),
    updateQty: (productId: string, qty: number) => updateQty(shopId, productId, qty),
    clearCart: () => clearCart(shopId),
    total,
    count,
  }
}

/**
 * Imperative reorder: drop a past order's items straight into a shop's basket
 * without mounting `useCart(slug)` for that shop (the orders list shows many
 * shops at once, so a per-row hook isn't possible). Safe to call from an event
 * handler — the store is already rehydrated app-wide by BottomNav/Footer on
 * mount, so `getState()` reads the live persisted basket, not the empty initial
 * one. `addItem` merges quantities into whatever's already there.
 */
export function addItemsToCart(
  shopId: string,
  shopName: string,
  items: Array<Omit<CartItem, 'quantity'> & { quantity: number }>,
) {
  const { addItem } = useCartStore.getState()
  items.forEach(({ quantity, ...item }) => addItem(shopId, shopName, item, quantity))
}

export interface OtherCart {
  slug: string
  shopName: string
  count: number
  total: number
}

/** Non-empty baskets sitting at every *other* shop (for a "N items waiting at X" nudge). */
export function useOtherCarts(currentSlug: string): OtherCart[] {
  const all = useAllCarts()
  return useMemo(() => all.filter(c => c.slug !== currentSlug), [all, currentSlug])
}

/** Every shop with a non-empty basket (for a "N items in cart" chip on shop listings). */
export function useAllCarts(): OtherCart[] {
  useEffect(() => { useCartStore.persist.rehydrate() }, [])

  const carts = useCartStore(s => s.carts)
  const shopNames = useCartStore(s => s.shopNames)

  return useMemo(() => {
    return Object.entries(carts)
      .filter(([, items]) => items.length > 0)
      .map(([slug, items]) => ({
        slug,
        shopName: shopNames[slug] || slug,
        count: items.reduce((s, i) => s + i.quantity, 0),
        total: items.reduce((s, i) => s + i.price * i.quantity, 0),
      }))
  }, [carts, shopNames])
}
