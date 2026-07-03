'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Shop } from '@/lib/types'
import { isShopOpen } from '@/lib/shop'
import { useLocation } from '@/lib/location'
import { cn, distanceKm, formatDistance } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import {
  Bike, Clock, MapPin, Navigation, Share2, FileText, Ban, Loader2, LocateFixed,
} from 'lucide-react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface ShopInfoSheetProps {
  shop: Shop
  open: boolean
  onClose: () => void
}

export function ShopInfoSheet({ shop, open, onClose }: ShopInfoSheetProps) {
  const { selected } = useLocation()
  const shopOpen = isShopOpen(shop)
  const hasShopCoords = shop.latitude != null && shop.longitude != null

  const [deviceCoords, setDeviceCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [locateFailed, setLocateFailed] = useState(false)

  const customerCoords = selected?.latitude != null && selected?.longitude != null
    ? { latitude: selected.latitude, longitude: selected.longitude }
    : deviceCoords

  // No saved address with coords — fall back to a one-off device location lookup.
  useEffect(() => {
    if (!open || !hasShopCoords) return
    if (selected?.latitude != null && selected?.longitude != null) return
    if (deviceCoords || locating || locateFailed) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setLocateFailed(true); return }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setDeviceCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); setLocating(false) },
      () => { setLocateFailed(true); setLocating(false) },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    )
  }, [open, hasShopCoords, selected, deviceCoords, locating, locateFailed])

  const distance = hasShopCoords && customerCoords
    ? distanceKm(customerCoords, { latitude: shop.latitude!, longitude: shop.longitude! })
    : null

  const outOfDeliveryRange = shop.delivery_enabled && shop.delivery_radius_km != null
    && distance != null && distance > shop.delivery_radius_km
  const canDeliverHere = shop.delivery_enabled && !outOfDeliveryRange

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/${shop.shop_slug}` : ''
    const shareData = { title: shop.shop_name, text: `Check out ${shop.shop_name} on ShopNear`, url }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share(shareData) } catch { /* user cancelled */ }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Could not copy link')
    }
  }

  const today = new Date().getDay()

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-3xl p-0 sm:max-w-lg sm:mx-auto sm:bottom-4"
      >
        <SheetHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0 text-primary font-black text-base">
              {shop.shop_name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate">{shop.shop_name}</SheetTitle>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant={shopOpen ? 'open' : 'closed'} className="text-[11px]">
                  <span className={cn('size-1.5 rounded-full', shopOpen ? 'bg-success animate-pulse-live' : 'bg-muted-foreground')} />
                  {shopOpen ? 'Open' : 'Closed'}
                </Badge>
                {canDeliverHere ? (
                  <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                    <Bike size={11} /> Delivery available
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Ban size={11} /> Pickup only
                  </span>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Description */}
          {shop.description && (
            <div className="flex items-start gap-2.5">
              <FileText size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
              <p className="text-sm text-foreground leading-relaxed">{shop.description}</p>
            </div>
          )}

          {/* Address */}
          <div className="rounded-2xl border border-border bg-muted/40 p-3.5 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <MapPin size={15} className="mt-0.5 shrink-0 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Store address</p>
                <p className="text-sm text-foreground leading-relaxed mt-0.5">
                  {shop.address_text || 'Address not provided yet'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-[26px]">
              {hasShopCoords && (
                <a
                  href={`https://www.google.com/maps?q=${shop.latitude},${shop.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                >
                  <Navigation size={12} /> Get directions
                </a>
              )}

              {hasShopCoords && (
                distance != null ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <LocateFixed size={12} /> {formatDistance(distance)} away
                  </span>
                ) : locating ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Loader2 size={12} className="animate-spin" /> Finding distance…
                  </span>
                ) : locateFailed ? (
                  <span className="text-xs text-muted-foreground">Enable location to see distance</span>
                ) : null
              )}
            </div>
          </div>

          {/* Timings */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <Clock size={12} /> Shop timings
            </p>
            <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
              {DAYS.map((label, day) => {
                const slot = shop.schedule.find(s => s.day === day)
                const isToday = day === today
                return (
                  <div
                    key={day}
                    className={cn('flex items-center justify-between px-3.5 py-2 text-sm', isToday && 'bg-primary/5')}
                  >
                    <span className={cn('font-medium', isToday ? 'text-primary font-bold' : 'text-foreground')}>
                      {label}{isToday ? ' (Today)' : ''}
                    </span>
                    <span className={cn(slot ? 'text-foreground' : 'text-muted-foreground', 'font-medium')}>
                      {slot ? `${slot.open} – ${slot.close}` : 'Closed'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Share */}
          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-bold text-foreground hover:bg-muted transition-colors active:scale-[0.99]"
          >
            <Share2 size={15} /> Share this shop
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
