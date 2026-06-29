'use client'

import { HeartPulse, Baby, TrendingDown } from 'lucide-react'

const DISTRICTS_MCH = [
  { name: 'Mandla', mmr: 310, imr: 52, immunization: 72, anc: 68, institutional: 81 },
  { name: 'Dindori', mmr: 295, imr: 55, immunization: 69, anc: 65, institutional: 78 },
  { name: 'Umaria', mmr: 285, imr: 50, immunization: 73, anc: 66, institutional: 80 },
  { name: 'Singrauli', mmr: 260, imr: 47, immunization: 76, anc: 70, institutional: 82 },
  { name: 'Alirajpur', mmr: 340, imr: 58, immunization: 65, anc: 62, institutional: 74 },
  { name: 'Bhopal', mmr: 98, imr: 22, immunization: 94, anc: 89, institutional: 98 },
  { name: 'Indore', mmr: 88, imr: 19, immunization: 96, anc: 91, institutional: 99 },
]

function Bar({ pct, warn }: { pct: number; warn: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full ${warn ? 'bg-rose-500' : 'bg-[var(--color-primary)]'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${warn ? 'text-rose-600' : 'text-[var(--color-foreground)]'}`}>{pct}%</span>
    </div>
  )
}

export default function MchPage() {
  const stateMmr = 163
  const stateImr = 38
  const stateImmunization = 87

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">MCH & Immunization</h1>
        <p className="text-sm text-[var(--color-foreground-muted)] mt-0.5">MCH और टीकाकरण · Maternal, child health and immunization state overview</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'State MMR', value: String(stateMmr), sub: 'per 1L live births', warn: stateMmr > 100 },
          { label: 'State IMR', value: String(stateImr), sub: 'per 1K live births', warn: stateImr > 30 },
          { label: 'Full immunization', value: `${stateImmunization}%`, sub: 'children 12-23 months', warn: false },
          { label: 'ANC coverage', value: '76%', sub: '4+ ANC visits', warn: true },
          { label: 'Institutional deliveries', value: '89%', sub: 'of all deliveries', warn: false },
        ].map(k => (
          <div key={k.label} className="bg-white border border-[var(--color-border)] rounded-xl p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <p className="text-xs text-[var(--color-foreground-muted)]">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.warn ? 'text-rose-600' : 'text-[var(--color-foreground)]'}`}>{k.value}</p>
            <p className="text-xs text-[var(--color-foreground-lighter)]">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* District comparison table */}
      <div className="bg-white border border-[var(--color-border)] rounded-2xl overflow-auto" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="px-5 py-3.5 border-b border-[var(--color-border)]">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">District MCH performance — worst & best</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
              <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--color-foreground-muted)]">District</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--color-foreground-muted)]">MMR</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--color-foreground-muted)]">IMR</th>
              <th className="px-5 py-3 text-left w-40 text-xs font-semibold text-[var(--color-foreground-muted)]">Immunization</th>
              <th className="px-5 py-3 text-left w-40 text-xs font-semibold text-[var(--color-foreground-muted)]">ANC 4+</th>
              <th className="px-5 py-3 text-left w-40 text-xs font-semibold text-[var(--color-foreground-muted)]">Inst. Delivery</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {DISTRICTS_MCH.map(d => (
              <tr key={d.name} className="hover:bg-[var(--color-surface-raised)]">
                <td className="px-5 py-3 font-medium text-[var(--color-foreground)]">{d.name}</td>
                <td className={`px-5 py-3 font-bold ${d.mmr > 200 ? 'text-rose-600' : 'text-[var(--color-foreground)]'}`}>{d.mmr}</td>
                <td className={`px-5 py-3 font-bold ${d.imr > 45 ? 'text-rose-600' : 'text-[var(--color-foreground)]'}`}>{d.imr}</td>
                <td className="px-5 py-3 w-40"><Bar pct={d.immunization} warn={d.immunization < 75} /></td>
                <td className="px-5 py-3 w-40"><Bar pct={d.anc} warn={d.anc < 70} /></td>
                <td className="px-5 py-3 w-40"><Bar pct={d.institutional} warn={d.institutional < 80} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
