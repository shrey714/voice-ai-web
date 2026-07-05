'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Store, Heart, ShoppingBasket, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWishlist } from '@/lib/wishlist'
import { useAllCarts } from '@/lib/cart'

// Every /[slug]/... route (shop, product, checkout, order-status) already
// renders its own fixed bottom bar (cart pill, add-to-cart, or a focused
// checkout/status flow) and /auth is a focused flow too — showing the tab
// bar there would stack two fixed bottom bars on screen. Allowlist the
// handful of routes that don't already own the bottom of the screen,
// rather than guessing at every shop-route shape.
const SHOWN_ON = ['/', '/wishlist', '/orders', '/addresses']

export function BottomNav() {
  const pathname = usePathname()
  const wishlist = useWishlist()
  const allCarts = useAllCarts()

  if (!SHOWN_ON.includes(pathname)) return null

  const cartCount = allCarts.reduce((sum, c) => sum + c.count, 0)
  // Cart has no route of its own — it jumps to whichever single shop has a
  // basket, or home if there are none/several — so unlike the other tabs it
  // can legitimately resolve to the same href as Home. It's never "active"
  // the way a real destination tab is; it's a shortcut, styled by its badge.
  const cartHref = allCarts.length === 1 ? `/${allCarts[0].slug}` : '/'

  const tabs = [
    { href: '/', label: 'Home', Icon: Store, badge: 0, isCart: false },
    { href: cartHref, label: 'Cart', Icon: ShoppingBasket, badge: cartCount, isCart: true },
    { href: '/wishlist', label: 'Wishlist', Icon: Heart, badge: wishlist.count, isCart: false },
    { href: '/orders', label: 'Orders', Icon: ShoppingBag, badge: 0, isCart: false },
  ]

  return (
    <>
      {/* Spacer in normal flow so the fixed bar below never covers page content. */}
      <div className="md:hidden h-[calc(4rem+env(safe-area-inset-bottom))]" aria-hidden />
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-border pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        <div className="grid grid-cols-4 h-16">
          {tabs.map(({ href, label, Icon, badge, isCart }) => {
            const active = !isCart && pathname === href
            return (
              <Link
                key={label}
                href={href}
                aria-label={badge > 0 ? `${label}, ${badge} items` : label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors active:scale-95',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="relative">
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                  {badge > 0 && (
                    <span
                      key={badge}
                      className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center animate-cart-pop"
                    >
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
