'use client'
import React from 'react'
import { cn } from '@/lib/utils'

interface GlassIconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  icon: React.ReactNode
  /** CSS `background` value for the colored backing tile (gradient or solid). Defaults to the brand teal gradient. */
  color?: string
  /** Button box size in px — also drives the internal em-based proportions (corner radius, blur, tilt offsets) via font-size, so the whole glass effect scales with it. */
  size?: number
}

/**
 * Compact adaptation of reactbits.dev's GlassIcons showcase component: a
 * colored gradient backing tile (tilts further on hover) under a frosted
 * glass pane with the icon centered. The showcase version is sized for a
 * big label grid (4.5em/~72px tiles, 5em gaps) — this shrinks the whole
 * thing to an icon-slot size by setting the button's own font-size, since
 * every measurement in the original is in `em` relative to it.
 */
export function GlassIconButton({ icon, color, size = 36, className, style, children, ...props }: GlassIconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'group relative shrink-0 bg-transparent outline-none border-none cursor-pointer [perspective:24em] [-webkit-tap-highlight-color:transparent]',
        className,
      )}
      style={{ width: size, height: size, fontSize: size / 4.5, ...style }}
      {...props}
    >
      <span
        className="absolute inset-0 rounded-[1.25em] block transition-transform duration-300 ease-[cubic-bezier(0.83,0,0.17,1)] origin-[100%_100%] rotate-[15deg] [will-change:transform] group-hover:[transform:rotate(25deg)_translate3d(-0.5em,-0.5em,0.5em)]"
        style={{
          background: color ?? 'linear-gradient(var(--primary), var(--chart-2))',
          boxShadow: '0.5em -0.5em 0.75em color-mix(in oklch, var(--foreground) 18%, transparent)',
        }}
      />
      <span
        className="absolute inset-0 rounded-[1.25em] bg-white/15 flex backdrop-blur-[0.75em] transition-transform duration-300 ease-[cubic-bezier(0.83,0,0.17,1)] [will-change:transform] group-hover:[transform:translate3d(0,0,2em)]"
        style={{ boxShadow: 'inset 0 0 0 0.1em rgba(255,255,255,0.3)' }}
      >
        <span className="m-auto flex items-center justify-center text-white">{icon}</span>
      </span>
      {children}
    </button>
  )
}
