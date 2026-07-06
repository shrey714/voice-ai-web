'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useViewTransition } from '@/lib/useViewTransition'
import { OnlineProduct } from '@/lib/types'
import { cn, formatPrice } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Search, X, Clock, TrendingUp, Package, ArrowUpLeft } from 'lucide-react'

const RECENT_KEY = 'sk-recent-searches'

function readRecent(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}
function writeRecent(list: string[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6)))
}

interface ProductSearchProps {
  value: string
  onChange: (v: string) => void
  products: OnlineProduct[]
  slug: string
  placeholder?: string
  className?: string
}

export function ProductSearch({ value, onChange, products, slug, placeholder, className }: ProductSearchProps) {
  const vt = useViewTransition()
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setRecent(readRecent()) }, [])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const q = value.trim().toLowerCase()
  const suggestions = q
    ? products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 6)
    : []

  // Trending = most common categories, fallback to first product names
  const trending = [...new Set(products.map(p => p.category).filter(Boolean))].slice(0, 5)

  const commit = (term: string) => {
    const t = term.trim()
    onChange(t)
    if (t) {
      const next = [t, ...recent.filter(r => r.toLowerCase() !== t.toLowerCase())]
      setRecent(next); writeRecent(next)
    }
    setOpen(false)
  }

  const removeRecent = (term: string) => {
    const next = recent.filter(r => r !== term)
    setRecent(next); writeRecent(next)
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
      <Input
        value={value}
        role="combobox"
        aria-expanded={open}
        aria-controls="product-search-list"
        aria-autocomplete="list"
        onChange={e => { onChange(e.target.value); setOpen(true); setActiveIdx(-1) }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
          else if (e.key === 'Enter') {
            if (activeIdx >= 0 && suggestions[activeIdx]) { setOpen(false); vt.push(`/${slug}/product/${suggestions[activeIdx].product_id}`) }
            else commit(value)
          } else if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1) }
        }}
        placeholder={placeholder ?? 'Search products…'}
        className="pl-10 h-9 text-sm rounded-xl"
      />
      {value && (
        <button onClick={() => { onChange(''); setOpen(true) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10">
          <X size={14} />
        </button>
      )}

      {open && (
        <div
          // Same anchored-floating-menu glass technique as DropdownMenu/Select
          // (translucent bg + a -z-1 ::before carrying the actual backdrop-blur)
          // — this popup is a custom implementation, not built on those shared
          // primitives, so it needs the treatment spelled out explicitly here.
          className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50 animate-scale-in origin-top text-popover-foreground shadow-2xl ring-1 ring-foreground/5 dark:ring-foreground/10 bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150"
        >
          {/* Live suggestions */}
          {q && suggestions.length > 0 && (
            <div className="p-1.5" id="product-search-list" role="listbox">
              {suggestions.map((p, i) => {
                const price = p.online_price ?? p.store_price ?? 0
                return (
                  <button
                    key={p.product_id}
                    role="option"
                    aria-selected={i === activeIdx}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => { setOpen(false); vt.push(`/${slug}/product/${p.product_id}`) }}
                    className={cn('w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-colors text-left', i === activeIdx ? 'bg-muted' : 'hover:bg-muted')}
                  >
                    <span className="relative size-9 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
                      {p.image_url
                        ? <Image src={p.image_url} alt="" fill sizes="36px" className="object-cover" />
                        : <Package size={16} className="text-muted-foreground" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-foreground truncate">{p.name}</span>
                      <span className="block text-xs text-muted-foreground truncate">{p.category}</span>
                    </span>
                    <span className="text-sm font-bold text-foreground shrink-0">{formatPrice(price)}</span>
                  </button>
                )
              })}
              <button onClick={() => commit(value)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-muted transition-colors text-left text-sm text-muted-foreground">
                <Search size={14} /> Search “<span className="font-semibold text-foreground">{value}</span>”
              </button>
            </div>
          )}

          {q && suggestions.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No products match “{value}”</p>
            </div>
          )}

          {/* Recent + trending (empty query) */}
          {!q && (
            <div className="p-3 space-y-3">
              {recent.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    <Clock size={11} /> Recent
                  </p>
                  <div className="flex flex-col">
                    {recent.map(term => (
                      <div key={term} className="group flex items-center gap-2 rounded-lg hover:bg-muted transition-colors">
                        <button onClick={() => commit(term)} className="flex-1 flex items-center gap-2.5 px-2 py-1.5 text-left text-sm text-foreground">
                          <ArrowUpLeft size={13} className="text-muted-foreground" /> {term}
                        </button>
                        <button onClick={() => removeRecent(term)} className="px-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {trending.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    <TrendingUp size={11} /> Popular categories
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {trending.map(cat => (
                      <button
                        key={cat}
                        onClick={() => commit(cat)}
                        className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {recent.length === 0 && trending.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Start typing to search products</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
