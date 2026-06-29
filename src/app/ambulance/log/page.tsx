"use client"

import { useMemo, useState } from "react"
import { Truck, ArrowRight, CheckCircle2, MapPin, ShieldCheck } from "lucide-react"
import { useAmbulanceStore, type AmbulanceTrip, type TripStatus } from "@/store/useAmbulanceStore"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const STATUS_LABEL: Record<TripStatus, string> = {
  dispatched: 'Dispatched',
  en_route:   'En route',
  at_scene:   'At scene',
  transporting: 'Transporting',
  completed:  'Completed',
  cancelled:  'Cancelled',
}

const STATUS_TINT: Record<TripStatus, string> = {
  dispatched: 'bg-amber-100 text-amber-700',
  en_route:   'bg-[rgba(8,145,178,0.12)] text-[var(--color-primary)]',
  at_scene:   'bg-[rgba(8,145,178,0.12)] text-[var(--color-primary)]',
  transporting: 'bg-[rgba(8,145,178,0.12)] text-[var(--color-primary)]',
  completed:  'bg-emerald-100 text-emerald-700',
  cancelled:  'bg-slate-200 text-slate-600',
}

// Next status in the lifecycle for the action button.
const NEXT: Partial<Record<TripStatus, TripStatus>> = {
  dispatched: 'en_route',
  en_route:   'at_scene',
  at_scene:   'transporting',
  transporting: 'completed',
}

const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function AmbulanceLogPage() {
  const trips      = useAmbulanceStore(s => s.trips)
  const updateTrip = useAmbulanceStore(s => s.updateTrip)

  const [tab, setTab] = useState<'active' | 'history'>('active')

  const sorted = useMemo(() => [...trips].sort((a, b) => new Date(b.dispatchedAt).getTime() - new Date(a.dispatchedAt).getTime()), [trips])
  const active = sorted.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
  const history = sorted.filter(t => t.status === 'completed' || t.status === 'cancelled')

  const advance = (t: AmbulanceTrip) => {
    const next = NEXT[t.status]
    if (!next) return
    updateTrip(t.id, { status: next, ...(next === 'completed' ? { completedAt: new Date().toISOString() } : {}) })
    toast.success(`${t.vehicleNumber} → ${STATUS_LABEL[next]}`)
  }

  const list = tab === 'active' ? active : history

  return (
    <div className="space-y-5 p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Truck className="h-6 w-6 text-orange-600" />Trip Log
        </h1>
        <p className="text-sm text-slate-500 mt-1">Live dispatch console · response-time tracking · NABH COP evidence</p>
      </div>

      <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 w-fit">
        {(['active', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer capitalize',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t} <span className="text-slate-400">{t === 'active' ? active.length : history.length}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {list.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-500">No trips in this view</p>
          </div>
        )}
        {list.map(t => {
          const minsActive = Math.round((Date.now() - new Date(t.dispatchedAt).getTime()) / 60000)
          const next = NEXT[t.status]
          return (
            <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                    {t.vehicleNumber}
                    <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", STATUS_TINT[t.status])}>
                      {STATUS_LABEL[t.status]}
                    </span>
                    <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                      t.tripType === 'emergency' ? 'bg-red-100 text-red-700' : 'bg-[rgba(8,145,178,0.12)] text-[var(--color-primary)]')}>
                      {t.tripType}
                    </span>
                  </p>
                  <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{t.pickupLocation} <ArrowRight className="h-3 w-3 text-slate-400" /> {t.destination}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Dispatched {fmt(t.dispatchedAt)} ({minsActive} min ago)
                    {t.chiefComplaint ? ` · ${t.chiefComplaint}` : ''}
                    {t.callerName ? ` · caller: ${t.callerName}${t.callerPhone ? ` (${t.callerPhone})` : ''}` : ''}
                  </p>
                  {t.responseTimeMinutes !== undefined && (
                    <p className="text-[11px] text-emerald-700 mt-0.5">Response time: {t.responseTimeMinutes} min</p>
                  )}
                  {t.completedAt && (
                    <p className="text-[11px] text-slate-500 mt-0.5">Completed {fmt(t.completedAt)}</p>
                  )}
                </div>
                {next && (
                  <button onClick={() => advance(t)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white cursor-pointer">
                    <ArrowRight className="h-3.5 w-3.5" />Advance to {STATUS_LABEL[next]}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <ShieldCheck className="h-3 w-3" />Dispatch &amp; completion fire NABH COP audit events with response time evidence.
      </p>
    </div>
  )
}
