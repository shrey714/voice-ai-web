import Link from 'next/link'
import { CompassIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <EmptyState
        icon={CompassIcon}
        title="Page not found"
        description="This link is invalid or the page has been moved."
        action={
          <Button asChild variant="secondary">
            <Link href="/">← Back to Shops</Link>
          </Button>
        }
      />
    </div>
  )
}
