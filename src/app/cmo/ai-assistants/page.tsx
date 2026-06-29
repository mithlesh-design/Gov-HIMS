"use client"
import { useState } from 'react'
import { Sparkles, Bug, Pill, Newspaper } from 'lucide-react'
import { CmoPageHeader } from '@/components/cmo/layout/CmoPageHeader'
import { DrillCard } from '@/components/shared/DrillCard'
import { cn } from '@/lib/utils'
const PRESS_BRIEF_RESPONSES: Record<string, string> = {
  default: 'The Bhopal district health administration is actively monitoring the situation and has deployed all necessary resources to ensure public safety. District CMO Dr. Rajesh Sharma has personally reviewed the case and coordinated with senior specialists. Families are being supported through our patient welfare cell. Further updates will be issued every 24 hours.',
}

export default function CmoAiAssistantsPage() {
  const [openDrill, setOpenDrill] = useState<string | null>(null)
  const [pressPrompt, setPressPrompt] = useState('')
  const [pressResponse, setPressResponse] = useState('')
  const [pressLoading, setPressLoading] = useState(false)

  const generatePressBrief = () => {
    setPressLoading(true)
    setPressResponse('')
    setTimeout(() => {
      const key = Object.keys(PRESS_BRIEF_RESPONSES).find(k => pressPrompt.toLowerCase().includes(k)) ?? 'default'
      setPressResponse(PRESS_BRIEF_RESPONSES[key])
      setPressLoading(false)
    }, 2000)
  }

  const ASSISTANTS = [
    {
      id: 'brief',
      icon: <Sparkles size={20} className="text-blue-600" />,
      title: '8 AM Hindi brief',
      preview: 'कल रात OPD में 4,127 मरीज... Dengue 3.2× baseline...',
      desc: 'AI-generated morning briefing in Hindi-English',
    },
    {
      id: 'outbreak',
      icon: <Bug size={20} className="text-amber-600" />,
      title: 'Outbreak predictor',
      preview: '1 amber alert: Dengue (84% confidence) · 0 red',
      desc: 'Predicts outbreaks 7–14 days ahead',
    },
    {
      id: 'stockout',
      icon: <Pill size={20} className="text-red-600" />,
      title: 'Stock-out forecaster',
      preview: '14-day forecast: Oxytocin critical at 6 facilities',
      desc: 'Predicts drug stockouts before they happen',
    },
    {
      id: 'press',
      icon: <Newspaper size={20} className="text-slate-600" />,
      title: 'Press brief drafter',
      preview: 'Type any event → AI drafts official statement',
      desc: 'Generates press-ready paragraphs in 2 seconds',
    },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <CmoPageHeader title="AI assistants · AI सहायक" subtitle="AI tools to assist your day" />

      <div className="grid grid-cols-2 gap-4">
        {ASSISTANTS.map(a => (
          <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-200 hover:shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center">{a.icon}</div>
              <div>
                <p className="text-[13px] font-bold text-slate-900">{a.title}</p>
                <p className="text-[11px] text-slate-500">{a.desc}</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 bg-slate-50 rounded-lg px-3 py-2 mb-3 font-mono">{a.preview}</p>
            <button onClick={() => setOpenDrill(a.id)}
              className="w-full text-[12px] font-semibold py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors">
              Open assistant
            </button>
          </div>
        ))}
      </div>

      {/* Drills */}
      <DrillCard open={openDrill === 'brief'} onClose={() => setOpenDrill(null)} title="8 AM Hindi brief">
        <div className="space-y-3 text-[13px] text-slate-700 leading-relaxed" style={{ fontFamily: "'Noto Sans Devanagari', system-ui" }}>
          <p>कल रात OPD में 4,127 मरीज, IPD में 412 भर्ती, 38 deliveries, 2 maternal deaths under review.</p>
          <p>Dengue cases wards 14/17/19 में 3.2× baseline — outbreak management में देखें. Hamidia DH में oxygen 4 hrs से कम.</p>
          <p>12 doctors AWOL across 4 PHCs. कलेक्टर ब्रीफिंग 10:30 बजे · draft तैयार है.</p>
        </div>
      </DrillCard>

      <DrillCard open={openDrill === 'outbreak'} onClose={() => setOpenDrill(null)} title="Outbreak predictor">
        <div className="space-y-3 text-[13px]">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="font-semibold text-amber-900">🟡 Dengue escalation risk — Bhopal Urban</p>
            <p className="text-amber-700 text-[12px] mt-1">84% confidence · 7-day window · Based on fever clinic surge + rainfall data</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="font-semibold text-green-900">✅ No red-level predictions</p>
            <p className="text-green-700 text-[12px] mt-1">Cholera, typhoid, malaria — all within expected range</p>
          </div>
        </div>
      </DrillCard>

      <DrillCard open={openDrill === 'stockout'} onClose={() => setOpenDrill(null)} title="Stock-out forecaster (14-day)">
        <div className="space-y-2 text-[12px]">
          {[
            { drug: 'Oxytocin', facilities: 6, days: 4, risk: 'critical' },
            { drug: 'Paracetamol', facilities: 3, days: 8, risk: 'high' },
            { drug: 'Amoxicillin', facilities: 2, days: 11, risk: 'medium' },
            { drug: 'ORS', facilities: 8, days: 14, risk: 'medium' },
          ].map(s => (
            <div key={s.drug} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5',
              s.risk === 'critical' ? 'bg-red-50 border border-red-200' : s.risk === 'high' ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200')}>
              <span className="font-semibold text-slate-900 flex-1">{s.drug}</span>
              <span className="text-slate-500">{s.facilities} facilities</span>
              <span className={cn('font-bold', s.risk === 'critical' ? 'text-red-700' : s.risk === 'high' ? 'text-amber-700' : 'text-slate-600')}>in {s.days}d</span>
            </div>
          ))}
        </div>
      </DrillCard>

      <DrillCard open={openDrill === 'press'} onClose={() => setOpenDrill(null)} title="Press brief drafter">
        <div className="space-y-3">
          <textarea value={pressPrompt} onChange={e => setPressPrompt(e.target.value)}
            placeholder="What event? e.g., 'Maternal death CHC Berasia', 'Dengue outbreak', 'Drug shortage'"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400 h-20" />
          <button disabled={!pressPrompt.trim() || pressLoading} onClick={generatePressBrief}
            className="w-full text-[12px] font-semibold py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40">
            {pressLoading ? 'Generating...' : 'Generate press brief'}
          </button>
          {pressLoading && <div className="h-2 bg-blue-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 animate-pulse w-2/3" /></div>}
          {pressResponse && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-[12px] text-slate-700 leading-relaxed">
              <p className="font-semibold text-slate-900 mb-1 text-[11px] uppercase tracking-wider text-slate-400">AI-generated statement</p>
              {pressResponse}
            </div>
          )}
        </div>
      </DrillCard>
    </div>
  )
}
