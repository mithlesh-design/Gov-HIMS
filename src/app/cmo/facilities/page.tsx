"use client"
import { useState, useMemo } from 'react'
import { useCmoFacilitiesStore } from '@/store/useCmoFacilitiesStore'
import { CmoPageHeader } from '@/components/cmo/layout/CmoPageHeader'
import { FacilityRow } from '@/components/shared/FacilityRow'
import { DrillCard } from '@/components/shared/DrillCard'
import { MetricTile } from '@/components/shared/MetricTile'
import type { Facility, FacilityType, FacilityStatus } from '@/types/cmo'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

const BLOCKS = ['All', 'Bhopal Urban', 'Berasia', 'Phanda', 'Bairagarh', 'Kolar']
const TYPES: Array<'All' | FacilityType> = ['All', 'DH', 'CH', 'CHC', 'PHC', 'SHC']
const STATUSES: Array<'All' | FacilityStatus> = ['All', 'ok', 'watch', 'warning', 'critical']

export default function CmoFacilitiesPage() {
  const { facilities, loaded, fetchFacilities } = useCmoFacilitiesStore()
  const [typeFilter, setTypeFilter] = useState<'All' | FacilityType>('All')
  const [blockFilter, setBlockFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState<'All' | FacilityStatus>('All')
  const [search, setSearch] = useState('')
  const [drill, setDrill] = useState<Facility | null>(null)
  const [drillTab, setDrillTab] = useState('overview')

  useEffect(() => { if (!loaded) fetchFacilities() }, [loaded, fetchFacilities])

  const filtered = useMemo(() => facilities
    .filter(f => typeFilter === 'All' || f.type === typeFilter)
    .filter(f => blockFilter === 'All' || f.block === blockFilter)
    .filter(f => statusFilter === 'All' || f.status === statusFilter)
    .filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.alertsCount - a.alertsCount)
  , [facilities, typeFilter, blockFilter, statusFilter, search])

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <CmoPageHeader title="Facilities & map" titleHindi="सुविधाएं और मानचित्र" subtitle="142 facilities in Bhopal district" />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..."
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400 w-48" />
        {[{label:'Type', val:typeFilter, set:setTypeFilter, opts:TYPES},
          {label:'Block', val:blockFilter, set:setBlockFilter, opts:BLOCKS},
          {label:'Status', val:statusFilter, set:setStatusFilter, opts:STATUSES}
        ].map(({label, val, set, opts}) => (
          <select key={label} value={val} onChange={e => set(e.target.value as never)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] focus:outline-none bg-white">
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
        <span className="text-[11px] text-slate-500 ml-auto">{filtered.length} of {facilities.length}</span>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.slice(0, 50).map(f => (
          <FacilityRow key={f.id} name={f.name} type={f.type} block={f.block} status={f.status}
            summary={`${f.beds.used}/${f.beds.total} beds · OPD ${f.opdToday} · IPD ${f.ipdCensusToday}`}
            alertCount={f.alertsCount} onClick={() => { setDrill(f); setDrillTab('overview') }} />
        ))}
        {filtered.length > 50 && <p className="text-center text-[12px] text-slate-400 py-2">Showing 50 of {filtered.length} — use filters to narrow down</p>}
      </div>

      <DrillCard open={!!drill} onClose={() => setDrill(null)} title={drill?.name ?? ''} subtitle={`${drill?.type} · ${drill?.block}`}
        tabs={[{id:'overview',label:'Overview'},{id:'beds',label:'Beds'},{id:'stock',label:'Stock'},{id:'staff',label:'Staff'}]}
        activeTab={drillTab} onTabChange={setDrillTab}>
        {drill && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <MetricTile label="Beds" value={`${drill.beds.used}/${drill.beds.total}`} />
              <MetricTile label="OPD today" value={drill.opdToday} />
              <MetricTile label="IPD census" value={drill.ipdCensusToday} />
              <MetricTile label="Alerts" value={drill.alertsCount} variant={drill.alertsCount > 0 ? 'critical' : 'success'} />
            </div>
            <div className="text-[12px] text-slate-600 space-y-1 bg-slate-50 rounded-lg p-3">
              <p>Staff: <b>{drill.staffCount}</b> · Population: <b>{drill.population.toLocaleString()}</b></p>
              <p>NQAS: <b>{drill.nqasScore ?? 'N/A'}</b> · Last visited: <b>{drill.lastVisited ?? 'Not on record'}</b></p>
            </div>
          </div>
        )}
      </DrillCard>
    </div>
  )
}
