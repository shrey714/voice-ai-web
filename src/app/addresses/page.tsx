'use client'
import { Suspense, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { CustomerAddress } from '@/lib/types'
import { fetchAddresses, deleteAddress, setDefaultAddress } from '@/lib/addresses'
import { useLocation, addressToSelected } from '@/lib/location'
import { AddressDialog } from '@/components/AddressDialog'
import { BrandLoader } from '@/components/BrandLoader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft, Plus, MapPin, Home, Briefcase, MapPinned,
  Star, Pencil, Trash2, Check, Loader2, AlertCircle,
} from 'lucide-react'

function labelIcon(label: string) {
  const l = label.toLowerCase()
  if (l === 'home') return Home
  if (l === 'work') return Briefcase
  return MapPinned
}

function AddressesInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selected, setSelected } = useLocation()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerAddress | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CustomerAddress | null>(null)
  const [deleting, setDeleting] = useState(false)

  const refresh = useCallback(async () => {
    const { data, error } = await fetchAddresses()
    setLoadError(error)
    // Don't blow away a good list on a transient error.
    if (!error) setAddresses(data)
  }, [])

  const retry = async () => { setLoading(true); await refresh(); setLoading(false) }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) { router.replace('/auth?redirect=/addresses'); return }
      await refresh()
      setLoading(false)
      if (searchParams.get('add') === '1') { setEditing(null); setDialogOpen(true) }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openAdd = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (a: CustomerAddress) => { setEditing(a); setDialogOpen(true) }

  const handleSaved = (saved: CustomerAddress) => {
    refresh()
    // If we just saved the address the header points at (or made one default), sync it.
    if (selected?.addressId === saved.id || saved.is_default && !selected) {
      setSelected(addressToSelected(saved))
    }
  }

  const handleSetDefault = async (a: CustomerAddress) => {
    setBusyId(a.id)
    // Optimistically flag AND reorder so the new default jumps to the top,
    // matching the canonical default-first ordering.
    setAddresses(prev =>
      prev.map(x => ({ ...x, is_default: x.id === a.id }))
        .sort((x, y) => Number(y.is_default) - Number(x.is_default)),
    )
    const ok = await setDefaultAddress(a.id)
    setBusyId(null)
    if (!ok) { toast.error('Could not set default'); refresh() }
    else {
      toast.success(`${a.label} set as default`)
      if (!selected || selected.addressId === a.id || selected.addressId === null) {
        setSelected(addressToSelected({ ...a, is_default: true }))
      }
    }
  }

  const confirmDelete = async () => {
    const a = deleteTarget
    if (!a) return
    setDeleting(true)
    setAddresses(prev => prev.filter(x => x.id !== a.id))
    const ok = await deleteAddress(a.id)
    setDeleting(false)
    setDeleteTarget(null)
    if (!ok) { toast.error('Could not delete address'); refresh(); return }
    toast.success('Address deleted')
    if (selected?.addressId === a.id) setSelected(null)
    refresh()
  }

  if (loading) return <BrandLoader label="Loading addresses…" />

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 h-14">
            <Button variant="ghost" size="icon-sm" onClick={() => router.back()} className="text-muted-foreground -ml-1" aria-label="Back">
              <ArrowLeft size={18} />
            </Button>
            <div className="flex-1">
              <h1 className="font-bold text-base leading-tight text-foreground">My Addresses</h1>
              <p className="text-xs text-muted-foreground">Manage your delivery addresses</p>
            </div>
            <Button size="sm" className="gap-1.5 rounded-xl" onClick={openAdd}>
              <Plus size={15} /> Add new
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-5">
        {loadError && addresses.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load your addresses"
            description="Something went wrong. Please check your connection and try again."
            action={<Button variant="secondary" className="gap-1.5" onClick={retry}>Retry</Button>}
          />
        ) : addresses.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No saved addresses yet"
            description="Add an address for faster checkout and delivery."
            action={<Button className="gap-1.5" onClick={openAdd}><Plus size={15} /> Add your first address</Button>}
          />
        ) : (
          <div className="space-y-3">
            {addresses.map(a => {
              const Icon = labelIcon(a.label)
              const busy = busyId === a.id
              return (
                <div key={a.id} className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/25">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                      <Icon size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-foreground">{a.label}</p>
                        {a.is_default && <Badge variant="success" className="text-[10px] gap-1 px-1.5 py-0"><Check size={10} /> Default</Badge>}
                        {busy && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{a.formatted_address}</p>
                      {a.landmark && <p className="text-xs text-muted-foreground mt-0.5">Landmark: {a.landmark}</p>}
                      {(a.receiver_name || a.receiver_phone) && (
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                          {a.receiver_name}{a.receiver_name && a.receiver_phone ? ' · ' : ''}{a.receiver_phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/60">
                    {!a.is_default && (
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => handleSetDefault(a)} disabled={busy}>
                        <Star size={13} /> Set default
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => openEdit(a)} disabled={busy}>
                      <Pencil size={13} /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive ml-auto" onClick={() => setDeleteTarget(a)} disabled={busy}>
                      <Trash2 size={13} /> Delete
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <AddressDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} onSaved={handleSaved} />

      {/* Styled delete confirmation (replaces the native confirm() dialog). */}
      <Dialog open={!!deleteTarget} onOpenChange={o => { if (!o && !deleting) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this address?</DialogTitle>
            <DialogDescription>
              {deleteTarget ? `Your ${deleteTarget.label} address will be permanently removed.` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" className="gap-2" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AddressesPage() {
  return (
    <Suspense fallback={<BrandLoader label="Loading addresses…" />}>
      <AddressesInner />
    </Suspense>
  )
}
