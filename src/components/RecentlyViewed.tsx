'use client'
import { useViewTransition } from '@/lib/useViewTransition'
import { useRecentlyViewed } from '@/lib/recentlyViewed'
import { formatPrice } from '@/lib/utils'
import { SectionHeader } from '@/components/SectionHeader'
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import { History, Package } from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'

/** Horizontal rail of recently-viewed products (across shops). Hidden if empty. */
export function RecentlyViewed({ excludeId, title = 'Recently viewed' }: { excludeId?: string; title?: string }) {
  const vt = useViewTransition()
  const { items } = useRecentlyViewed()
  const list = items.filter(i => i.productId !== excludeId)

  if (list.length === 0) return null

  return (
    <section className="animate-fade-in">
      <SectionHeader title={title} icon={History} />
      <Carousel opts={{ align: 'start', dragFree: true }}>
        <CarouselContent className="-ml-3">
          {list.map(item => (
            <CarouselItem key={item.productId} className="pl-3 basis-auto">
              <RecentCard item={item} onClick={() => vt.push(`/${item.slug}/product/${item.productId}`)} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  )
}

function RecentCard({ item, onClick }: { item: ReturnType<typeof useRecentlyViewed>['items'][number]; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <button onClick={onClick} className="relative group text-left rounded-2xl border border-border liquid-surface overflow-hidden w-36 shrink-0 transition-all hover:shadow-float hover:-translate-y-0.5 press">
      <div className="relative aspect-square bg-muted overflow-hidden">
        {item.image_url && !imgErr
          ? <Image src={item.image_url} alt="" fill sizes="144px" onError={() => setImgErr(true)} className="object-cover transition-transform duration-500 group-hover:scale-110" />
          : <div className="w-full h-full flex items-center justify-center"><Package size={22} className="text-muted-foreground" /></div>}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight mb-1 min-h-8">{item.name}</p>
        <p className="text-sm font-black text-foreground">{formatPrice(item.price)}</p>
      </div>
    </button>
  )
}
