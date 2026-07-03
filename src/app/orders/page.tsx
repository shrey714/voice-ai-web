'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<(OnlineOrder & { shop_name?: string; shop_slug?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all')

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) { router.replace('/auth?redirect=/orders'); return }

      const { data } = await supabase
        .from('online_orders')
        .select('*, online_shops(shop_name, shop_slug)')
        .eq('customer_user_id', session.session.user.id)
        .order('created_at', { ascending: false })

      setOrders((data ?? []).map((o: any) => ({
        ...o,
        shop_name: o.online_shops?.shop_name,
        shop_slug: o.online_shops?.shop_slug,
      })))
      setLoading(false)
    })()
  }, [])

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
            <Button variant="ghost" size="icon-sm" onClick={() => router.push('/')} className="text-muted-foreground -ml-1">
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

              return (
                <button
                  key={order.id}
                  onClick={() => router.push(`/${order.shop_slug}/order/${order.id}`)}
                  className={cn(
                    'w-full text-left bg-card rounded-2xl border overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
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
                        <p className="font-bold text-[15px] text-foreground truncate">{order.shop_name ?? 'Shop'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={sc.badgeVariant} className="text-[10px] capitalize">{sc.label}</Badge>
                        <ChevronRight size={15} className="text-muted-foreground" />
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
