'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { useSecretaryDistrictsStore } from '@/store/useSecretaryDistrictsStore'
import type { District, DistrictRegion } from '@/types/secretary'

const REGIONS: (DistrictRegion | 'all')[] = ['all', 'Chambal', 'Malwa', 'Mahakoshal', 'Bundelkhand', 'Vindhya', 'Nimad', 'Bhopal']

function scoreColor(s: number) {
  if (s >= 75) return { bg: '#dcfce7', text: '#166534' }
  if (s >= 60) return { bg: '#fef3c7', text: '#92400e' }
  return { bg: '#fee2e2', text: '#991b1b' }
}

export default function DistrictsPage() {
  const router = useRouter()
  const { districts } = useSecretaryDistrictsStore()
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<DistrictRegion | 'all'>('all')
  const [tribalOnly, setTribalOnly] = useState(false)

  const filtered = useMemo(() => districts.filter(d => {
    if (query && !d.name.toLowerCase().includes(query.toLowerCase()) && !d.nameHindi.includes(query)) return false
    if (region !== 'all' && d.region !== region) return false
    if (tribalOnly && !d.isTribal) return false
    return true
  }), [districts, query, region, tribalOnly])

  const sorted = [...filtered].sort((a, b) => a.rank - b.rank)

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">52 District Cockpits</h1>
        <p className="text-sm text-[var(--color-foreground-muted)] mt-0.5">52 जिला कॉकपिट · Drill into any district</p>
      </div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-foreground-lighter)]" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search district..." className="pl-9 pr-4 py-2 border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-48" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {REGIONS.map(r => (
            <button key={r} onClick={() => setRegion(r)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${region === r ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-foreground-muted)]'}`}>
              {r === 'all' ? 'All regions' : r}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-[var(--color-foreground-muted)] cursor-pointer">
          <input type="checkbox" checked={tribalOnly} onChange={e => setTribalOnly(e.target.checked)} className="rounded" />
          Tribal districts only
        </label>
        <span className="ml-auto text-xs text-[var(--color-foreground-muted)]">{sorted.length} districts</span>
      </div>
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sorted.map(d => {
          const sc = scoreColor(d.score)
          const delta = d.score - d.prevScore
          return (
            <div key={d.id} className="bg-white border border-[var(--color-border)] rounded-xl p-4 hover:shadow-md transition-all hover:-translate-y-0.5" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: sc.bg, color: sc.text }}>#{d.rank}</span>
                    {d.isTribal && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 rounded-full">Tribal</span>}
                  </div>
                  <p className="text-sm font-bold text-[var(--color-foreground)] mt-1">{d.name}</p>
                  <p className="text-[10px] text-[var(--color-foreground-lighter)]" style={{ fontFamily: 'Noto Sans Devanagari' }}>{d.nameHindi}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black" style={{ color: sc.text }}>{d.score}</p>
                  {delta !== 0 && (
                    <span className={`text-[10px] flex items-center justify-end gap-0.5 ${delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{Math.abs(delta)}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-[var(--color-foreground-muted)] mb-3">
                <span>CMO: {d.cmoName.split(' ').slice(0, 2).join(' ')}</span>
                <span className="text-right">{d.population}L pop</span>
                <span><MapPin className="h-2.5 w-2.5 inline mr-0.5" />{d.region}</span>
                <span className="text-right">{d.facilitiesCount} facilities</span>
              </div>
              {d.topAlerts > 0 && (
                <p className="text-[10px] text-rose-600 font-medium mb-2">{d.topAlerts} active alert{d.topAlerts > 1 ? 's' : ''}</p>
              )}
              <button
                onClick={() => router.push(`/secretary/districts/${d.id}`)}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-[var(--color-primary)] border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors cursor-pointer"
              >
                Open cockpit <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
