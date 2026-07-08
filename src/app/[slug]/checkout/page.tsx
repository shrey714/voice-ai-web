'use client'
import { useEffect, useState, useRef, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchShop, isShopOpen } from '@/lib/shop'
import { useIsShopOpen } from '@/lib/useIsShopOpen'
import { useCart } from '@/lib/cart'
import { supabase } from '@/lib/supabase'
import { Shop } from '@/lib/types'
import { useLocation } from '@/lib/location'
import { listAddresses } from '@/lib/addresses'
import { cn, formatPrice, distanceKm, formatDistance } from '@/lib/utils'
import { checkoutSchema } from '@/lib/validation/checkout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { BrandLoader } from '@/components/BrandLoader'
import { LocationPicker } from '@/components/LocationPicker'
import { EmptyState } from '@/components/EmptyState'
import {
  ArrowLeft, User, Phone, MapPin, FileText, Truck, Store,
  CheckCircle, AlertCircle, Loader2, Tag, Check, Wallet, Banknote, Navigation, Pencil, Clock, PartyPopper,
} from 'lucide-react'
import type { User as SupaUser } from '@supabase/supabase-js'

const COUPONS: Record<string, { pct: number; max: number; label: string }> = {
  LOCAL10: { pct: 10, max: 50, label: '10% off (up to ₹50)' },
  FRESH15: { pct: 15, max: 80, label: '15% off (up to ₹80)' },
}

function StepDot({ done, active, label, num }: { done: boolean; active: boolean; label: string; num: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={cn(
        'size-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
        done ? 'bg-primary text-primary-foreground'
          : active ? 'bg-primary/10 border-2 border-primary text-primary'
          : 'bg-muted text-muted-foreground',
      )}>
        {done ? <CheckCircle size={16} /> : num}
      </div>
      <span className={cn('text-[11px] font-medium', done || active ? 'text-primary' : 'text-muted-foreground')}>{label}</span>
    </div>
  )
}

export default function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [shop, setShop] = useState<Shop | null>(null)
  const [user, setUser] = useState<SupaUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const orderPlaced = useRef(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [wantsDelivery, setWantsDelivery] = useState(false)
  const [payment, setPayment] = useState<'cod' | 'store'>('cod')
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState<string | null>(null)
  const [couponMsg, setCouponMsg] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pickerOpen, setPickerOpen] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)

  // Measured, not guessed — same reasoning as ShopClient's headerRef: a
  // hardcoded sticky offset silently drifts out of sync the next time the
  // header's content changes (e.g. shop_name wrapping to a second line).
  const headerRef = useRef<HTMLElement>(null)
  const [headerHeight, setHeaderHeight] = useState(0)
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setHeaderHeight(entry.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cart = useCart(slug, shop?.shop_name)
  // Re-checked live (not just once on mount) — a cart can sit untouched for
  // days, and the shop could close while this exact tab is left open.
  const shopOpen = useIsShopOpen(shop)
  const { selected, setSelected } = useLocation()

  const clearFieldError = (field: string) =>
    setFieldErrors(prev => (prev[field] ? { ...prev, [field]: '' } : prev))

  useEffect(() => {
    (async () => {
      const [s, { data: sessionData }] = await Promise.all([
        fetchShop(slug),
        supabase.auth.getSession(),
      ])
      if (!sessionData.session) { router.replace(`/auth?redirect=/${slug}/checkout`); return }
      setShop(s)
      setUser(sessionData.session.user)
      const authPhone = sessionData.session.user.phone ?? ''
      if (authPhone) setPhone(authPhone.replace('+91', '').replace(/\D/g, ''))

      const saved = await listAddresses()

      if (selected) {
        // Respect whatever's already selected app-wide (header/shop page) —
        // a saved address, "Use current location", or a search result, all
        // of which set addressId: null — instead of silently swapping in an
        // unrelated default saved address underneath the customer. This also
        // keeps the delivery-range check (computed from `selected`'s actual
        // coordinates) and the address text sent to the shop pointing at the
        // same place.
        if (selected.formatted_address && s?.delivery_enabled) {
          setAddress(selected.formatted_address)
          setWantsDelivery(true)
        }
        const linked = saved.find(a => a.id === selected.addressId)
        if (linked?.receiver_name) setName(linked.receiver_name)
        if (linked?.receiver_phone) setPhone(linked.receiver_phone.replace(/\D/g, ''))
      } else {
        // Nothing selected anywhere yet — prefill from the default saved address.
        const active = saved.find(a => a.is_default)
        if (active) {
          if (active.receiver_name) setName(active.receiver_name)
          if (active.receiver_phone) setPhone(active.receiver_phone.replace(/\D/g, ''))
          if (s?.delivery_enabled) {
            setAddress(active.formatted_address)
            setWantsDelivery(true)
          }
          setSelected({
            addressId: active.id, label: active.label, formatted_address: active.formatted_address,
            area: active.area, city: active.city, pincode: active.pincode,
            latitude: active.latitude, longitude: active.longitude,
          })
        }
      }
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  // Keep the address field in sync when the user switches location via the picker.
  useEffect(() => {
    if (selected?.formatted_address && shop?.delivery_enabled) {
      setAddress(selected.formatted_address)
      if (!outOfDeliveryRange) setWantsDelivery(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.addressId, selected?.formatted_address])

  useEffect(() => {
    if (!loading && shop && cart.count === 0 && !orderPlaced.current) router.replace(`/${slug}`)
  }, [loading, shop, cart.count, slug, router])

  const distanceToShop = selected?.latitude != null && selected?.longitude != null
    && shop?.latitude != null && shop?.longitude != null
    ? distanceKm({ latitude: selected.latitude, longitude: selected.longitude }, { latitude: shop.latitude, longitude: shop.longitude })
    : null
  const outOfDeliveryRange = !!shop?.delivery_enabled && shop?.delivery_radius_km != null
    && distanceToShop != null && distanceToShop > shop.delivery_radius_km

  // If the customer's location puts them outside this shop's delivery radius, force pickup.
  useEffect(() => {
    if (outOfDeliveryRange && wantsDelivery) setWantsDelivery(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outOfDeliveryRange])

  if (loading || !shop) return <BrandLoader label="Loading checkout…" />

  if (!shopOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <EmptyState
          icon={Clock}
          title="Shop is currently closed"
          description="This shop isn't taking orders right now. Your cart is still saved — come back once they reopen."
          action={
            <Button asChild variant="secondary">
              <Link href={`/${slug}`}>← Back to shop</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const deliveryFee = wantsDelivery && shop.delivery_enabled ? shop.delivery_fee : 0
  const subtotal = cart.total
  const discount = coupon
    ? Math.min(COUPONS[coupon].max, Math.round((subtotal * COUPONS[coupon].pct) / 100))
    : 0
  const total = Math.max(0, subtotal + deliveryFee - discount)
  const belowMin = shop.min_order_amount > 0 && subtotal < shop.min_order_amount
  const canPlace = !placing && !belowMin && name.trim().length >= 2
    && phone.replace(/\D/g, '').length === 10
    && (!wantsDelivery || !!address.trim())

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    if (COUPONS[code]) { setCoupon(code); setCouponMsg('') }
    else { setCoupon(null); setCouponMsg('Invalid coupon code') }
  }

  const handlePlaceOrder = async () => {
    // Guard against a fast double-tap (common on mobile) placing two orders:
    // `placing` only flips true after sync validation below, so without this a
    // second click could re-enter before the button re-renders as disabled.
    if (placing || orderPlaced.current) return
    if (belowMin) { setError(`Minimum order is ${formatPrice(shop.min_order_amount)}.`); return }

    // Re-fetch live shop status right before submitting — `shop` was loaded
    // on mount and the periodic isShopOpen check only ticks every 30s, so a
    // shop that closes in that window shouldn't slip an order through.
    const liveShop = await fetchShop(slug)
    if (!liveShop || !isShopOpen(liveShop)) {
      setShop(liveShop)
      return
    }

    const items = cart.items.map(i => ({
      productId: i.productId,
      productName: i.name,
      quantity: i.quantity,
      unitPrice: i.price,
      totalPrice: i.price * i.quantity,
    }))

    const parsed = checkoutSchema.safeParse({
      name, phone, wantsDelivery, address, note, items, subtotal, deliveryFee, total,
    })
    if (!parsed.success) {
      // Map every issue to its field so each input can show an associated,
      // announced error — not just a single generic banner.
      const errs: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form')
        if (!errs[key]) errs[key] = issue.message
      }
      setFieldErrors(errs)
      setError(parsed.error.issues[0].message)
      // Send the user straight to the first problem.
      if (errs.name) nameRef.current?.focus()
      else if (errs.phone) phoneRef.current?.focus()
      else if (errs.address) setPickerOpen(true)
      return
    }

    setFieldErrors({})
    setError('')
    setPlacing(true)

    const noteParts = [parsed.data.note ?? '']
    noteParts.push(`Payment: ${payment === 'cod' ? 'Cash on delivery' : 'Pay at store'}`)
    if (coupon) noteParts.push(`Coupon ${coupon} (−${formatPrice(discount)})`)
    const finalNote = noteParts.filter(Boolean).join(' · ')

    // Falls back to 10 minutes if the shopkeeper never touched this setting
    // (older shops / a zero value shouldn't mean "cancel instantly").
    const timeoutMinutes = shop.order_timeout_minutes > 0 ? shop.order_timeout_minutes : 10

    const { data, error: err } = await supabase
      .from('online_orders')
      .insert({
        shop_id: shop.id,
        customer_user_id: user?.id ?? null,
        customer_name: parsed.data.name,
        customer_phone: parsed.data.phone,
        customer_address: wantsDelivery ? parsed.data.address : null,
        items: parsed.data.items,
        subtotal: parsed.data.subtotal,
        delivery_fee: parsed.data.deliveryFee,
        total: parsed.data.total,
        status: 'pending',
        note: finalNote || null,
        expires_at: new Date(Date.now() + timeoutMinutes * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    setPlacing(false)
    if (err || !data) {
      // The DB re-validates price/stock/min-order/shop-status at insert time
      // (see supabase/schema.sql's validate_order_before_insert trigger and
      // is_shop_open policy) and raises a specific, customer-facing message
      // when something changed since the cart was filled — surface that
      // instead of a dead-end generic error.
      setError(err?.message || 'Could not place order. Please try again.')
      return
    }

    orderPlaced.current = true
    cart.clearCart()
    // Auto-cancel is enforced server-side by a Supabase pg_cron job that
    // cancels any 'pending' order past its `expires_at` (set above) — see
    // supabase/schema.sql section 14. Nothing to trigger from here.
    router.replace(`/${slug}/order/${data.id}`)
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header ref={headerRef} className="sticky top-0 z-40 liquid-glass-strong liquid-edge border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-14">
            {/* Explicit destination, not router.back() — checkout can be
                reopened fresh (bookmark, PWA relaunch, refresh) with no
                history to go back to. The shop is the unambiguous parent. */}
            <Button variant="ghost" size="icon-sm" onClick={() => router.push(`/${slug}`)} className="text-muted-foreground -ml-1" aria-label="Back to shop">
              <ArrowLeft size={18} />
            </Button>
            <div className="min-w-0">
              <h1 className="font-bold text-base leading-tight text-foreground">Checkout</h1>
              <p className="text-xs text-muted-foreground truncate">{shop.shop_name}</p>
            </div>
          </div>
          <div className="flex items-center pb-4 relative">
            <div className="absolute left-[10%] right-[10%] top-4 h-px bg-border -z-0" />
            <div className="relative z-10 flex items-start justify-between w-full">
              <StepDot done active={false} label="Cart" num={1} />
              <StepDot done={false} active label="Details" num={2} />
              <StepDot done={false} active={false} label="Confirm" num={3} />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <form
          onSubmit={e => { e.preventDefault(); handlePlaceOrder() }}
          className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5"
        >
          {/* Left: form */}
          <div className="space-y-4">
            {/* Details */}
            <div className="relative liquid-surface rounded-2xl border border-border p-5 space-y-4">
              <div>
                <h2 className="font-bold text-base text-foreground">Your Details</h2>
                <p className="text-xs text-muted-foreground mt-0.5">So the shop can prepare and reach you about your order</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="checkout-name">Full name</Label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="checkout-name"
                      ref={nameRef}
                      name="name"
                      autoComplete="name"
                      autoCapitalize="words"
                      placeholder="e.g. Aarav Sharma"
                      value={name}
                      onChange={e => { setName(e.target.value); clearFieldError('name') }}
                      aria-invalid={!!fieldErrors.name}
                      aria-describedby={fieldErrors.name ? 'checkout-name-error' : undefined}
                      className="pl-10"
                    />
                  </div>
                  {fieldErrors.name && (
                    <p id="checkout-name-error" role="alert" className="text-xs font-medium text-destructive">{fieldErrors.name}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="checkout-phone">Phone number</Label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="checkout-phone"
                      ref={phoneRef}
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={phone}
                      onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); clearFieldError('phone') }}
                      aria-invalid={!!fieldErrors.phone}
                      aria-describedby={fieldErrors.phone ? 'checkout-phone-error' : undefined}
                      className="pl-10"
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p id="checkout-phone-error" role="alert" className="text-xs font-medium text-destructive">{fieldErrors.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery */}
            {shop.delivery_enabled && (
              <div className="relative liquid-surface rounded-2xl border border-border p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('size-10 rounded-xl flex items-center justify-center transition-all', wantsDelivery ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                      <Truck size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">Home Delivery</p>
                      <p className="text-xs text-muted-foreground">
                        {outOfDeliveryRange
                          ? 'Not available at your location'
                          : shop.delivery_fee > 0 ? `+${formatPrice(shop.delivery_fee)} charge` : 'Free delivery'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => !outOfDeliveryRange && setWantsDelivery(v => !v)}
                    role="switch"
                    aria-checked={wantsDelivery}
                    aria-label="Home delivery"
                    disabled={outOfDeliveryRange}
                    className={cn(
                      'w-11 h-6 rounded-full relative transition-all shrink-0',
                      outOfDeliveryRange ? 'bg-muted cursor-not-allowed' : wantsDelivery ? 'bg-primary' : 'bg-border',
                    )}
                  >
                    <span className={cn('absolute top-0.5 size-5 bg-white rounded-full shadow-sm transition-all', wantsDelivery ? 'left-[22px]' : 'left-0.5')} />
                  </button>
                </div>
                {outOfDeliveryRange && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning/10 p-3">
                    <AlertCircle size={15} className="mt-0.5 shrink-0 text-warning" />
                    <p className="text-xs text-warning">
                      You&apos;re {formatDistance(distanceToShop!)} away — outside this shop&apos;s {shop.delivery_radius_km} km delivery range. Pickup from store is available below.
                    </p>
                  </div>
                )}
                {!outOfDeliveryRange && wantsDelivery && (
                  <div className="space-y-2.5 animate-fade-in">
                    {address.trim() ? (
                      <div className="flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary/5 p-3">
                        <MapPin size={15} className="mt-0.5 shrink-0 text-primary" />
                        <div className="flex-1 min-w-0">
                          {selected?.label && <p className="text-xs font-bold text-primary">{selected.label}</p>}
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{address.trim()}</p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setPickerOpen(true)} className="shrink-0 -my-1 -mr-1 h-8 gap-1 text-xs">
                          <Pencil size={12} /> Change
                        </Button>
                      </div>
                    ) : (
                      <div className={cn('rounded-xl border p-3 space-y-2.5', fieldErrors.address ? 'border-destructive/30 bg-destructive/10' : 'border-warning/25 bg-warning/10')}>
                        <div className="flex items-start gap-2.5">
                          <AlertCircle size={15} className={cn('mt-0.5 shrink-0', fieldErrors.address ? 'text-destructive' : 'text-warning')} />
                          <p id="checkout-address-error" role={fieldErrors.address ? 'alert' : undefined} className={cn('text-xs', fieldErrors.address ? 'text-destructive font-medium' : 'text-warning')}>
                            {fieldErrors.address || 'Add a delivery address so the shop knows where to send your order.'}
                          </p>
                        </div>
                        <Button type="button" size="sm" onClick={() => setPickerOpen(true)} className="w-full gap-1.5">
                          <MapPin size={14} /> Choose delivery location
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Payment */}
            <div className="relative liquid-surface rounded-2xl border border-border p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Wallet size={15} className="text-muted-foreground" />
                <p className="font-bold text-sm text-foreground">Payment Method</p>
              </div>
              <RadioGroup value={payment} onValueChange={v => setPayment(v as 'cod' | 'store')} className="gap-2">
                <Label htmlFor="pay-cod" className={cn('flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all duration-200', payment === 'cod' ? 'border-primary bg-primary/5 shadow-soft' : 'border-border hover:bg-muted')}>
                  <RadioGroupItem value="cod" id="pay-cod" />
                  <Banknote size={16} className="text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{wantsDelivery ? 'Cash on Delivery' : 'Pay in cash'}</span>
                  {payment === 'cod' && <Check size={16} className="ml-auto text-primary animate-scale-in" />}
                </Label>
                <Label htmlFor="pay-store" className={cn('flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all duration-200', payment === 'store' ? 'border-primary bg-primary/5 shadow-soft' : 'border-border hover:bg-muted')}>
                  <RadioGroupItem value="store" id="pay-store" />
                  <Store size={16} className="text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Pay at Store</span>
                  {payment === 'store' && <Check size={16} className="ml-auto text-primary animate-scale-in" />}
                </Label>
              </RadioGroup>
            </div>

            {/* Note */}
            <div className="relative liquid-surface rounded-2xl border border-border p-5 space-y-3">
              <Label htmlFor="checkout-note" className="flex items-center gap-2">
                <FileText size={15} className="text-muted-foreground" />
                <span className="font-bold text-sm text-foreground">Special Instructions</span>
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input id="checkout-note" name="note" maxLength={300} placeholder="E.g. ring the doorbell twice…" value={note} onChange={e => setNote(e.target.value)} />
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-2xl border border-destructive/25 bg-destructive/10 animate-fade-in">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-destructive" />
                <p className="text-sm font-semibold text-destructive">{error}</p>
              </div>
            )}
          </div>

          {/* Right: summary */}
          <div className="space-y-4">
            <div className="relative liquid-surface rounded-2xl border border-border p-5 space-y-4 lg:sticky" style={{ top: headerHeight }}>
              <h2 className="font-bold text-base text-foreground">Order Summary</h2>

              {/* Where this order is going */}
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                {wantsDelivery ? (
                  <div className="flex items-start gap-2.5">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        Delivering to{selected?.label ? ` · ${selected.label}` : ''}
                      </p>
                      <p className="text-xs text-foreground leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
                        {address.trim() || 'Select your location from the header'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5">
                    <Store size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Pickup at store</p>
                      <p className="text-xs text-foreground leading-relaxed mt-0.5">
                        {shop.address_text || shop.shop_name}
                        {shop.delivery_enabled ? ' · Turn on Home Delivery to get it delivered' : ''}
                      </p>
                      {shop.latitude != null && shop.longitude != null && (
                        <a
                          href={`https://www.google.com/maps?q=${shop.latitude},${shop.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-1.5"
                        >
                          <Navigation size={12} />
                          Get directions
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                {cart.items.map(item => (
                  <div key={item.productId} className="flex items-start gap-3">
                    <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[11px] font-black shrink-0 mt-0.5">{item.quantity}×</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight truncate text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatPrice(item.price)} each</p>
                    </div>
                    <p className="text-sm font-bold shrink-0 text-foreground">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Coupon */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      aria-label="Coupon code"
                      placeholder="Coupon code"
                      value={couponInput}
                      onChange={e => { setCouponInput(e.target.value); setCouponMsg('') }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon() } }}
                      className="pl-9 h-9 text-sm uppercase"
                    />
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={applyCoupon} className="h-9">Apply</Button>
                </div>
                {coupon && (
                  <p className="text-xs text-success font-medium flex items-center gap-1"><Check size={12} /> {coupon} applied — {COUPONS[coupon].label}</p>
                )}
                {couponMsg && <p className="text-xs text-destructive font-medium">{couponMsg}</p>}
                {!coupon && !couponMsg && <p className="text-[11px] text-muted-foreground">Try <span className="font-semibold">LOCAL10</span> or <span className="font-semibold">FRESH15</span></p>}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({cart.count} items)</span>
                  <span className="font-semibold text-foreground">{formatPrice(subtotal)}</span>
                </div>
                {wantsDelivery && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1"><Truck size={12} /> Delivery</span>
                    <span className={cn('font-semibold', shop.delivery_fee === 0 ? 'text-success' : 'text-foreground')}>{shop.delivery_fee > 0 ? formatPrice(deliveryFee) : 'Free'}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1"><Tag size={12} /> Discount</span>
                    <span className="font-semibold text-success">−{formatPrice(discount)}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-bold text-base text-foreground">Total</span>
                <span className="font-black text-xl text-primary tracking-tight">{formatPrice(total)}</span>
              </div>
              {discount > 0 && (
                <p className="text-xs text-success font-semibold text-right -mt-1 flex items-center justify-end gap-1">
                  You save <span key={discount} className="inline-block animate-count">{formatPrice(discount)}</span>
                  <PartyPopper size={12} className="shrink-0" />
                </p>
              )}

              {belowMin && (
                <div className="text-xs rounded-xl px-3 py-2.5 font-medium border border-warning/25 bg-warning/10 text-warning">
                  Add {formatPrice(shop.min_order_amount - subtotal)} more to reach the minimum order of {formatPrice(shop.min_order_amount)}.
                </div>
              )}

              {error && (
                <p role="alert" className="text-xs font-medium text-destructive flex items-start gap-1.5">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
                </p>
              )}

              <Button type="submit" className={cn('w-full gap-2 h-11', canPlace && 'animate-pulse-ready')} size="lg" disabled={placing || belowMin}>
                {placing ? <><Loader2 size={17} className="animate-spin" /> Placing order…</> : <><CheckCircle size={17} /> Place Order · {formatPrice(total)}</>}
              </Button>

              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                By placing your order you agree to our{' '}
                <Link href="/terms" target="_blank" className="text-primary font-semibold hover:underline">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" className="text-primary font-semibold hover:underline">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* Inline delivery-location picker — writes to the shared location store,
          which the sync effect above reads back into the address field. */}
      <LocationPicker open={pickerOpen} onOpenChange={setPickerOpen} />
    </div>
  )
}
