'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[route-error]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <EmptyState
        icon={AlertTriangleIcon}
        title="Something went wrong"
        description="An unexpected error occurred. Please try again."
        // "Try again" alone was a dead end if the error persists (e.g. a
        // broken deep link) — always leave a way back to a known-good page.
        action={
          <div className="flex items-center gap-2">
            <Button onClick={reset}>Try again</Button>
            <Button asChild variant="secondary">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        }
      />
    </div>
  )
}
