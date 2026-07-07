'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FilterState {
  priceRange: [number, number]
  rating: number
  inStockOnly: boolean
  freeDeliveryOnly: boolean
  sortBy: 'relevance' | 'price-asc' | 'price-desc' | 'rating'
}

interface ProductFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  maxPrice?: number
  onClose?: () => void
}

export function ProductFilters({
  filters,
  onFiltersChange,
  maxPrice = 10000,
  onClose,
}: ProductFiltersProps) {
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    rating: true,
    stock: true,
    sort: true,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Scale the slider step to the catalog's price range so a shop selling ₹5–₹200
  // items doesn't get a slider whose smallest move (₹100) skips most products.
  const priceStep = maxPrice > 2000 ? 100 : maxPrice > 500 ? 50 : 10

  const hasActiveFilters =
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < maxPrice ||
    filters.rating > 0 ||
    filters.inStockOnly ||
    filters.freeDeliveryOnly

  const handleResetFilters = () => {
    onFiltersChange({
      priceRange: [0, maxPrice],
      rating: 0,
      inStockOnly: false,
      freeDeliveryOnly: false,
      sortBy: 'relevance',
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground">Filters</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 hover:bg-muted/60 hover:backdrop-blur-md rounded-lg transition-colors"
          >
            <X size={18} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Reset button */}
      {hasActiveFilters && (
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={handleResetFilters}
        >
          Reset Filters
        </Button>
      )}

      {/* Sort Section */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('sort')}
          className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <span className="font-semibold text-foreground">Sort By</span>
          <ChevronDown
            size={16}
            className={cn(
              'transition-transform text-muted-foreground',
              expandedSections.sort && 'rotate-180'
            )}
          />
        </button>

        {expandedSections.sort && (
          <div className="space-y-1.5 pl-2">
            {[
              { value: 'relevance' as const, label: 'Most Relevant' },
              { value: 'price-asc' as const, label: 'Price: Low to High' },
              { value: 'price-desc' as const, label: 'Price: High to Low' },
              { value: 'rating' as const, label: 'Highest Rated' },
            ].map(option => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-muted transition-colors"
              >
                <input
                  type="radio"
                  name="sort"
                  checked={filters.sortBy === option.value}
                  onChange={() =>
                    onFiltersChange({
                      ...filters,
                      sortBy: option.value,
                    })
                  }
                  className="cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Price Section */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <span className="font-semibold text-foreground">Price Range</span>
          <ChevronDown
            size={16}
            className={cn(
              'transition-transform text-muted-foreground',
              expandedSections.price && 'rotate-180'
            )}
          />
        </button>

        {expandedSections.price && (
          <div className="space-y-3 pl-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Min Price</label>
              <input
                type="range"
                min={0}
                max={maxPrice}
                step={priceStep}
                value={filters.priceRange[0]}
                onChange={e => {
                  const newMin = Number(e.target.value)
                  if (newMin <= filters.priceRange[1]) {
                    onFiltersChange({
                      ...filters,
                      priceRange: [newMin, filters.priceRange[1]],
                    })
                  }
                }}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="text-sm font-medium text-foreground">₹{filters.priceRange[0]}</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Max Price</label>
              <input
                type="range"
                min={0}
                max={maxPrice}
                step={priceStep}
                value={filters.priceRange[1]}
                onChange={e => {
                  const newMax = Number(e.target.value)
                  if (newMax >= filters.priceRange[0]) {
                    onFiltersChange({
                      ...filters,
                      priceRange: [filters.priceRange[0], newMax],
                    })
                  }
                }}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="text-sm font-medium text-foreground">₹{filters.priceRange[1]}</div>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Rating Section */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('rating')}
          className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <span className="font-semibold text-foreground">Rating</span>
          <ChevronDown
            size={16}
            className={cn(
              'transition-transform text-muted-foreground',
              expandedSections.rating && 'rotate-180'
            )}
          />
        </button>

        {expandedSections.rating && (
          <div className="space-y-1.5 pl-2">
            {/* "Any" is explicit — a radio can't be un-checked by re-clicking it,
                so without this the rating floor could be raised but never cleared. */}
            <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-muted transition-colors">
              <input
                type="radio"
                name="rating"
                checked={filters.rating === 0}
                onChange={() => onFiltersChange({ ...filters, rating: 0 })}
                className="cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">Any rating</span>
            </label>
            {[4, 3, 2, 1].map(rating => (
              <label
                key={rating}
                className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-muted transition-colors"
              >
                <input
                  type="radio"
                  name="rating"
                  checked={filters.rating === rating}
                  onChange={() => onFiltersChange({ ...filters, rating })}
                  className="cursor-pointer"
                />
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">{rating}★</span>
                  <span className="text-xs text-muted-foreground">&amp; up</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Stock Section */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('stock')}
          className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <span className="font-semibold text-foreground">Availability</span>
          <ChevronDown
            size={16}
            className={cn(
              'transition-transform text-muted-foreground',
              expandedSections.stock && 'rotate-180'
            )}
          />
        </button>

        {expandedSections.stock && (
          <div className="space-y-1.5 pl-2">
            <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-muted transition-colors">
              <input
                type="checkbox"
                checked={filters.inStockOnly}
                onChange={e =>
                  onFiltersChange({
                    ...filters,
                    inStockOnly: e.target.checked,
                  })
                }
                className="cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">In Stock Only</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-muted transition-colors">
              <input
                type="checkbox"
                checked={filters.freeDeliveryOnly}
                onChange={e =>
                  onFiltersChange({
                    ...filters,
                    freeDeliveryOnly: e.target.checked,
                  })
                }
                className="cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">Free Delivery Only</span>
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
