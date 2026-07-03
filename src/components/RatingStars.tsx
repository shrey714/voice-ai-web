'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingStarsProps {
  rating: number
  count?: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onRate?: (rating: number) => void
}

export function RatingStars({
  rating,
  count,
  size = 'md',
  interactive = false,
  onRate,
}: RatingStarsProps) {
  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => interactive && onRate?.(star)}
            disabled={!interactive}
            className={cn(
              'transition-transform',
              interactive && 'hover:scale-110 cursor-pointer',
              !interactive && 'cursor-default'
            )}
          >
            <Star
              className={cn(
                sizes[size],
                star <= Math.round(rating)
                  ? 'fill-star text-star'
                  : 'text-muted-foreground'
              )}
            />
          </button>
        ))}
      </div>
      <span className={cn('font-medium', textSizes[size])}>
        {rating.toFixed(1)}
      </span>
      {count !== undefined && (
        <span className={cn('text-muted-foreground', textSizes[size])}>
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  )
}
