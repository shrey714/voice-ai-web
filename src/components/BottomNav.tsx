'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Store, Heart, ShoppingBasket, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWishlist } from '@/lib/wishlist'
import { useAllCarts } from '@/lib/cart'

export function BottomNav() {
  const pathname = usePathname()
  const wishlist = useWishlist()
  const allCarts = useAllCarts()

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

  // No in-flow spacer here: this nav is `fixed` and always the last thing
  // painted, so a spacer in front of it would just add dead scroll space
  // after the real content — Footer (the last in-flow element) is what
  // reserves clearance for it instead (see Footer's own bottom padding).
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 liquid-glass-strong liquid-edge border-t border-border pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="grid grid-cols-4 h-16">
        {tabs.map(({ href, label, Icon, badge, isCart }) => {
          const active = !isCart && pathname === href
          // Cart has no destination of its own when empty — its href would
          // silently fall back to Home, which reads as a broken tap rather
          // than "there's nothing here yet". Disable instead of navigating.
          const disabled = isCart && badge === 0
          const itemClassName = cn(
            'flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors',
            disabled ? 'text-muted-foreground/40 cursor-not-allowed' : 'active:scale-95',
            !disabled && (active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'),
          )
          const content = (
            <>
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
            </>
          )

          if (disabled) {
            return (
              <button key={label} type="button" disabled aria-label="Cart, empty" className={itemClassName}>
                {content}
              </button>
            )
          }

          return (
            <Link
              key={label}
              href={href}
              aria-label={badge > 0 ? `${label}, ${badge} items` : label}
              aria-current={active ? 'page' : undefined}
              className={itemClassName}
            >
              {content}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
