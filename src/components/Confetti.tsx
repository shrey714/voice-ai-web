'use client'
import { useEffect, useMemo, useState } from 'react'

const COLORS = ['var(--primary)', 'var(--chart-1)', 'var(--chart-2)', '#f5c542', '#f2683c']

interface Piece {
  left: number
  delay: number
  dur: number
  size: number
  color: string
  rounded: boolean
}

/**
 * Lightweight CSS confetti burst — no dependencies. Renders ~40 pieces that
 * fall once, then unmounts itself. Respects reduced-motion (renders nothing).
 */
export function Confetti({ pieces = 44, duration = 3200 }: { pieces?: number; duration?: number }) {
  const [show, setShow] = useState(true)

  // Randomized once per mount (not per render) so re-renders while the burst
  // is on screen don't reshuffle piece positions mid-fall.
  /* eslint-disable react-hooks/purity -- one-time randomization is intentional, see comment above */
  const pieceData = useMemo<Piece[]>(() => Array.from({ length: pieces }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    dur: 2.2 + Math.random() * 1.4,
    size: 6 + Math.random() * 6,
    color: COLORS[i % COLORS.length],
    rounded: Math.random() > 0.5,
  })), [pieces])
  /* eslint-enable react-hooks/purity */

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShow(false)
      return
    }
    const t = setTimeout(() => setShow(false), duration)
    return () => clearTimeout(t)
  }, [duration])

  if (!show) return null

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieceData.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: '-6vh',
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.rounded ? 1 : 1.6),
            background: p.color,
            borderRadius: p.rounded ? '9999px' : '2px',
            animation: `confetti-fall ${p.dur}s linear ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  )
}
