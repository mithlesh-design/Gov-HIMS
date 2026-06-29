"use client"
import { useState } from 'react'
import { toast } from 'sonner'
import { CmoPageHeader } from '@/components/cmo/layout/CmoPageHeader'
import { MetricTile } from '@/components/shared/MetricTile'
import { cn } from '@/lib/utils'

const GRIEVANCES = [
  { id: 'g1', type: 'rti', title: 'RTI/2026/0347 — Drug stock information', raisedBy: 'Ramesh Gupta', ageHours: 72, status: 'open', slaBreached: true },
  { id: 'g2', type: 'citizen', title: 'Poor sanitation at PHC Kolar OPD', raisedBy: 'Meena Sharma', ageHours: 48, status: 'in-progress', slaBreached: false },
  { id: 'g3', type: 'citizen', title: 'Doctor absent — PHC Phanda', raisedBy: 'Sunita Devi', ageHours: 24, status: 'open', slaBreached: false },
  { id: 'g4', type: 'rti', title: 'RTI/2026/0312 — Staff posting records', raisedBy: 'Advocate R. Joshi', ageHours: 240, status: 'open', slaBreached: true },
  { id: 'g5', type: 'internal', title: 'Harassment complaint — PHC staff', raisedBy: 'Anonymous', ageHours: 12, status: 'open', slaBreached: false },
]

const TABS = ['RTI', 'Citizen grievances', 'Internal grievances']
const TAB_TYPES = ['rti', 'citizen', 'internal']

export default function CmoGrievancesPage() {
  const [tab, setTab] = useState(0)
  const [grievances, setGrievances] = useState(GRIEVANCES)

  const filtered = grievances.filter(g => g.type === TAB_TYPES[tab])

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <CmoPageHeader title="RTI & grievances · RTI और शिकायतें" />
      <div className="grid grid-cols-3 gap-3">
        <MetricTile label="RTI pending" value={grievances.filter(g => g.type === 'rti' && g.status !== 'resolved').length} variant="warning" />
        <MetricTile label="Grievances open" value={grievances.filter(g => g.type !== 'rti' && g.status !== 'resolved').length} />
        <MetricTile label="SLA breached" value={grievances.filter(g => g.slaBreached).length} variant="critical" />
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={cn('text-[12px] font-semibold px-3 py-2.5 border-b-2 -mb-px transition-colors',
              tab === i ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
            {t} ({grievances.filter(g => g.type === TAB_TYPES[i]).length})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(g => (
          <div key={g.id} className={cn('bg-white border rounded-xl p-4', g.slaBreached ? 'border-red-300' : 'border-slate-200')}>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                {g.slaBreached && <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded mr-2">SLA BREACH</span>}
                <span className="text-[13px] font-semibold text-slate-900">{g.title}</span>
                <p className="text-[11px] text-slate-500 mt-0.5">{g.raisedBy} · {g.ageHours}h ago · {g.status}</p>
              </div>
              <button
                onClick={() => {
                  setGrievances(gs => gs.map(x => x.id === g.id ? {...x, status: 'resolved'} : x))
                  toast.success('Response drafted · RTI reply sent')
                }}
                className="text-[11px] font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Respond
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center py-10 text-slate-400 text-[13px]">No {TABS[tab].toLowerCase()} items</p>}
      </div>
    </div>
  )
}
