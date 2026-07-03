import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '₹—'
  return '₹' + n.toFixed(2).replace(/\.00$/, '')
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const hours = diff / 3_600_000
  if (hours < 24) {
    return 'Today, ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  }
  if (hours < 48) {
    return 'Yesterday, ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  }
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

/** Great-circle distance between two coordinates, in kilometers. */
export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371
  const dLat = (b.latitude - a.latitude) * Math.PI / 180
  const dLon = (b.longitude - a.longitude) * Math.PI / 180
  const lat1 = a.latitude * Math.PI / 180
  const lat2 = b.latitude * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

/** Human-readable distance ("450 m" below 1 km, else "3.2 km"). */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

/** Deterministic 32-bit hash of a string (stable across renders). */
export function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/**
 * Deterministic pseudo-random number in [min, max] seeded by `key`.
 * Use for placeholder/mock data (ratings, ETAs) so values stay stable
 * across re-renders instead of flickering like Math.random().
 */
export function seeded(key: string, min: number, max: number, decimals = 0): number {
  const t = (hashString(key) % 1000) / 1000
  const v = min + t * (max - min)
  const p = 10 ** decimals
  return Math.round(v * p) / p
}
