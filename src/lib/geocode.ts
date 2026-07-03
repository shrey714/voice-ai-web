/**
 * Geocoding helpers — keyless providers so the app works with no maps API key.
 *
 * - Reverse geocode (lat/lng → address): BigDataCloud's free client endpoint
 *   (CORS-friendly, no key, generous free tier).
 * - Forward search (text → places): Photon by Komoot (OpenStreetMap-based,
 *   keyless, CORS-friendly).
 *
 * Both are abstracted behind `reverseGeocode()` / `searchAddresses()` so a paid
 * provider (Google/Mapbox) can be dropped in later without touching callers.
 */

export interface GeoAddress {
  formatted: string;
  flat: string | null;      // house / building number when known
  building: string | null;  // street / road / building name
  area: string | null;      // locality / neighbourhood
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number;
  longitude: number;
}

/** Compose a readable one-line address from parts, skipping blanks. */
function compose(parts: (string | null | undefined)[]): string {
  return parts.map(p => (p ?? '').trim()).filter(Boolean).join(', ');
}

/* ───────────────────────────── Reverse geocode ──────────────────────────── */

interface BigDataCloudResp {
  locality?: string;
  city?: string;
  principalSubdivision?: string;   // state
  postcode?: string;
  countryName?: string;
  localityInfo?: {
    administrative?: { name?: string; order?: number }[];
    informative?: { name?: string; description?: string }[];
  };
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<GeoAddress> {
  const url =
    `https://api.bigdatacloud.net/data/reverse-geocode-client` +
    `?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('reverse-geocode-failed');
  const d: BigDataCloudResp = await res.json();

  const area = d.locality || null;
  const city = d.city || d.locality || null;
  const state = d.principalSubdivision || null;
  const pincode = d.postcode || null;

  const formatted = compose([area, city !== area ? city : null, state, pincode]) ||
    `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  return {
    formatted,
    flat: null,
    building: null,
    area,
    city,
    state,
    pincode,
    latitude,
    longitude,
  };
}

/* ────────────────────────────── Forward search ──────────────────────────── */

interface PhotonFeature {
  geometry: { coordinates: [number, number] }; // [lng, lat]
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    locality?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<GeoAddress[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('search-failed');
  const data: { features?: PhotonFeature[] } = await res.json();

  return (data.features ?? []).map(f => {
    const p = f.properties;
    const [lng, lat] = f.geometry.coordinates;
    const area = p.district || p.locality || p.name || null;
    const city = p.city || p.county || null;
    const building = compose([p.name && p.name !== area ? p.name : null, p.street]) || null;
    const formatted = compose([
      p.name,
      p.housenumber,
      p.street && p.street !== p.name ? p.street : null,
      area && area !== p.name ? area : null,
      city && city !== area ? city : null,
      p.state,
      p.postcode,
    ]) || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    return {
      formatted,
      flat: p.housenumber || null,
      building,
      area,
      city,
      state: p.state || null,
      pincode: p.postcode || null,
      latitude: lat,
      longitude: lng,
    };
  });
}
