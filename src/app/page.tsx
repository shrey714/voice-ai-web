'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getUser } from '@/lib/supabase'
import { isShopOpen } from '@/lib/shop'
import { Shop } from '@/lib/types'
import { useLocation } from '@/lib/location'
import { useAllCarts } from '@/lib/cart'
import { cn, seeded, distanceKm, formatDistance } from '@/lib/utils'
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
import { DecorativeBlobs } from '@/components/DecorativeBlobs'
import { RecentlyViewed } from '@/components/RecentlyViewed'
import { Reveal } from '@/components/Reveal'
import { useHeaderScroll } from '@/lib/useScroll'
import { useWishlist } from '@/lib/wishlist'
import { useViewTransition } from '@/lib/useViewTransition'
import { LocationChip } from '@/components/LocationChip'
import {
  Search, ShoppingBag, LogOut, Bike, Store, Sparkles, User,
  ArrowRight, Clock, ShieldCheck, MapPin, Star, X, Heart, ShoppingBasket,
} from 'lucide-react'

/* ─────────────────────────── Promo hero carousel ────────────────────────── */
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

  useEffect(() => {
    if (!api) return
    setCurrent(api.selectedScrollSnap())
    api.on('select', () => setCurrent(api.selectedScrollSnap()))
  }, [api])

  useEffect(() => {
    if (!api) return
    const id = setInterval(() => api.scrollNext(), 5000)
    return () => clearInterval(id)
  }, [api])

  return (
    <div className="relative animate-fade-in">
      <Carousel setApi={setApi} opts={{ loop: true }} className="overflow-hidden rounded-3xl">
        <CarouselContent>
          {PROMOS.map((p, i) => (
            <CarouselItem key={i}>
              <div className={cn('relative overflow-hidden bg-gradient-to-br text-white p-6 md:p-10 h-full min-h-[168px] md:min-h-[200px] flex flex-col justify-center', p.className)}>
                <div className="relative z-10 max-w-lg">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Sparkles size={15} className="text-yellow-300" />
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
      {/* Dots */}
      <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
        {PROMOS.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => api?.scrollTo(i)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              current === i ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/70',
            )}
          />
        ))}
      </div>
    </div>
  )
}

/* ────────────────────────────── Trust strip ─────────────────────────────── */
const TRUST = [
  { Icon: Bike, label: 'Fast local delivery' },
  { Icon: ShieldCheck, label: 'Trusted shops' },
  { Icon: Clock, label: 'Live open hours' },
]
function TrustStrip() {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
      {TRUST.map(({ Icon, label }) => (
        <div key={label} className="flex items-center gap-2.5 rounded-2xl border border-border bg-card px-3 py-3">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Icon size={16} />
          </span>
          <span className="text-xs sm:text-sm font-semibold text-foreground leading-tight">{label}</span>
        </div>
      ))}
    </div>
  )
}

/* ────────────────────────────── Shop card ───────────────────────────────── */
function ShopCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <Skeleton className="h-24 w-full rounded-none" />
      <div className="p-4 space-y-2.5">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-9 w-full rounded-xl mt-3" />
      </div>
    </div>
  )
}

function ShopCard({ shop, onClick, featured = false, distance = null, cartCount = 0 }: { shop: Shop; onClick: () => void; featured?: boolean; distance?: number | null; cartCount?: number }) {
  const vt = useViewTransition()
  const open = isShopOpen(shop)
  const initial = shop.shop_name.charAt(0).toUpperCase()
  const rating = seeded(shop.id + 'r', 4.0, 4.9, 1)
  const eta = seeded(shop.id + 'e', 12, 35)
  const outOfDeliveryRange = shop.delivery_enabled && shop.delivery_radius_km != null && distance != null && distance > shop.delivery_radius_km

  return (
    <button
      onClick={onClick}
      onPointerEnter={() => vt.prefetch(`/${shop.shop_slug}`)}
      className={cn(
        'group text-left rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-float hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.99] w-full',
        featured ? 'border-gradient shadow-soft' : 'border border-border bg-card hover:border-primary/30',
      )}
    >
      {/* Banner */}
      <div className={cn(
        'h-24 flex items-center justify-center relative overflow-hidden',
        open ? 'bg-gradient-to-br from-primary/15 to-primary/5' : 'bg-muted',
      )}>
        <span className={cn(
          'text-4xl font-black tracking-tighter transition-transform duration-300 group-hover:scale-110',
          open ? 'text-primary' : 'text-muted-foreground',
        )}>
          {initial}
        </span>
        <Badge variant={open ? 'open' : 'closed'} className="absolute top-2.5 right-2.5 text-[11px]">
          <span className={cn('size-1.5 rounded-full', open ? 'bg-success animate-pulse-live' : 'bg-muted-foreground')} />
          {open ? 'Open' : 'Closed'}
        </Badge>
        {featured && (
          <Badge variant="default" className="absolute top-2.5 left-2.5 text-[10px] gap-1"><Sparkles size={10} /> Featured</Badge>
        )}
        {cartCount > 0 && (
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 shadow-sm">
            <ShoppingBasket size={10} /> {cartCount} in cart
          </div>
        )}
        {open && (
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-background/90 backdrop-blur px-2 py-0.5 text-[11px] font-bold text-foreground shadow-sm">
            <Star size={10} className="fill-star text-star" />
            {rating}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-bold text-[15px] text-foreground leading-tight mb-1 truncate group-hover:text-primary transition-colors">
          {shop.shop_name}
        </h3>
        {shop.description && (
          <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2 min-h-8">{shop.description}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap text-[11px] mb-3.5">
          {shop.delivery_enabled && (
            outOfDeliveryRange ? (
              <span className="flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 font-semibold">
                <Store size={11} /> Pickup only
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-primary/8 text-primary px-2 py-0.5 font-semibold">
                <Bike size={11} /> Delivery
              </span>
            )
          )}
          {open && (
            <span className="flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 font-semibold">
              <Clock size={10} /> {eta} min
            </span>
          )}
          {shop.min_order_amount > 0 && (
            <span className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 font-semibold">Min ₹{shop.min_order_amount}</span>
          )}
          {distance != null && (
            <span className="flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 font-semibold">
              <MapPin size={10} /> {formatDistance(distance)}
            </span>
          )}
        </div>
        <div className={cn(
          'flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200',
          open
            ? 'bg-primary text-primary-foreground group-hover:brightness-110'
            : 'bg-muted text-muted-foreground',
        )}>
          <span>{open ? 'Order Now' : 'Currently Closed'}</span>
          {open && <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />}
        </div>
      </div>
    </button>
  )
}

/* ──────────────────────────────── Page ──────────────────────────────────── */
export default function HomePage() {
  const router = useRouter()
  const vt = useViewTransition()
  const { hidden, scrolled } = useHeaderScroll()
  const wishlist = useWishlist()
  const { selected } = useLocation()
  const allCarts = useAllCarts()
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    (async () => {
      const [u, { data }] = await Promise.all([
        getUser(),
        supabase.from('online_shops').select('*').eq('is_enabled', true).order('shop_name'),
      ])
      setUser(u)
      setShops(data ?? [])
      setLoading(false)
    })()
  }, [])

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

  return (
    <div className="relative min-h-screen">
      <DecorativeBlobs className="h-[560px] bottom-auto" />
      {/* ── Header ── */}
      <header className={cn(
        'sticky top-0 z-40 border-b transition-all duration-300 will-change-transform',
        scrolled ? 'glass-strong border-border shadow-soft' : 'glass border-transparent',
        hidden && '-translate-y-full',
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={cn('flex items-center gap-3 transition-all duration-300', scrolled ? 'h-14' : 'h-16')}>
            <button onClick={() => router.push('/')} className="flex items-center gap-2 shrink-0">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Store size={17} />
              </span>
              <div className="hidden lg:block text-left leading-none">
                <span className="font-black text-[17px] text-foreground tracking-tight block">ShopNear</span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                  <MapPin size={9} /> Local shops near you
                </span>
              </div>
            </button>

            <LocationChip className="shrink-0" />

            <div className={cn('flex-1 mx-auto transition-all duration-300 hidden sm:block', scrolled ? 'max-w-md' : 'max-w-2xl')}>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search shops…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 h-10 rounded-xl"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
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
          <div className="sm:hidden pb-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search shops…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-10 rounded-xl"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <HeroCarousel />
        <TrustStrip />
        {!search && <RecentlyViewed title="Continue shopping" />}

        {/* Stats */}
        {!loading && shops.length > 0 && (
          <div className="grid grid-cols-3 gap-3 animate-fade-in">
            {[
              { label: 'Shops', value: shops.length },
              { label: 'Open Now', value: shops.filter(s => isShopOpen(s)).length },
              { label: 'With Delivery', value: shops.filter(s => s.delivery_enabled).length },
            ].map(stat => (
              <div key={stat.label} className="rounded-2xl border border-border bg-card p-4 text-center">
                <p className="text-2xl sm:text-3xl font-black text-primary tracking-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Shops */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <ShopCardSkeleton key={i} />)}
          </div>
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
                <div className="stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {openShops.map((shop, i) => <ShopCard key={shop.id} shop={shop} featured={i === 0} distance={distanceFor(shop)} cartCount={cartCountFor(shop)} onClick={() => vt.push(`/${shop.shop_slug}`)} />)}
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
                <div className="stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-90">
                  {closedShops.map(shop => <ShopCard key={shop.id} shop={shop} distance={distanceFor(shop)} cartCount={cartCountFor(shop)} onClick={() => vt.push(`/${shop.shop_slug}`)} />)}
                </div>
              </Reveal>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
