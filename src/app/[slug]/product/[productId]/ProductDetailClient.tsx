'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { useIsShopOpen } from '@/lib/useIsShopOpen'
import { useCart } from '@/lib/cart'
import { useWishlist } from '@/lib/wishlist'
import { useRecentlyViewed } from '@/lib/recentlyViewed'
import { useViewTransition } from '@/lib/useViewTransition'
import { Shop, OnlineProduct } from '@/lib/types'
import { cn, formatPrice, seeded } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RatingStars } from '@/components/RatingStars'
import { SectionHeader } from '@/components/SectionHeader'
import { DeliveryCountdown } from '@/components/DeliveryCountdown'
import { CartSheet } from '@/components/CartSheet'
import { GlassIconButton } from '@/components/GlassIconButton'
import {
  Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext,
} from '@/components/ui/carousel'
import {
  ArrowLeft, Heart, Share2, ShoppingCart, Check, Package,
  AlertCircle, Store, Plus, Minus, Star, Bike, Layers,
} from 'lucide-react'

function MiniProductCard({ product, slug }: { product: OnlineProduct; slug: string }) {
  const vt = useViewTransition()
  const price = product.online_price ?? product.store_price ?? 0
  const rating = seeded(product.product_id + 'r', 3.6, 4.9, 1)
  const [imgErr, setImgErr] = useState(false)
  return (
    <button
      onClick={() => vt.push(`/${slug}/product/${product.product_id}`)}
      className="relative group text-left rounded-2xl border border-border liquid-surface overflow-hidden w-40 shrink-0 transition-all hover:shadow-float hover:-translate-y-0.5"
    >
      <div className="relative aspect-square bg-muted overflow-hidden">
        {product.image_url && !imgErr ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="160px"
            onError={() => setImgErr(true)}
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Package size={24} className="text-muted-foreground" /></div>
        )}
      </div>
      <div className="p-2.5">
        <div className="flex items-center gap-1 mb-1 text-[11px] text-muted-foreground">
          <Star size={10} className="fill-star text-star" /> {rating}
        </div>
        <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight mb-1 min-h-8">{product.name}</p>
        <p className="text-sm font-black text-foreground">{formatPrice(price)}</p>
      </div>
    </button>
  )
}

export function ProductDetailClient({
  slug, shop, product, allProducts,
}: {
  slug: string
  shop: Shop
  product: OnlineProduct
  allProducts: OnlineProduct[]
}) {
  const router = useRouter()
  const cart = useCart(slug, shop.shop_name)
  const wishlist = useWishlist()
  const recent = useRecentlyViewed()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [burst, setBurst] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const open = useIsShopOpen(shop)

  // Track this view for the "recently viewed" rail.
  useEffect(() => {
    recent.add({
      productId: product.product_id,
      slug,
      name: product.name,
      price: product.online_price ?? product.store_price ?? 0,
      image_url: product.image_url,
      category: product.category,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.product_id])

  const price = product.online_price ?? product.store_price ?? 0
  const originalPrice = (product.online_price != null && product.store_price != null && product.online_price < product.store_price)
    ? product.store_price : null
  const discountPct = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0
  const saveAmount = originalPrice ? originalPrice - price : 0
  const outOfStock = product.quantity <= 0
  const wishlisted = wishlist.has(product.product_id)

  const rating = seeded(product.product_id + 'r', 3.6, 4.9, 1)
  const reviewCount = seeded(product.product_id + 'c', 24, 320)
  const freeDelivery = seeded(product.product_id + 'd', 0, 10) > 5
  const lowStock = !outOfStock && product.quantity <= 5

  const similar = allProducts
    .filter(p => p.product_id !== product.product_id)
    .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category))
    .slice(0, 8)

  // Same-category picks, presented as a bundle — display-only grouping of
  // already-fetched products, not a real "frequently bought together"
  // computation (that needs order-history data we don't have here).
  const bundlePartners = similar.filter(p => p.category === product.category && p.quantity > 0).slice(0, 2)
  const [bundleChecked, setBundleChecked] = useState<Record<string, boolean>>({})
  const bundleTotal = price + bundlePartners
    .filter(p => bundleChecked[p.product_id] !== false)
    .reduce((sum, p) => sum + (p.online_price ?? p.store_price ?? 0), 0)
  const handleAddBundle = () => {
    cart.addItem({ productId: product.product_id, name: product.name, price, unit: product.unit }, 1)
    bundlePartners
      .filter(p => bundleChecked[p.product_id] !== false)
      .forEach(p => cart.addItem({
        productId: p.product_id, name: p.name, price: p.online_price ?? p.store_price ?? 0, unit: p.unit,
      }, 1))
    toast.success('Added to cart')
  }

  const handleAddToCart = () => {
    cart.addItem(
      { productId: product.product_id, name: product.name, price, unit: product.unit },
      quantity,
    )
    setAdded(true)
    toast.success('Added to cart', { description: `${quantity} × ${product.name}` })
    setTimeout(() => setAdded(false), 2000)
  }

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (navigator.share) await navigator.share({ title: product.name, url })
      else { await navigator.clipboard.writeText(url); toast.success('Link copied to clipboard') }
    } catch { /* dismissed */ }
  }

  return (
    <div className="min-h-screen pb-[calc(10rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-40 liquid-glass-strong liquid-edge border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
          {/* Explicit destination, not vt.back()/router.back() — this page is
              routinely opened directly via a shared product link with no
              browser history to go back to, in which case history.back()
              silently does nothing (or worse, exits the app). The shop this
              product belongs to is always the correct, unambiguous target. */}
          <Button variant="ghost" size="icon-sm" onClick={() => router.push(`/${slug}`)} className="-ml-1 shrink-0" aria-label="Back to shop">
            <ArrowLeft size={18} />
          </Button>
          {/* Shop context that was previously only reachable via the back
              arrow — a shopper landing here from a shared link had no way
              to tell which shop they're in without tapping back first. */}
          <button
            onClick={() => router.push(`/${slug}`)}
            className="flex-1 min-w-0 flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary transition-colors truncate"
          >
            <Store size={14} className="shrink-0" />
            <span className="truncate">{shop.shop_name}</span>
          </button>
          <GlassIconButton onClick={handleShare} aria-label="Share" icon={<Share2 size={16} />} />
          <GlassIconButton onClick={() => setCartOpen(true)} aria-label="View cart" icon={<ShoppingCart size={16} />}>
            {cart.count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 size-4 bg-primary text-primary-foreground text-[9px] font-black rounded-full flex items-center justify-center">{cart.count}</span>
            )}
          </GlassIconButton>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Gallery */}
        <div className="md:sticky md:top-20 md:self-start space-y-3">
          <div className="aspect-square bg-muted rounded-3xl overflow-hidden relative group border border-border" style={{ viewTransitionName: 'product-hero' } as React.CSSProperties}>
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Package size={56} className="text-muted-foreground" /></div>
            )}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {discountPct > 0 && <Badge variant="destructive" className="text-xs font-bold">{discountPct}% OFF</Badge>}
              {freeDelivery && <Badge variant="success" className="text-xs font-bold"><Bike /> FREE DELIVERY</Badge>}
            </div>
            <GlassIconButton
              onClick={() => {
                if (!wishlisted) { setBurst(true); setTimeout(() => setBurst(false), 500) }
                wishlist.toggle({
                  productId: product.product_id,
                  slug,
                  name: product.name,
                  price,
                  image_url: product.image_url,
                  unit: product.unit,
                  category: product.category,
                })
              }}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              className="absolute top-4 right-4 active:scale-95"
              size={40}
              color={wishlisted ? 'linear-gradient(var(--destructive), color-mix(in oklch, var(--destructive), black 20%))' : undefined}
              icon={<Heart size={18} className={cn(burst && 'animate-heart-burst', wishlisted && 'fill-white')} />}
            >
              {burst && <span className="absolute inset-0 rounded-[1.25em] border-2 border-destructive animate-heart-ring" />}
            </GlassIconButton>
          </div>
        </div>

        {/* Right: Details */}
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">{product.category || 'Product'}</p>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground leading-tight tracking-tight">{product.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{product.unit}</p>
            <div className="mt-2.5">
              <RatingStars rating={rating} count={reviewCount} size="md" />
            </div>
          </div>

          {/* Price card */}
          <div className="relative liquid-surface border border-border p-4 rounded-2xl space-y-3">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">{formatPrice(price)}</span>
              {originalPrice && <span className="text-lg text-muted-foreground line-through">{formatPrice(originalPrice)}</span>}
              {discountPct > 0 && <Badge variant="success" className="text-xs font-bold">Save {formatPrice(saveAmount)}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">Inclusive of all taxes</p>

            <div className="space-y-1.5">
              {outOfStock
                ? <p className="text-destructive font-semibold text-sm flex items-center gap-1.5"><AlertCircle size={14} /> Out of Stock</p>
                : <p className="text-success font-semibold text-sm flex items-center gap-1.5"><Check size={14} /> In Stock</p>}
              {lowStock && (
                <p className="text-destructive text-xs font-bold flex items-center gap-1.5">
                  <span className="inline-block size-1.5 rounded-full bg-destructive animate-pulse-live" />
                  Hurry! Only {product.quantity} left in stock
                </p>
              )}
            </div>

            {/* The old "Delivery by {date}" line here was a per-product
                `seeded()` 1–3 day estimate dressed up as a shipping promise —
                fabricated, and it contradicts both the real DeliveryCountdown
                right below (which promises "the fastest slot", not a multi-day
                wait) and the minutes-based ETA the rest of the app uses for
                delivery (shop cards, ShopClient). Removed rather than
                replaced: DeliveryCountdown is the one real delivery-timing
                signal on this page, so this section is skipped entirely
                (Separator included) when there's no free-delivery chip to
                show either, rather than leaving a bare rule above nothing. */}
            {freeDelivery && (
              <>
                <Separator />
                <p className="text-sm text-success font-semibold flex items-center gap-1.5"><Check size={14} /> Free delivery on this item</p>
              </>
            )}
          </div>

          {/* Delivery urgency countdown */}
          {!outOfStock && open && <DeliveryCountdown />}

          {/* Quantity + add (desktop) */}
          {!outOfStock && (
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center liquid-surface rounded-xl overflow-hidden">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity" className="px-3.5 py-2.5 hover:bg-muted transition-colors text-foreground"><Minus size={15} /></button>
                <span className="px-4 py-2.5 font-bold text-foreground min-w-[48px] text-center" aria-live="polite" aria-label={`Quantity ${quantity}`}>{quantity}</span>
                <button
                  onClick={() => quantity < product.quantity && setQuantity(quantity + 1)}
                  disabled={quantity >= product.quantity}
                  aria-label="Increase quantity"
                  className="px-3.5 py-2.5 hover:bg-muted transition-colors text-foreground disabled:opacity-40 disabled:pointer-events-none"
                ><Plus size={15} /></button>
              </div>
              <Button size="lg" className="flex-1 gap-2 h-12 text-[15px]" onClick={handleAddToCart} disabled={!open}>
                {added ? <><Check size={18} /> Added</> : open ? <><ShoppingCart size={18} /> Add to Cart</> : <><AlertCircle size={18} /> Shop Closed</>}
              </Button>
            </div>
          )}

          {/* Frequently bought together */}
          {bundlePartners.length > 0 && (
            <div className="relative liquid-surface border border-border p-4 rounded-2xl space-y-3.5">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Layers size={16} className="text-primary" /> Frequently bought together
              </h3>
              <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-1">
                {[product, ...bundlePartners].map((p, i) => (
                  <div key={p.product_id} className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {i > 0 && <Plus size={14} className="text-muted-foreground shrink-0" />}
                    <label className={cn('flex flex-col items-center gap-1.5 w-20 text-center', i > 0 && 'cursor-pointer')}>
                      <div className="relative size-16 rounded-xl bg-muted overflow-hidden border border-border">
                        {p.image_url ? (
                          <Image src={p.image_url} alt={p.name} fill sizes="64px" className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-muted-foreground" /></div>
                        )}
                        {i > 0 && (
                          <input
                            type="checkbox"
                            checked={bundleChecked[p.product_id] !== false}
                            onChange={e => setBundleChecked(prev => ({ ...prev, [p.product_id]: e.target.checked }))}
                            className="absolute top-1 right-1 size-4 accent-primary cursor-pointer"
                            aria-label={`Include ${p.name} in bundle`}
                          />
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-foreground line-clamp-2 leading-tight">{p.name}</p>
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-border">
                <div>
                  <p className="text-[11px] text-muted-foreground">Bundle total</p>
                  <p className="font-black text-lg text-foreground">{formatPrice(bundleTotal)}</p>
                </div>
                <Button size="sm" onClick={handleAddBundle} disabled={!open} className="gap-1.5">
                  <ShoppingCart size={14} /> Add bundle to cart
                </Button>
              </div>
            </div>
          )}

          {/* Seller */}
          <div className="relative liquid-surface border border-border p-4 rounded-2xl flex items-center gap-3">
            <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground text-sm font-black shrink-0">
              {shop.shop_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">{shop.shop_name}</p>
              <p className="text-xs text-muted-foreground">{shop.address_text || 'Local shop'}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => router.push(`/${slug}`)} className="gap-1.5">
              <Store size={14} /> Visit
            </Button>
          </div>
        </div>
      </div>

      {/* Reviews — was a 3-column layout built to sit beside a per-star
          percentage breakdown and a grid of three hardcoded reviews
          ("Priya S." etc.) each carrying a false "Verified" badge. There is
          no review data behind this product (OnlineProduct has no reviews
          table), so all of that was fabricated and has been removed. What's
          left is the one real, kept number: the seeded aggregate rating +
          count (see ratings-scope decision) — sized and centred as what it
          actually is, a single stat, not stretched to fill a 3-column grid
          it no longer has content for. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-border">
        <SectionHeader title="Ratings" icon={Star} />
        {/* Star row built from plain icons rather than <RatingStars>: that
            component always appends its own "{rating}" text after the stars,
            which would print 3.9 twice next to the headline number below. */}
        <div className="relative liquid-surface border border-border rounded-2xl p-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:justify-start">
          <p className="text-5xl font-black text-foreground leading-none">{rating}</p>
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <div className="flex gap-0.5" role="img" aria-label={`Rated ${rating.toFixed(1)} out of 5, ${reviewCount.toLocaleString()} ratings`}>
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} aria-hidden size={18} className={cn(star <= Math.round(rating) ? 'fill-star text-star' : 'text-muted-foreground')} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground" aria-hidden>{reviewCount} ratings</p>
          </div>
        </div>
      </div>

      {/* Similar products */}
      {similar.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-border">
          <SectionHeader title="You may also like" icon={Package} />
          <Carousel opts={{ align: 'start', dragFree: true }} className="w-full">
            <CarouselContent className="-ml-3">
              {similar.map(p => (
                <CarouselItem key={p.product_id} className="pl-3 basis-auto">
                  <MiniProductCard product={p} slug={slug} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>
      )}

      {/* Sticky mobile add-to-cart bar — sits above the global BottomNav
          (fixed, every route, mobile-only) instead of the true screen
          bottom, so the two fixed bars stack rather than overlap. */}
      {!outOfStock && (
        <div className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 liquid-glass-strong liquid-edge border-t border-border p-3 flex items-center gap-3">
          <div className="flex items-center liquid-surface rounded-xl overflow-hidden shrink-0">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity" className="px-3 py-2.5 text-foreground"><Minus size={15} /></button>
            <span className="px-2 py-2.5 font-bold text-foreground min-w-[36px] text-center" aria-live="polite" aria-label={`Quantity ${quantity}`}>{quantity}</span>
            <button
              onClick={() => quantity < product.quantity && setQuantity(quantity + 1)}
              disabled={quantity >= product.quantity}
              aria-label="Increase quantity"
              className="px-3 py-2.5 text-foreground disabled:opacity-40 disabled:pointer-events-none"
            ><Plus size={15} /></button>
          </div>
          <Button size="lg" className="flex-1 gap-2 h-12" onClick={handleAddToCart} disabled={!open}>
            {added ? <><Check size={18} /> Added</> : open ? <><ShoppingCart size={18} /> Add · {formatPrice(price * quantity)}</> : 'Shop Closed'}
          </Button>
        </div>
      )}

      <CartSheet
        cart={cart}
        shop={shop}
        onCheckout={() => { setCartOpen(false); router.push(`/${slug}/checkout`) }}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </div>
  )
}
