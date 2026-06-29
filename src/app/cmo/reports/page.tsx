"use client"
import { toast } from 'sonner'
import { CmoPageHeader } from '@/components/cmo/layout/CmoPageHeader'
import { cn } from '@/lib/utils'

const REPORTS = [
  { name: 'HMIS Monthly Report', frequency: 'Monthly', lastSubmitted: '2026-05-31', nextDue: '2026-06-30', status: 'due-soon' },
  { name: 'Weekly IHIP Return', frequency: 'Weekly', lastSubmitted: '2026-06-16', nextDue: '2026-06-23', status: 'due-today' },
  { name: 'RCH portal sync', frequency: 'Monthly', lastSubmitted: '2026-06-01', nextDue: '2026-07-01', status: 'submitted' },
  { name: 'U-WIN immunization sync', frequency: 'Weekly', lastSubmitted: '2026-06-17', nextDue: '2026-06-24', status: 'submitted' },
  { name: 'Nikshay TB return', frequency: 'Monthly', lastSubmitted: '2026-06-01', nextDue: '2026-07-01', status: 'submitted' },
  { name: 'PM-JAY monthly reconciliation', frequency: 'Monthly', lastSubmitted: '2026-06-01', nextDue: '2026-07-01', status: 'submitted' },
]

const STATUS_STYLES: Record<string, string> = {
  'due-today':  'bg-red-100 text-red-700',
  'due-soon':   'bg-amber-100 text-amber-700',
  'submitted':  'bg-green-100 text-green-700',
}

export default function CmoReportsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <CmoPageHeader title="Reports & returns · रिपोर्ट और रिटर्न"
        actions={
          <button onClick={() => toast.success('Collector brief generated — 1 pager ready (demo)')}
            className="text-[12px] font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Generate collector brief
          </button>
        }
      />

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {REPORTS.map((r, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-50 last:border-0">
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-slate-900">{r.name}</p>
              <p className="text-[11px] text-slate-500">Due {r.nextDue} · Last: {r.lastSubmitted}</p>
            </div>
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', STATUS_STYLES[r.status])}>
              {r.status === 'due-today' ? 'DUE TODAY' : r.status === 'due-soon' ? 'Due soon' : '✓ Submitted'}
            </span>
            <div className="flex gap-2">
              <button onClick={() => toast.success('Draft opened')}
                className="text-[11px] font-medium px-2 py-1 border border-slate-300 rounded hover:bg-slate-50">
                View draft
              </button>
              {r.status !== 'submitted' && (
                <button onClick={() => toast.success(`${r.name} signed & submitted · audit log updated`)}
                  className="text-[11px] font-semibold px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                  Sign & submit
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-[13px] font-bold text-slate-900 mb-3">Custom report builder</p>
        <div className="flex gap-3">
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-[12px] bg-white focus:outline-none">
            <option>OPD statistics</option><option>IPD census</option><option>Drug consumption</option><option>Staff attendance</option>
          </select>
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-[12px] bg-white focus:outline-none">
            <option>All blocks</option><option>Bhopal Urban</option><option>Berasia</option>
          </select>
          <button onClick={() => toast.success('Report generating... PDF will download shortly')}
            className="text-[12px] font-semibold px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
            Generate PDF
          </button>
        </div>
      </div>
    </div>
  )
}
