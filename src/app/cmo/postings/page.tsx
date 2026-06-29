"use client"
import { useState } from 'react'
import { toast } from 'sonner'
import { CmoPageHeader } from '@/components/cmo/layout/CmoPageHeader'
import { MetricTile } from '@/components/shared/MetricTile'
import { cn } from '@/lib/utils'

const ESCALATIONS = [
  { id: 'e1', from: { name: 'BMO Berasia', facility: 'CHC Berasia', role: 'BMO' }, issue: 'Chronic shortage of specialists — no gynaecologist for 3 months', severity: 'high', ageHours: 72, slaBreached: true, status: 'open' },
  { id: 'e2', from: { name: 'BMO Phanda', facility: 'PHC Phanda', role: 'BMO' }, issue: 'Broken cold chain equipment — vaccines at risk', severity: 'high', ageHours: 48, slaBreached: true, status: 'open' },
  { id: 'e3', from: { name: 'BMO Bairagarh', facility: 'CH Bairagarh', role: 'BMO' }, issue: 'Renovation work blocking ambulance bay', severity: 'medium', ageHours: 24, slaBreached: false, status: 'in-progress' },
  { id: 'e4', from: { name: 'BMO Kolar', facility: 'CHC Kolar', role: 'BMO' }, issue: 'Staff quarters dilapidated — retention risk', severity: 'low', ageHours: 120, slaBreached: false, status: 'open' },
]

export default function CmoPostingsPage() {
  const [tab, setTab] = useState('vacancies')
  const [escalations, setEscalations] = useState(ESCALATIONS)

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <CmoPageHeader title="Postings & escalations · पोस्टिंग और एस्केलेशन" />
      <div className="grid grid-cols-3 gap-3">
        <MetricTile label="Vacancies" value="207" variant="warning" />
        <MetricTile label="Pending transfers" value="8" />
        <MetricTile label="BMO escalations" value="4" hint="2 SLA breached" variant="critical" />
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {['vacancies', 'transfers', 'escalations', 'grievances'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('text-[12px] font-semibold px-3 py-2.5 border-b-2 -mb-px capitalize transition-colors',
              tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'escalations' && (
        <div className="space-y-3">
          {escalations.map(e => (
            <div key={e.id} className={cn('bg-white border rounded-xl p-4', e.slaBreached ? 'border-red-300' : 'border-slate-200')}>
              <div className="flex items-start gap-3">
                {e.slaBreached && <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">SLA BREACH</span>}
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-slate-900">{e.issue}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{e.from.name} · {e.from.facility} · {e.ageHours}h ago</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => { setEscalations(es => es.map(x => x.id === e.id ? {...x, status: 'resolved'} : x)); toast.success('Escalation resolved') }}
                    className="text-[11px] font-semibold px-2 py-1 bg-green-600 text-white rounded-lg">
                    Resolve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab !== 'escalations' && (
        <div className="text-center py-12 text-slate-400 text-[13px]">
          {tab === 'vacancies' && '207 vacancies across district · 68 in PHCs · 43 in CHCs · 96 specialist posts'}
          {tab === 'transfers' && '8 pending transfer requests awaiting CMO order'}
          {tab === 'grievances' && '12 staff grievances · 3 pending beyond 30 days'}
        </div>
      )}
    </div>
  )
}
