"use client"
import { useState } from 'react'
import { toast } from 'sonner'
import { CmoPageHeader } from '@/components/cmo/layout/CmoPageHeader'
import { MetricTile } from '@/components/shared/MetricTile'
import { cn } from '@/lib/utils'

const TABS = ['ANC register', 'PNC', 'High-risk pregnancies', 'Deliveries', 'Immunization due-list', 'JSY payments']

const JSY_ROWS = Array.from({length: 12}, (_, i) => ({
  name: ['Savita Devi', 'Meena Kumari', 'Asha Rani', 'Kavita Bai', 'Poonam Sharma', 'Rekha Devi', 'Sushila', 'Champa', 'Geeta Bai', 'Lalita', 'Anita', 'Sunita'][i],
  facility: ['CHC Berasia', 'PHC Phanda', 'Hamidia DH', 'CHC Bairagarh', 'PHC Kolar', 'CHC Phanda'][i % 6],
  deliveryDate: `2026-06-${String(i + 1).padStart(2, '0')}`,
  amount: 1400,
  status: i < 4 ? 'paid' : 'pending',
}))

export default function CmoMchPage() {
  const [tab, setTab] = useState(0)
  const [jsyRows, setJsyRows] = useState(JSY_ROWS)

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <CmoPageHeader title="MCH & immunization · मातृ-शिशु और टीकाकरण" />
      <div className="grid grid-cols-4 gap-3">
        <MetricTile label="MMR (per lakh)" value="152" variant="warning" />
        <MetricTile label="IMR (district)" value="41" variant="warning" />
        <MetricTile label="Institutional delivery %" value="91%" variant="success" />
        <MetricTile label="JSY payments pending" value={jsyRows.filter(r => r.status === 'pending').length} variant="warning" />
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
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-[12px]">
            <thead><tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
              <th className="px-4 py-2.5 text-left">Mother</th>
              <th className="px-3 py-2.5 text-left">Facility</th>
              <th className="px-3 py-2.5 text-left">Delivery date</th>
              <th className="px-3 py-2.5 text-right">Amount</th>
              <th className="px-3 py-2.5 text-center">Status</th>
              <th className="px-3 py-2.5"></th>
            </tr></thead>
            <tbody>
              {jsyRows.map((r, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="px-4 py-2.5 font-semibold text-slate-900">{r.name}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.facility}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.deliveryDate}</td>
                  <td className="px-3 py-2.5 text-right font-semibold">₹{r.amount}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      r.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {r.status === 'pending' && (
                      <button onClick={() => { setJsyRows(rows => rows.map((row, j) => j === i ? {...row, status: 'paid'} : row)); toast.success('JSY payment processed') }}
                        className="text-[10px] font-semibold px-2 py-1 bg-green-600 text-white rounded">
                        Pay
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-[13px]">
          {TABS[tab]} data — {[248, 187, 34, 312, 1240][tab] ?? 150} records
          <p className="text-[11px] mt-1">Select JSY payments tab to process pending payments</p>
        </div>
      )}
    </div>
  )
}
