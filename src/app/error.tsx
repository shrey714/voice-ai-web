'use client'
import { useEffect } from 'react'
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
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  )
}
