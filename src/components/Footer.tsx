'use client'
import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Sun, Moon, Monitor, Store, ShieldCheck, BadgeCheck, Headset } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAllCarts } from '@/lib/cart'

// Top-level routes that aren't a `/[slug]` shop page — used to tell a shop
// slug apart from a reserved route using only the pathname's first segment.
const RESERVED_TOP_LEVEL = new Set(['about', 'addresses', 'auth', 'help', 'orders', 'privacy', 'terms', 'wishlist'])

const THEMES = [
  { key: 'light',  label: 'Light',  Icon: Sun     },
  { key: 'dark',   label: 'Dark',   Icon: Moon    },
  { key: 'system', label: 'System', Icon: Monitor },
] as const

const TRUST = [
  { Icon: ShieldCheck, label: 'Secure checkout' },
  { Icon: BadgeCheck,  label: 'Verified local shops' },
  { Icon: Headset,     label: 'Shop-direct support' },
] as const

const LINKS = [
  { href: '/about',   label: 'About' },
  { href: '/help',    label: 'Help Center' },
  { href: '/terms',   label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
] as const

export function Footer() {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const allCarts = useAllCarts()
  // Avoid hydration mismatch — don't render active state until mounted
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // BottomNav (4rem tall, mobile-only) is fixed and global, so Footer always
  // reserves at least that much bottom padding — otherwise the nav covers
  // Footer's last ~4rem once scrolled into view. Two routes stack a second
  // fixed bar *above* BottomNav (see ShopClient's floating cart bar and
  // ProductDetailClient's add-to-cart bar) and need extra clearance on top
  // of the base amount; every other route would just carry that extra as
  // unwanted empty space, so it's added only where it's actually needed.
  const extraBarRem = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    const isShopSlug = segments.length >= 1 && !RESERVED_TOP_LEVEL.has(segments[0])
    if (!isShopSlug) return 0
    const isProductDetail = segments.length === 3 && segments[1] === 'product'
    if (isProductDetail) return 4.75 // ProductDetailClient's sticky add-to-cart bar
    const isShopRoot = segments.length === 1
    if (isShopRoot && allCarts.some(c => c.slug === segments[0] && c.count > 0)) {
      return 7 // ShopClient's floating "View Cart" bar
    }
    return 0
  }, [pathname, allCarts])

  return (
    <footer className={cn(
      // `relative z-[-1]`: .liquid-glass's own backdrop-filter makes this
      // static element form its own stacking context. Chrome's compositor
      // then paints that layer above other fixed-position layers elsewhere
      // on the page (BottomNav, the per-page add-to-cart/cart bars) despite
      // their higher z-index — a backdrop-filter compositing quirk, not a
      // real stacking-order win. Explicit negative z-index (still above
      // DecorativeBlobs' -z-10 page background) forces correct paint order.
      // Custom property (not the property itself) is set inline so `md:pb-0`
      // — a plain class — can still win on desktop; an inline `paddingBottom`
      // would always beat it regardless of breakpoint.
      'relative z-[-1] border-t border-border liquid-glass liquid-edge pb-[calc(4rem+var(--footer-extra-pb)+env(safe-area-inset-bottom))] md:pb-0',
    )}
    style={{ '--footer-extra-pb': `${extraBarRem}rem` } as React.CSSProperties}
    >
      {/* Trust badges + link columns — kept to one slim row each so the
          footer stays compact (per earlier feedback) while still reading as
          a real storefront footer instead of just a brand strip. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3.5 flex flex-wrap items-center justify-center sm:justify-between gap-x-6 gap-y-2 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {TRUST.map(({ Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Icon size={13} className="text-primary shrink-0" /> {label}
            </span>
          ))}
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href} className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3.5">
        <div className="border-t border-border/60" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left — brand + copy */}
        <div className="flex items-center gap-2 sm:text-left">
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
