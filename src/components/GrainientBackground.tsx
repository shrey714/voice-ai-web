'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

const Grainient = dynamic(() => import('@/components/Grainient'), { ssr: false })

function supportsWebgl2() {
  try {
    const canvas = document.createElement('canvas')
    return !!canvas.getContext('webgl2')
  } catch {
    return false
  }
}

/**
 * Auth-page-only backdrop: the Grainient WebGL shader is a real GPU cost
 * (continuous requestAnimationFrame render loop), so it's deliberately
 * scoped to this one low-frequency-visit screen rather than a global
 * background — see the liquid-glass rollout notes for the full reasoning.
 * Feature-detects WebGL2 (the shader is GLSL ES 3.00, `ogl`'s WebGL1
 * fallback can't compile it) and simply renders nothing — leaving the
 * page's plain `bg-background` — on unsupported devices/browsers.
 */
export function GrainientBackground({ className }: { className?: string }) {
  const [supported, setSupported] = useState(false)

  useEffect(() => { setSupported(supportsWebgl2()) }, [])

  if (!supported) return null

  return (
    <div aria-hidden className={cn('overflow-hidden bg-fade-mask opacity-60 dark:opacity-40', className)}>
      <Grainient className="h-full w-full" />
    </div>
  )
}
