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

  // Accessible label describing the whole rating in one phrase.
  const label = `Rated ${rating.toFixed(1)} out of 5${
    count !== undefined ? `, ${count.toLocaleString()} reviews` : ''
  }`

  return (
    <div
      className="flex items-center gap-1.5"
      // Non-interactive ratings are a single graphical object, not 5 buttons.
      {...(!interactive ? { role: 'img' as const, 'aria-label': label } : {})}
    >
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(rating)
          const starIcon = (
            <Star
              aria-hidden
              className={cn(sizes[size], filled ? 'fill-star text-star' : 'text-muted-foreground')}
            />
          )
          // Only emit real buttons when the control is actually interactive.
          return interactive ? (
            <button
              key={star}
              type="button"
              onClick={() => onRate?.(star)}
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
              className="transition-transform hover:scale-110 cursor-pointer"
            >
              {starIcon}
            </button>
          ) : (
            <span key={star}>{starIcon}</span>
          )
        })}
      </div>
      <span className={cn('font-medium', textSizes[size])} aria-hidden={!interactive}>
        {rating.toFixed(1)}
      </span>
      {count !== undefined && (
        <span className={cn('text-muted-foreground', textSizes[size])} aria-hidden={!interactive}>
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  )
}
