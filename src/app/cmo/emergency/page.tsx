"use client"
import { useState } from 'react'
import { toast } from 'sonner'
import { CmoPageHeader } from '@/components/cmo/layout/CmoPageHeader'
import { cn } from '@/lib/utils'

type MCIType = 'rta' | 'disaster' | 'outbreak' | null

const CASUALTY_LEVELS = ['P1 — Immediate', 'P2 — Delayed', 'P3 — Minor', 'P4 — Expectant']

export default function CmoEmergencyPage() {
  const [active, setActive] = useState<MCIType>(null)
  const [surgeActivated, setSurgeActivated] = useState(false)
  const [surgeBeds, setSurgeBeds] = useState(0)
  const [casualties, setCasualties] = useState<{name:string;triage:string}[]>([])
  const [form, setForm] = useState({ name: '', triage: CASUALTY_LEVELS[0] })
  const [staffAck, setStaffAck] = useState(0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <CmoPageHeader title="Emergency mode · आपातकालीन मोड" subtitle="Mass casualty incident response" />

      {!active ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6">
          <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">🚨</span>
          </div>
          <div>
            <p className="text-[18px] font-bold text-slate-900">No active emergency</p>
            <p className="text-[13px] text-slate-500 mt-1">Activate MCI mode to coordinate district-wide response</p>
          </div>
          <div className="flex gap-4 justify-center flex-wrap">
            {[
              { type: 'rta' as MCIType, label: '🚗 Mass casualty (RTA)', desc: 'Road traffic accident response' },
              { type: 'disaster' as MCIType, label: '🌊 Disaster (flood/quake)', desc: 'Natural disaster protocol' },
              { type: 'outbreak' as MCIType, label: '🦠 Outbreak surge', desc: 'Epidemic response mode' },
            ].map(opt => (
              <button key={opt.type} onClick={() => { setActive(opt.type); toast.success(`${opt.label} mode activated`) }}
                className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-red-200 hover:border-red-500 hover:bg-red-50 transition-all w-48">
                <span className="text-[20px]">{opt.label}</span>
                <span className="text-[11px] text-slate-500">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-red-600 text-white rounded-xl px-5 py-3 flex items-center justify-between">
            <div>
              <p className="text-[15px] font-bold">MCI MODE ACTIVE · {active.toUpperCase()}</p>
              <p className="text-red-200 text-[12px]">Activated {new Date().toLocaleTimeString('en-IN')} · All district resources on standby</p>
            </div>
            <button onClick={() => { setActive(null); setSurgeBeds(0); setCasualties([]) }}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-white text-red-700 hover:bg-red-50">
              Deactivate
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'Beds available', value: `${247 + surgeBeds}` },
              { label: 'Surge beds activated', value: surgeBeds.toString() },
              { label: 'OTs available', value: '3 of 5' },
              { label: 'Surgeons on-call', value: '4' },
              { label: 'Ventilators free', value: '11' },
              { label: 'Blood O-neg', value: '89 units' },
            ].map(t => (
              <div key={t.label} className="bg-white border border-slate-200 rounded-xl p-3">
                <p className="text-[11px] text-slate-500">{t.label}</p>
                <p className="text-[22px] font-semibold text-slate-900">{t.value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setSurgeBeds(s => s + 50); toast.success('+50 surge beds activated') }}
              className="text-[12px] font-semibold px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700">
              Activate +50 surge beds
            </button>
            <button onClick={() => { setStaffAck(s => s + 3); toast.success('All surgeons paged') }}
              className="text-[12px] font-semibold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              Page all surgeons {staffAck > 0 ? `(${staffAck} ack)` : ''}
            </button>
          </div>

          {/* Casualty intake */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-[13px] font-bold text-slate-900 mb-3">Triage board — log casualty</p>
            <div className="flex gap-2 mb-4">
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Patient name / ID"
                className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-red-400" />
              <select value={form.triage} onChange={e => setForm(f => ({...f, triage: e.target.value}))}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-[12px] bg-white focus:outline-none">
                {CASUALTY_LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
              <button onClick={() => { if(form.name) { setCasualties(c => [...c, form]); setForm({name:'', triage: CASUALTY_LEVELS[0]}); toast.success('Casualty logged') }}}
                className="text-[11px] font-semibold px-3 py-1.5 bg-red-600 text-white rounded-lg">Log</button>
            </div>
            <div className="space-y-1">
              {casualties.map((c, i) => (
                <div key={i} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-[12px]',
                  c.triage.startsWith('P1') ? 'bg-red-50 text-red-800' :
                  c.triage.startsWith('P2') ? 'bg-amber-50 text-amber-800' :
                  c.triage.startsWith('P3') ? 'bg-green-50 text-green-800' : 'bg-slate-100 text-slate-600')}>
                  <span className="font-bold">{c.triage.split(' — ')[0]}</span>
                  <span>{c.name}</span>
                </div>
              ))}
              {casualties.length === 0 && <p className="text-[12px] text-slate-400 py-2 text-center">No casualties logged yet</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
