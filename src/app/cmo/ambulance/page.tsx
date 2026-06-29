"use client"
import { useState } from 'react'
import { toast } from 'sonner'
import { Ambulance as AmbulanceIcon, MapPin, Brain, ChevronRight } from 'lucide-react'
import { useCmoAmbulancesStore } from '@/store/useCmoAmbulancesStore'
import { CmoPageHeader } from '@/components/cmo/layout/CmoPageHeader'
import { MetricTile }    from '@/components/shared/MetricTile'
import { DrillCard }     from '@/components/shared/DrillCard'
import type { Ambulance } from '@/types/cmo'
import { cn } from '@/lib/utils'
const REROUTE_OPTIONS = [
  { id: 'fac_dh_hamidia',   name: 'Hamidia DH',   eta: 22, capability: '✓ CCU · ✓ OT · ✓ Trauma' },
  { id: 'fac_ch_kolar',     name: 'CH Kolar',      eta: 18, capability: '✓ Emergency · ✓ Beds · ✗ CCU' },
  { id: 'fac_ch_bairagarh', name: 'CH Bairagarh',  eta: 31, capability: '✓ Emergency · ✗ OT · ✗ CCU' },
]

const STATUS_CONFIG: Record<Ambulance['status'], { label: string; badge: string }> = {
  'idle':              { label: 'Idle',         badge: 'bg-slate-100 text-slate-600' },
  'dispatched':        { label: 'Dispatched',   badge: 'bg-blue-100 text-blue-700' },
  'at-incident':       { label: 'At incident',  badge: 'bg-amber-100 text-amber-700' },
  'en-route-facility': { label: 'En route →',   badge: 'bg-emerald-100 text-emerald-700' },
  'returning':         { label: 'Returning',    badge: 'bg-slate-100 text-slate-600' },
}

function VitalChip({ label, value, alert }: { label: string; value: string | number; alert: boolean }) {
  return (
    <div className={cn('rounded-lg px-2.5 py-2 text-center',
      alert ? 'bg-red-50 border border-red-200' : 'bg-[var(--color-surface-raised)] border border-[var(--color-border)]')}>
      <p className={cn('text-[9.5px] font-semibold uppercase tracking-wide mb-0.5', alert ? 'text-red-500' : 'text-[var(--color-foreground-lighter)]')}>{label}</p>
      <p className={cn('text-[14px] font-bold leading-none tabular-nums', alert ? 'text-red-700' : 'text-[var(--color-foreground)]')}
         style={{ fontFamily: 'var(--font-heading)' }}>
        {value}
      </p>
    </div>
  )
}

export default function CmoAmbulancePage() {
  const ambulances = useCmoAmbulancesStore(s => s.ambulances)
  const reroute    = useCmoAmbulancesStore(s => s.reroute)

  const [drill, setDrill]           = useState<Ambulance | null>(null)
  const [rerouteAmb, setRerouteAmb] = useState<Ambulance | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<typeof REROUTE_OPTIONS[0] | null>(null)

  const active    = ambulances.filter(a => a.status !== 'idle')
  const enRoute   = active.filter(a => a.status === 'en-route-facility')
  const atIncident = active.filter(a => a.status === 'at-incident')
  const returning  = active.filter(a => a.status === 'returning')

  return (
    <div className="max-w-5xl mx-auto space-y-5 cmo-fade-up">
      <CmoPageHeader
        title="Ambulance command · एम्बुलेंस कमांड"
        titleHindi="23 वाहन · 8 सक्रिय · लाइव ट्रैकिंग"
        subtitle={`${active.length} active · ${enRoute.length} en route · ${atIncident.length} at incident · ${returning.length} returning`}
      />

      <div className="grid grid-cols-4 gap-3">
        <MetricTile label="Active ambulances" value={active.length} />
        <MetricTile label="En route →" value={enRoute.length} variant="info" />
        <MetricTile label="At incident" value={atIncident.length} variant="warning" />
        <MetricTile label="Returning" value={returning.length} />
      </div>

      {/* En-route cards */}
      {enRoute.length > 0 && (
        <div>
          <p className="text-[13px] font-bold text-[var(--color-foreground)] mb-3"
             style={{ fontFamily: 'var(--font-heading)' }}>
            En route — live feed
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
              <span className="cmo-live-pulse h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {enRoute.map(amb => (
              <div key={amb.id}
                className="bg-[var(--color-surface)] border-2 border-[border-green-200] rounded-2xl overflow-hidden cursor-pointer hover:shadow-[var(--shadow-card-hover)] transition-all duration-200"
                style={{ boxShadow: 'var(--shadow-card)' }}
                onClick={() => setDrill(amb)}
              >
                {/* Card header */}
                <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-success-bg)] border-b border-[border-green-200]">
                  <div className="flex items-center gap-2">
                    <AmbulanceIcon size={14} className="text-emerald-700" />
                    <span className="text-[12px] font-bold text-emerald-900">{amb.vehicleNumber}</span>
                  </div>
                  <span className={cn('text-[9.5px] font-bold px-2 py-0.5 rounded-full border', 'bg-emerald-700 text-white border-emerald-800')}>
                    {amb.service}
                  </span>
                </div>

                {/* Patient info */}
                {amb.patient && (
                  <div className="px-4 py-3 border-b border-[var(--color-border)]">
                    <p className="text-[13px] font-bold text-[var(--color-foreground)] leading-snug"
                       style={{ fontFamily: 'var(--font-heading)' }}>
                      {amb.patient.name ?? 'Unknown'}{amb.patient.age ? `, ${amb.patient.age} ${amb.patient.gender}` : ''}
                    </p>
                    <p className="text-[11.5px] text-[var(--color-foreground-muted)] mt-0.5 line-clamp-2">{amb.patient.chiefComplaint}</p>

                    {/* Vitals */}
                    <div className="grid grid-cols-4 gap-1.5 mt-2.5">
                      <VitalChip label="HR" value={`${amb.patient.vitals.hr}`} alert={amb.patient.vitals.hr > 120 || amb.patient.vitals.hr < 50} />
                      <VitalChip label="BP" value={amb.patient.vitals.bp} alert={false} />
                      <VitalChip label="SpO₂" value={`${amb.patient.vitals.spo2}%`} alert={amb.patient.vitals.spo2 < 92} />
                      <VitalChip label="Temp" value={`${amb.patient.vitals.temp}°`} alert={amb.patient.vitals.temp > 38.5} />
                    </div>
                  </div>
                )}

                {/* AI prediction */}
                {amb.aiPrediction && (
                  <div className="px-4 py-2 flex items-start gap-2 border-b border-[var(--color-border)]">
                    <Brain size={13} className="text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[11.5px] font-semibold text-[#1E40AF]">{amb.aiPrediction.diagnosis}</p>
                      <p className="text-[10px] text-[var(--color-foreground-lighter)]">{amb.aiPrediction.confidence}% · {amb.aiPrediction.specialty}</p>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] text-[var(--color-foreground-muted)]">
                    <MapPin size={11} />
                    <span className="truncate max-w-[100px]">{amb.destinationFacility?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-emerald-700 tabular-nums"
                          style={{ fontFamily: 'var(--font-heading)' }}>
                      {Math.round(amb.etaMinutes ?? 0)} min
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); setRerouteAmb(amb); setSelectedRoute(null) }}
                      className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-[var(--color-border)] text-[var(--color-foreground-muted)] hover:border-[rgba(8,145,178,0.18)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-all">
                      Re-route
                    </button>
                  </div>
                </div>

                {/* Receiving prep chips */}
                {amb.receivingFacilityStatus && (
                  <div className="px-4 pb-3 flex gap-1.5 flex-wrap">
                    {amb.receivingFacilityStatus.specialistPaged && (
                      <span className="text-[9px] font-semibold bg-[var(--color-success-bg)] text-[#065F46] border border-[border-green-200] px-2 py-0.5 rounded-full">
                        Specialist paged
                      </span>
                    )}
                    {amb.receivingFacilityStatus.bedReserved && (
                      <span className="text-[9px] font-semibold bg-[var(--color-success-bg)] text-[#065F46] border border-[border-green-200] px-2 py-0.5 rounded-full">
                        Bed {amb.receivingFacilityStatus.bedId}
                      </span>
                    )}
                    {amb.receivingFacilityStatus.otPrepStarted && (
                      <span className="text-[9px] font-semibold bg-[var(--color-warning-bg)] text-[#92400E] border border-[border-amber-200] px-2 py-0.5 rounded-full">
                        OT prep
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* At incident + returning */}
      {[...atIncident, ...returning].length > 0 && (
        <div>
          <p className="text-[13px] font-bold text-[var(--color-foreground)] mb-2"
             style={{ fontFamily: 'var(--font-heading)' }}>Other active vehicles</p>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden"
               style={{ boxShadow: 'var(--shadow-card)' }}>
            {[...atIncident, ...returning].map((amb, i) => {
              const badge = STATUS_CONFIG[amb.status]
              return (
                <div key={amb.id}
                  onClick={() => setDrill(amb)}
                  className={cn('flex items-center gap-3.5 px-5 py-3 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-raised)] cursor-pointer transition-colors',
                    i % 2 === 1 ? 'bg-[var(--color-surface-raised)]' : '')}>
                  <AmbulanceIcon size={14} className="text-[var(--color-foreground-lighter)] flex-shrink-0" />
                  <span className="text-[12.5px] font-semibold text-[var(--color-foreground)] min-w-[140px]">{amb.vehicleNumber}</span>
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0', badge.badge)}>{badge.label}</span>
                  <span className="text-[11.5px] text-[var(--color-foreground-muted)] flex-1 truncate">
                    {amb.patient?.chiefComplaint ?? amb.currentLocation.address}
                  </span>
                  <span className="text-[11px] text-[var(--color-foreground-lighter)] flex-shrink-0">{amb.driver.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Ambulance drill */}
      <DrillCard open={!!drill} onClose={() => setDrill(null)}
        title={drill?.vehicleNumber ?? ''} subtitle={`${drill?.service} · ${drill?.driver.name}`}
        width="wide"
        footer={
          <>
            <button onClick={() => { setRerouteAmb(drill); setDrill(null); setSelectedRoute(null) }}
              className="text-[12.5px] font-semibold px-4 py-2.5 rounded-xl border border-[var(--color-border)] hover:bg-slate-50">
              Re-route
            </button>
            <button onClick={() => { console.info('[CMO Demo] Page specialist'); toast.success('Specialist paged') }}
              className="flex-1 text-[12.5px] font-semibold py-2.5 rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90">
              Page specialist
            </button>
          </>
        }
      >
        {drill?.patient && (
          <div className="space-y-4">
            <div className="bg-[var(--color-surface-raised)] rounded-xl border border-[var(--color-border)] p-4">
              <p className="text-[15px] font-bold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--font-heading)' }}>
                {drill.patient.name ?? 'Unknown patient'}{drill.patient.age ? `, ${drill.patient.age} yrs` : ''}
              </p>
              {drill.patient.abhaId && <p className="text-[11px] text-[var(--color-foreground-lighter)] mt-0.5">ABHA: {drill.patient.abhaId}</p>}
              <p className="text-[12.5px] text-[var(--color-foreground-muted)] mt-1.5">{drill.patient.chiefComplaint}</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'HR', value: `${drill.patient.vitals.hr} bpm`, alert: drill.patient.vitals.hr > 120 || drill.patient.vitals.hr < 50 },
                { label: 'BP', value: drill.patient.vitals.bp, alert: false },
                { label: 'SpO₂', value: `${drill.patient.vitals.spo2}%`, alert: drill.patient.vitals.spo2 < 92 },
                { label: 'Temp', value: `${drill.patient.vitals.temp}°C`, alert: drill.patient.vitals.temp > 38.5 },
              ].map(v => <VitalChip key={v.label} {...v} />)}
            </div>
            {drill.aiPrediction && (
              <div className="bg-[var(--color-primary-soft)] border border-[rgba(8,145,178,0.18)] rounded-xl p-4">
                <p className="text-[13px] font-bold text-[var(--color-foreground)]">AI diagnosis: {drill.aiPrediction.diagnosis}</p>
                <p className="text-[12px] text-[var(--color-foreground-muted)] mt-0.5">{drill.aiPrediction.confidence}% confidence · {drill.aiPrediction.specialty}</p>
              </div>
            )}
            {drill.receivingFacilityStatus && (
              <div className="bg-[var(--color-surface-raised)] rounded-xl border border-[var(--color-border)] p-4 space-y-2 text-[12.5px]">
                <p className="font-bold text-[var(--color-foreground)]">Receiving facility prep</p>
                {[
                  { label: 'Specialist paged', done: drill.receivingFacilityStatus.specialistPaged },
                  { label: `Bed reserved${drill.receivingFacilityStatus.bedId ? ` (${drill.receivingFacilityStatus.bedId})` : ''}`, done: drill.receivingFacilityStatus.bedReserved },
                  { label: 'OT prep started', done: drill.receivingFacilityStatus.otPrepStarted },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full flex-shrink-0', item.done ? 'bg-emerald-500' : 'bg-slate-300')} />
                    <span className={item.done ? 'text-[var(--color-foreground)]' : 'text-[var(--color-foreground-lighter)]'}>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[12px] text-[var(--color-foreground-muted)] space-y-0.5">
              <p>Driver: <strong>{drill.driver.name}</strong> · {drill.driver.phone}</p>
              <p>EMT: <strong>{drill.emt.name}</strong> ({drill.emt.certificationLevel})</p>
              {drill.etaMinutes !== undefined && (
                <p className="font-semibold text-emerald-700 mt-1">
                  ETA: {Math.round(drill.etaMinutes)} min → {drill.destinationFacility?.name}
                </p>
              )}
            </div>
          </div>
        )}
      </DrillCard>

      {/* Re-route */}
      <DrillCard open={!!rerouteAmb} onClose={() => setRerouteAmb(null)}
        title="Re-route ambulance" subtitle={rerouteAmb?.vehicleNumber}
        footer={
          <button disabled={!selectedRoute}
            onClick={async () => {
              if (rerouteAmb && selectedRoute) {
                await reroute(rerouteAmb.id, selectedRoute.id, selectedRoute.name, selectedRoute.eta)
                setRerouteAmb(null)
                toast.success(`Rerouted to ${selectedRoute.name} · ETA ${selectedRoute.eta} min`)
              }
            }}
            className="flex-1 text-[12.5px] font-semibold py-2.5 rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-40">
            Confirm reroute
          </button>
        }
      >
        <div className="space-y-3">
          <p className="text-[12px] text-[var(--color-foreground-lighter)]">Select alternative facility (AI-ranked by capability + proximity):</p>
          {REROUTE_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => setSelectedRoute(opt)}
              className={cn(
                'w-full text-left rounded-xl border p-4 transition-all duration-150',
                selectedRoute?.id === opt.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-[var(--shadow-glow-sm)]'
                  : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-raised)]',
              )}>
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-[var(--color-foreground)]"
                   style={{ fontFamily: 'var(--font-heading)' }}>
                  {opt.name}
                </p>
                <span className="text-[14px] font-bold text-emerald-700 tabular-nums"
                      style={{ fontFamily: 'var(--font-heading)' }}>
                  {opt.eta} min
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-foreground-lighter)] mt-0.5">{opt.capability}</p>
            </button>
          ))}
        </div>
      </DrillCard>
    </div>
  )
}
