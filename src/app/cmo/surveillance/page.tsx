"use client"
import { useState } from 'react'
import { toast } from 'sonner'
import { CmoPageHeader } from '@/components/cmo/layout/CmoPageHeader'
import { MetricTile } from '@/components/shared/MetricTile'

const DISEASES = [
  { name: 'Dengue', week: 47, prev: 14, trend: '↑', severity: 'critical' },
  { name: 'Malaria', week: 12, prev: 9, trend: '↑', severity: 'warning' },
  { name: 'Typhoid', week: 8, prev: 10, trend: '↓', severity: 'info' },
  { name: 'Cholera', week: 0, prev: 0, trend: '—', severity: 'ok' },
  { name: 'Chikungunya', week: 3, prev: 2, trend: '↑', severity: 'info' },
  { name: 'TB (new)', week: 18, prev: 20, trend: '↓', severity: 'info' },
  { name: 'ARI', week: 142, prev: 98, trend: '↑', severity: 'warning' },
]

const CONTAINMENT_ACTIONS = [
  { label: 'Fogging teams deployed to wards 14, 17, 19', done: true },
  { label: 'RDT testing at fever clinics', done: true },
  { label: 'Advisory issued to all PHCs', done: true },
  { label: 'Larviciding in affected areas', done: false },
  { label: 'IDSP portal updated', done: false },
]

export default function CmoSurveillancePage() {
  const [actions, setActions] = useState(CONTAINMENT_ACTIONS)
  const [showRunbook, setShowRunbook] = useState(false)

  const toggle = (i: number) => setActions(a => a.map((act, idx) => idx === i ? { ...act, done: !act.done } : act))

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <CmoPageHeader title="Surveillance & outbreaks · निगरानी और प्रकोप" />

      <div className="grid grid-cols-4 gap-3">
        <MetricTile label="Notifiable diseases (week)" value="247" />
        <MetricTile label="Active outbreaks" value="1" variant="warning" />
        <MetricTile label="Weekly returns submitted" value="✓" variant="success" />
        <MetricTile label="IDSP/IHIP sync" value="✓" variant="success" />
      </div>

      {/* Active outbreak */}
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full">ACTIVE OUTBREAK</span>
              <span className="text-[13px] font-bold text-amber-900">Dengue · Bhopal Urban wards 14, 17, 19</span>
            </div>
            <p className="text-[12px] text-amber-800">47 cases this week · 3.2× baseline · Day 4</p>
          </div>
          <button onClick={() => setShowRunbook(s => !s)}
            className="text-[11px] font-semibold px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
            {showRunbook ? 'Hide' : 'Activate dengue runbook'}
          </button>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-[12px] font-semibold text-amber-900">Containment checklist:</p>
          {actions.map((a, i) => (
            <label key={i} className="flex items-center gap-2 text-[12px] cursor-pointer">
              <input type="checkbox" checked={a.done} onChange={() => toggle(i)} className="rounded" />
              <span className={a.done ? 'line-through text-slate-400' : 'text-amber-900'}>{a.label}</span>
            </label>
          ))}
        </div>
        {showRunbook && (
          <div className="mt-4 bg-white rounded-lg p-4 border border-amber-200 text-[12px] space-y-2">
            <p className="font-bold text-slate-900">Dengue response runbook — Step 1/5</p>
            {['1. Identify & map all fever cases in affected wards', '2. Deploy rapid response team for case investigation', '3. Activate vector control — fogging + larviciding', '4. Strengthen fever clinic surveillance', '5. Daily IDSP reporting until outbreak resolved'].map((s, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-amber-600 font-bold flex-shrink-0">{i + 1}.</span>
                <span className="text-slate-700">{s.slice(3)}</span>
              </div>
            ))}
            <button onClick={() => toast.success('Runbook activated · Notifications sent to BMOs')}
              className="mt-2 text-[11px] font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg">
              Activate all steps
            </button>
          </div>
        )}
      </div>

      {/* Disease table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-[12px]">
          <thead><tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
            <th className="px-4 py-2.5 text-left font-medium">Disease</th>
            <th className="px-3 py-2.5 text-right font-medium">This week</th>
            <th className="px-3 py-2.5 text-right font-medium">Last week</th>
            <th className="px-3 py-2.5 text-center font-medium">Trend</th>
          </tr></thead>
          <tbody>
            {DISEASES.map(d => (
              <tr key={d.name} className="border-b border-slate-50">
                <td className="px-4 py-2.5 font-semibold text-slate-900">{d.name}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{d.week}</td>
                <td className="px-3 py-2.5 text-right text-slate-500">{d.prev}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={d.trend === '↑' ? 'text-red-600 font-bold' : d.trend === '↓' ? 'text-green-600 font-bold' : 'text-slate-400'}>{d.trend}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
