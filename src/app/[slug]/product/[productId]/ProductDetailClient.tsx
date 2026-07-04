'use client'
import { useEffect, useMemo, useState } from 'react'
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
import {
  Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext,
} from '@/components/ui/carousel'
import {
  ArrowLeft, Heart, Share2, ShoppingCart, Check, Package,
  Truck, AlertCircle, Store, ShieldCheck, RotateCcw, Plus, Minus, Star, Bike, Flame,
} from 'lucide-react'

const HIGHLIGHTS = [
  'Sourced from trusted local suppliers',
  'Freshness guaranteed on every order',
  'Carefully packed for safe delivery',
  'Backed by an easy return policy',
]

const SAMPLE_REVIEWS = [
  { name: 'Priya S.', title: 'Great quality!', body: 'Exactly as described and delivered fresh. Will order again.' },
  { name: 'Rahul M.', title: 'Worth the price', body: 'Good value for money and quick delivery from my local shop.' },
  { name: 'Anjali K.', title: 'Highly recommended', body: 'Packaging was neat and the product quality was excellent.' },
]

function MiniProductCard({ product, slug }: { product: OnlineProduct; slug: string }) {
  const vt = useViewTransition()
  const price = product.online_price ?? product.store_price ?? 0
  const rating = seeded(product.product_id + 'r', 3.6, 4.9, 1)
  const [imgErr, setImgErr] = useState(false)
  return (
    <button
      onClick={() => vt.push(`/${slug}/product/${product.product_id}`)}
      className="group text-left rounded-2xl border border-border bg-card overflow-hidden w-40 shrink-0 transition-all hover:shadow-float hover:-translate-y-0.5"
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
  const vt = useViewTransition()
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
  const estimatedDays = seeded(product.product_id + 'e', 1, 3)
  const boughtToday = seeded(product.product_id + 'b', 8, 60)
  const lowStock = !outOfStock && product.quantity <= 5
  // Computed once per mount rather than inline in JSX — Date.now() read directly during
  // render is impure and, since this is a Client Component (server-rendered once, then
  // hydrated), could disagree with the server's clock and trigger a hydration mismatch.
  /* eslint-disable react-hooks/purity -- one-time-per-mount Date.now() read, see comment above */
  const deliveryDateLabel = useMemo(() => (
    new Date(Date.now() + estimatedDays * 86400000).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
  ), [estimatedDays])
  /* eslint-enable react-hooks/purity */

  const similar = allProducts
    .filter(p => p.product_id !== product.product_id)
    .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category))
    .slice(0, 8)

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
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => vt.back()} className="-ml-1" aria-label="Go back">
            <ArrowLeft size={18} />
          </Button>
          {/* Not an <h1>: the page's single <h1> is the product title in the details column below. */}
          <p className="font-bold text-foreground flex-1 truncate text-sm sm:text-base" aria-hidden>{product.name}</p>
          <Button variant="ghost" size="icon-sm" onClick={handleShare} className="text-muted-foreground" aria-label="Share">
            <Share2 size={17} />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setCartOpen(true)} className="text-muted-foreground relative" aria-label="View cart">
            <ShoppingCart size={17} />
            {cart.count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 size-4 bg-primary text-primary-foreground text-[9px] font-black rounded-full flex items-center justify-center">{cart.count}</span>
            )}
          </Button>
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
            <button
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
              className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-background/85 backdrop-blur shadow-sm transition-all hover:scale-110 active:scale-95"
            >
              {burst && <span className="absolute inset-0 rounded-full border-2 border-destructive animate-heart-ring" />}
              <Heart size={18} className={cn(burst && 'animate-heart-burst', wishlisted ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
            </button>
          </div>
        </div>

        {/* Right: Details */}
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">{product.category || 'Product'}</p>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground leading-tight tracking-tight">{product.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{product.unit}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <RatingStars rating={rating} count={reviewCount} size="md" />
              <span className="text-xs font-semibold text-primary flex items-center gap-1">
                <Flame size={12} className="shrink-0" /> {boughtToday} bought in the last 24h
              </span>
            </div>
          </div>

          {/* Price card */}
          <div className="bg-card border border-border p-4 rounded-2xl space-y-3">
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

            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck size={16} className="text-success" />
                <span>Delivery by <span className="font-semibold text-foreground">
                  {deliveryDateLabel}
                </span></span>
              </div>
              {freeDelivery && <p className="text-sm text-success font-semibold flex items-center gap-1.5"><Check size={14} /> Free delivery on this item</p>}
            </div>
          </div>

          {/* Delivery urgency countdown */}
          {!outOfStock && open && <DeliveryCountdown />}

          {/* Quantity + add (desktop) */}
          {!outOfStock && (
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center border border-border rounded-xl overflow-hidden">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity" className="px-3.5 py-2.5 hover:bg-muted transition-colors text-foreground"><Minus size={15} /></button>
                <span className="px-4 py-2.5 font-bold text-foreground min-w-[48px] text-center" aria-live="polite" aria-label={`Quantity ${quantity}`}>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity" className="px-3.5 py-2.5 hover:bg-muted transition-colors text-foreground"><Plus size={15} /></button>
              </div>
              <Button size="lg" className="flex-1 gap-2 h-12 text-[15px]" onClick={handleAddToCart} disabled={!open}>
                {added ? <><Check size={18} /> Added</> : open ? <><ShoppingCart size={18} /> Add to Cart</> : <><AlertCircle size={18} /> Shop Closed</>}
              </Button>
            </div>
          )}

          {/* Trust row */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { Icon: ShieldCheck, label: 'Verified seller' },
              { Icon: Truck, label: 'Fast delivery' },
              { Icon: RotateCcw, label: 'Easy returns' },
            ].map(({ Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 text-center rounded-2xl border border-border bg-card p-3">
                <Icon size={18} className="text-primary" />
                <span className="text-[11px] font-medium text-muted-foreground leading-tight">{label}</span>
              </div>
            ))}
          </div>

          {/* Seller */}
          <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-3">
            <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground text-sm font-black shrink-0">
              {shop.shop_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">{shop.shop_name}</p>
              <Badge variant="success" className="text-[10px] mt-1"><ShieldCheck /> Verified Seller</Badge>
            </div>
            <Button variant="secondary" size="sm" onClick={() => router.push(`/${slug}`)} className="gap-1.5">
              <Store size={14} /> Visit
            </Button>
          </div>

          {/* Highlights */}
          <div className="bg-card border border-border p-4 rounded-2xl">
            <h3 className="font-bold text-foreground mb-3">Product highlights</h3>
            <ul className="space-y-2">
              {HIGHLIGHTS.map(h => (
                <li key={h} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check size={15} className="text-success mt-0.5 shrink-0" /> {h}
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div className="bg-card border border-border p-4 rounded-2xl">
            <h3 className="font-bold text-foreground mb-2">About this product</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              High-quality {product.name.toLowerCase()} sourced from trusted suppliers. Perfect for your everyday needs, available at {shop.shop_name}.
            </p>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-border">
        <SectionHeader title="Customer Reviews" icon={Star} subtitle={`${reviewCount} verified ratings`} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-border p-6 rounded-2xl text-center flex flex-col items-center justify-center gap-2">
            <p className="text-5xl font-black text-foreground">{rating}</p>
            <RatingStars rating={rating} size="md" />
            <p className="text-sm text-muted-foreground">{reviewCount} reviews</p>
          </div>
          <div className="md:col-span-2 bg-card border border-border p-6 rounded-2xl space-y-3">
            {[5, 4, 3, 2, 1].map(star => {
              const pct = seeded(product.product_id + 's' + star, star >= 4 ? 40 : 3, star >= 4 ? 85 : 20)
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-xs font-medium min-w-8 flex items-center gap-0.5">{star}<Star size={10} className="fill-star text-star" /></span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-star rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground min-w-10 text-right">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {SAMPLE_REVIEWS.map((r, i) => (
            <div key={i} className="bg-card border border-border p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <RatingStars rating={seeded(product.product_id + 'rv' + i, 4, 5, 0)} size="sm" />
                <Badge variant="success" className="text-[10px]"><Check /> Verified</Badge>
              </div>
              <h4 className="font-semibold text-foreground text-sm">{r.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>
              <p className="text-xs text-muted-foreground font-medium">— {r.name}</p>
            </div>
          ))}
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

      {/* Sticky mobile add-to-cart bar */}
      {!outOfStock && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-border p-3 flex items-center gap-3">
          <div className="flex items-center border border-border rounded-xl overflow-hidden bg-card shrink-0">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity" className="px-3 py-2.5 text-foreground"><Minus size={15} /></button>
            <span className="px-2 py-2.5 font-bold text-foreground min-w-[36px] text-center" aria-live="polite" aria-label={`Quantity ${quantity}`}>{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity" className="px-3 py-2.5 text-foreground"><Plus size={15} /></button>
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
