'use client'
import { useEffect } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const CAP = 12

export interface RecentItem {
  productId: string
  slug: string
  name: string
  price: number
  image_url: string | null
  category?: string
}

interface RecentState {
  items: RecentItem[]
  add: (item: RecentItem) => void
  clear: () => void
}

const useRecentStore = create<RecentState>()(
  persist(
    set => ({
      items: [],
      add: item => set(state => ({
        items: [item, ...state.items.filter(i => i.productId !== item.productId)].slice(0, CAP),
      })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'sk-recently-viewed',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
)

/**
 * Recently-viewed products (across shops), persisted + shared. Same public API
 * as before: `items`, `add`, `clear`.
 */
export function useRecentlyViewed() {
  useEffect(() => { useRecentStore.persist.rehydrate() }, [])

  const items = useRecentStore(s => s.items)
  const add = useRecentStore(s => s.add)
  const clear = useRecentStore(s => s.clear)

  return { items, add, clear }
}
