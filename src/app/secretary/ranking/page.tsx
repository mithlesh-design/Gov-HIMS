'use client'

import { useState, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, Search, Trophy, AlertCircle, ChevronDown,
  MessageSquare, ClipboardList, Calendar, FileDown, X, CheckCircle,
} from 'lucide-react'
import { useSecretaryDistrictsStore } from '@/store/useSecretaryDistrictsStore'
import type { District } from '@/types/secretary'

type WeightProfile = 'balanced' | 'mmr-focus' | 'scheme-focus'
type ViewMode = 'map' | 'table' | 'movers'

const WEIGHTS: Record<WeightProfile, { mmr: number; imr: number; nqas: number; stock: number; attend: number; scheme: number }> = {
  balanced:     { mmr: 20, imr: 20, nqas: 15, stock: 15, attend: 15, scheme: 15 },
  'mmr-focus':  { mmr: 40, imr: 25, nqas: 10, stock: 10, attend: 8,  scheme: 7  },
  'scheme-focus':{ mmr: 10, imr: 10, nqas: 10, stock: 10, attend: 10, scheme: 50 },
}

function computeScore(d: District, profile: WeightProfile) {
  const w = WEIGHTS[profile]
  const c = d.components
  return Math.round(
    c.mmr.score          * w.mmr / 100 +
    c.imr.score          * w.imr / 100 +
    c.nqasPct.score      * w.nqas / 100 +
    c.stockHealth.score  * w.stock / 100 +
    c.attendance.score   * w.attend / 100 +
    c.schemeCoverage.score * w.scheme / 100
  )
}

function scoreColor(score: number) {
  if (score >= 85) return '#166534'
  if (score >= 75) return '#15803d'
  if (score >= 65) return '#65a30d'
  if (score >= 55) return '#d97706'
  if (score >= 45) return '#ea580c'
  return '#dc2626'
}
function scoreBg(score: number) {
  if (score >= 85) return '#dcfce7'
  if (score >= 75) return '#d1fae5'
  if (score >= 65) return '#ecfccb'
  if (score >= 55) return '#fef3c7'
  if (score >= 45) return '#fed7aa'
  return '#fee2e2'
}

// ── District drill drawer ────────────────────────────────────────────────
function DistrictDrillDrawer({ district, computedScore, onClose }: {
  district: District; computedScore: number; onClose: () => void
}) {
  const { sendCongratulation, issueShowCause } = useSecretaryDistrictsStore()
  const [showCause, setShowCause] = useState(false)
  const [reason, setReason] = useState('')
  const [done, setDone] = useState('')

  async function handleCongrat() {
    await sendCongratulation(district.id)
    setDone('congrat')
  }
  async function handleShowCause() {
    if (!reason.trim()) return
    await issueShowCause(district.id, reason)
    setDone('showcause')
    setShowCause(false)
  }

  const comps = [
    { label: 'MMR', value: district.components.mmr.value, score: district.components.mmr.score, unit: '/1L' },
    { label: 'IMR', value: district.components.imr.value, score: district.components.imr.score, unit: '/1k' },
    { label: 'NQAS %', value: district.components.nqasPct.value, score: district.components.nqasPct.score, unit: '%' },
    { label: 'Stock health', value: district.components.stockHealth.value, score: district.components.stockHealth.score, unit: '%' },
    { label: 'Attendance', value: district.components.attendance.value, score: district.components.attendance.score, unit: '%' },
    { label: 'Scheme cov.', value: district.components.schemeCoverage.value, score: district.components.schemeCoverage.score, unit: '%' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40 backdrop-blur-sm" />
      <div className="w-[480px] bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-foreground)]">{district.name}</h2>
            <p className="text-sm text-[var(--color-foreground-muted)] font-[Noto_Sans_Devanagari]">{district.nameHindi}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--color-surface-raised)] rounded-lg"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Rank + score */}
          <div className="flex gap-4">
            <div className="flex-1 bg-[var(--color-surface-raised)] rounded-xl p-4 text-center">
              <p className="text-xs text-[var(--color-foreground-muted)]">Rank</p>
              <p className="text-3xl font-bold text-[var(--color-foreground)]">#{district.rank}</p>
              <p className="text-xs text-[var(--color-foreground-muted)]">of 52 districts</p>
            </div>
            <div className="flex-1 rounded-xl p-4 text-center" style={{ background: scoreBg(computedScore) }}>
              <p className="text-xs font-medium" style={{ color: scoreColor(computedScore) }}>Composite Score</p>
              <p className="text-3xl font-bold" style={{ color: scoreColor(computedScore) }}>{computedScore}</p>
              <p className="text-xs" style={{ color: scoreColor(computedScore) }}>/ 100</p>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-[var(--color-foreground-muted)]">CMO:</span> <span className="font-medium text-[var(--color-foreground)]">{district.cmoName}</span></div>
            <div><span className="text-[var(--color-foreground-muted)]">Population:</span> <span className="font-medium text-[var(--color-foreground)]">{district.population}L</span></div>
            <div><span className="text-[var(--color-foreground-muted)]">Region:</span> <span className="font-medium text-[var(--color-foreground)]">{district.region}</span></div>
            <div><span className="text-[var(--color-foreground-muted)]">Facilities:</span> <span className="font-medium text-[var(--color-foreground)]">{district.facilitiesCount}</span></div>
            {district.isTribal && <div className="col-span-2"><span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Tribal district</span></div>}
          </div>

          {/* Score components */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">Score breakdown</h3>
            <div className="space-y-2">
              {comps.map(c => (
                <div key={c.label} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--color-foreground-muted)] w-20">{c.label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${c.score}%`, background: scoreColor(c.score) }} />
                  </div>
                  <span className="text-xs font-bold text-[var(--color-foreground)] w-8 text-right">{c.score}</span>
                  <span className="text-xs text-[var(--color-foreground-muted)] w-12 text-right">{c.value}{c.unit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          {done === 'congrat' && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium bg-emerald-50 p-3 rounded-lg">
              <CheckCircle className="h-4 w-4" /> Congratulation sent to {district.cmoName}
            </div>
          )}
          {done === 'showcause' && (
            <div className="flex items-center gap-2 text-amber-700 text-sm font-medium bg-amber-50 p-3 rounded-lg">
              <CheckCircle className="h-4 w-4" /> Show-cause issued — audit logged
            </div>
          )}
          {!done && (
            <div className="space-y-2">
              <button onClick={handleCongrat}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
                <Trophy className="h-4 w-4" /> Send congratulation to CMO
              </button>
              <button onClick={() => setShowCause(!showCause)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-rose-300 text-rose-700 text-sm font-medium rounded-lg hover:bg-rose-50 transition-colors">
                <ClipboardList className="h-4 w-4" /> Issue show-cause notice
              </button>
              {showCause && (
                <div className="space-y-2">
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Reason for show-cause (required)..."
                    className="w-full border border-[var(--color-border)] rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <button onClick={handleShowCause} disabled={!reason.trim()}
                    className="w-full px-4 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors">
                    Issue show-cause — 7 days to respond
                  </button>
                </div>
              )}
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[var(--color-border)] text-[var(--color-foreground)] text-sm font-medium rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors">
                <Calendar className="h-4 w-4" /> Schedule review with CMO
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Heatmap grid ─────────────────────────────────────────────────────────
function HeatmapGrid({ districts, profile, onSelect }: {
  districts: District[]; profile: WeightProfile; onSelect: (d: District) => void
}) {
  const maxRow = Math.max(...districts.map(d => d.gridRow))
  const maxCol = Math.max(...districts.map(d => d.gridCol))
  const grid: (District | null)[][] = Array.from({ length: maxRow + 1 }, () => Array(maxCol + 1).fill(null))
  districts.forEach(d => { grid[d.gridRow][d.gridCol] = d })

  return (
    <div className="space-y-1">
      <p className="text-[10px] text-[var(--color-foreground-muted)] mb-2">
        Approximate geographic layout of MP districts · Click any tile to drill
      </p>
      {grid.map((row, ri) => (
        <div key={ri} className="flex gap-1">
          {row.map((d, ci) => {
            if (!d) return <div key={ci} className="w-[72px] h-[52px]" />
            const score = computeScore(d, profile)
            return (
              <button
                key={ci}
                onClick={() => onSelect(d)}
                title={`${d.name} — ${score}`}
                className="w-[72px] h-[52px] rounded-lg flex flex-col items-center justify-center hover:scale-105 transition-transform hover:z-10 relative text-white font-bold border border-white/30"
                style={{ background: scoreColor(score) }}
              >
                <span className="text-[9px] leading-tight text-center px-0.5 line-clamp-2 font-medium">{d.name}</span>
                <span className="text-xs font-bold">{score}</span>
              </button>
            )
          })}
        </div>
      ))}
      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {[['≥85', '#166534', '#dcfce7'], ['75–84', '#15803d', '#d1fae5'], ['65–74', '#65a30d', '#ecfccb'], ['55–64', '#d97706', '#fef3c7'], ['45–54', '#ea580c', '#fed7aa'], ['<45', '#dc2626', '#fee2e2']].map(([label, color, bg]) => (
          <div key={label} className="flex items-center gap-1 text-[10px]">
            <div className="w-4 h-4 rounded" style={{ background: color }} />
            <span className="text-[var(--color-foreground-muted)]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Full table ────────────────────────────────────────────────────────────
type SortKey = 'rank' | 'name' | 'score' | 'mmr' | 'imr' | 'nqas' | 'stock' | 'attend' | 'scheme' | 'delta'

function FullTable({ districts, profile, onSelect }: {
  districts: District[]; profile: WeightProfile; onSelect: (d: District) => void
}) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortAsc, setSortAsc] = useState(true)

  const computed = useMemo(() => districts.map(d => ({ ...d, cs: computeScore(d, profile) })), [districts, profile])
  const filtered = computed.filter(d => d.name.toLowerCase().includes(query.toLowerCase()) || d.nameHindi.includes(query))
  const sorted = [...filtered].sort((a, b) => {
    let va = 0, vb = 0
    if (sortKey === 'rank')   { va = a.rank; vb = b.rank }
    else if (sortKey === 'name')   { return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name) }
    else if (sortKey === 'score')  { va = a.cs; vb = b.cs }
    else if (sortKey === 'mmr')    { va = a.components.mmr.score; vb = b.components.mmr.score }
    else if (sortKey === 'imr')    { va = a.components.imr.score; vb = b.components.imr.score }
    else if (sortKey === 'nqas')   { va = a.components.nqasPct.score; vb = b.components.nqasPct.score }
    else if (sortKey === 'stock')  { va = a.components.stockHealth.score; vb = b.components.stockHealth.score }
    else if (sortKey === 'attend') { va = a.components.attendance.score; vb = b.components.attendance.score }
    else if (sortKey === 'scheme') { va = a.components.schemeCoverage.score; vb = b.components.schemeCoverage.score }
    else if (sortKey === 'delta')  { va = a.cs - a.prevScore; vb = b.cs - b.prevScore }
    return sortAsc ? va - vb : vb - va
  })

  function th(key: SortKey, label: string) {
    const active = sortKey === key
    return (
      <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--color-foreground-muted)] cursor-pointer select-none whitespace-nowrap hover:text-[var(--color-foreground)] transition-colors"
        onClick={() => { if (active) setSortAsc(!sortAsc); else { setSortKey(key); setSortAsc(true) } }}>
        {label}{active && <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>}
      </th>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-foreground-lighter)]" />
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search district..."
          className="w-full pl-9 pr-4 py-2.5 border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-raised)]">
            <tr>
              {th('rank', '#')}
              {th('name', 'District')}
              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--color-foreground-muted)]">Population</th>
              {th('score', 'Score')}
              {th('mmr', 'MMR')}
              {th('imr', 'IMR')}
              {th('nqas', 'NQAS')}
              {th('stock', 'Stock')}
              {th('attend', 'Attend.')}
              {th('scheme', 'Scheme')}
              {th('delta', 'Δ week')}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {sorted.map(d => {
              const delta = d.cs - d.prevScore
              return (
                <tr key={d.id} className="hover:bg-teal-50/40 cursor-pointer transition-colors" onClick={() => onSelect(d)}>
                  <td className="px-3 py-2.5 text-xs font-bold text-[var(--color-foreground-muted)]">#{d.rank}</td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-[var(--color-foreground)]">{d.name}</p>
                    <p className="text-[10px] text-[var(--color-foreground-lighter)]">{d.nameHindi}</p>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[var(--color-foreground-muted)]">{d.population}L</td>
                  <td className="px-3 py-2.5">
                    <span className="text-sm font-bold px-2 py-0.5 rounded-lg" style={{ color: scoreColor(d.cs), background: scoreBg(d.cs) }}>{d.cs}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{d.components.mmr.score}</td>
                  <td className="px-3 py-2.5 text-xs">{d.components.imr.score}</td>
                  <td className="px-3 py-2.5 text-xs">{d.components.nqasPct.score}</td>
                  <td className="px-3 py-2.5 text-xs">{d.components.stockHealth.score}</td>
                  <td className="px-3 py-2.5 text-xs">{d.components.attendance.score}</td>
                  <td className="px-3 py-2.5 text-xs">{d.components.schemeCoverage.score}</td>
                  <td className="px-3 py-2.5">
                    {delta !== 0 && (
                      <span className={`text-xs font-medium flex items-center gap-0.5 ${delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {Math.abs(delta)}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Movers view ───────────────────────────────────────────────────────────
function MoversView({ districts, profile }: { districts: District[]; profile: WeightProfile }) {
  const computed = useMemo(() =>
    districts.map(d => ({ ...d, cs: computeScore(d, profile), delta: computeScore(d, profile) - d.prevScore }))
  , [districts, profile])
  const improvers = [...computed].sort((a, b) => b.delta - a.delta).slice(0, 5)
  const decliners = [...computed].sort((a, b) => a.delta - b.delta).slice(0, 5)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[{ title: 'Biggest improvers this week', list: improvers, color: 'emerald' }, { title: 'Biggest decliners this week', list: decliners, color: 'rose' }].map(({ title, list, color }) => (
        <div key={title} className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className={`px-4 py-3 border-b border-[var(--color-border)] bg-${color}-50`}>
            <p className={`text-sm font-semibold text-${color}-800`}>{title}</p>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {list.map(d => (
              <div key={d.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--color-foreground)]">{d.name}</p>
                  <p className="text-xs text-[var(--color-foreground-muted)]">{d.cmoName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--color-foreground)]">{d.cs}</p>
                  <p className={`text-xs font-medium ${color === 'emerald' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {d.delta > 0 ? '+' : ''}{d.delta} pts
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────
export default function RankingPage() {
  const { districts, sendCongratulation, issueShowCause } = useSecretaryDistrictsStore()
  const [view, setView]     = useState<ViewMode>('map')
  const [profile, setProfile] = useState<WeightProfile>('balanced')
  const [selected, setSelected] = useState<District | null>(null)
  const [showActions, setShowActions] = useState(false)
  const [actionResult, setActionResult] = useState('')

  const computedDistricts = useMemo(() =>
    [...districts].sort((a, b) => computeScore(b, profile) - computeScore(a, profile))
      .map((d, i) => ({ ...d, cs: computeScore(d, profile), rank: i + 1 }))
  , [districts, profile])

  async function handleCongratTop5() {
    for (const d of computedDistricts.slice(0, 5)) {
      await sendCongratulation(d.id)
    }
    setActionResult('Congratulations sent to top 5 CMOs — logged to audit')
    setShowActions(false)
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Map & District Ranking</h1>
          <p className="text-sm text-[var(--color-foreground-muted)] mt-0.5">
            मानचित्र और जिला रैंकिंग · Weekly composite score · 52 districts · Last updated Sun 22 Jun
          </p>
        </div>
        <button onClick={() => setShowActions(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
          <ClipboardList className="h-4 w-4" /> Actions
        </button>
      </div>

      {/* View toggle */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {(['map', 'table', 'movers'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-lg text-sm transition-all capitalize ${
                view === v ? 'bg-white text-[var(--color-primary)] font-semibold shadow' : 'font-medium text-slate-500 hover:text-slate-700'
              }`}>{v}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-[var(--color-foreground-muted)] self-center mr-1">Weight profile:</span>
          {(['balanced', 'mmr-focus', 'scheme-focus'] as WeightProfile[]).map(p => (
            <button key={p} onClick={() => setProfile(p)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                profile === p ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-foreground-muted)] hover:border-[var(--color-primary)]'
              }`}>{p === 'balanced' ? 'Balanced' : p === 'mmr-focus' ? 'MMR focus' : 'Scheme delivery'}</button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        {view === 'map' && (
          <HeatmapGrid
            districts={computedDistricts}
            profile={profile}
            onSelect={d => setSelected(d)}
          />
        )}
        {view === 'table' && (
          <FullTable
            districts={computedDistricts}
            profile={profile}
            onSelect={d => setSelected(d)}
          />
        )}
        {view === 'movers' && <MoversView districts={computedDistricts} profile={profile} />}
      </div>

      {actionResult && (
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-medium">
          <CheckCircle className="h-4 w-4" /> {actionResult}
          <button className="ml-auto" onClick={() => setActionResult('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* District drill drawer */}
      {selected && (
        <DistrictDrillDrawer
          district={selected}
          computedScore={computeScore(selected, profile)}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Actions panel */}
      {showActions && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center p-4" onClick={() => setShowActions(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[var(--color-foreground)] mb-4">District actions</h3>
            <div className="space-y-2">
              <button onClick={handleCongratTop5}
                className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-50 text-emerald-800 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors text-left">
                <Trophy className="h-4 w-4" /> Send congratulations to top 5 CMOs
              </button>
              <button onClick={() => { console.log('[Secretary Demo] Show-cause to bottom 5 initiated'); setActionResult('Show-cause flow initiated for bottom 5 districts'); setShowActions(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-rose-50 text-rose-800 rounded-xl text-sm font-medium hover:bg-rose-100 transition-colors text-left">
                <ClipboardList className="h-4 w-4" /> Issue show-cause to bottom 5 CMOs
              </button>
              <button onClick={() => { console.log('[Secretary Demo] VC scheduled with bottom 5 CMOs'); setActionResult('VC scheduled with bottom 5 CMOs — calendar invites sent'); setShowActions(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-800 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors text-left">
                <Calendar className="h-4 w-4" /> Schedule review with bottom 5 CMOs
              </button>
              <button onClick={() => { console.log('[Secretary Demo] Ranking report generated'); setActionResult('Ranking report generated and sent to Drive'); setShowActions(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 text-slate-800 rounded-xl text-sm font-medium hover:bg-slate-100 transition-colors text-left">
                <FileDown className="h-4 w-4" /> Generate ranking report (PDF)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
