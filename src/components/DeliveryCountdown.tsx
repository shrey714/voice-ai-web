'use client'
import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

function nextCutoff(): Date {
  // Order-before cutoff at 20:00 local; if past, use tomorrow 20:00.
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setHours(20, 0, 0, 0)
  if (now >= cutoff) cutoff.setDate(cutoff.getDate() + 1)
  return cutoff
}

/** Live "order within HH:MM:SS for faster delivery" urgency ticker. */
export function DeliveryCountdown() {
  const [remaining, setRemaining] = useState<number>(() => nextCutoff().getTime() - Date.now())

  useEffect(() => {
    const id = setInterval(() => setRemaining(nextCutoff().getTime() - Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const totalSec = Math.max(0, Math.floor(remaining / 1000))
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0')
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0')
  const s = String(totalSec % 60).padStart(2, '0')

  return (
    <div className="flex items-center gap-2 rounded-xl border border-warning/25 bg-warning/10 px-3 py-2.5">
      <Clock size={15} className="text-warning shrink-0" />
      <p className="text-xs text-foreground">
        Order within{' '}
        <span className="font-black tabular-nums text-warning">{h}:{m}:{s}</span>{' '}
        for the fastest delivery slot
      </p>
    </div>
  )
}
