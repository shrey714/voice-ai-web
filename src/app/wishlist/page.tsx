'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { useWishlist } from '@/lib/wishlist'
import { cn, formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { GlassIconButton } from '@/components/GlassIconButton'
import BorderGlow from '@/components/BorderGlow'
import { ArrowLeft, Heart, Package, Store } from 'lucide-react'

function WishCard({
  item, onOpen, onRemove,
}: {
  item: ReturnType<typeof useWishlist>['items'][number]
  onOpen: () => void
  onRemove: () => void
}) {
  const [imgErr, setImgErr] = useState(false)
  return (
    // No hover:-translate-y-1 here — BorderGlow sets its own inline `transform`
    // for its 3D layering trick, which would silently beat a translate-y
    // class at equal specificity (same conflict already documented on
    // ShopCard/ProductCard). The edge glow is the hover cue instead.
    <BorderGlow className="group liquid-surface transition-shadow duration-300 hover:shadow-lg flex flex-col">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative aspect-square bg-muted overflow-hidden">
          {item.image_url && !imgErr
            ? (
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1280px) 25vw, 220px"
                onError={() => setImgErr(true)}
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
            )
            : <div className="w-full h-full flex items-center justify-center"><Package size={28} className="text-muted-foreground" /></div>}
        </div>
        <div className="p-3">
          <p className="font-semibold text-sm text-foreground leading-tight line-clamp-2 mb-0.5">{item.name}</p>
          {item.unit && <p className="text-xs text-muted-foreground mb-1">{item.unit}</p>}
          <p className="font-black text-[15px] text-foreground">{formatPrice(item.price)}</p>
        </div>
      </button>
      <GlassIconButton
        onClick={onRemove}
        aria-label="Remove from wishlist"
        className="absolute top-2 right-2 active:scale-95"
        size={32}
        color="linear-gradient(var(--destructive), color-mix(in oklch, var(--destructive), black 20%))"
        icon={<Heart size={14} className="fill-white" />}
      />
    </BorderGlow>
  )
}

export default function WishlistPage() {
  const router = useRouter()
  const { items, remove, toggle, count } = useWishlist()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 liquid-glass-strong liquid-edge border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()} className="text-muted-foreground -ml-1" aria-label="Go back">
            <ArrowLeft size={18} />
          </Button>
          <div className="flex items-center gap-2">
            <Heart size={18} className="fill-destructive text-destructive" />
            <h1 className="font-bold text-base text-foreground">My Wishlist</h1>
            {count > 0 && <span className="text-xs font-semibold text-muted-foreground">({count})</span>}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {count === 0 ? (
          <EmptyState
            icon={Heart}
            title="Your wishlist is empty"
            description="Tap the heart on any product to save it here for later."
            action={<Button onClick={() => router.push('/')} className="gap-2"><Store size={15} /> Browse Shops</Button>}
          />
        ) : (
          <div className={cn('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 stagger')}>
            {items.map(item => (
              <WishCard
                key={item.productId}
                item={item}
                onOpen={() => router.push(`/${item.slug}/product/${item.productId}`)}
                onRemove={() => {
                  remove(item.productId)
                  toast('Removed from wishlist', {
                    action: { label: 'Undo', onClick: () => toggle(item) },
                  })
                }}
              />
            ))}
          </div>
        )}

        {count > 0 && (
          <div className="mt-6 flex justify-center">
            <Button variant="secondary" size="sm" onClick={() => router.push('/')} className="gap-2">
              <Store size={14} /> Continue shopping
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
