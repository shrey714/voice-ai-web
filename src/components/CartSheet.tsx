'use client'
import { useCart } from '@/lib/cart'
import { useIsShopOpen } from '@/lib/useIsShopOpen'
import { Shop } from '@/lib/types'
import { formatPrice } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { ShoppingCart, Minus, Plus, Trash2, ArrowRight, Clock } from 'lucide-react'

interface CartSheetProps {
  cart: ReturnType<typeof useCart>
  shop: Shop
  onCheckout: () => void
  open: boolean
  onClose: () => void
}

export function CartSheet({ cart, shop, onCheckout, open, onClose }: CartSheetProps) {
  const subtotal = cart.total
  const belowMin = shop.min_order_amount > 0 && subtotal < shop.min_order_amount
  // Items can sit in the cart across a browser restart, well past whenever the
  // shop closed — re-check live status here instead of trusting the cart's
  // mere presence as permission to check out.
  const shopOpen = useIsShopOpen(shop)

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary" />
            Your Cart
            {cart.count > 0 && <Badge variant="default" className="text-xs ml-1">{cart.count}</Badge>}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {cart.items.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Your cart is empty"
              description="Add items to get started with your order."
              size="sm"
            />
          ) : (
            <div className="space-y-2.5 p-4">
              {cart.items.map(item => (
                <div key={item.productId} className="flex items-center gap-3 p-3 bg-muted/60 rounded-xl border border-border/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatPrice(item.price)} · {item.unit}</p>
                  </div>
                  <div className="flex items-center liquid-surface rounded-lg overflow-hidden shrink-0">
                    <button
                      onClick={() => cart.updateQty(item.productId, item.quantity - 1)}
                      aria-label={item.quantity === 1 ? `Remove ${item.name} from cart` : 'Decrease quantity'}
                      className="size-7 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                    >
                      {item.quantity === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                    </button>
                    <span key={item.quantity} className="px-1.5 text-sm font-bold text-foreground min-w-[24px] text-center animate-count">{item.quantity}</span>
                    <button
                      onClick={() => cart.updateQty(item.productId, item.quantity + 1)}
                      aria-label="Increase quantity"
                      className="size-7 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-foreground shrink-0 w-16 text-right">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {cart.items.length > 0 && (
          <div className="relative p-4 border-t border-border space-y-3 liquid-glass-strong liquid-edge">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-foreground">{formatPrice(subtotal)}</span>
              </div>
              {shop.delivery_enabled && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="font-medium text-foreground">{shop.delivery_fee > 0 ? formatPrice(shop.delivery_fee) : 'Free'}</span>
                </div>
              )}
              {belowMin && (
                <p className="text-xs rounded-lg px-2.5 py-2 font-medium bg-warning/12 text-warning border border-warning/25">
                  Add {formatPrice(shop.min_order_amount - subtotal)} more to reach the minimum order.
                </p>
              )}
              {!shopOpen && (
                <p className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-2 font-medium bg-warning/12 text-warning border border-warning/25">
                  <Clock size={13} className="shrink-0" /> This shop is currently closed and can&apos;t take orders right now.
                </p>
              )}
            </div>
            <Button className="w-full gap-2 h-11 text-[15px]" onClick={onCheckout} disabled={belowMin || !shopOpen}>
              Checkout · {formatPrice(subtotal + (shop.delivery_enabled ? shop.delivery_fee : 0))}
              <ArrowRight size={16} />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
