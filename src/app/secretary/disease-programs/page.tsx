'use client'

import { useState } from 'react'

type TabId = 'tb' | 'malaria' | 'sickle' | 'ncd'

const TABS: { id: TabId; label: string; hi: string }[] = [
  { id: 'tb', label: 'TB / RNTCP', hi: 'क्षय रोग' },
  { id: 'malaria', label: 'Malaria & Vector', hi: 'मलेरिया' },
  { id: 'sickle', label: 'Sickle Cell Mission', hi: 'सिकल सेल मिशन' },
  { id: 'ncd', label: 'NCD Programs', hi: 'गैर-संचारी रोग' },
]

function ProgressBar({ label, value, total, pct }: { label: string; value: string; total?: string; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-[var(--color-foreground-muted)]">{label}</span>
        <span className="font-bold text-[var(--color-foreground)]">{value}{total && <span className="font-normal text-[var(--color-foreground-lighter)]"> / {total}</span>}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function TbTab() {
  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Notified cases (FY24)', value: '78,412', sub: 'Public + private' },
          { label: 'Treatment success rate', value: '88%', sub: 'NTEP target: 90%' },
          { label: 'Lost-to-follow-up', value: '5.2%', sub: 'NTEP target: <5%' },
          { label: 'Nikshay Poshan Yojana', value: '91%', sub: 'Beneficiaries paid' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-[var(--color-border)] rounded-xl p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <p className="text-xs text-[var(--color-foreground-muted)]">{k.label}</p>
            <p className="text-xl font-bold mt-0.5 text-[var(--color-foreground)]">{k.value}</p>
            <p className="text-xs text-[var(--color-foreground-lighter)]">{k.sub}</p>
          </div>
        ))}
      </div>
      <div className="bg-white border border-[var(--color-border)] rounded-xl p-4 space-y-3" style={{ boxShadow: 'var(--shadow-card)' }}>
        <p className="text-sm font-semibold text-[var(--color-foreground)]">District performance — bottom 5</p>
        {[
          { label: 'Singrauli', value: '76%', total: '90%', pct: 76 },
          { label: 'Shahdol', value: '78%', total: '90%', pct: 78 },
          { label: 'Anuppur', value: '79%', total: '90%', pct: 79 },
          { label: 'Dindori', value: '80%', total: '90%', pct: 80 },
          { label: 'Mandla', value: '81%', total: '90%', pct: 81 },
        ].map(d => <ProgressBar key={d.label} label={d.label} value={d.value} total={d.total} pct={d.pct} />)}
      </div>
    </div>
  )
}

function MalariaTab() {
  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'API (Annual Parasite Index)', value: '2.8', sub: 'Target <1 by 2027' },
          { label: 'Pf proportion', value: '38%', sub: 'Falciparum cases' },
          { label: 'High-burden districts', value: '8', sub: 'API > 5' },
          { label: 'IRS coverage', value: '74%', sub: 'Completed' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-[var(--color-border)] rounded-xl p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <p className="text-xs text-[var(--color-foreground-muted)]">{k.label}</p>
            <p className="text-xl font-bold mt-0.5 text-[var(--color-foreground)]">{k.value}</p>
            <p className="text-xs text-[var(--color-foreground-lighter)]">{k.sub}</p>
          </div>
        ))}
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-amber-800">⚠ Balaghat, Mandla, Dindori high alert — Pf cases rising this week</p>
        <p className="text-xs text-amber-700 mt-1">Deploy rapid response team + ACT drug replenishment required within 48 hours</p>
      </div>
    </div>
  )
}

function SickleCellTab() {
  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Screened (FY24)', value: '3.1L', sub: 'Q1+Q2' },
          { label: 'Positive (trait)', value: '21,800', sub: '7% prevalence' },
          { label: 'On hydroxyurea', value: '980', sub: '+340 vs Q1' },
          { label: 'Tribal districts covered', value: '21/21', sub: '100% coverage' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-[var(--color-border)] rounded-xl p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <p className="text-xs text-[var(--color-foreground-muted)]">{k.label}</p>
            <p className="text-xl font-bold mt-0.5 text-[var(--color-foreground)]">{k.value}</p>
            <p className="text-xs text-[var(--color-foreground-lighter)]">{k.sub}</p>
          </div>
        ))}
      </div>
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-teal-800">Q3 target: screen 2L more · Mandla + Balaghat + Seoni prioritized</p>
        <p className="text-xs text-teal-700 mt-1">Newborn screening pilot launched in 3 GMCs — results expected August 2024</p>
      </div>
    </div>
  )
}

function NcdTab() {
  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Hypertension screened', value: '68L', sub: '30+ years' },
          { label: 'On treatment (HT)', value: '42%', sub: 'Of diagnosed' },
          { label: 'Diabetes screened', value: '55L', sub: '30+ years' },
          { label: 'Cancer early detection', value: '3.2L', sub: 'Oral+Cervical+Breast' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-[var(--color-border)] rounded-xl p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <p className="text-xs text-[var(--color-foreground-muted)]">{k.label}</p>
            <p className="text-xl font-bold mt-0.5 text-[var(--color-foreground)]">{k.value}</p>
            <p className="text-xs text-[var(--color-foreground-lighter)]">{k.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DiseaseProgramsPage() {
  const [tab, setTab] = useState<TabId>('tb')
  return (
    <div className="p-6 space-y-4 max-w-screen-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Disease Programs</h1>
        <p className="text-sm text-[var(--color-foreground-muted)] mt-0.5">रोग कार्यक्रम · National and state vertical programs</p>
      </div>
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${tab === t.id ? 'bg-white text-[var(--color-primary)] font-semibold shadow' : 'font-medium text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        {tab === 'tb' && <TbTab />}
        {tab === 'malaria' && <MalariaTab />}
        {tab === 'sickle' && <SickleCellTab />}
        {tab === 'ncd' && <NcdTab />}
      </div>
    </div>
  )
}
