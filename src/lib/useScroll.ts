'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Header scroll behavior:
 *  - `scrolled`: page has moved past a few px (→ add elevation/blur)
 *  - `hidden`:   user scrolled DOWN past a threshold (→ slide header away);
 *                becomes false again as soon as they scroll UP.
 */
export function useHeaderScroll(opts?: { delta?: number; revealAt?: number }) {
  const delta = opts?.delta ?? 6
  const revealAt = opts?.revealAt ?? 90
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const last = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    const update = () => {
      const y = Math.max(0, window.scrollY)
      setScrolled(y > 4)
      if (Math.abs(y - last.current) > delta) {
        setHidden(y > last.current && y > revealAt)
        last.current = y
      }
      ticking.current = false
    }
    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true
        requestAnimationFrame(update)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [delta, revealAt])

  return { hidden, scrolled }
}
