'use client'
import { memo, useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
import { useLocation } from '@/lib/location'
import { Shop, OnlineProduct } from '@/lib/types'
import { cn, formatPrice, seeded, distanceKm } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { RatingStars } from '@/components/RatingStars'
import { EmptyState } from '@/components/EmptyState'
import { ProductSearch } from '@/components/ProductSearch'
import { ProductFilters, type FilterState } from '@/components/ProductFilters'
import { RecentlyViewed } from '@/components/RecentlyViewed'
import { LocationChip } from '@/components/LocationChip'
import { ShopInfoSheet } from '@/components/ShopInfoSheet'
import { CartSheet } from '@/components/CartSheet'
import { useHeaderScroll } from '@/lib/useScroll'
import {
  Search, ArrowLeft, ShoppingCart, Plus, Minus, Package, Heart,
  Bike, Clock, ShoppingBag, Layers, ArrowRight, Sliders, Info, ShoppingBasket, Store,
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
  const eta = seeded(product.product_id + 'e', 10, 30)

  const goDetails = () => vt.push(`/${slug}/product/${product.product_id}`, imgRef.current)

  return (
    <div
      onPointerEnter={() => vt.prefetch(`/${slug}/product/${product.product_id}`)}
      className="group liquid-surface rounded-2xl border border-border overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/25 flex flex-col"
    >
      {/* Image */}
      <div ref={imgRef} className="relative w-full aspect-square bg-muted overflow-hidden shrink-0 cursor-pointer" onClick={goDetails}>
        {product.image_url && !imgErr ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1280px) 25vw, 220px"
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
        <button
          onClick={e => { e.stopPropagation(); handleWishlist() }}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-background/85 backdrop-blur text-foreground shadow-sm transition-all hover:scale-110 active:scale-95"
        >
          {burst && <span className="absolute inset-0 rounded-full border-2 border-destructive animate-heart-ring" />}
          <Heart size={15} className={cn('transition-all', burst && 'animate-heart-burst', wishlisted ? 'fill-destructive text-destructive scale-110' : 'text-muted-foreground')} />
        </button>

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
              className="w-full bg-primary/95 text-primary-foreground text-xs font-bold py-2.5 flex items-center justify-center gap-1 backdrop-blur hover:brightness-110"
            >
              <Plus size={13} /> Quick Add
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 mb-1.5">
          <RatingStars rating={rating} count={reviewCount} size="sm" />
        </div>

        <button onClick={goDetails} className="text-left">
          <p className="font-semibold text-sm text-foreground leading-tight mb-0.5 line-clamp-2 hover:text-primary transition-colors">
            {product.name}
          </p>
        </button>

        <p className="text-xs text-muted-foreground mb-2">{product.unit}</p>

        {!outOfStock && (
          <div className="flex items-center gap-2 mb-2 mt-auto">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock size={10} /> {eta} min
            </p>
            {product.quantity <= 5 && (
              <span className="text-[10px] font-bold text-destructive flex items-center gap-1">
                <span className="inline-block size-1 rounded-full bg-destructive animate-pulse-live" />
                {product.quantity} left
              </span>
            )}
          </div>
        )}

        {/* Price + action */}
        <div className={cn('flex items-center justify-between gap-2', outOfStock && 'mt-auto')}>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <p className="font-black text-[15px] text-foreground tracking-tight leading-none">{formatPrice(price)}</p>
              {originalPrice && (
                <p className="text-xs text-muted-foreground line-through leading-none">{formatPrice(originalPrice)}</p>
              )}
            </div>
          </div>

          {disabled ? (
            <div className="shrink-0 px-3 py-1.5 rounded-xl bg-muted text-xs text-muted-foreground font-semibold">
              {outOfStock ? 'Sold out' : 'Closed'}
            </div>
          ) : cartQty === 0 ? (
            <button
              onClick={handleQuickAdd}
              className={cn(
                'shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-xl',
                'bg-primary/10 text-primary border border-primary/20',
                'text-sm font-bold transition-all duration-150',
                'hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md',
                'active:scale-95',
              )}
            >
              <Plus size={13} /> ADD
            </button>
          ) : (
            <div className="shrink-0 flex items-center bg-primary rounded-xl overflow-hidden shadow-sm animate-scale-in">
              <button onClick={() => onUpdateQty(product.product_id, cartQty - 1)} aria-label="Decrease quantity" className="size-7 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/15 transition-colors active:bg-primary-foreground/25">
                <Minus size={13} />
              </button>
              <span key={cartQty} className="px-1 min-w-[22px] text-center text-sm font-black text-primary-foreground animate-count">{cartQty}</span>
              <button
                onClick={() => cartQty < product.quantity && onUpdateQty(product.product_id, cartQty + 1)}
                disabled={cartQty >= product.quantity}
                aria-label="Increase quantity"
                className="size-7 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/15 transition-colors active:bg-primary-foreground/25 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Plus size={13} />
              </button>
            </div>
          )}
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
          'sticky top-0 z-40 border-b transition-all duration-300',
          scrolled ? 'liquid-glass-strong border-border shadow-soft' : 'liquid-glass border-border',
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-14">
            <Button variant="ghost" size="icon-sm" onClick={() => router.push('/')} className="shrink-0 text-muted-foreground hover:text-foreground -ml-1" aria-label="Back to shops">
              <ArrowLeft size={18} />
            </Button>

            <button
              onClick={() => setInfoOpen(true)}
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left rounded-xl -mx-1.5 px-1.5 py-1 hover:bg-muted/60 transition-colors"
            >
              <div className="size-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0 text-primary font-black text-sm">
                {shop.shop_name.charAt(0)}
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-[15px] leading-tight truncate text-foreground flex items-center gap-1">
                  {shop.shop_name}
                  <Info size={12} className="text-muted-foreground shrink-0" />
                </h1>
                {shop.delivery_enabled && (
                  // min-w-0 + truncate on the label: without it, this row can wrap to two
                  // lines on narrow phones and overflow the header's fixed h-14 row height
                  // (the sticky offsets below now measure this height via ResizeObserver
                  // rather than assuming one, but the row overflowing its own box is still
                  // a visible clipping bug on its own).
                  canDeliverHere ? (
                    <p className="text-[11px] text-primary flex items-center gap-1 font-semibold min-w-0">
                      <Bike size={10} className="shrink-0" /> <span className="truncate">Delivery available</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold min-w-0">
                      <Store size={10} className="shrink-0" /> <span className="truncate">Pickup only here</span>
                    </p>
                  )
                )}
              </div>
              <Badge variant={open ? 'open' : 'closed'} className="ml-auto shrink-0 text-[11px]">
                <span className={cn('size-1.5 rounded-full', open ? 'bg-success animate-pulse-live' : 'bg-muted-foreground')} />
                {open ? 'Open' : 'Closed'}
              </Badge>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              {user && (
                <Button variant="ghost" size="icon-sm" onClick={() => router.push('/orders')} className="text-muted-foreground" aria-label="My orders">
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

          {/* Location · Search bar & Filter button */}
          <div className="pb-3 flex gap-2 items-center">
            <LocationChip className="shrink-0 max-w-[45%] sm:max-w-[240px] border-r border-border pr-2" />
            <ProductSearch
              value={search}
              onChange={v => { setQueryState({ q: v }); setActiveCategory('all') }}
              products={products}
              slug={slug}
              placeholder={`Search in ${shop.shop_name}…`}
              className="flex-1"
            />
            <Button variant="secondary" size="icon-sm" onClick={() => setFilterOpen(true)} className="lg:hidden shrink-0 rounded-xl relative" aria-label={activeFilterCount > 0 ? `Open filters (${activeFilterCount} active)` : 'Open filters'}>
              <Sliders size={16} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 size-4 bg-primary text-primary-foreground text-[9px] font-black rounded-full flex items-center justify-center">{activeFilterCount}</span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main layout ── */}
      {/* Extra bottom padding when the floating cart bar is visible so it can't
          cover the last product row on mobile. */}
      <div className={cn(
        'flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex gap-0 lg:gap-6 pt-0 lg:pt-4',
        cart.count > 0 ? 'pb-28' : 'pb-4',
      )}>
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex flex-col w-52 xl:w-56 shrink-0 self-start sticky space-y-4" style={{ top: headerHeight }}>
          {categories.length > 0 && (
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Categories</p>
              </div>
              <div className="py-1.5">
                <button
                  onClick={() => scrollToCategory('all')}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors',
                    activeCategory === 'all' ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted hover:text-foreground font-medium',
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
                        'w-full flex items-center justify-between gap-2 px-3.5 py-2 text-left text-sm transition-colors',
                        activeCategory === cat ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted hover:text-foreground font-medium',
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

          <div className="bg-card rounded-2xl border border-border p-4">
            <ProductFilters filters={filters} onFiltersChange={handleFiltersChange} maxPrice={maxPrice} />
          </div>
        </aside>

        {/* Product area */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Category pills — mobile/tablet (sticky below header) */}
          {categories.length > 0 && (
            <div className="lg:hidden sticky z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 liquid-glass-strong border-b border-border overflow-x-auto no-scrollbar" style={{ top: headerHeight }}>
              <div className="flex gap-2 w-max">
                <button
                  ref={el => { pillRefs.current['all'] = el }}
                  onClick={() => scrollToCategory('all')}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border press',
                    activeCategory === 'all' ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-105' : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-primary',
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
                      'px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border press',
                      activeCategory === cat ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-105' : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-primary',
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Closed banner */}
          {!open && (
            <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-warning/25 bg-warning/10 animate-fade-in">
              <Clock size={16} className="mt-0.5 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-bold text-warning">Shop is currently closed</p>
                <p className="text-xs mt-0.5 text-warning/90">You can browse products but cannot place orders right now.</p>
              </div>
            </div>
          )}

          {/* Other shops' baskets waiting */}
          {otherCarts.length > 0 && (
            <div className="space-y-2 animate-fade-in">
              {otherCarts.map(oc => (
                <button
                  key={oc.slug}
                  onClick={() => router.push(`/${oc.slug}`)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
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
                  <div className="stagger grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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

      {/* Floating cart bar */}
      {cart.count > 0 && !cartOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-3 pb-5 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none">
          <button
            onClick={() => setCartOpen(true)}
            className="pointer-events-auto mx-auto max-w-sm w-full flex items-center justify-between gap-3 bg-primary text-primary-foreground rounded-2xl px-4 py-3.5 shadow-lg active:scale-[0.98] transition-all animate-slide-up"
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

      {/* Mobile Filter Sheet */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="left" className="w-full sm:w-80 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters & Sort</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <ProductFilters filters={filters} onFiltersChange={handleFiltersChange} maxPrice={maxPrice} onClose={() => setFilterOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
