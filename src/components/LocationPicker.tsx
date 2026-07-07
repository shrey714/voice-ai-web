'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import { CustomerAddress, SelectedLocation } from '@/lib/types'
import {
  useLocation, addressToSelected, detectPosition, getGeoPermission,
  GeoError, type GeoPermission,
} from '@/lib/location'
import { reverseGeocode, searchAddresses, type GeoAddress } from '@/lib/geocode'
import { listAddresses } from '@/lib/addresses'
import {
  MapPin, Navigation, Search, Plus, Home, Briefcase, MapPinned,
  Loader2, X, LocateFixed, AlertTriangle, Settings2, ChevronRight,
} from 'lucide-react'

function labelIcon(label: string) {
  const l = label.toLowerCase()
  if (l === 'home') return Home
  if (l === 'work') return Briefcase
  return MapPinned
}

export function LocationPicker({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter()
  const { selected, setSelected } = useLocation()

  const [userId, setUserId] = useState<string | null>(null)
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [loadingAddr, setLoadingAddr] = useState(false)

  const [perm, setPerm] = useState<GeoPermission>('prompt')
  const [detecting, setDetecting] = useState(false)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoAddress[]>([])
  const [searching, setSearching] = useState(false)
  const searchAbort = useRef<AbortController | null>(null)

  const refreshAddresses = useCallback(async () => {
    setLoadingAddr(true)
    setAddresses(await listAddresses())
    setLoadingAddr(false)
  }, [])

  // On open: read session + permission + saved addresses.
  useEffect(() => {
    if (!open) return
    setQuery(''); setResults([])
    getGeoPermission().then(setPerm)
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null
      setUserId(uid)
      if (uid) refreshAddresses()
      else setAddresses([])
    })
  }, [open, refreshAddresses])

  // Debounced address search.
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

  const chooseAndClose = (loc: SelectedLocation) => {
    setSelected(loc)
    toast.success('Delivery location updated', { description: loc.formatted_address })
    onOpenChange(false)
  }

  const go = (path: string) => { onOpenChange(false); router.push(path) }

  const handleDetect = async () => {
    setDetecting(true)
    try {
      const { latitude, longitude } = await detectPosition()
      setPerm('granted')
      const geo = await reverseGeocode(latitude, longitude)
      chooseAndClose({
        addressId: null, label: 'Current location', formatted_address: geo.formatted,
        area: geo.area, city: geo.city, pincode: geo.pincode, latitude, longitude,
      })
    } catch (e) {
      const err = e as GeoError
      if (err.code === 'denied') {
        setPerm('denied')
        toast.error('Location permission denied', {
          description: 'Enable location access in your browser settings, or search your address below.',
        })
      } else if (err.code === 'unsupported') {
        toast.error('Location not supported', { description: 'Please search your address manually.' })
      } else if (err.code === 'timeout') {
        toast.error('Location timed out', { description: 'Try again or search your address.' })
      } else {
        toast.error('Location unavailable', { description: 'Please search your address manually.' })
      }
    } finally {
      setDetecting(false)
    }
  }

  const pickSearchResult = (g: GeoAddress) => chooseAndClose({
    addressId: null, label: 'Selected location', formatted_address: g.formatted,
    area: g.area, city: g.city, pincode: g.pincode, latitude: g.latitude, longitude: g.longitude,
  })

  const selectSaved = (a: CustomerAddress) => chooseAndClose(addressToSelected(a))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false}
        className="p-0 gap-0 rounded-t-3xl max-h-[88vh] sm:max-w-lg sm:mx-auto">
        <SheetHeader className="p-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base">Select delivery location</SheetTitle>
              <SheetDescription className="text-xs">Choose where you want your order delivered</SheetDescription>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} aria-label="Close">
              <X size={18} />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Detect current location */}
            <button
              onClick={handleDetect}
              disabled={detecting}
              className="w-full flex items-center gap-3 rounded-2xl liquid-surface liquid-glass-interactive p-3.5 text-left disabled:opacity-70"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0">
                {detecting ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-primary">
                  {detecting ? 'Detecting your location…' : 'Use my current location'}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {perm === 'denied' ? 'Permission blocked — enable it in browser settings' : 'Detect via GPS and reverse-geocode'}
                </span>
              </span>
              <Navigation size={16} className="text-primary shrink-0" />
            </button>

            {perm === 'denied' && (
              <div className="flex items-start gap-2 rounded-xl border border-warning/25 bg-warning/10 p-3 text-xs text-warning">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>Location access is blocked. Allow it from the site settings in your browser, or search manually below.</span>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search for area, street, landmark…"
                className="pl-10 h-11 rounded-xl"
              />
              {searching && <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
              {!searching && query && (
                <button onClick={() => { setQuery(''); setResults([]) }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:backdrop-blur-md transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Search results */}
            {results.length > 0 && (
              <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
                {results.map(g => (
                  <button key={`${g.latitude},${g.longitude}`} onClick={() => pickSearchResult(g)} className="w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-muted">
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
              <p className="text-center text-xs text-muted-foreground py-2">No matches. Try a different search.</p>
            )}

            {/* Saved addresses */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Saved addresses</p>
              <Button variant="ghost" size="sm" className="gap-1.5 text-primary h-8" onClick={() => go('/addresses?add=1')}>
                <Plus size={15} /> Add new
              </Button>
            </div>

            {!userId ? (
              <button
                onClick={() => go('/auth?redirect=/addresses')}
                className="w-full rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                Sign in to save and reuse your addresses
              </button>
            ) : loadingAddr ? (
              <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
            ) : addresses.length === 0 ? (
              <EmptyState icon={MapPin} size="sm" title="No saved addresses" description="Add one for faster checkout." />
            ) : (
              <>
                <div className="space-y-2.5">
                  {addresses.map(a => {
                    const Icon = labelIcon(a.label)
                    const active = selected?.addressId === a.id
                    return (
                      <button
                        key={a.id}
                        onClick={() => selectSaved(a)}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
                          active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30 hover:bg-muted',
                        )}
                      >
                        <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground shrink-0">
                          <Icon size={16} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-foreground">{a.label}</span>
                            {a.is_default && <Badge variant="success" className="text-[9px] px-1.5 py-0">Default</Badge>}
                          </span>
                          <span className="block text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.formatted_address}</span>
                        </span>
                        {active ? <Badge variant="default" className="text-[9px] shrink-0">Selected</Badge> : <ChevronRight size={16} className="text-muted-foreground shrink-0" />}
                      </button>
                    )
                  })}
                </div>

                <Button variant="secondary" className="w-full gap-2 rounded-xl" onClick={() => go('/addresses')}>
                  <Settings2 size={15} /> Manage addresses
                </Button>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
