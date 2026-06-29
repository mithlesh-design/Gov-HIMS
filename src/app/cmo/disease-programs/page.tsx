"use client"
import { useState } from 'react'
import { CmoPageHeader } from '@/components/cmo/layout/CmoPageHeader'
import { MetricTile } from '@/components/shared/MetricTile'
import { cn } from '@/lib/utils'

const TABS = ['TB (Nikshay)', 'NCD screening', 'Tribal / Sickle cell', 'Vector-borne']

export default function CmoDiseaseProgramsPage() {
  const [tab, setTab] = useState(0)

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <CmoPageHeader title="Disease programs · रोग कार्यक्रम" />
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={cn('text-[12px] font-semibold px-3 py-2.5 border-b-2 -mb-px whitespace-nowrap transition-colors',
              tab === i ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <MetricTile label="New notifications (month)" value="142" />
            <MetricTile label="Treatment success %" value="87%" variant="success" />
            <MetricTile label="Defaulters" value="8" variant="warning" />
            <MetricTile label="Nikshay Mitra" value="34" />
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-[13px] text-slate-600">
            <p className="font-semibold text-slate-900 mb-2">TB programme status</p>
            <p>142 new patients notified this month · 34 Nikshay Mitras providing nutritional support · 8 defaulters on recall notice · Treatment success rate 87% (target 90%)</p>
          </div>
        </div>
      )}
      {tab === 1 && (
        <div className="grid grid-cols-3 gap-3">
          <MetricTile label="30+ screened" value="14,200" />
          <MetricTile label="Hypertension positive" value="3,847" variant="warning" />
          <MetricTile label="Diabetes positive" value="1,923" variant="warning" />
          <MetricTile label="Follow-up due" value="287" variant="critical" />
          <MetricTile label="Enrolled in care" value="4,200" variant="success" />
          <MetricTile label="Coverage %" value="74%" />
        </div>
      )}
      {tab === 2 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <p className="text-[15px] font-bold text-blue-900">Not applicable for Bhopal district</p>
          <p className="text-[12px] text-blue-700 mt-1">Tribal health programs are managed by ITDP for tribal districts. Bhopal is non-tribal.</p>
          <button className="mt-4 text-[11px] font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg">
            Switch to demo data
          </button>
        </div>
      )}
      {tab === 3 && (
        <div className="grid grid-cols-3 gap-3">
          <MetricTile label="Fever clinic cases (week)" value="247" variant="warning" />
          <MetricTile label="RDT positivity %" value="19%" variant="warning" />
          <MetricTile label="Dengue confirmed" value="47" variant="critical" />
          <MetricTile label="Malaria confirmed" value="12" />
          <MetricTile label="Fogging rounds done" value="8" variant="success" />
          <MetricTile label="Blocks covered" value="3 of 5" />
        </div>
      )}
    </div>
  )
}
