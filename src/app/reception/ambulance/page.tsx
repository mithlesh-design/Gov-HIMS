"use client"

import { useAmbulanceStore } from "@/store/useAmbulanceStore"
import { VisibilityHeader, STAT_CARD } from "@/components/reception/VisibilityHeader"
import { Truck, Activity, CheckCircle2, Wrench, MapPin, Navigation, Fuel, Phone } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { notifyAndAudit } from "@/lib/notifyAndAudit"

const VEHICLE_STATUS: Record<string, { label: string; tint: string; dot: string }> = {
  available:      { label: 'Available',   tint: 'bg-green-50 text-green-700',  dot: 'bg-green-500' },
  on_trip:        { label: 'On trip',     tint: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]',    dot: 'bg-[rgba(8,145,178,0.07)]0' },
  maintenance:    { label: 'Maintenance', tint: 'bg-amber-50 text-amber-700',  dot: 'bg-amber-500' },
  out_of_service: { label: 'Out of service', tint: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
}
const TRIP_TINT: Record<string, string> = {
  dispatched: 'bg-amber-50 text-amber-700', en_route: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]', at_scene: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]',
  transporting: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]', completed: 'bg-green-50 text-green-700', cancelled: 'bg-slate-100 text-slate-500',
}

export default function ReceptionAmbulance() {
  const vehicles = useAmbulanceStore(s => s.vehicles)
  const trips = useAmbulanceStore(s => s.trips)

  const available = vehicles.filter(v => v.status === 'available').length
  const onTrip = vehicles.filter(v => v.status === 'on_trip').length
  const activeTrips = trips.filter(t => t.status !== 'completed' && t.status !== 'cancelled')

  const tiles = [
    { label: 'Available', value: available, icon: CheckCircle2, tint: 'bg-green-50 text-green-600' },
    { label: 'On trip', value: onTrip, icon: Activity, tint: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]' },
    { label: 'Active trips', value: activeTrips.length, icon: Navigation, tint: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]' },
    { label: 'Fleet size', value: vehicles.length, icon: Truck, tint: 'bg-slate-100 text-slate-600' },
  ]

  return (
    <div className="pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <VisibilityHeader title="Ambulance" subtitle="Fleet status & active trips" owner="ambulance desk" />
      </div>
      <div className="-mt-2 mb-4">
        <button
          onClick={() => {
            notifyAndAudit({
              to: 'ambulance', type: 'system', priority: 'high',
              title: 'New dispatch request',
              body: `Reception is requesting an ambulance dispatch. ${available > 0 ? `${available} vehicle${available !== 1 ? 's' : ''} available` : 'No vehicles free — please prioritise.'}`,
              audit: { action: 'ambulance_dispatched', resource: 'ambulance', detail: 'Reception requested dispatch via ambulance dashboard', userName: 'Reception' },
            })
            toast.success('Dispatch request sent to ambulance desk', { description: available > 0 ? `${available} vehicle${available !== 1 ? 's' : ''} available` : 'No vehicles free — desk will prioritise' })
          }}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[13.5px] font-bold shadow-sm active:scale-[0.98] transition">
          <Phone className="h-4 w-4" /> Request dispatch
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {tiles.map(t => (
          <div key={t.label} className={STAT_CARD}>
            <span className={cn("h-9 w-9 rounded-xl flex items-center justify-center", t.tint)}><t.icon className="h-4.5 w-4.5" /></span>
            <p className="text-[22px] font-bold text-slate-900 mt-2.5 leading-none tabular-nums">{t.value}</p>
            <p className="text-[12px] font-semibold text-slate-500 mt-1">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Active trips */}
        <div className="rounded-2xl bg-white shadow-[0_1px_4px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] p-5">
          <h3 className="text-[15px] font-bold text-slate-900 mb-3">Active trips</h3>
          {activeTrips.length === 0 ? (
            <p className="text-[13px] text-slate-400 bg-slate-50 rounded-xl p-3">No active trips right now.</p>
          ) : (
            <div className="space-y-2.5">
              {activeTrips.map(t => (
                <div key={t.id} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[13.5px] font-bold text-slate-900 capitalize">{t.tripType} · {t.patientName ?? 'Emergency'}</p>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full capitalize", TRIP_TINT[t.status] ?? 'bg-slate-100 text-slate-600')}>{t.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-[11.5px] text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> {t.pickupLocation} → {t.destination}</p>
                  {typeof t.responseTimeMinutes === 'number' && <p className="text-[11px] text-slate-400 mt-0.5">Response: {t.responseTimeMinutes} min</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fleet */}
        <div className="rounded-2xl bg-white shadow-[0_1px_4px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] p-5">
          <h3 className="text-[15px] font-bold text-slate-900 mb-3">Fleet</h3>
          <div className="space-y-2">
            {vehicles.map(v => {
              const st = VEHICLE_STATUS[v.status] ?? VEHICLE_STATUS.out_of_service
              return (
                <div key={v.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                  <span className={cn("h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0", v.status === 'maintenance' ? 'bg-amber-50 text-amber-600' : 'bg-white border border-slate-200 text-slate-600')}>
                    {v.status === 'maintenance' ? <Wrench className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-bold text-slate-900 truncate">{v.vehicleNumber} <span className="font-medium text-slate-400">· {v.type}</span></p>
                    <p className="text-[11.5px] text-slate-500 truncate">{v.driverName}{typeof v.fuelLevel === 'number' ? ` · ` : ''}{typeof v.fuelLevel === 'number' && <span className="inline-flex items-center gap-0.5"><Fuel className="h-3 w-3" />{v.fuelLevel}%</span>}</p>
                  </div>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0", st.tint)}><span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />{st.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
