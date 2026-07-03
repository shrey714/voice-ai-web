'use client'

/**
 * "Product flies into the cart" animation. Clones the source element (or a
 * colored dot), animates it along a curved path to the cart target, then
 * pops the cart icon. No-op under reduced-motion.
 */
export function flyToCart(source: HTMLElement | null, imageUrl?: string | null) {
  if (typeof window === 'undefined' || !source) return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

  const target = document.getElementById('cart-target')
  if (!target) return

  const from = source.getBoundingClientRect()
  const to = target.getBoundingClientRect()

  const clone = document.createElement(imageUrl ? 'img' : 'div') as HTMLElement
  if (imageUrl) (clone as HTMLImageElement).src = imageUrl
  else clone.style.background = 'var(--primary)'
  clone.className = 'fly-clone'

  const size = Math.min(64, Math.max(36, from.width * 0.5))
  Object.assign(clone.style, {
    left: `${from.left + from.width / 2 - size / 2}px`,
    top: `${from.top + from.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
  })
  document.body.appendChild(clone)

  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height / 2 - (from.top + from.height / 2)

  const anim = clone.animate(
    [
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(0.8)`, opacity: 0.95, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.25)`, opacity: 0.3 },
    ],
    { duration: 650, easing: 'cubic-bezier(0.5, 0, 0.75, 0.3)' },
  )
  anim.onfinish = () => {
    clone.remove()
    target.classList.remove('animate-cart-pop')
    void target.offsetWidth
    target.classList.add('animate-cart-pop')
  }
}
