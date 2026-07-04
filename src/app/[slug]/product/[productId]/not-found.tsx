import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ProductNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center space-y-4">
        <AlertCircle size={32} className="text-muted-foreground mx-auto" />
        <p className="font-bold text-foreground">Product not found</p>
        <p className="text-sm text-muted-foreground">This product may have been removed or is unavailable.</p>
        <Button asChild variant="secondary" size="sm">
          <Link href="/">← Back to shops</Link>
        </Button>
      </div>
    </div>
  )
}
