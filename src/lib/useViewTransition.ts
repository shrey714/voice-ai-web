'use client'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

/**
 * Navigate immediately — no waiting on data or transitions. The destination
 * route's `loading.tsx` skeleton shows right away and swaps in once the
 * server response arrives. `push`/`back` accept the same call signature as
 * before so existing call sites don't need to change.
 */
export function useViewTransition() {
  const router = useRouter()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept so call sites passing a source element (for the transition version of this API) don't need to change
  const push = useCallback((href: string, _sourceEl?: HTMLElement | null) => {
    router.push(href)
  }, [router])

  const back = useCallback(() => {
    router.back()
  }, [router])

  const prefetch = useCallback((href: string) => {
    try { router.prefetch(href) } catch { /* ignore */ }
  }, [router])

  return { push, back, prefetch }
}
