'use client'
import { useEffect } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface WishlistItem {
  productId: string
  slug: string
  name: string
  price: number
  image_url: string | null
  unit?: string
  category?: string
}

interface WishlistState {
  items: WishlistItem[]
  toggle: (item: WishlistItem) => void
  remove: (productId: string) => void
}

const useWishlistStore = create<WishlistState>()(
  persist(
    set => ({
      items: [],
      toggle: item => set(state => {
        const exists = state.items.some(i => i.productId === item.productId)
        return {
          items: exists
            ? state.items.filter(i => i.productId !== item.productId)
            : [item, ...state.items],
        }
      }),
      remove: productId => set(state => ({
        items: state.items.filter(i => i.productId !== productId),
      })),
    }),
    {
      name: 'sk-wishlist',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
)

/**
 * Global wishlist (across shops), persisted + shared across all components and
 * tabs. Same public API as before: `items`, `toggle`, `remove`, `has`, `count`.
 */
export function useWishlist() {
  useEffect(() => { useWishlistStore.persist.rehydrate() }, [])

  const items = useWishlistStore(s => s.items)
  const toggle = useWishlistStore(s => s.toggle)
  const remove = useWishlistStore(s => s.remove)

  return {
    items,
    toggle,
    remove,
    has: (productId: string) => items.some(i => i.productId === productId),
    count: items.length,
  }
}
