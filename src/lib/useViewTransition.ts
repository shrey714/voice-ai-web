'use client'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

/**
 * Navigate immediately — no waiting on data or transitions. The destination
 * route's `loading.tsx` skeleton shows right away and swaps in once the
 * server response arrives. `push` accepts the same call signature as before
 * so existing call sites don't need to change.
 *
 * No `back()` here on purpose — a history-based back is unsafe on pages that
 * are routinely opened via a direct/shared link (no history entry to return
 * to). Every call site now navigates to an explicit, known destination
 * instead (e.g. a product page's back button goes to `/${slug}`, not
 * `router.back()`) — see ProductDetailClient.tsx.
 */
export function useViewTransition() {
  const router = useRouter()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept so call sites passing a source element (for the transition version of this API) don't need to change
  const push = useCallback((href: string, _sourceEl?: HTMLElement | null) => {
    router.push(href)
  }, [router])

  const prefetch = useCallback((href: string) => {
    try { router.prefetch(href) } catch { /* ignore */ }
  }, [router])

  return { push, prefetch }
}
