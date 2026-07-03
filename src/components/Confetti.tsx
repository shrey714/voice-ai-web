'use client'
import { useEffect, useState } from 'react'

const COLORS = ['var(--primary)', 'var(--chart-1)', 'var(--chart-2)', '#f5c542', '#f2683c']

/**
 * Lightweight CSS confetti burst — no dependencies. Renders ~40 pieces that
 * fall once, then unmounts itself. Respects reduced-motion (renders nothing).
 */
export function Confetti({ pieces = 44, duration = 3200 }: { pieces?: number; duration?: number }) {
  const [show, setShow] = useState(true)

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
      {Array.from({ length: pieces }).map((_, i) => {
        const left = Math.random() * 100
        const delay = Math.random() * 0.6
        const dur = 2.2 + Math.random() * 1.4
        const size = 6 + Math.random() * 6
        const color = COLORS[i % COLORS.length]
        const rounded = Math.random() > 0.5
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              top: '-6vh',
              left: `${left}%`,
              width: size,
              height: size * (rounded ? 1 : 1.6),
              background: color,
              borderRadius: rounded ? '9999px' : '2px',
              animation: `confetti-fall ${dur}s linear ${delay}s forwards`,
            }}
          />
        )
      })}
    </div>
  )
}
