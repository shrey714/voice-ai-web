'use client'
import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/**
 * Draggable pin-drop map. Keyless — uses OpenStreetMap raster tiles.
 * Controlled via `lat`/`lng`; reports moves through `onChange`.
 *
 * Rendered client-only (Leaflet needs `window`) — import it with
 * next/dynamic({ ssr: false }) from the parent.
 */

// Teardrop pin as an inline SVG divIcon → avoids the classic missing
// marker-image problem and inherits the app's primary colour via the CSS var.
const pinIcon = L.divIcon({
  className: 'sk-pin',
  html: `<div style="color:var(--primary);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">
    <svg width="34" height="42" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 8.25 12 18 12 18s12-9.75 12-18C24 5.37 18.63 0 12 0z" fill="currentColor"/>
      <circle cx="12" cy="12" r="4.5" fill="white"/>
    </svg>
  </div>`,
  iconSize: [34, 42],
  iconAnchor: [17, 42],
})

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true })
  }, [lat, lng, map])
  return null
}

function ClickToMove({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onChange(e.latlng.lat, e.latlng.lng) } })
  return null
}

// Leaflet mis-measures when its container animates in (inside a dialog);
// recompute size once it's visible.
function AutoResize() {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 220)
    return () => clearTimeout(t)
  }, [map])
  return null
}

export function MapPicker({
  lat, lng, onChange,
}: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  const markerRef = useRef<L.Marker>(null)

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      // Off by default so scrolling the wheel over the map inside the address
      // dialog scrolls the form, not the map. +/- controls still zoom.
      scrollWheelZoom={false}
      className="h-56 w-full rounded-xl z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      <Marker
        position={[lat, lng]}
        draggable
        ref={markerRef}
        icon={pinIcon}
        eventHandlers={{
          dragend() {
            const p = markerRef.current?.getLatLng()
            if (p) onChange(p.lat, p.lng)
          },
        }}
      />
      <Recenter lat={lat} lng={lng} />
      <ClickToMove onChange={onChange} />
      <AutoResize />
    </MapContainer>
  )
}
