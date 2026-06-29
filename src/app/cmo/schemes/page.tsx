"use client"
import { useState } from 'react'
import { toast } from 'sonner'
import { CmoPageHeader } from '@/components/cmo/layout/CmoPageHeader'
import { MetricTile } from '@/components/shared/MetricTile'
import { cn } from '@/lib/utils'

const TABS = ['PM-JAY', 'Sambal', 'JSY', 'RBSK', 'Free drug & diagnostic', 'Fraud']

const FRAUD_FLAGS = [
  { hospital: 'Shri Ram Hospital', cases: 14, pattern: 'Same ICD codes for different patients', risk: 'High', status: 'active' },
  { hospital: 'New Life Clinic', cases: 6, pattern: 'Duplicate claim submissions detected', risk: 'Medium', status: 'active' },
]

export default function CmoSchemesPage() {
  const [tab, setTab] = useState(0)
  const [fraud, setFraud] = useState(FRAUD_FLAGS)

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <CmoPageHeader title="PM-JAY & schemes · PM-JAY और योजनाएं" />
      <div className="grid grid-cols-4 gap-3">
        <MetricTile label="PM-JAY claims today" value="47" />
        <MetricTile label="PM-JAY ₹ approved" value="₹4.2Cr" variant="success" />
        <MetricTile label="Pre-auth pending" value="12" variant="warning" />
        <MetricTile label="Fraud flagged" value={fraud.filter(f => f.status === 'active').length} variant="critical" />
      </div>
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={cn('text-[12px] font-semibold px-3 py-2.5 border-b-2 -mb-px whitespace-nowrap transition-colors',
              tab === i ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
            {t}
          </button>
        ))}
      </div>
      {tab === 5 ? (
        <div className="space-y-3">
          <p className="text-[12px] text-slate-600">AI-flagged suspicious PM-JAY claim patterns:</p>
          {fraud.map((f, i) => (
            <div key={i} className={cn('bg-white border rounded-xl p-4', f.status === 'active' ? 'border-red-200' : 'border-slate-200')}>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-slate-900">{f.hospital}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{f.cases} suspicious claims · {f.pattern}</p>
                </div>
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', f.risk === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>{f.risk} risk</span>
                {f.status === 'active' && (
                  <button onClick={() => { setFraud(fl => fl.map((x, j) => j === i ? {...x, status: 'suspended'} : x)); toast.success(`${f.hospital} PM-JAY suspended · logged to audit`) }}
                    className="text-[10px] font-semibold px-2 py-1 bg-red-600 text-white rounded-lg">
                    Suspend empanelment
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-[13px]">
          {TABS[tab]} — scheme data loading from NHA portal
        </div>
      )}
    </div>
  )
}
