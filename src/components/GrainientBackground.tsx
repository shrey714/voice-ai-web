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
 * fallback can't compile it) and falls back to a static CSS gradient in the
 * same colors on unsupported devices/browsers.
 */
export function GrainientBackground({ className }: { className?: string }) {
  const [supported, setSupported] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => { setSupported(supportsWebgl2()) }, [])

  // One opacity for both themes (was 60 light / 40 dark). Light mode used to
  // get away with 60 because bg-fade-mask faded the gradient out toward the
  // edges; full-bleed at 60 washed out the muted body copy and the disabled
  // button against the bright cyan, so it now matches dark's 40.
  return (
    <div aria-hidden className={cn('overflow-hidden opacity-40', className)}>
      {/* Always-present CSS stand-in. Three things had to land before the
          shader could show anything — hydration flipping `supported`, the
          ssr:false chunk downloading, then WebGL init — so the form used to
          paint against a bare background and the gradient slammed in late.
          This layer is in the server HTML, so the page is never backgroundless,
          and it stays put underneath as the fallback when WebGL2 is missing. */}
      <div className="absolute inset-0 grainient-fallback" />
      {supported && (
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none',
            ready ? 'opacity-100' : 'opacity-0',
          )}
        >
          <Grainient className="h-full w-full" onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  )
}
