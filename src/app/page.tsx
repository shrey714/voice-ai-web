'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryState, parseAsString } from 'nuqs'
import { supabase, getUser } from '@/lib/supabase'
import { isShopOpen } from '@/lib/shop'
import { Shop } from '@/lib/types'
import { useLocation } from '@/lib/location'
import { useAllCarts } from '@/lib/cart'
import { cn, seeded, hashString, distanceKm, formatDistance } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Carousel, CarouselContent, CarouselItem, type CarouselApi,
} from '@/components/ui/carousel'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SectionHeader } from '@/components/SectionHeader'
import { EmptyState } from '@/components/EmptyState'
import { RecentlyViewed } from '@/components/RecentlyViewed'
import { Reveal } from '@/components/Reveal'
import { useHeaderScroll } from '@/lib/useScroll'
import { useWishlist } from '@/lib/wishlist'
import { LocationChip } from '@/components/LocationChip'
import {
  Search, ShoppingBag, LogOut, Bike, Store, Sparkles, User,
  Clock, MapPin, Star, X, Heart, ShoppingBasket, TrendingUp, BadgePercent,
  LayoutGrid, Headphones, Shirt, Pizza, Pill, PencilRuler,
} from 'lucide-react'

/* ─────────────────────────── Promo hero carousel ────────────────────────── */
// The hero is deliberately the loud element on this page — a saturated
// gradient per slide with its own decorative shapes. It's the one place the
// quiet editorial treatment used everywhere else below is NOT wanted.
const PROMOS = [
  {
    tag: 'Local Shops, Delivered Fast',
    title: 'Groceries from your neighbourhood',
    subtitle: 'Fresh products from trusted local stores near you.',
    className: 'from-primary to-[color-mix(in_oklch,var(--primary),black_22%)]',
  },
  {
    tag: 'Fast Delivery',
    title: 'Everyday essentials in minutes',
    subtitle: 'Order now and skip the queue at your local store.',
    className: 'from-[oklch(0.55_0.13_260)] to-[oklch(0.4_0.11_265)]',
  },
  {
    tag: 'Support Local',
    title: 'Shop small, save big',
    subtitle: 'Exclusive deals from neighbourhood shops every day.',
    className: 'from-[oklch(0.58_0.14_25)] to-[oklch(0.42_0.12_20)]',
  },
]

function HeroCarousel() {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!api) return
    setCurrent(api.selectedScrollSnap())
    api.on('select', () => setCurrent(api.selectedScrollSnap()))
  }, [api])

  useEffect(() => {
    if (!api) return
    // WCAG 2.2.2: don't auto-advance for reduced-motion users, and pause on
    // hover/focus (via `paused`) or when the tab is backgrounded.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => {
      if (!paused && !document.hidden) api.scrollNext()
    }, 5000)
    return () => clearInterval(id)
  }, [api, paused])

  return (
    <div
      className="relative animate-fade-in"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <Carousel setApi={setApi} opts={{ loop: true }} className="overflow-hidden rounded-3xl">
        <CarouselContent>
          {PROMOS.map((p, i) => (
            <CarouselItem key={i}>
              {/* pb reserves the dot row's lane. Without it the subtitle wraps
                  to two lines at 375px and the last line runs straight through
                  the dots. */}
              <div className={cn('relative overflow-hidden bg-gradient-to-br text-white px-6 pt-6 pb-11 md:p-10 md:pb-12 h-full min-h-[168px] md:min-h-[200px] flex flex-col justify-center', p.className)}>
                <div className="relative z-10 max-w-lg">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Sparkles size={15} className="text-star" />
                    <span className="text-[11px] font-bold tracking-wide uppercase opacity-80">{p.tag}</span>
                  </div>
                  <h2 className="text-xl md:text-3xl font-black tracking-tight leading-tight mb-2">{p.title}</h2>
                  <p className="text-sm md:text-base opacity-80 leading-relaxed">{p.subtitle}</p>
                </div>
                <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10" />
                <div className="absolute right-6 bottom-[-30px] size-28 rounded-full bg-white/10" />
                <div className="absolute right-24 top-4 size-16 rounded-full bg-white/5" />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      {/* Dots — small visual, ≥44px tappable hit area via padding */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center z-10">
        {PROMOS.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={current === i ? 'true' : undefined}
            onClick={() => api?.scrollTo(i)}
            className="flex h-11 min-w-11 items-center justify-center px-0.5"
          >
            <span
              className={cn(
                'block h-1.5 rounded-full transition-all duration-300',
                current === i ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/70',
              )}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────── Category tabs (in header) ────────────────────── */
// Deep-links into the existing shop search (matches shop name/description) —
// a lightweight "browse" entry point rather than a real product-category
// filter, since shops (not products) are what this page lists.
//
// `term: ''` is the "All" tab — clearing the search *is* showing everything,
// so it needs no special-casing in the click handler or the active check.
//
// `tint` is the wayfinding colour from globals.css. Icons stay in full colour
// whether or not the tab is selected (that's what makes a category rail
// scannable — you find "Food" by its orange, not by reading six labels);
// selection is carried by opacity, label weight, and the sliding bar.
const BROWSE_CATEGORIES = [
  { label: 'All', Icon: LayoutGrid, term: '', tint: null },
  { label: 'Grocery', Icon: ShoppingBasket, term: 'grocery', tint: '--cat-grocery' },
  { label: 'Electronics', Icon: Headphones, term: 'electronics', tint: '--cat-electronics' },
  { label: 'Fashion', Icon: Shirt, term: 'fashion', tint: '--cat-fashion' },
  { label: 'Food', Icon: Pizza, term: 'food', tint: '--cat-food' },
  { label: 'Pharmacy', Icon: Pill, term: 'pharmacy', tint: '--cat-pharmacy' },
  { label: 'Stationery', Icon: PencilRuler, term: 'stationery', tint: '--cat-stationery' },
]

/**
 * Persistent category rail docked in the header. Not a `role="tablist"` —
 * these filter the shop list in place rather than swapping panels, so they're
 * toggle buttons with `aria-pressed` instead of tabs promising a tabpanel
 * relationship that doesn't exist.
 *
 * Free-text search (e.g. "milk") matches no tab, so nothing is highlighted —
 * including "All", which would otherwise be a lie about what's on screen.
 */
/** How far the sliding bar is inset from each edge of its tab, in px. */
const BAR_INSET = 8

function CategoryTabs({ active, onPick }: { active: string; onPick: (term: string) => void }) {
  const current = active.trim().toLowerCase()
  const activeIndex = BROWSE_CATEGORIES.findIndex(c => c.term === current)
  // The bar picks up the selected category's colour, so the moving element
  // and the tile it lands on read as the same object. "All" has no colour of
  // its own and falls back to `foreground`.
  const activeTint = activeIndex >= 0 ? BROWSE_CATEGORIES[activeIndex].tint : null

  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null)
  // Transitions stay off until the bar has been placed once, otherwise it
  // visibly flies in from x=0 on every load.
  const [slides, setSlides] = useState(false)

  // Measured rather than derived from the tab index: label widths differ per
  // category (and shift with the font swap), so any arithmetic guess drifts.
  useEffect(() => {
    const btn = btnRefs.current[activeIndex]
    // No tab matches (free-text search) — leave the bar where it was and let
    // the opacity class below fade it out, so it doesn't jump to 0 first.
    if (!btn) return
    const measure = () => setBar({
      left: btn.offsetLeft + BAR_INSET,
      width: Math.max(0, btn.offsetWidth - BAR_INSET * 2),
    })
    measure()
    // Catches the Inter font swap and any container resize, both of which
    // change offsetWidth after the initial measure.
    const ro = new ResizeObserver(measure)
    ro.observe(btn)
    return () => ro.disconnect()
  }, [activeIndex])

  useEffect(() => {
    if (!bar || slides) return
    const id = requestAnimationFrame(() => setSlides(true))
    return () => cancelAnimationFrame(id)
  }, [bar, slides])

  return (
    <div
      role="group"
      aria-label="Browse by category"
      className="relative flex gap-0.5 overflow-x-auto no-scrollbar -mx-4 px-2 sm:mx-0 sm:px-0"
    >
      {BROWSE_CATEGORIES.map(({ label, Icon, term, tint }, i) => {
        const isActive = current === term
        return (
          <button
            key={label}
            ref={el => { btnRefs.current[i] = el }}
            onClick={() => onPick(term)}
            aria-pressed={isActive}
            className={cn(
              'group relative flex shrink-0 flex-col items-center gap-1 rounded-t-lg px-3 pt-1 pb-1.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span
              className={cn(
                'flex size-8 items-center justify-center rounded-xl transition-all duration-200',
                isActive ? 'scale-105' : 'group-hover:scale-105',
              )}
              style={tint ? {
                background: `color-mix(in oklch, var(${tint}) ${isActive ? 20 : 12}%, transparent)`,
                color: `var(${tint})`,
              } : undefined}
            >
              <Icon size={19} strokeWidth={isActive ? 2.3 : 2} className={cn(!tint && 'text-current')} />
            </span>
            <span
              className={cn('whitespace-nowrap text-[11px] leading-none', isActive ? 'font-bold' : 'font-semibold')}
              style={isActive && tint ? { color: `var(${tint})` } : undefined}
            >
              {label}
            </span>
          </button>
        )
      })}

      {/* One shared bar that travels between tabs, rather than one per tab
          fading in/out — that's what makes the movement readable.
          `bottom-0`, not a negative offset: `overflow-x-auto` computes
          overflow-y to `auto` too, so anything below the box gets clipped.
          Being absolute inside the scroll container, it scrolls with the tabs. */}
      <span
        aria-hidden
        style={bar ? {
          transform: `translateX(${bar.left}px)`,
          width: bar.width,
          background: activeTint ? `var(${activeTint})` : 'var(--foreground)',
        } : undefined}
        className={cn(
          'pointer-events-none absolute bottom-0 left-0 h-[3px] rounded-full',
          slides && 'transition-[transform,width,opacity,background-color] duration-300 ease-out motion-reduce:transition-none',
          bar && activeIndex >= 0 ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  )
}

/* ──────────────────────────────── Offer rail ────────────────────────────── */
const OFFERS = [
  { Icon: Bike, title: 'Free delivery', subtitle: 'On orders above ₹499', tint: '--cat-grocery' },
  { Icon: Sparkles, title: 'New shops weekly', subtitle: 'More stores joining', tint: '--cat-electronics' },
  { Icon: Heart, title: 'Refer & save', subtitle: 'Share with a friend', tint: '--cat-fashion' },
]
// Was three stacked full-width panels costing 255px on a 375px screen — a
// quarter of the first scroll spent on copy nobody came for. As a horizontal
// rail it's ~76px and behaves like Blinkit's offer strip: peek the third card
// so the row reads as scrollable without needing an affordance.
function OfferRail() {
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto no-scrollbar px-4 pb-0.5 sm:mx-0 sm:px-0">
      {OFFERS.map(({ Icon, title, subtitle, tint }) => (
        <div
          key={title}
          className="flex w-[212px] shrink-0 items-center gap-3 rounded-2xl border border-border bg-card p-3"
        >
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `color-mix(in oklch, var(${tint}) 14%, transparent)`, color: `var(${tint})` }}
          >
            <Icon size={18} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold tracking-tight text-foreground">{title}</p>
            <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ────────────────────────────── Shop card ───────────────────────────────── */
function ShopCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Skeleton className="h-28 w-full rounded-none" />
      <div className="space-y-2 p-3.5">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <Skeleton className="h-8 w-full rounded-none" />
    </div>
  )
}

// Each shop gets a stable colour off the wayfinding ramp, seeded from its id
// so it never changes between renders or sessions. Shops have no photography
// in this schema, so colour + monogram is the only thing making a grid of
// them scannable — without it every card is an identical grey rectangle.
const SHOP_TINTS = [
  '--cat-grocery', '--cat-electronics', '--cat-fashion',
  '--cat-food', '--cat-pharmacy', '--cat-stationery',
]

function ShopCard({ shop, featured = false, distance = null, cartCount = 0 }: { shop: Shop; featured?: boolean; distance?: number | null; cartCount?: number }) {
  const open = isShopOpen(shop)
  const initial = shop.shop_name.charAt(0).toUpperCase()
  const rating = seeded(shop.id + 'r', 4.0, 4.9, 1)
  const eta = seeded(shop.id + 'e', 12, 35)
  // `hashString % len`, NOT `seeded(…, 0, len-1)`: seeded() rounds, so the
  // first and last buckets are half as wide as the middle ones and the ramp
  // collapses toward the centre — six shops in a row all came out indigo.
  const tint = SHOP_TINTS[hashString(shop.id + 't') % SHOP_TINTS.length]
  const outOfDeliveryRange = shop.delivery_enabled && shop.delivery_radius_km != null && distance != null && distance > shop.delivery_radius_km

  return (
    <Link
      href={`/${shop.shop_slug}`}
      aria-label={`${shop.shop_name} — ${open ? 'open' : 'closed'}, rated ${rating} out of 5`}
      className={cn(
        'group flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-card text-left transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.99]',
        'hover:border-primary hover:shadow-float',
        featured ? 'border-primary/40' : 'border-border',
      )}
    >
      {/* ── Banner ── */}
      <div
        className="relative h-28 shrink-0 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklch, var(${tint}) 30%, var(--card)), color-mix(in oklch, var(${tint}) 8%, var(--card)))`,
        }}
      >
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center text-5xl font-black tracking-tighter transition-transform duration-300 group-hover:scale-110"
          style={{ color: `color-mix(in oklch, var(${tint}) 55%, transparent)` }}
        >
          {initial}
        </span>

        {/* Scrim sits before the badges so they render on top of it — the
            rating still reads on a closed shop, which is exactly what you
            use to decide whether it's worth coming back for. */}
        {!open && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
            <span className="rounded-lg bg-foreground/85 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-background">
              Closed
            </span>
          </div>
        )}

        {featured && (
          <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-background">
            <Sparkles size={9} /> Featured
          </span>
        )}

        {/* Zomato-style solid rating chip. Rating is the single most-scanned
            value on a listing card, so it gets a filled block rather than
            competing as one more item in a grey meta row. */}
        <span className="absolute right-2.5 top-2.5 flex items-center gap-0.5 rounded-md bg-success px-1.5 py-0.5 text-[11px] font-black text-success-foreground shadow-sm">
          {rating}<Star size={9} className="fill-current" />
        </span>

        {/* The Blinkit/Zepto move: lead with time-to-door, not with the shop. */}
        {open && (
          <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-lg bg-background/95 px-2 py-1 text-[11px] font-black text-foreground shadow-sm backdrop-blur">
            <Bike size={11} className="text-primary" />{eta} min
          </span>
        )}

        {cartCount > 0 && (
          <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-[10px] font-black text-primary-foreground shadow-sm">
            <ShoppingBasket size={10} />{cartCount}
          </span>
        )}

      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="truncate text-[15px] font-extrabold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary">
          {shop.shop_name}
        </h3>
        {shop.description && (
          <p className="mt-1 truncate text-xs text-muted-foreground">{shop.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-semibold text-muted-foreground">
          {distance != null && (
            <span className="flex items-center gap-1"><MapPin size={10} strokeWidth={2} />{formatDistance(distance)}</span>
          )}
          {distance != null && shop.min_order_amount > 0 && <span aria-hidden className="text-border">•</span>}
          {shop.min_order_amount > 0 && <span>Min ₹{shop.min_order_amount}</span>}
          {!open && <span className="flex items-center gap-1"><Clock size={10} strokeWidth={2} />Reopens later</span>}
        </div>
      </div>

      {/* ── Offer strip ──
          The dashed rule is the Swiggy/Zomato coupon convention — it reads as
          "torn off" and separates a promise from the shop's own facts. */}
      {shop.delivery_enabled && (
        <div
          className={cn(
            'mt-auto flex items-center gap-1.5 border-t border-dashed px-3 py-2 text-[11px] font-extrabold',
            outOfDeliveryRange
              ? 'border-border bg-muted/60 text-muted-foreground'
              : 'border-primary/25 bg-primary/[0.07] text-primary-text',
          )}
        >
          {/* Kept to ~19 characters and `truncate`d: at the 2-up mobile width
              the card is ~165px, and anything longer wrapped this strip onto
              a second line and broke the card's bottom alignment. */}
          {outOfDeliveryRange
            ? <><Store size={11} strokeWidth={2.2} className="shrink-0" /><span className="truncate">Pickup only</span></>
            : <><BadgePercent size={11} strokeWidth={2.2} className="shrink-0" /><span className="truncate">Free delivery ₹499+</span></>}
        </div>
      )}
    </Link>
  )
}

/* ──────────────────────────────── Page ──────────────────────────────────── */
function HomePageInner() {
  const router = useRouter()
  const { hidden, scrolled } = useHeaderScroll()
  const wishlist = useWishlist()
  const { selected } = useLocation()
  const allCarts = useAllCarts()
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  // Shareable/bookmarkable/refresh-persistent, same reasoning as the shop
  // page's product search — see ShopClient.tsx's filterParsers comment.
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault('').withOptions({ history: 'replace', throttleMs: 300 }))

  const loadShops = () => {
    setLoading(true)
    setLoadError(false)
    ;(async () => {
      const [u, { data, error }] = await Promise.all([
        getUser(),
        supabase.from('online_shops').select('*').eq('is_enabled', true).order('shop_name'),
      ])
      if (error) console.error('[shops-fetch]', error)
      setUser(u)
      setShops(data ?? [])
      setLoadError(!!error)
      setLoading(false)
    })()
  }

  useEffect(loadShops, [])

  const customerCoords = selected?.latitude != null && selected?.longitude != null
    ? { latitude: selected.latitude, longitude: selected.longitude }
    : null

  const cartCountFor = (shop: Shop): number =>
    allCarts.find(c => c.slug === shop.shop_slug)?.count ?? 0

  const distanceFor = (shop: Shop): number | null =>
    customerCoords && shop.latitude != null && shop.longitude != null
      ? distanceKm(customerCoords, { latitude: shop.latitude, longitude: shop.longitude })
      : null

  const filtered = search.trim()
    ? shops.filter(s =>
        s.shop_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.description ?? '').toLowerCase().includes(search.toLowerCase()))
    : shops

  const sorted = customerCoords
    ? [...filtered].sort((a, b) => {
        const da = distanceFor(a)
        const db = distanceFor(b)
        if (da == null && db == null) return 0
        if (da == null) return 1
        if (db == null) return -1
        return da - db
      })
    : filtered

  const openShops = sorted.filter(s => isShopOpen(s))
  const closedShops = sorted.filter(s => !isShopOpen(s))
  // Same seeded rating ShopCard itself displays — sorted here just to pick
  // an order for this rail, not a new data source.
  const trendingShops = [...openShops]
    .sort((a, b) => seeded(b.id + 'r', 4.0, 4.9, 1) - seeded(a.id + 'r', 4.0, 4.9, 1))
    .slice(0, 6)

  return (
    <div className="relative min-h-screen">
      {/* ── Header ── */}
      <header className={cn(
        // Always liquid-glass-strong (same blur/opacity as BottomNav) —
        // it used to fall back to the weaker `.liquid-glass` at scroll-top,
        // which read as a visibly worse blur than the rest of the app's
        // fixed/sticky chrome.
        //
        // `fixed`, not `sticky` — backdrop-filter blur on a sticky element
        // doesn't repaint reliably while its stuck content scrolls
        // underneath (ghosting/stale blur in Safari and some Chrome
        // versions); `fixed` is what BottomNav already uses and renders
        // cleanly. The measured spacer right after `</header>` reserves its
        // flow height (it changes with `scrolled`, see above).
        'sticky top-0 z-40 border-b liquid-glass-strong liquid-edge transition-all duration-300',
        scrolled ? 'border-border shadow-soft' : 'border-transparent',
        hidden && '-translate-y-full',
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Shorter on mobile than on desktop: the sticky header was 171px
              tall on a 375px screen, a fifth of the viewport permanently
              spent on chrome. */}
          <div className={cn('flex items-center gap-3 transition-all duration-300', scrolled ? 'h-11 sm:h-14' : 'h-12 sm:h-16')}>
            <Link href="/" aria-label="ShopNear home" className="flex items-center gap-2 shrink-0">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Store size={17} />
              </span>
              <div className="hidden lg:block text-left leading-none">
                <span className="font-black text-[17px] text-foreground tracking-tight block">ShopNear</span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                  <MapPin size={9} /> Local shops near you
                </span>
              </div>
            </Link>

            <LocationChip className="shrink-0" />

            <div className={cn('flex-1 mx-auto transition-all duration-300 hidden sm:block', scrolled ? 'max-w-md' : 'max-w-2xl')} role="search">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  aria-label="Search shops"
                  placeholder="Search shops…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 h-10 rounded-xl"
                />
                {search && (
                  <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-1.5 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:backdrop-blur-md transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/wishlist')}
                className="rounded-full relative"
                aria-label="Wishlist"
              >
                <Heart size={16} className={cn(wishlist.count > 0 && 'fill-destructive text-destructive')} />
                {wishlist.count > 0 && (
                  <span key={wishlist.count} className="absolute -top-0.5 -right-0.5 size-4 bg-destructive text-destructive-foreground text-[9px] font-black rounded-full flex items-center justify-center animate-cart-pop">
                    {wishlist.count}
                  </span>
                )}
              </Button>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="rounded-full" aria-label="Account menu">
                      <User size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="truncate">My account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/orders')}>
                      <ShoppingBag size={15} /> My Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/addresses')}>
                      <MapPin size={15} /> My Addresses
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/wishlist')}>
                      <Heart size={15} /> My Wishlist
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={async () => { await supabase.auth.signOut(); setUser(null) }}
                    >
                      <LogOut size={15} /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button size="sm" onClick={() => router.push('/auth')} className="gap-1.5 rounded-xl">
                  <User size={14} /> Sign In
                </Button>
              )}
            </div>
          </div>

          {/* Mobile search row */}
          <div className="sm:hidden pb-2" role="search">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                aria-label="Search shops"
                placeholder="Search shops…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-10 rounded-xl"
              />
              {search && (
                <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-1.5 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:backdrop-blur-md transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Category rail — lives in the header (not the page body) so it
              stays reachable while scrolling the shop list, and so picking a
              category doesn't hide the control that set it. */}
          <CategoryTabs active={search} onPick={setSearch} />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl space-y-5 px-4 py-4 sm:px-6 lg:px-8">
        <h1 className="sr-only">Order from local shops near you</h1>
        {/* Browse-mode chrome — hidden while searching so results sit at the
            top of the page instead of below the fold.

            What used to live here: hero + a 255px promo panel + a stats row +
            a trust row = 534px, which pushed the first shop card to y=948 on
            an 812px screen. You scrolled a full viewport of marketing before
            seeing a single shop. The stats row duplicated the counts already
            in each section header, and the trust row duplicated the footer's
            three trust items verbatim — both are gone rather than restyled. */}
        {!search && (
          <>
            <HeroCarousel />
            <OfferRail />
            <RecentlyViewed title="Continue shopping" />
          </>
        )}

        {/* Trending shops — top-rated among already-loaded shops (client-side
            sort on the seeded rating used throughout, not a separate fetch). */}
        {!search && !loading && openShops.length > 1 && (
          <Reveal as="section">
            <SectionHeader title="Trending near you" icon={TrendingUp} />
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
              {trendingShops.map(shop => (
                <div key={shop.id} className="w-[172px] shrink-0 sm:w-56">
                  <ShopCard shop={shop} distance={distanceFor(shop)} cartCount={cartCountFor(shop)} />
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {/* Shops */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {[...Array(8)].map((_, i) => <ShopCardSkeleton key={i} />)}
          </div>
        ) : loadError ? (
          <EmptyState
            icon={Store}
            title="Couldn't load shops"
            description="Something went wrong while fetching nearby shops. Please try again."
            action={<Button variant="secondary" size="sm" onClick={loadShops}>Retry</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Store}
            title={search ? 'No shops match your search' : 'No shops available'}
            description={search ? `We couldn't find anything for "${search}".` : 'New shops are joining soon — check back later!'}
            action={search ? <Button variant="secondary" size="sm" onClick={() => setSearch('')}>Clear search</Button> : undefined}
          />
        ) : (
          <div className="space-y-10">
            {openShops.length > 0 && (
              <Reveal as="section">
                <SectionHeader
                  title="Open Now"
                  icon={Sparkles}
                  badge={<Badge variant="open" className="text-[10px]"><span className="size-1.5 bg-success rounded-full animate-pulse-live" />{openShops.length}</Badge>}
                />
                <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                  {openShops.map((shop, i) => <ShopCard key={shop.id} shop={shop} featured={i === 0} distance={distanceFor(shop)} cartCount={cartCountFor(shop)} />)}
                </div>
              </Reveal>
            )}
            {closedShops.length > 0 && (
              <Reveal as="section">
                <SectionHeader
                  title="Closed Now"
                  subtitle="Will reopen during scheduled hours"
                  icon={Clock}
                  badge={<Badge variant="secondary" className="text-[10px]">{closedShops.length}</Badge>}
                />
                {/* The dimming that used to live here now sits on the card
                    itself (`!open && opacity-80`), so it isn't applied twice. */}
                <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                  {closedShops.map(shop => <ShopCard key={shop.id} shop={shop} distance={distanceFor(shop)} cartCount={cartCountFor(shop)} />)}
                </div>
              </Reveal>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  )
}
