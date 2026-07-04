'use client'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { CustomerAddress } from '@/lib/types'
import { detectPosition, useLocation } from '@/lib/location'
import { reverseGeocode, searchAddresses, type GeoAddress } from '@/lib/geocode'
import { createAddress, updateAddress, type AddressInput } from '@/lib/addresses'
import {
  Home, Briefcase, MapPinned, LocateFixed, Loader2, Check, MapPin, Move, Search, X,
} from 'lucide-react'

// Client-only map (Leaflet needs `window`).
const MapPicker = dynamic(() => import('./MapPicker').then(m => m.MapPicker), {
  ssr: false,
  loading: () => <div className="h-56 w-full rounded-xl bg-muted animate-pulse" />,
})

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 }

const LABELS = [
  { value: 'Home', Icon: Home },
  { value: 'Work', Icon: Briefcase },
  { value: 'Other', Icon: MapPinned },
] as const

function draftFrom(a?: CustomerAddress | null): AddressInput {
  return {
    label: a?.label ?? 'Home',
    receiver_name: a?.receiver_name ?? '',
    receiver_phone: a?.receiver_phone ?? '',
    flat: a?.flat ?? '',
    building: a?.building ?? '',
    landmark: a?.landmark ?? '',
    area: a?.area ?? '',
    city: a?.city ?? '',
    state: a?.state ?? '',
    pincode: a?.pincode ?? '',
    formatted_address: a?.formatted_address ?? '',
    latitude: a?.latitude ?? null,
    longitude: a?.longitude ?? null,
    is_default: a?.is_default ?? false,
  }
}

function composeFormatted(d: AddressInput): string {
  return [d.flat, d.building, d.area, d.city, d.state, d.pincode]
    .map(p => (p ?? '').trim()).filter(Boolean).join(', ')
}

export function AddressDialog({
  open, onOpenChange, initial, onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial?: CustomerAddress | null
  onSaved?: (a: CustomerAddress) => void
}) {
  const editingId = initial?.id ?? null
  const { selected } = useLocation()
  const [draft, setDraft] = useState<AddressInput>(draftFrom(initial))
  const [detecting, setDetecting] = useState(false)
  const [saving, setSaving] = useState(false)
  const geoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoAddress[]>([])
  const [searching, setSearching] = useState(false)
  const searchAbort = useRef<AbortController | null>(null)

  // Reset the form each time the dialog opens (for a fresh add or a new edit).
  useEffect(() => {
    if (open) { setDraft(draftFrom(initial)); setQuery(''); setResults([]) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id])

  // Debounced location search — lets you place the pin anywhere (e.g. your
  // hometown while you're out of town), independent of GPS.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) { setResults([]); setSearching(false); return }
    setSearching(true)
    const t = setTimeout(async () => {
      searchAbort.current?.abort()
      const ac = new AbortController()
      searchAbort.current = ac
      try {
        setResults(await searchAddresses(q, ac.signal))
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  const pickResult = (g: GeoAddress) => {
    setQuery(''); setResults([])
    setDraft(d => ({
      ...d,
      latitude: g.latitude, longitude: g.longitude,
      area: g.area ?? d.area, city: g.city ?? d.city,
      state: g.state ?? d.state, pincode: g.pincode ?? d.pincode,
      building: d.building?.trim() ? d.building : (g.building ?? d.building),
      formatted_address: g.formatted,
    }))
    toast.success('Location set — drag the pin to fine-tune')
  }

  const set = <K extends keyof AddressInput>(k: K, v: AddressInput[K]) =>
    setDraft(d => ({ ...d, [k]: v }))

  // Fill address parts from coordinates. Only backfills fields the user hasn't
  // typed into (keeps manual corrections; a pin nudge shouldn't wipe them).
  const fillFromCoords = (lat: number, lng: number, immediate = false) => {
    setDraft(d => ({ ...d, latitude: lat, longitude: lng }))
    if (geoTimer.current) clearTimeout(geoTimer.current)
    const run = async () => {
      try {
        const geo = await reverseGeocode(lat, lng)
        setDraft(d => {
          const keep = (cur: string | null | undefined, next: string | null) =>
            (cur ?? '').trim() ? cur! : (next ?? cur ?? '')
          return {
            ...d,
            area: keep(d.area, geo.area),
            city: keep(d.city, geo.city),
            state: keep(d.state, geo.state),
            pincode: keep(d.pincode, geo.pincode),
            building: keep(d.building, geo.building),
            formatted_address: geo.formatted,
          }
        })
      } catch { /* keep manual values */ }
    }
    if (immediate) run()
    else geoTimer.current = setTimeout(run, 500)
  }

  const detect = async () => {
    setDetecting(true)
    try {
      const { latitude, longitude } = await detectPosition()
      fillFromCoords(latitude, longitude, true)
      toast.success('Location detected')
    } catch {
      toast.error('Could not detect location', { description: 'Drop the pin manually or type your address.' })
    } finally {
      setDetecting(false)
    }
  }

  const hasPin = draft.latitude != null && draft.longitude != null

  // Concrete list of what's still needed — shown next to a disabled Save so the
  // button isn't a dead end (audit: "disabled CTA with no explanation").
  const missing: string[] = []
  if (!draft.receiver_name?.trim()) missing.push('receiver name')
  if ((draft.receiver_phone ?? '').replace(/\D/g, '').length < 10) missing.push('a 10-digit phone')
  if (!(draft.flat?.trim() || draft.building?.trim() || draft.area?.trim())) missing.push('house/area')
  if ((draft.pincode ?? '').replace(/\D/g, '').length !== 6) missing.push('a 6-digit pincode')
  const canSave = missing.length === 0

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    const formatted = composeFormatted(draft) || draft.formatted_address || 'Saved address'
    const payload: AddressInput = { ...draft, formatted_address: formatted }
    const saved = editingId ? await updateAddress(editingId, payload) : await createAddress(payload)
    setSaving(false)
    if (!saved) { toast.error('Could not save address'); return }
    toast.success(editingId ? 'Address updated' : 'Address saved')
    onOpenChange(false)
    onSaved?.(saved)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-3xl">
        <DialogHeader className="p-5 pb-3 border-b border-border text-left">
          <DialogTitle>{editingId ? 'Edit address' : 'Add new address'}</DialogTitle>
          <DialogDescription>Pin your exact location and add delivery details.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-5 space-y-4">
            {/* Search any location (works away from home / GPS off) */}
            <div className="space-y-2">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search any area, street or city…"
                  className="pl-10 h-11 rounded-xl"
                />
                {searching && <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
                {!searching && query && (
                  <button type="button" onClick={() => { setQuery(''); setResults([]) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                )}
              </div>
              {results.length > 0 && (
                <div className="rounded-xl border border-border overflow-hidden divide-y divide-border max-h-56 overflow-y-auto">
                  {results.map(g => (
                    <button key={`${g.latitude},${g.longitude}`} type="button" onClick={() => pickResult(g)} className="w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-muted">
                      <MapPin size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-foreground truncate">{g.area || g.city || 'Location'}</span>
                        <span className="block text-xs text-muted-foreground line-clamp-2">{g.formatted}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {query.trim().length >= 3 && !searching && results.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-1">No matches. Try a different search.</p>
              )}
            </div>

            {/* Map / pin-drop */}
            {hasPin ? (
              <div className="space-y-2">
                <div className="overflow-hidden rounded-xl border border-border">
                  <MapPicker
                    lat={draft.latitude as number}
                    lng={draft.longitude as number}
                    onChange={(lat, lng) => fillFromCoords(lat, lng)}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Move size={12} /> Drag the pin or tap the map to adjust
                  </p>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-primary" onClick={detect} disabled={detecting}>
                    {detecting ? <Loader2 size={12} className="animate-spin" /> : <LocateFixed size={12} />}
                    Recenter
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-3">
                <div className="flex flex-col items-center gap-1">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"><MapPin size={18} /></span>
                  <p className="text-sm font-semibold text-foreground">Set your location on the map</p>
                  <p className="text-xs text-muted-foreground">Search above, detect via GPS, or drop the pin to place it precisely.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button variant="secondary" size="sm" className="gap-1.5" onClick={detect} disabled={detecting}>
                    {detecting ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
                    Use current location
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-primary"
                    onClick={() => {
                      // Start near the user's chosen location if we have it, so
                      // they don't have to pan across the country from India's centre.
                      const seed = selected?.latitude != null && selected?.longitude != null
                        ? { lat: selected.latitude, lng: selected.longitude }
                        : INDIA_CENTER
                      fillFromCoords(seed.lat, seed.lng)
                    }}>
                    <Move size={14} /> Drop pin manually
                  </Button>
                </div>
              </div>
            )}

            {/* Label chips */}
            <div>
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Save as</Label>
              <div className="flex gap-2 mt-2">
                {LABELS.map(({ value, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('label', value)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors',
                      draft.label === value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <Icon size={14} /> {value}
                  </button>
                ))}
              </div>
            </div>

            {/* Receiver */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rn" className="text-xs">Receiver name *</Label>
                <Input id="rn" value={draft.receiver_name ?? ''} onChange={e => set('receiver_name', e.target.value)} placeholder="Full name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rp" className="text-xs">Phone *</Label>
                <Input id="rp" type="tel" inputMode="numeric" value={draft.receiver_phone ?? ''}
                  onChange={e => set('receiver_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit number" />
              </div>
            </div>

            {/* Address parts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="flat" className="text-xs">House / Flat no.</Label>
                <Input id="flat" value={draft.flat ?? ''} onChange={e => set('flat', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bldg" className="text-xs">Building / Road</Label>
                <Input id="bldg" value={draft.building ?? ''} onChange={e => set('building', e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lm" className="text-xs">Landmark</Label>
              <Input id="lm" value={draft.landmark ?? ''} onChange={e => set('landmark', e.target.value)} placeholder="Nearby landmark (optional)" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="area" className="text-xs">Area / Locality</Label>
              <Input id="area" value={draft.area ?? ''} onChange={e => set('area', e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-xs">City</Label>
                <Input id="city" value={draft.city ?? ''} onChange={e => set('city', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state" className="text-xs">State</Label>
                <Input id="state" value={draft.state ?? ''} onChange={e => set('state', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pin" className="text-xs">Pincode *</Label>
                <Input id="pin" inputMode="numeric" value={draft.pincode ?? ''}
                  onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} />
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <Checkbox checked={!!draft.is_default} onCheckedChange={v => set('is_default', v === true)} />
              <span className="text-sm text-foreground">Set as default delivery address</span>
            </label>
          </div>
        </ScrollArea>

        <div className="p-5 pt-3 border-t border-border space-y-2">
          {!canSave && !saving && (
            <p className="text-xs text-muted-foreground text-center">
              Add {missing.join(', ')} to save.
            </p>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1 h-11" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="flex-1 gap-2 h-11" onClick={handleSave} disabled={!canSave || saving}>
              {saving ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
              {editingId ? 'Update' : 'Save address'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
