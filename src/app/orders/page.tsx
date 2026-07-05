'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryState, parseAsStringEnum } from 'nuqs'
import { supabase } from '@/lib/supabase'
import { OnlineOrder } from '@/lib/types'
import { cn, formatPrice, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/EmptyState'
import {
  ArrowLeft, ShoppingBag, Clock, CheckCircle, XCircle,
  Package, Star, AlertCircle, ChevronRight, Store,
} from 'lucide-react'

const STATUS_MAP = {
  pending:   { label: 'Pending',   badgeVariant: 'pending' as const,     Icon: Clock },
  accepted:  { label: 'Confirmed', badgeVariant: 'success' as const,     Icon: CheckCircle },
  ready:     { label: 'Ready',     badgeVariant: 'success' as const,     Icon: Package },
  completed: { label: 'Delivered', badgeVariant: 'success' as const,     Icon: Star },
  rejected:  { label: 'Rejected',  badgeVariant: 'destructive' as const, Icon: XCircle },
  cancelled: { label: 'Cancelled', badgeVariant: 'destructive' as const, Icon: AlertCircle },
} as const

function OrderSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="size-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <div className="flex justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  )
}

type OrderRow = OnlineOrder & { shop_name?: string; shop_slug?: string }
// Shape of a single row from the joined query below — `online_shops` comes
// back as the related row (or null if the shop was deleted) via the FK join.
type OrderJoinRow = OnlineOrder & { online_shops: { shop_name: string; shop_slug: string } | null }

function OrdersPageInner() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  // Refresh-persistent and shareable (e.g. a support agent linking a customer
  // straight to their active orders) — same reasoning as the shop page's
  // search/filters, see ShopClient.tsx's filterParsers comment.
  const [filter, setFilter] = useQueryState('filter', parseAsStringEnum(['all', 'active', 'done'] as const).withDefault('all').withOptions({ history: 'replace' }))
  // Read inside the mount-only effect below without making it re-run (and
  // refetch every order) on every tab switch — same ref pattern ShopClient
  // uses to keep callbacks stable while reading the latest value.
  const filterRef = useRef(filter)
  useEffect(() => { filterRef.current = filter })

  const loadOrders = () => {
    setLoading(true)
    setLoadError(false)
    ;(async () => {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        // Preserve ?filter=... across the auth detour — otherwise a shared
        // "check your active orders" link loses its filter for anyone who
        // wasn't already signed in.
        const f = filterRef.current
        const redirectTo = f !== 'all' ? `/orders?filter=${f}` : '/orders'
        router.replace(`/auth?redirect=${encodeURIComponent(redirectTo)}`)
        return
      }

      const { data, error } = await supabase
        .from('online_orders')
        .select('*, online_shops(shop_name, shop_slug)')
        .eq('customer_user_id', session.session.user.id)
        .order('created_at', { ascending: false })
        .returns<OrderJoinRow[]>()

      if (error) console.error('[orders-fetch]', error)
      setOrders((data ?? []).map(o => ({
        ...o,
        shop_name: o.online_shops?.shop_name,
        shop_slug: o.online_shops?.shop_slug,
      })))
      setLoadError(!!error)
      setLoading(false)
    })()
  }

  useEffect(loadOrders, [router])

  const activeStatuses = ['pending', 'accepted', 'ready']
  const filtered = filter === 'active'
    ? orders.filter(o => activeStatuses.includes(o.status))
    : filter === 'done'
    ? orders.filter(o => !activeStatuses.includes(o.status))
    : orders

  const activeCount = orders.filter(o => activeStatuses.includes(o.status)).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-14">
            <Button variant="ghost" size="icon-sm" onClick={() => router.push('/')} className="text-muted-foreground -ml-1" aria-label="Back to shops">
              <ArrowLeft size={18} />
            </Button>
            <div className="flex-1">
              <h1 className="font-bold text-base leading-tight text-foreground">My Orders</h1>
              {!loading && <p className="text-xs text-muted-foreground">{orders.length} total order{orders.length !== 1 ? 's' : ''}</p>}
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 pb-3">
            {([
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active', count: activeCount },
              { key: 'done', label: 'Past' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all',
                  filter === tab.key ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-border',
                )}
              >
                {tab.label}
                {'count' in tab && tab.count > 0 && (
                  <span className={cn('size-4 rounded-full flex items-center justify-center text-[10px] font-black', filter === tab.key ? 'bg-primary-foreground/25 text-primary-foreground' : 'bg-border text-muted-foreground')}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <OrderSkeleton key={i} />)}</div>
        ) : loadError ? (
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load your orders"
            description="Something went wrong. Please try again."
            action={<Button variant="secondary" size="sm" onClick={loadOrders}>Retry</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title={filter !== 'all' ? 'No orders here' : 'No orders yet'}
            description={
              filter === 'active' ? 'You have no active orders right now.'
                : filter === 'done' ? 'Your completed orders will appear here.'
                : 'Place your first order from a nearby shop!'
            }
            action={<Button onClick={() => router.push('/')} className="gap-2"><Store size={15} /> Browse Shops</Button>}
          />
        ) : (
          <div className="stagger space-y-3">
            {filtered.map(order => {
              const sc = STATUS_MAP[order.status] ?? STATUS_MAP.pending
              const StatusIcon = sc.Icon
              const isActive = activeStatuses.includes(order.status)

              // The order-tracking route needs the shop slug; if the shop was
              // deleted the join returns null, so guard against a dead
              // `/undefined/order/...` navigation.
              const hasShop = !!order.shop_slug

              return (
                <button
                  key={order.id}
                  onClick={() => hasShop && router.push(`/${order.shop_slug}/order/${order.id}`)}
                  disabled={!hasShop}
                  aria-label={hasShop ? `View order from ${order.shop_name ?? 'shop'}` : undefined}
                  className={cn(
                    'w-full text-left bg-card rounded-2xl border overflow-hidden transition-all duration-200',
                    hasShop ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : 'cursor-default',
                    isActive ? 'border-primary/25 ring-1 ring-primary/10' : 'border-border hover:border-primary/20',
                  )}
                >
                  {isActive && <div className="h-0.5 bg-gradient-to-r from-primary to-primary/60" />}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0', isActive ? 'bg-primary/10' : 'bg-muted')}>
                        <StatusIcon size={18} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[15px] text-foreground truncate">{order.shop_name ?? 'Shop no longer available'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={sc.badgeVariant} className="text-[10px] capitalize">{sc.label}</Badge>
                        {hasShop && <ChevronRight size={15} className="text-muted-foreground" />}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground truncate">
                      {order.items.map(i => `${i.quantity}× ${i.productName}`).join(', ')}
                    </p>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground bg-muted border border-border rounded-lg px-2.5 py-1">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </span>
                      <span className="font-black text-base text-foreground">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersPageInner />
    </Suspense>
  )
}
