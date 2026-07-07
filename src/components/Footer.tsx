'use client'
import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SHOWN_ON } from '@/components/BottomNav'

const THEMES = [
  { key: 'light',  label: 'Light',  Icon: Sun     },
  { key: 'dark',   label: 'Dark',   Icon: Moon    },
  { key: 'system', label: 'System', Icon: Monitor },
] as const

export function Footer() {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  // Avoid hydration mismatch — don't render active state until mounted
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Routes not covered by BottomNav (product/checkout/order-status — see the
  // allowlist comment in BottomNav.tsx) each render their own fixed bottom
  // bar instead. That bar has no in-flow spacer reserving room for it the
  // way BottomNav's own spacer protects the Footer above it, so on those
  // routes it was overlapping the last ~4.5rem of the Footer once scrolled
  // into view. Reserve that space here too, mobile-only (bars are md:hidden).
  const needsBottomBarSpace = !SHOWN_ON.includes(pathname) && pathname !== '/auth'

  return (
    <footer className={cn(
      'border-t border-border liquid-glass liquid-edge mt-8',
      needsBottomBarSpace && 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0',
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left — brand + copy */}
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
            <Store size={14} />
          </span>
          <div>
            <p className="text-xs font-bold text-foreground leading-tight">ShopNear</p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              © {new Date().getFullYear()} · Order from local shops near you
            </p>
          </div>
        </div>

        {/* Right — theme switcher */}
        <div
          className="flex items-center gap-0.5 p-1 rounded-xl liquid-surface"
          role="group"
          aria-label="Theme"
        >
          {THEMES.map(({ key, label, Icon }) => {
            const active = mounted && theme === key
            return (
              <button
                key={key}
                onClick={() => setTheme(key)}
                title={label}
                aria-pressed={active}
                className={cn(
                  'flex min-h-8 items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold liquid-glass-interactive',
                  active
                    ? 'liquid-btn [--liquid-tint:var(--primary)] text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </footer>
  )
}
