"use client"
import { useState } from 'react'
import { toast } from 'sonner'
import { CmoPageHeader } from '@/components/cmo/layout/CmoPageHeader'
import { cn } from '@/lib/utils'

const VISITS = [
  { id: 'v1', facility: 'CHC Berasia', date: '2026-06-01', type: 'surprise', findings: '3 staff absent, drug store disorganised, maternity ward clean', followUp: ['Issue show cause to absent staff', 'Drug store audit scheduled'] },
  { id: 'v2', facility: 'PHC Phanda', date: '2026-05-18', type: 'scheduled', findings: 'ASHA workers absent, RDT kits expired', followUp: ['ASHA coordinator meeting', 'Replace RDT kits'] },
  { id: 'v3', facility: 'Hamidia DH', date: '2026-05-14', type: 'scheduled', findings: 'ICU at 94% capacity, O₂ monitoring inadequate, excellent nursing', followUp: ['O₂ monitoring SOP issued'] },
]

export default function CmoFieldVisitsPage() {
  const [tab, setTab] = useState('my')
  const [showInspForm, setShowInspForm] = useState(false)
  const [formFacility, setFormFacility] = useState('')
  const [formFindings, setFormFindings] = useState('')

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <CmoPageHeader title="Field visits · फ़ील्ड विज़िट"
        actions={
          <button onClick={() => setShowInspForm(s => !s)}
            className="text-[12px] font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Start surprise inspection
          </button>
        }
      />

      {showInspForm && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
          <p className="text-[13px] font-bold text-amber-900">Surprise Inspection</p>
          <input value={formFacility} onChange={e => setFormFacility(e.target.value)} placeholder="Facility name"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400" />
          <textarea value={formFindings} onChange={e => setFormFindings(e.target.value)} placeholder="Findings..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400 h-20" />
          <div className="flex gap-2">
            <button onClick={() => { console.info('[CMO Demo] Capture photo'); toast.success('Photo captured (demo mode)') }}
              className="text-[11px] font-semibold px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50">
              📷 Capture photo
            </button>
            <button
              disabled={!formFacility || !formFindings}
              onClick={() => { setShowInspForm(false); setFormFacility(''); setFormFindings(''); toast.success('Inspection submitted · audit log updated') }}
              className="text-[11px] font-semibold px-3 py-1.5 bg-green-600 text-white rounded-lg disabled:opacity-40">
              Submit inspection
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200">
        {['my', 'scheduled', 'surprise'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('text-[12px] font-semibold px-3 py-2.5 border-b-2 -mb-px capitalize transition-colors',
              tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
            {t === 'my' ? 'My visits' : t === 'scheduled' ? 'Scheduled' : 'Surprise'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {VISITS.filter(v => tab === 'my' || v.type === tab).map(v => (
          <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-slate-900">{v.facility}</p>
                <p className="text-[11px] text-slate-500">{v.date} · {v.type} inspection</p>
                <p className="text-[12px] text-slate-700 mt-2">{v.findings}</p>
                <div className="mt-2 space-y-1">
                  {v.followUp.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <span className="text-amber-500">→</span> {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
