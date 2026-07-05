'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { OnlineOrder, OrderStatus } from '@/lib/types'
import { cn, formatPrice, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Confetti } from '@/components/Confetti'
import { BrandLoader } from '@/components/BrandLoader'
import {
  ArrowLeft, CheckCircle, XCircle, Clock,
  Package, Truck, Star, AlertCircle, RefreshCw, MapPin,
  Phone, User, Repeat2,
} from 'lucide-react'

type Tone = 'warning' | 'success' | 'destructive'

const STATUS_META: Record<OrderStatus, {
  label: string; sub: string; tone: Tone; Icon: React.ElementType
  badgeVariant: 'pending' | 'success' | 'destructive'; progress: number
}> = {
  pending: {
    label: 'Order Received', sub: 'Waiting for the shop to confirm your order…',
    tone: 'warning', Icon: Clock, badgeVariant: 'pending', progress: 10,
  },
  accepted: {
    label: 'Order Confirmed!', sub: 'The shop is preparing your items right now.',
    tone: 'success', Icon: CheckCircle, badgeVariant: 'success', progress: 40,
  },
  ready: {
    label: 'Ready!', sub: 'Your order is packed and ready for pickup or delivery.',
    tone: 'success', Icon: Package, badgeVariant: 'success', progress: 75,
  },
  completed: {
    label: 'Order Delivered', sub: 'Thank you for shopping with us! We hope to see you again.',
    tone: 'success', Icon: Star, badgeVariant: 'success', progress: 100,
  },
  rejected: {
    label: 'Order Rejected', sub: "The shop couldn't take your order this time. Please try again.",
    tone: 'destructive', Icon: XCircle, badgeVariant: 'destructive', progress: 0,
  },
  cancelled: {
    label: 'Order Cancelled', sub: "This order was cancelled as it wasn't confirmed in time.",
    tone: 'destructive', Icon: AlertCircle, badgeVariant: 'destructive', progress: 0,
  },
}

const TONE: Record<Tone, { text: string; bg: string; border: string; dot: string }> = {
  warning: { text: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/25', dot: 'bg-warning' },
  success: { text: 'text-success', bg: 'bg-success/10', border: 'border-success/25', dot: 'bg-success' },
  destructive: { text: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/25', dot: 'bg-destructive' },
}

const STEPS: { key: OrderStatus; label: string; Icon: React.ElementType }[] = [
  { key: 'pending', label: 'Received', Icon: Clock },
  { key: 'accepted', label: 'Confirmed', Icon: CheckCircle },
  { key: 'ready', label: 'Ready', Icon: Package },
  { key: 'completed', label: 'Delivered', Icon: Star },
]

export default function OrderStatusPage({ params }: { params: Promise<{ slug: string; orderId: string }> }) {
  const { slug, orderId } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<OnlineOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => {
    // First-order celebration — fires once per browser
    if (typeof window !== 'undefined' && !localStorage.getItem('sk-celebrated')) {
      localStorage.setItem('sk-celebrated', '1')
      setCelebrate(true)
    }
  }, [])

  useEffect(() => {
    supabase.from('online_orders').select('*').eq('id', orderId).single()
      .then(({ data, error }) => {
        if (error) console.error('[order-fetch]', error)
        setOrder(data)
        setLoadError(!!error)
        setLoading(false)
      })

    const channel = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'online_orders', filter: `id=eq.${orderId}`,
      }, payload => setOrder(payload.new as OnlineOrder))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orderId])

  if (loading) return <BrandLoader label="Loading your order…" />

  if (!order) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <AlertCircle size={32} className="text-muted-foreground mx-auto" />
        <p className="font-bold text-foreground">{loadError ? "Couldn't load this order" : 'Order not found'}</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          {loadError
            ? 'Something went wrong while fetching your order. Please try again.'
            : "This order doesn't exist or may have been removed."}
        </p>
        <div className="flex items-center justify-center gap-2">
          {loadError && (
            <Button size="sm" onClick={() => window.location.reload()}>Retry</Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => router.push(`/${slug}`)}>Back to shop</Button>
        </div>
      </div>
    </div>
  )

  const meta = STATUS_META[order.status]
  const tone = TONE[meta.tone]
  const StatusIcon = meta.Icon
  const isTerminal = ['completed', 'rejected', 'cancelled'].includes(order.status)
  const isFailed = ['rejected', 'cancelled'].includes(order.status)
  const isSuccess = meta.tone === 'success'
  // Pickup orders have no delivery address — relabel so the timeline and
  // headings don't promise "Delivered" for something collected from the store.
  const isPickup = !order.customer_address
  const steps = isPickup
    ? STEPS.map(s => (s.key === 'completed' ? { ...s, label: 'Picked Up' } : s))
    : STEPS
  const heroLabel = isPickup && order.status === 'completed' ? 'Order Picked Up' : meta.label
  const currentStepIdx = steps.findIndex(s => s.key === order.status)

  return (
    <div className="min-h-screen bg-background">
      {celebrate && !isFailed && <Confetti />}
      {/* Header */}
      <header className="sticky top-0 z-40 liquid-glass-strong border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-14">
            <Button variant="ghost" size="icon-sm" onClick={() => router.push(`/${slug}`)} className="text-muted-foreground -ml-1" aria-label="Back to shop">
              <ArrowLeft size={18} />
            </Button>
            <div className="flex-1">
              <h1 className="font-bold text-[15px] leading-tight text-foreground">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
              <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
            </div>
            {!isTerminal && (
              <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                <RefreshCw size={12} className="animate-spin-slow" /> Live
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
        {/* Status hero */}
        <div className={cn('rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-scale-in', tone.bg, tone.border)}>
          <div className="relative size-14 rounded-2xl flex items-center justify-center shrink-0 bg-background/60 shadow-sm">
            {isSuccess && !isTerminal && <span className={cn('absolute inset-0 rounded-2xl animate-ping-ring', tone.dot)} />}
            <StatusIcon size={26} className={cn(tone.text, 'relative', isSuccess && 'animate-bounce-in')} />
          </div>
          <div className="flex-1">
            <h2 className={cn('text-xl font-black tracking-tight mb-0.5 flex items-center gap-1.5', tone.text)}>
              {heroLabel}{order.status === 'completed' && ' ✓'}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{meta.sub}</p>
          </div>
          <Badge variant={meta.badgeVariant} className="shrink-0 text-xs capitalize">{order.status}</Badge>
        </div>

        {/* Progress tracker */}
        {!isFailed && (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4 animate-fade-in">
            <Progress value={meta.progress} className="h-1.5" />
            <div className="relative flex items-start justify-between">
              <div className="absolute top-[14px] left-[14px] right-[14px] h-px bg-border -z-0" />
              {steps.map((step, i) => {
                const StepIcon = step.Icon
                const done = i < currentStepIdx
                const active = i === currentStepIdx
                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center gap-1.5 flex-1">
                    <div className={cn(
                      'size-7 rounded-full flex items-center justify-center transition-all duration-300',
                      done ? 'bg-primary text-primary-foreground'
                        : active ? 'bg-primary/10 border-2 border-primary text-primary'
                        : 'bg-muted border border-border text-muted-foreground',
                    )}>
                      {done ? <CheckCircle size={14} /> : <StepIcon size={12} />}
                    </div>
                    <span className={cn('text-[10px] font-bold text-center leading-tight px-0.5', done || active ? 'text-primary' : 'text-muted-foreground')}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Delivery / pickup details */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
            <h3 className="font-bold text-sm text-foreground">{isPickup ? 'Pickup Details' : 'Delivery Details'}</h3>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <User size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Name</p>
                  <p className="text-sm font-semibold text-foreground">{order.customer_name}</p>
                </div>
              </div>
              {order.customer_phone && (
                <div className="flex items-start gap-2.5">
                  <Phone size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Phone</p>
                    <a href={`tel:${order.customer_phone}`} className="text-sm font-semibold text-primary hover:underline">{order.customer_phone}</a>
                  </div>
                </div>
              )}
              {order.customer_address && (
                <div className="flex items-start gap-2.5">
                  <MapPin size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Address</p>
                    <p className="text-sm font-semibold leading-snug text-foreground">{order.customer_address}</p>
                  </div>
                </div>
              )}
              {order.note && (
                <div className="p-2.5 bg-muted rounded-xl text-xs text-muted-foreground italic border border-border">&quot;{order.note}&quot;</div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
            <h3 className="font-bold text-sm text-foreground">Items Ordered</h3>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="size-6 rounded-lg bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0">{item.quantity}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">{formatPrice(item.unitPrice)} each</p>
                  </div>
                  <p className="text-sm font-bold shrink-0 text-foreground">{formatPrice(item.totalPrice)}</p>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-foreground">{formatPrice(order.subtotal)}</span>
              </div>
              {order.delivery_fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><Truck size={11} /> Delivery</span>
                  <span className="font-semibold text-foreground">{formatPrice(order.delivery_fee)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-base text-foreground">Total</span>
                <span className="font-black text-lg text-primary">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live update notice */}
        {!isTerminal && (
          <div className="flex items-center gap-2.5 p-3.5 bg-primary/8 border border-primary/20 rounded-2xl animate-fade-in">
            <RefreshCw size={14} className="text-primary animate-spin-slow shrink-0" />
            <p className="text-sm font-semibold text-primary">This page updates automatically — no need to refresh.</p>
          </div>
        )}

        {isTerminal && (
          <Button className="w-full gap-2 h-11" onClick={() => router.push(`/${slug}`)}>
            <Repeat2 size={16} /> Order Again
          </Button>
        )}
      </div>
    </div>
  )
}
