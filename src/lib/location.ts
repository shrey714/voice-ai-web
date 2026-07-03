'use client'
/**
 * Selected delivery location — global Zustand store persisted to localStorage
 * (mirrors lib/cart.ts). Shared across the header, checkout and every tab.
 *
 * Also exposes browser-geolocation helpers that cover every permission state:
 * unsupported, prompt, granted, denied, unavailable, timeout.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SelectedLocation, CustomerAddress } from './types';

/* ─────────────────────────── Selected-location store ─────────────────────── */

interface LocationState {
  selected: SelectedLocation | null;
  setSelected: (loc: SelectedLocation | null) => void;
}

const useLocationStore = create<LocationState>()(
  persist(
    set => ({
      selected: null,
      setSelected: selected => set({ selected }),
    }),
    {
      name: 'sk-location',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // rehydrate on the client (avoids SSR mismatch)
    },
  ),
);

export function useLocation() {
  useEffect(() => { useLocationStore.persist.rehydrate(); }, []);
  const selected = useLocationStore(s => s.selected);
  const setSelected = useLocationStore(s => s.setSelected);
  return { selected, setSelected };
}

/** Map a saved address row to the header's SelectedLocation shape. */
export function addressToSelected(a: CustomerAddress): SelectedLocation {
  return {
    addressId: a.id,
    label: a.label,
    formatted_address: a.formatted_address,
    area: a.area,
    city: a.city,
    pincode: a.pincode,
    latitude: a.latitude,
    longitude: a.longitude,
  };
}

/** Short text for the header chip (area/city, falling back to the full line). */
export function shortLocationText(loc: SelectedLocation | null): string {
  if (!loc) return 'Select location';
  return loc.area || loc.city || loc.formatted_address;
}

/* ────────────────────────────── Geolocation ─────────────────────────────── */

export type GeoPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

export type GeoErrorCode = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

export class GeoError extends Error {
  code: GeoErrorCode;
  constructor(code: GeoErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'GeoError';
  }
}

/** Best-effort read of the current geolocation permission (never throws). */
export async function getGeoPermission(): Promise<GeoPermission> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return 'unsupported';
  if (!('permissions' in navigator) || !navigator.permissions?.query) return 'prompt';
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return status.state as GeoPermission;
  } catch {
    return 'prompt';
  }
}

/**
 * Subscribe to permission changes (e.g. the user revokes access later).
 * Returns an unsubscribe fn. No-op where the Permissions API is unavailable.
 */
export function watchGeoPermission(cb: (state: GeoPermission) => void): () => void {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return () => {};
  let status: PermissionStatus | null = null;
  const handler = () => status && cb(status.state as GeoPermission);
  navigator.permissions
    .query({ name: 'geolocation' as PermissionName })
    .then(s => { status = s; s.addEventListener('change', handler); })
    .catch(() => {});
  return () => status?.removeEventListener('change', handler);
}

/** Get the current GPS coordinates, mapping every failure to a typed GeoError. */
export function detectPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new GeoError('unsupported', 'Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      err => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject(new GeoError('denied', 'Location permission denied.'));
            break;
          case err.POSITION_UNAVAILABLE:
            reject(new GeoError('unavailable', 'Your location is currently unavailable.'));
            break;
          case err.TIMEOUT:
            reject(new GeoError('timeout', 'Timed out while getting your location.'));
            break;
          default:
            reject(new GeoError('unavailable', 'Could not get your location.'));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}
