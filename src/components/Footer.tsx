'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

const THEMES = [
  { key: 'light',  label: 'Light',  Icon: Sun     },
  { key: 'dark',   label: 'Dark',   Icon: Moon    },
  { key: 'system', label: 'System', Icon: Monitor },
] as const

export function Footer() {
  const { theme, setTheme } = useTheme()
  // Avoid hydration mismatch — don't render active state until mounted
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <footer className="border-t border-border liquid-glass mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left — brand + copy */}
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
            <Store size={16} />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">ShopNear</p>
            <p className="text-xs text-muted-foreground leading-tight">
              © {new Date().getFullYear()} · Order from local shops near you
            </p>
          </div>
        </div>

        {/* Right — theme switcher */}
        <div
          className="flex items-center gap-0.5 p-1 rounded-xl border border-border bg-muted"
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
                  'flex min-h-9 items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150',
                  active
                    ? 'bg-card text-foreground shadow-sm'
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
