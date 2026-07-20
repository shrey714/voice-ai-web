'use client'
import { memo, useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  useQueryState, useQueryStates,
  parseAsString, parseAsInteger, parseAsBoolean, parseAsStringEnum,
} from 'nuqs'
import { useIsShopOpen } from '@/lib/useIsShopOpen'
import { useCart, useOtherCarts } from '@/lib/cart'
import { useWishlist } from '@/lib/wishlist'
import { flyToCart } from '@/lib/flyToCart'
import { useViewTransition } from '@/lib/useViewTransition'
import { supabase } from '@/lib/supabase'
import { useLocation, shortLocationText } from '@/lib/location'
import { Shop, OnlineProduct } from '@/lib/types'
import { cn, formatPrice, seeded, distanceKm } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { EmptyState } from '@/components/EmptyState'
import { ProductSearch } from '@/components/ProductSearch'
import { ProductFilters, type FilterState } from '@/components/ProductFilters'
import { RecentlyViewed } from '@/components/RecentlyViewed'
import { LocationPicker } from '@/components/LocationPicker'
import { ShopInfoSheet } from '@/components/ShopInfoSheet'
import { CartSheet } from '@/components/CartSheet'
import { GlassIconButton } from '@/components/GlassIconButton'
import { useHeaderScroll } from '@/lib/useScroll'
import {
  Search, ArrowLeft, ShoppingCart, Plus, Minus, Package, Heart, Star,
  Bike, Clock, ShoppingBag, Layers, ArrowRight, Sliders, Info, ShoppingBasket, Store, ChevronRight, ChevronDown,
} from 'lucide-react'
import type { User as SupaUser } from '@supabase/supabase-js'

/* ── URL-synced search/filter state ──────────────────────────────────────────
 * Shareable/bookmarkable/refresh-persistent filtered views, and working
 * back/forward navigation — same as Amazon/Flipkart/Myntra category pages.
 * history: 'replace' + a shared throttle so typing a search query or
 * clicking through filters doesn't spam browser history with one entry per
 * keystroke/click (nuqs' local state updates immediately either way — only
 * the URL/history write is throttled).
 *
 * priceRange is deliberately NOT included here: its "default" is the shop's
 * actual min/max product price, computed per shop, not a fixed value nuqs'
 * clearOnDefault can compare against — kept as local state instead.
 */
const shopQueryOptions = { history: 'replace' as const, throttleMs: 300 }
const filterParsers = {
  q: parseAsString.withDefault(''),
  sort: parseAsStringEnum(['relevance', 'price-asc', 'price-desc', 'rating'] as const).withDefault('relevance'),
  rating: parseAsInteger.withDefault(0),
  inStock: parseAsBoolean.withDefault(false),
  freeDelivery: parseAsBoolean.withDefault(false),
}

/* ──────────────────────────── Product Card ──────────────────────────────── */
interface ProductCardProps {
  product: OnlineProduct
  cartQty: number
  shopOpen: boolean
  wishlisted: boolean
  onToggleWishlist: (product: OnlineProduct) => void
  onAdd: (product: OnlineProduct) => void
  onUpdateQty: (productId: string, qty: number) => void
  slug: string
}

// Memoized so a cart/wishlist change re-renders only the affected card, not the
// whole grid. Requires the callback props (onAdd/onToggleWishlist/onUpdateQty)
// to be stable references — see the useCallback handlers in ShopClient.
const ProductCard = memo(function ProductCard({
  product, cartQty, shopOpen, wishlisted, onToggleWishlist, onAdd, onUpdateQty, slug,
}: ProductCardProps) {
  const vt = useViewTransition()
  const price = product.online_price ?? product.store_price ?? 0
  const originalPrice = (product.online_price != null && product.store_price != null && product.online_price < product.store_price)
    ? product.store_price : null
  const discountPct = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0
  const outOfStock = product.quantity <= 0
  const [imgErr, setImgErr] = useState(false)
  const [burst, setBurst] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)
  const disabled = outOfStock || !shopOpen

  const handleWishlist = () => {
    if (!wishlisted) { setBurst(true); setTimeout(() => setBurst(false), 500) }
    onToggleWishlist(product)
  }

  const handleQuickAdd = () => {
    flyToCart(imgRef.current, product.image_url)
    onAdd(product)
  }

  // Stable placeholder data (deterministic — no render flicker)
  const rating = seeded(product.product_id + 'r', 3.6, 4.9, 1)
  const reviewCount = seeded(product.product_id + 'c', 12, 240)
  const freeDelivery = seeded(product.product_id + 'd', 0, 10) > 5

  const goDetails = () => vt.push(`/${slug}/product/${product.product_id}`, imgRef.current)

  // Shared action (Add / stepper / disabled state) — rendered twice: as a
  // compact button overlapping the image on mobile (matches the reference
  // grocery-app layout), and inline in the price row from `sm:` up.
  const action = disabled ? (
    <div className="shrink-0 px-3 py-1.5 rounded-xl bg-muted text-xs text-muted-foreground font-semibold">
      {outOfStock ? 'Sold out' : 'Closed'}
    </div>
  ) : cartQty === 0 ? (
    <button
      onClick={e => { e.stopPropagation(); handleQuickAdd() }}
      className="shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-xl liquid-btn liquid-glass-interactive [--liquid-tint:var(--primary)] text-primary-foreground text-sm font-bold active:scale-95"
    >
      <Plus size={13} /> ADD
    </button>
  ) : (
    <div className="shrink-0 flex items-center liquid-btn [--liquid-tint:var(--primary)] rounded-xl overflow-hidden shadow-sm animate-scale-in">
      <button onClick={e => { e.stopPropagation(); onUpdateQty(product.product_id, cartQty - 1) }} aria-label="Decrease quantity" className="size-7 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/15 transition-colors active:bg-primary-foreground/25">
        <Minus size={13} />
      </button>
      <span key={cartQty} className="px-1 min-w-[22px] text-center text-sm font-black text-primary-foreground animate-count">{cartQty}</span>
      <button
        onClick={e => { e.stopPropagation(); if (cartQty < product.quantity) onUpdateQty(product.product_id, cartQty + 1) }}
        disabled={cartQty >= product.quantity}
        aria-label="Increase quantity"
        className="size-7 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/15 transition-colors active:bg-primary-foreground/25 disabled:opacity-40 disabled:pointer-events-none"
      >
        <Plus size={13} />
      </button>
    </div>
  )

  return (
    <div
      onPointerEnter={() => vt.prefetch(`/${slug}/product/${product.product_id}`)}
      onClick={goDetails}
      className="group liquid-surface relative flex flex-col overflow-visible rounded-2xl border border-border cursor-pointer transition-[border-color,box-shadow] duration-200 hover:border-primary hover:shadow-lg"
    >
      {/* Image */}
      <div className="relative shrink-0">
        <div ref={imgRef} className="relative w-full aspect-square bg-muted overflow-hidden rounded-t-2xl">
          {product.image_url && !imgErr ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 33vw, (max-width: 768px) 33vw, (max-width: 1280px) 25vw, 220px"
              onError={() => setImgErr(true)}
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={30} className="text-muted-foreground" />
            </div>
          )}

          {/* Discount badge */}
          {discountPct > 0 && (
            <div className="ribbon-shine absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-black px-2 py-1 rounded-lg shadow-sm">
              {discountPct}% OFF
            </div>
          )}

          {/* Wishlist */}
          <GlassIconButton
            onClick={e => { e.stopPropagation(); handleWishlist() }}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-2 right-2 active:scale-95"
            color={wishlisted ? 'linear-gradient(var(--destructive), color-mix(in oklch, var(--destructive), black 20%))' : undefined}
            icon={<Heart size={15} className={cn('transition-all', burst && 'animate-heart-burst', wishlisted && 'fill-white scale-110')} />}
          >
            {burst && <span className="absolute inset-0 rounded-[1.25em] border-2 border-destructive animate-heart-ring" />}
          </GlassIconButton>

          {/* Free delivery ribbon */}
          {freeDelivery && !outOfStock && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-success/90 text-success-foreground text-[9px] font-bold px-1.5 py-0.5 shadow-sm">
              <Bike size={9} /> FREE
            </div>
          )}

          {/* Out of stock overlay */}
          {outOfStock && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
              <Badge variant="secondary" className="text-xs font-semibold">Out of Stock</Badge>
            </div>
          )}

          {/* Quick-add slides in on hover (desktop) */}
          {!disabled && cartQty === 0 && (
            <div className="hidden md:block absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
              <button
                onClick={e => { e.stopPropagation(); handleQuickAdd() }}
                className="w-full liquid-btn liquid-glass-interactive [--liquid-tint:var(--primary)] text-primary-foreground text-xs font-bold py-2.5 flex items-center justify-center gap-1"
              >
                <Plus size={13} /> Quick Add
              </button>
            </div>
          )}
        </div>

        {/* Mobile-only: action button floats over the image/info boundary,
            matching the reference layout. The `sm:` breakpoint keeps the
            existing inline action in the price row below. */}
        <div className="sm:hidden absolute -bottom-3 right-2 z-10">{action}</div>
      </div>

      {/* Info */}
      <div className="p-2.5 pt-5 sm:p-3 flex flex-col flex-1 rounded-b-2xl">
        {/* Name first, then unit, then rating — the Blinkit/Zepto order. A row
            of five stars used to sit ABOVE the name, so the loudest thing on
            every card was placeholder review data and you read the product
            last. Rating is now a compact chip that states the number instead
            of drawing it. */}
        <p className="font-bold text-xs sm:text-sm text-foreground leading-tight mb-0.5 line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </p>

        <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{product.unit}</p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-foreground min-w-0">
            <Star size={10} className="fill-star text-star shrink-0" />
            {rating}
            <span className="font-medium text-muted-foreground truncate">({reviewCount})</span>
          </span>
          {/* Per-product ETA is gone: it's shop-level data that was repeated
              identically on all 14 cards. The header carries it once. */}
          {!outOfStock && product.quantity <= 5 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-destructive shrink-0">
              <span className="inline-block size-1 rounded-full bg-destructive animate-pulse-live shrink-0" />
              {product.quantity} left
            </span>
          )}
        </div>

        <div className="mt-auto pt-2" />

        {/* Price + action (action hidden on mobile — it floats over the image instead) */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
              <p className="font-black text-sm sm:text-[15px] text-foreground tracking-tight leading-tight truncate max-w-full">{formatPrice(price)}</p>
              {originalPrice && (
                <p className="text-[10px] sm:text-xs text-muted-foreground line-through leading-tight truncate max-w-full">{formatPrice(originalPrice)}</p>
              )}
            </div>
          </div>

          <div className="hidden sm:block shrink-0">{action}</div>
        </div>
      </div>
    </div>
  )
})

/* ──────────────────────────────── Page ──────────────────────────────────── */
export function ShopClient({ slug, shop, products }: { slug: string; shop: Shop; products: OnlineProduct[] }) {
  const router = useRouter()
  const [user, setUser] = useState<SupaUser | null>(null)
  const [queryState, setQueryState] = useQueryStates(filterParsers, shopQueryOptions)
  const search = queryState.q
  // categoryParam is deliberately NOT the source of truth for the active
  // category — that stays local state (below), since it's also driven by a
  // scroll-spy that fires far too often to write back to the URL/history on
  // every tick. This is read once on mount to deep-link into a category, and
  // written on explicit pill/sidebar clicks (see scrollToCategory) — a
  // one-way sync in each direction, not a continuously bound value.
  const [categoryParam, setCategoryParam] = useQueryState('category', { ...shopQueryOptions, defaultValue: 'all', clearOnDefault: true })
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [cartOpen, setCartOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [locOpen, setLocOpen] = useState(false)
  // Slider ceiling derived from the actual catalog (rounded up), not a fixed
  // ₹10,000 that leaves most shops with a near-useless slider.
  const maxPrice = useMemo(() => {
    const prices = products.map(p => p.online_price ?? p.store_price ?? 0)
    const top = prices.length ? Math.max(...prices) : 1000
    return Math.max(100, Math.ceil(top / 50) * 50)
  }, [products])

  // priceRange stays local (see note above filterParsers); everything else in
  // FilterState is derived from the URL-synced queryState.
  const [priceRange, setPriceRange] = useState<[number, number]>([0, maxPrice])
  const filters: FilterState = useMemo(() => ({
    priceRange,
    rating: queryState.rating,
    inStockOnly: queryState.inStock,
    freeDeliveryOnly: queryState.freeDelivery,
    sortBy: queryState.sort,
  }), [priceRange, queryState.rating, queryState.inStock, queryState.freeDelivery, queryState.sort])

  const handleFiltersChange = (next: FilterState) => {
    setPriceRange(next.priceRange)
    setQueryState({ rating: next.rating, inStock: next.inStockOnly, freeDelivery: next.freeDeliveryOnly, sort: next.sortBy })
  }
  const catRefs = useRef<Record<string, HTMLElement | null>>({})
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  // Briefly ignore scroll-spy right after a pill click so the highlight doesn't
  // flicker through intermediate sections during the programmatic smooth-scroll.
  const clickScrollLock = useRef(false)

  // Measured, not guessed: the header's height varies (delivery/pickup label,
  // long shop names, responsive breakpoints), so the category-pills bar and
  // desktop sidebar stick right below it via this instead of a hand-tuned
  // pixel offset that silently goes stale whenever the header's content changes.
  const headerRef = useRef<HTMLElement>(null)
  const [headerHeight, setHeaderHeight] = useState(0)
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setHeaderHeight(entry.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cart = useCart(slug, shop.shop_name)
  const otherCarts = useOtherCarts(slug)
  const wishlist = useWishlist()

  // Keep the latest cart/wishlist in refs so the card callbacks below can be
  // stable (empty-dep useCallback) — the hooks return fresh objects each render.
  const cartRef = useRef(cart)
  const wishlistRef = useRef(wishlist)
  useEffect(() => { cartRef.current = cart; wishlistRef.current = wishlist })
  const { scrolled } = useHeaderScroll()
  const { selected } = useLocation()
  const open = useIsShopOpen(shop)

  const distanceToShop = selected?.latitude != null && selected?.longitude != null
    && shop.latitude != null && shop.longitude != null
    ? distanceKm({ latitude: selected.latitude, longitude: selected.longitude }, { latitude: shop.latitude, longitude: shop.longitude })
    : null
  const outOfDeliveryRange = shop.delivery_enabled && shop.delivery_radius_km != null
    && distanceToShop != null && distanceToShop > shop.delivery_radius_km
  const canDeliverHere = shop.delivery_enabled && !outOfDeliveryRange
  // `outOfDeliveryRange` is false when no location is set (the distance is
  // null), so `canDeliverHere` alone can't distinguish "we checked and it
  // delivers" from "we have nothing to check against".
  const locationKnown = selected?.latitude != null && selected?.longitude != null

  // Lightweight client-only session check (auth persists in the browser).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
  }, [])

  useEffect(() => {
    pillRefs.current[activeCategory]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeCategory])

  const categories = useMemo(
    () => [...new Set(products.map(p => p.category).filter(Boolean))],
    [products],
  )

  // Everything EXCEPT the category selector. Reused for the visible list and for
  // honest per-category counts (so the sidebar number matches what you see).
  const baseFiltered = useMemo(() => products.filter(p => {
    const matchSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase())
    const price = p.online_price ?? p.store_price ?? 0
    const matchPrice = price >= filters.priceRange[0] && price <= filters.priceRange[1]
    const rating = seeded(p.product_id + 'r', 3.6, 4.9, 1)
    const matchRating = filters.rating === 0 || rating >= filters.rating
    const matchStock = !filters.inStockOnly || p.quantity > 0
    const freeDelivery = seeded(p.product_id + 'd', 0, 10) > 5
    const matchDelivery = !filters.freeDeliveryOnly || freeDelivery
    return matchSearch && matchPrice && matchRating && matchStock && matchDelivery
  }), [products, search, filters])

  // Category selection is a scroll anchor / highlight — NOT a filter. The list
  // is narrowed only by search + price/rating/stock/delivery, then sorted, then
  // grouped into sections that all stay visible (Blinkit/Swiggy-style rail).
  const visibleProducts = useMemo(() => {
    return [...baseFiltered].sort((a, b) => {
      const priceA = a.online_price ?? a.store_price ?? 0
      const priceB = b.online_price ?? b.store_price ?? 0
      switch (filters.sortBy) {
        case 'price-asc': return priceA - priceB
        case 'price-desc': return priceB - priceA
        case 'rating': return seeded(b.product_id + 'r', 3.6, 4.9, 1) - seeded(a.product_id + 'r', 3.6, 4.9, 1)
        default: return 0
      }
    })
  }, [baseFiltered, filters.sortBy])

  const grouped = useMemo(() => categories.reduce<Record<string, OnlineProduct[]>>((acc, cat) => {
    const items = visibleProducts.filter(p => p.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {}), [categories, visibleProducts])

  // Scroll-spy: highlight the section currently in view. Safe now that setting
  // activeCategory only highlights (doesn't filter). Re-observes when sections change.
  const visibleCats = useMemo(() => Object.keys(grouped), [grouped])
  useEffect(() => {
    const els = visibleCats
      .map(cat => catRefs.current[cat])
      .filter((el): el is HTMLElement => !!el)
    if (els.length === 0) return
    const io = new IntersectionObserver(
      entries => {
        if (clickScrollLock.current) return
        const top = entries
          .filter(e => e.isIntersecting)
          .map(e => ({ cat: (e.target as HTMLElement).dataset.cat ?? 'all', y: e.boundingClientRect.top }))
          .sort((a, b) => a.y - b.y)[0]
        if (top) setActiveCategory(top.cat)
      },
      { rootMargin: '-150px 0px -70% 0px', threshold: 0 },
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [visibleCats])

  // Per-category counts under the active filters (minus category). Categories
  // that filter down to zero are hidden from the sidebar/pills to avoid dead clicks.
  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const p of baseFiltered) if (p.category) m[p.category] = (m[p.category] ?? 0) + 1
    return m
  }, [baseFiltered])

  // O(1) qty lookup instead of cart.items.find() per card (was O(cards × cart)).
  const cartQtyMap = useMemo(
    () => new Map(cart.items.map(i => [i.productId, i.quantity])),
    [cart.items],
  )

  const scrollToCategory = (cat: string) => {
    setActiveCategory(cat)
    setCategoryParam(cat) // explicit choice — worth reflecting in the URL, unlike scroll-spy updates
    clickScrollLock.current = true
    setTimeout(() => { clickScrollLock.current = false }, 700)
    if (cat !== 'all') catRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Deep-link entry point: if the page was opened with ?category=X (a shared
  // link), jump straight there once on mount. Deliberately not re-run when
  // categoryParam changes afterwards — see the note by its declaration above.
  useEffect(() => {
    if (categoryParam !== 'all' && categories.includes(categoryParam)) scrollToCategory(categoryParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Stable card callbacks (empty deps via refs) so React.memo(ProductCard) holds.
  const handleAdd = useCallback((product: OnlineProduct) => {
    cartRef.current.addItem({
      productId: product.product_id,
      name: product.name,
      price: product.online_price ?? product.store_price ?? 0,
      unit: product.unit,
    })
    toast.success('Added to cart', { description: product.name })
  }, [])

  const handleToggleWishlist = useCallback((product: OnlineProduct) => {
    wishlistRef.current.toggle({
      productId: product.product_id,
      slug,
      name: product.name,
      price: product.online_price ?? product.store_price ?? 0,
      image_url: product.image_url,
      unit: product.unit,
      category: product.category,
    })
  }, [slug])

  const handleUpdateQty = useCallback((productId: string, qty: number) => {
    cartRef.current.updateQty(productId, qty)
  }, [])

  // For the mobile filter trigger badge (filters are otherwise hidden in a sheet).
  const activeFilterCount =
    (filters.rating > 0 ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0) +
    (filters.freeDeliveryOnly ? 1 : 0) +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice ? 1 : 0) +
    (filters.sortBy !== 'relevance' ? 1 : 0)

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Top Nav ── */}
      <header
        ref={headerRef}
        className={cn(
          'sticky top-0 z-40 liquid-glass-strong liquid-edge transition-all duration-300 lg:border-b lg:border-border',
          scrolled && 'lg:shadow-soft',
          categories.length === 0 && 'max-lg:border-b max-lg:border-border',
          categories.length === 0 && scrolled && 'max-lg:shadow-soft',
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-14">
            <Button variant="ghost" size="icon-sm" onClick={() => router.push('/')} className="shrink-0 text-muted-foreground hover:text-foreground -ml-1" aria-label="Back to shops">
              <ArrowLeft size={18} />
            </Button>

            {/* Two sibling buttons, not one wrapping the other: the name opens
                the info sheet and the line under it opens the location picker.
                Nesting them would be invalid HTML and would leave the inner
                control unreachable to a screen reader. */}
            <div className="flex flex-1 min-w-0 items-center gap-2.5">
              {/* Decorative only, and hidden below sm: measured at 375px the h1
                  overflowed by exactly 36px, which is this tile's width. */}
              <button
                onClick={() => setInfoOpen(true)}
                aria-label={`About ${shop.shop_name}`}
                className="hidden sm:flex size-9 rounded-xl bg-primary/10 border border-primary/15 items-center justify-center shrink-0 text-primary font-black text-sm transition-colors hover:bg-primary/15"
              >
                {shop.shop_name.charAt(0)}
              </button>

              <div className="min-w-0 flex-1">
                {/* py-1 on both stacked buttons so they tile the h-14 row
                    rather than leaving dead space between two ~18px targets.
                    They can't reach 44px — two of them share a 56px row — but
                    this takes every pixel that is actually available. */}
                <button
                  onClick={() => setInfoOpen(true)}
                  className="flex max-w-full min-w-0 items-center gap-1 rounded-lg -mx-1 px-1 py-1 text-left transition-colors hover:bg-muted/60"
                >
                  <h1 className="truncate font-bold text-[15px] leading-tight text-foreground">{shop.shop_name}</h1>
                  <Info size={12} className="shrink-0 text-muted-foreground" />
                </button>

                {/* min-w-0 + truncate: without it this row wraps to two lines on
                    narrow phones and overflows the header's fixed row height. */}
                {shop.delivery_enabled ? (
                  <button
                    onClick={() => setLocOpen(true)}
                    aria-label="Change delivery location"
                    className="group flex max-w-full min-w-0 items-center gap-1 rounded-lg -mx-1 px-1 py-1 text-left transition-colors hover:bg-muted/60"
                  >
                    {locationKnown && !canDeliverHere
                      ? <Store size={10} className="shrink-0 text-muted-foreground" />
                      : <Bike size={10} className={cn('shrink-0', locationKnown ? 'text-primary' : 'text-muted-foreground')} />}
                    <span className={cn(
                      'truncate text-[11px] font-semibold',
                      !locationKnown ? 'text-muted-foreground' : canDeliverHere ? 'text-primary' : 'text-muted-foreground',
                    )}>
                      {/* Without a location we genuinely don't know whether this
                          shop delivers to you — `canDeliverHere` defaults to true
                          because the distance is null, so the old copy claimed
                          "Delivery available" on no evidence. Ask instead. */}
                      {!locationKnown
                        ? 'Set location'
                        : canDeliverHere
                          ? `Delivery to ${shortLocationText(selected)}`
                          : `Pickup only · ${shortLocationText(selected)}`}
                    </span>
                    <ChevronDown size={11} className="shrink-0 text-muted-foreground transition-transform group-hover:translate-y-0.5" />
                  </button>
                ) : (
                  <p className="flex min-w-0 items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <Store size={10} className="shrink-0" /> <span className="truncate">Pickup only</span>
                  </p>
                )}
              </div>

              {/* When closed, this is the third place saying so on one screen
                  — the banner below and every product's button already do. On
                  mobile the name needs those pixels more, so only the positive
                  "Open" state survives there. */}
              <Badge variant={open ? 'open' : 'closed'} className={cn('ml-auto shrink-0 text-[11px]', !open && 'hidden lg:inline-flex')}>
                <span className={cn('size-1.5 rounded-full', open ? 'bg-success animate-pulse-live' : 'bg-muted-foreground')} />
                {open ? 'Open' : 'Closed'}
              </Badge>
            </div>

            {/* Orders is `lg:` only — the global BottomNav already carries it
                on mobile, and the duplicate was squeezing the h1 until the
                shop name truncated to "Sharma gene…" at 375px. Wishlist stays
                at every size as a faster one-tap shortcut from mid-scroll,
                without needing to reach down to the BottomNav — same
                reasoning as the product detail page's mobile heart button. */}
            <div className="flex items-center gap-1.5 shrink-0">
              {user && (
                <Button variant="ghost" size="icon-sm" onClick={() => router.push('/orders')} className="hidden lg:inline-flex text-muted-foreground" aria-label="My orders">
                  <ShoppingBag size={17} />
                </Button>
              )}
              <Button variant="ghost" size="icon-sm" onClick={() => router.push('/wishlist')} className="text-muted-foreground relative" aria-label="Wishlist">
                <Heart size={17} className={cn(wishlist.count > 0 && 'fill-destructive text-destructive')} />
                {wishlist.count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 size-4 bg-destructive text-destructive-foreground text-[9px] font-black rounded-full flex items-center justify-center">{wishlist.count}</span>
                )}
              </Button>
              <Button
                id="cart-target"
                variant={cart.count > 0 ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setCartOpen(true)}
                className="gap-2 relative rounded-xl"
              >
                <ShoppingCart size={15} />
                <span className="hidden sm:inline">Cart</span>
                {cart.count > 0 && (
                  <span key={cart.count} className="size-5 rounded-full bg-primary-foreground text-primary text-[11px] font-black flex items-center justify-center animate-cart-pop">
                    {cart.count}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Search bar & Filter button.
              The separate LocationChip that used to sit here is gone at every
              size, not just mobile: the delivery line under the shop name is
              now the address control, so keeping both would be two buttons
              opening the same LocationPicker. It was also eating ~45% of this
              row, which is what forced the placeholder to render as
              "Search in Sha…". */}
          <div className="pb-3 flex gap-2 items-center">
            <ProductSearch
              value={search}
              onChange={v => { setQueryState({ q: v }); setActiveCategory('all') }}
              products={products}
              slug={slug}
              // Not `Search in ${shop.shop_name}…` — that never once fitted on a
              // phone (it rendered as "Search in Sha…"), and the shop name is
              // already the h1 directly above it.
              placeholder="Search products…"
              className="flex-1"
            />
            <Button variant="ghost" size="default" onClick={() => setFilterOpen(true)} className="lg:hidden shrink-0 text-muted-foreground relative border-0 rounded-xl border-l border-input" aria-label={activeFilterCount > 0 ? `Open filters (${activeFilterCount} active)` : 'Open filters'}>
              <Sliders size={16} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 size-4 bg-primary text-primary-foreground text-[9px] font-black rounded-full flex items-center justify-center">{activeFilterCount}</span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main layout ── */}
      {/* Bottom padding clears the global BottomNav (fixed, mobile-only) plus
          the floating cart bar on top of it when the cart has items, so
          neither can cover the last product row. */}
      <div className={cn(
        'flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex gap-0 lg:gap-6 pt-0 lg:pt-4',
        cart.count > 0
          ? 'pb-[calc(4rem+7rem+env(safe-area-inset-bottom))] md:pb-28'
          : 'pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-4',
      )}>
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex flex-col w-52 xl:w-56 shrink-0 self-start sticky space-y-4" style={{ top: headerHeight }}>
          {categories.length > 0 && (
            <div className="relative liquid-surface rounded-2xl border border-border overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Categories</p>
              </div>
              <div className="p-1.5 flex flex-col gap-1.5">
                <button
                  onClick={() => scrollToCategory('all')}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-sm liquid-glass-interactive rounded-xl',
                    activeCategory === 'all' ? 'liquid-btn [--liquid-tint:var(--primary)] text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground font-medium',
                  )}
                >
                  <Layers size={13} /> All items
                </button>
                {categories.map(cat => {
                  const count = categoryCounts[cat] ?? 0
                  if (count === 0) return null // hidden under current filters — avoids a dead click
                  return (
                    <button
                      key={cat}
                      onClick={() => scrollToCategory(cat)}
                      className={cn(
                        'w-full flex items-center justify-between gap-2 px-3.5 py-2 text-left text-sm liquid-glass-interactive rounded-xl',
                        activeCategory === cat ? 'liquid-btn [--liquid-tint:var(--primary)] text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground font-medium',
                      )}
                    >
                      <span className="truncate">{cat}</span>
                      <span className={cn('text-[10px] shrink-0 rounded-full px-1.5 py-0.5 font-bold', activeCategory === cat ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="relative liquid-surface rounded-2xl border border-border overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Filters</p>
            </div>
            <div className="p-4">
              <ProductFilters filters={filters} onFiltersChange={handleFiltersChange} maxPrice={maxPrice} />
            </div>
          </div>
        </aside>

        {/* Product area */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground pt-4 lg:pt-0">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight size={12} className="shrink-0" />
            <span className="font-semibold text-foreground truncate">{shop.shop_name}</span>
            {activeCategory !== 'all' && (
              <>
                <ChevronRight size={12} className="shrink-0" />
                <span className="font-semibold text-foreground truncate">{activeCategory}</span>
              </>
            )}
          </nav>

          {/* Category pills — mobile/tablet (sticky below header) */}
          {categories.length > 0 && (
            // No top border/highlight of its own — it mirrors the header's own
            // scrolled/unscrolled glass state so the two read as one continuous
            // panel, and only this bar (not the header) draws the shared bottom
            // edge/shadow on mobile. See the header className comment above.
            <div
              className={cn(
                'lg:hidden sticky z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 liquid-glass-strong liquid-edge overflow-x-auto no-scrollbar transition-all duration-300 border-b border-border',
                scrolled && 'shadow-soft',
              )}
              style={{ top: headerHeight }}
            >
              <div className="flex gap-2 w-max">
                <button
                  ref={el => { pillRefs.current['all'] = el }}
                  onClick={() => scrollToCategory('all')}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap liquid-glass-interactive press',
                    activeCategory === 'all' ? 'liquid-btn [--liquid-tint:var(--primary)] text-primary-foreground scale-105' : 'liquid-surface text-muted-foreground',
                  )}
                >
                  <Layers size={11} /> All
                </button>
                {categories.filter(cat => (categoryCounts[cat] ?? 0) > 0).map(cat => (
                  <button
                    key={cat}
                    ref={el => { pillRefs.current[cat] = el }}
                    onClick={() => scrollToCategory(cat)}
                    className={cn(
                      'px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap liquid-glass-interactive press',
                      activeCategory === cat ? 'liquid-btn [--liquid-tint:var(--primary)] text-primary-foreground scale-105' : 'liquid-surface text-muted-foreground',
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Closed banner — one line, not a 150px card. This is a persistent
              condition you scroll past on every visit while the shop is shut,
              and every product card already says "Closed" on its own button, so
              the long second sentence was restating what the grid shows. */}
          {!open && (
            <div className="flex items-center gap-2.5 rounded-xl border border-warning/25 bg-warning/10 px-3 py-2 animate-fade-in">
              <Clock size={14} className="shrink-0 text-warning" />
              <p className="text-xs text-warning">
                <span className="font-bold">Closed right now.</span> Browse and come back to order.
              </p>
            </div>
          )}

          {/* Other shops' baskets waiting */}
          {otherCarts.length > 0 && (
            <div className="space-y-2 animate-fade-in">
              {otherCarts.map(oc => (
                <button
                  key={oc.slug}
                  onClick={() => router.push(`/${oc.slug}`)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl liquid-surface liquid-glass-interactive text-left"
                >
                  <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                    <ShoppingBasket size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {oc.count} item{oc.count !== 1 ? 's' : ''} waiting at {oc.shopName}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatPrice(oc.total)} · Tap to view that cart</p>
                  </div>
                  <ArrowRight size={15} className="text-primary shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Recently viewed (browse mode only) */}
          {!search && (
            <RecentlyViewed title="Recently viewed" />
          )}

          {visibleProducts.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No products found"
              description={search ? `No results for "${search}".` : 'Nothing here yet.'}
              action={(search || activeCategory !== 'all')
                ? <Button variant="secondary" size="sm" onClick={() => { setQueryState({ q: '' }); setActiveCategory('all'); setCategoryParam('all') }}>Show all products</Button>
                : undefined}
            />
          ) : (
            <div className="space-y-8">
              {Object.entries(grouped).map(([cat, catProducts]) => (
                <section key={cat} data-cat={cat} ref={el => { catRefs.current[cat] = el }} className="scroll-mt-[150px] lg:scroll-mt-24">
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">{cat}</h2>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground font-medium">{catProducts.length} items</span>
                  </div>
                  <div className="stagger grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {catProducts.map(product => (
                      <ProductCard
                        key={product.product_id}
                        product={product}
                        cartQty={cartQtyMap.get(product.product_id) ?? 0}
                        shopOpen={open}
                        slug={slug}
                        wishlisted={wishlist.has(product.product_id)}
                        onToggleWishlist={handleToggleWishlist}
                        onAdd={handleAdd}
                        onUpdateQty={handleUpdateQty}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating cart bar. Sits above the global BottomNav (fixed, every
          route, mobile-only) instead of at the true screen bottom, so the
          two fixed bars stack rather than overlap. */}
      {cart.count > 0 && !cartOpen && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 z-30 p-3 pb-5 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none">
          <button
            onClick={() => setCartOpen(true)}
            className="pointer-events-auto mx-auto max-w-sm w-full flex items-center justify-between gap-3 liquid-btn liquid-glass-interactive [--liquid-tint:var(--primary)] text-primary-foreground rounded-2xl px-4 py-3.5 shadow-lg active:scale-[0.98] animate-slide-up"
          >
            <div className="flex items-center gap-2.5">
              <div className="size-8 bg-primary-foreground/15 rounded-xl flex items-center justify-center relative">
                <ShoppingCart size={16} />
                <span className="absolute -top-1 -right-1 size-4 bg-primary-foreground text-primary text-[9px] font-black rounded-full flex items-center justify-center">{cart.count}</span>
              </div>
              <div className="text-left">
                <p className="font-bold text-sm leading-tight">View Cart</p>
                <p className="text-xs text-primary-foreground/70 leading-tight">{cart.count} item{cart.count !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <p className="font-black text-base">{formatPrice(cart.total)}</p>
          </button>
        </div>
      )}

      {/* Cart Sheet */}
      <CartSheet
        cart={cart}
        shop={shop}
        onCheckout={() => { setCartOpen(false); router.push(`/${slug}/checkout`) }}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
      />

      {/* Shop Info Sheet */}
      <ShopInfoSheet shop={shop} open={infoOpen} onClose={() => setInfoOpen(false)} />
      <LocationPicker open={locOpen} onOpenChange={setLocOpen} />

      {/* Mobile Filter Sheet */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="left" className="w-full sm:w-80 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters & Sort</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <ProductFilters filters={filters} onFiltersChange={handleFiltersChange} maxPrice={maxPrice} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
