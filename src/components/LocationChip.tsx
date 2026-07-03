'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useLocation, shortLocationText } from '@/lib/location'
import { LocationPicker } from '@/components/LocationPicker'
import { MapPin, ChevronDown } from 'lucide-react'

/**
 * Header location selector. Shows the currently selected delivery location and
 * opens the LocationPicker sheet. Changing it updates the app-wide selection
 * (persisted Zustand store), so every page reflects the new address instantly.
 */
export function LocationChip({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const { selected } = useLocation()
  const text = shortLocationText(selected)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Change delivery location"
        className={cn(
          'group flex items-center gap-1.5 min-w-0 rounded-xl px-2 py-1 -ml-1 text-left transition-colors hover:bg-muted',
          className,
        )}
      >
        <MapPin size={16} className="shrink-0 text-primary" />
        <span className="min-w-0 leading-tight">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {selected ? `Deliver to · ${selected.label}` : 'Set location'}
          </span>
          <span className="flex items-center gap-0.5">
            <span className="block max-w-[42vw] sm:max-w-[220px] truncate text-[13px] font-bold text-foreground">
              {text}
            </span>
            <ChevronDown size={13} className="shrink-0 text-muted-foreground transition-transform group-hover:translate-y-0.5" />
          </span>
        </span>
      </button>

      <LocationPicker open={open} onOpenChange={setOpen} />
    </>
  )
}
