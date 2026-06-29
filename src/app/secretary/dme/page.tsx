'use client'

import { useState } from 'react'
import { Building2, AlertTriangle, CheckCircle, Clock, X, Users } from 'lucide-react'
import { useSecretaryMedicalCollegesStore } from '@/store/useSecretaryMedicalCollegesStore'
import type { MedicalCollege } from '@/types/secretary'

const STATUS_STYLES = {
  ok:       { badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' },
  watch:    { badge: 'bg-amber-100 text-amber-700',     border: 'border-amber-200' },
  warning:  { badge: 'bg-orange-100 text-orange-700',   border: 'border-orange-200' },
  critical: { badge: 'bg-rose-100 text-rose-700',       border: 'border-rose-200' },
}

function CollegeCard({ college, onClick }: { college: MedicalCollege; onClick: () => void }) {
  const st = STATUS_STYLES[college.status]
  const occupancyPct = Math.round((college.beds.used / college.beds.total) * 100)
  const vacancyPct = Math.round((college.facultyVacant / college.facultyTotal) * 100)
  return (
    <button onClick={onClick}
      className={`bg-white border ${st.border} rounded-xl p-4 text-left hover:shadow-md transition-all hover:-translate-y-0.5 w-full`}
      style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-bold text-[var(--color-foreground)] leading-tight">{college.name}</p>
          <p className="text-xs text-[var(--color-foreground-muted)] mt-0.5">{college.city}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${st.badge}`}>{college.status.toUpperCase()}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-[var(--color-foreground-muted)]">Occupancy</p>
          <p className="font-bold text-[var(--color-foreground)]">{occupancyPct}% <span className="font-normal text-[var(--color-foreground-muted)]">({college.beds.used}/{college.beds.total})</span></p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
            <div className={`h-1.5 rounded-full ${occupancyPct > 90 ? 'bg-rose-500' : 'bg-[var(--color-primary)]'}`} style={{ width: `${occupancyPct}%` }} />
          </div>
        </div>
        <div>
          <p className="text-[var(--color-foreground-muted)]">Faculty vacancy</p>
          <p className={`font-bold ${vacancyPct > 30 ? 'text-rose-600' : 'text-[var(--color-foreground)]'}`}>{vacancyPct}% <span className="font-normal text-[var(--color-foreground-muted)]">({college.facultyVacant} posts)</span></p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
            <div className={`h-1.5 rounded-full ${vacancyPct > 30 ? 'bg-rose-500' : 'bg-amber-400'}`} style={{ width: `${Math.min(100, vacancyPct * 2)}%` }} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-3">
        {college.specialties.slice(0, 4).map(s => (
          <span key={s} className="text-[9px] bg-[var(--color-surface-raised)] text-[var(--color-foreground-muted)] px-2 py-0.5 rounded-full">{s}</span>
        ))}
        {college.specialties.length > 4 && <span className="text-[9px] text-[var(--color-foreground-lighter)] px-1">+{college.specialties.length - 4}</span>}
      </div>
    </button>
  )
}

function CollegeDrill({ college, onClose }: { college: MedicalCollege; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div className="w-[440px] bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--color-foreground)]">{college.name}</h2>
            <p className="text-xs text-[var(--color-foreground-muted)]">{college.city}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--color-surface-raised)] rounded-lg"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total beds', value: college.beds.total },
              { label: 'Occupied', value: college.beds.used },
              { label: 'PG seats', value: college.pgSeats },
              { label: 'Faculty total', value: college.facultyTotal },
              { label: 'Faculty vacant', value: college.facultyVacant },
            ].map(m => (
              <div key={m.label} className="bg-[var(--color-surface-raised)] rounded-xl p-3 text-center">
                <p className="text-xs text-[var(--color-foreground-muted)]">{m.label}</p>
                <p className="text-xl font-bold text-[var(--color-foreground)]">{m.value}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-foreground)] mb-2">Specialties</p>
            <div className="flex flex-wrap gap-2">
              {college.specialties.map(s => (
                <span key={s} className="text-xs bg-teal-50 text-[var(--color-primary)] border border-teal-200 px-2 py-1 rounded-lg">{s}</span>
              ))}
            </div>
          </div>
          <div className="bg-[var(--color-surface-raised)] rounded-xl p-3">
            <p className="text-xs text-[var(--color-foreground-muted)]">Last NMC inspection</p>
            <p className="text-sm font-medium text-[var(--color-foreground)]">{college.lastNmcInspection || 'Not available'}</p>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 px-4 py-2.5 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:opacity-90">Issue directive</button>
            <button className="flex-1 px-4 py-2.5 border border-[var(--color-border)] text-sm font-medium rounded-lg hover:bg-[var(--color-surface-raised)]">Schedule inspection</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DmePage() {
  const { colleges } = useSecretaryMedicalCollegesStore()
  const [selected, setSelected] = useState<MedicalCollege | null>(null)

  const totalBeds = colleges.reduce((s, c) => s + c.beds.total, 0)
  const totalPg = colleges.reduce((s, c) => s + c.pgSeats, 0)
  const totalVacant = colleges.reduce((s, c) => s + c.facultyVacant, 0)
  const criticals = colleges.filter(c => c.status === 'critical' || c.status === 'warning').length

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">DME · 14 Medical Colleges</h1>
        <p className="text-sm text-[var(--color-foreground-muted)] mt-0.5">DME · 14 कॉलेज · Tertiary care coordination</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total colleges', value: '14' },
          { label: 'Total beds', value: totalBeds.toLocaleString() },
          { label: 'PG seats', value: totalPg.toLocaleString() },
          { label: 'Faculty vacancies', value: String(totalVacant) },
          { label: 'Action required', value: String(criticals), warn: true },
        ].map(k => (
          <div key={k.label} className="bg-white border border-[var(--color-border)] rounded-xl p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <p className="text-xs text-[var(--color-foreground-muted)]">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.warn ? 'text-rose-600' : 'text-[var(--color-foreground)]'}`}>{k.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {colleges.map(c => <CollegeCard key={c.id} college={c} onClick={() => setSelected(c)} />)}
      </div>
      {selected && <CollegeDrill college={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
