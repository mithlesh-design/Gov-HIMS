"use client"
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { useCmoAlertsStore } from '@/store/useCmoAlertsStore'
import { CmoPageHeader }  from '@/components/cmo/layout/CmoPageHeader'
import { SeverityDot }    from '@/components/shared/SeverityDot'
import { DrillCard }      from '@/components/shared/DrillCard'
import { MetricTile }     from '@/components/shared/MetricTile'
import { Filter, Search, CheckSquare } from 'lucide-react'
import type { Alert, AlertSeverity } from '@/types/cmo'
import { cn } from '@/lib/utils'
type SevFilter  = 'all' | AlertSeverity
type TimeFilter = '24h' | '7d' | '30d'

function ageLabel(m: number) {
  if (m < 60)   return `${Math.round(m)}m`
  if (m < 1440) return `${Math.round(m / 60)}h`
  return `${Math.round(m / 1440)}d`
}

const SOURCE_OPTIONS = ['All', 'surveillance', 'supply', 'hr', 'quality', 'finance', 'ai']
const TIME_LIMITS:    Record<TimeFilter, number> = { '24h': 1440, '7d': 10080, '30d': 43200 }

const severityRowStyle: Record<AlertSeverity, string> = {
  critical: 'border-l-3 border-l-red-500',
  warning:  'border-l-3 border-l-amber-400',
  info:     'border-l-3 border-l-blue-400',
}

export default function CmoAlertsPage() {
  const alerts      = useCmoAlertsStore(s => s.alerts)
  const acknowledge = useCmoAlertsStore(s => s.acknowledge)
  const dismiss     = useCmoAlertsStore(s => s.dismiss)

  const [sevFilter, setSevFilter]   = useState<SevFilter>('all')
  const [srcFilter, setSrcFilter]   = useState('All')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h')
  const [showAck, setShowAck]       = useState(false)
  const [search, setSearch]         = useState('')
  const [drill, setDrill]           = useState<Alert | null>(null)
  const [drillTab, setDrillTab]     = useState('details')
  const [selected, setSelected]     = useState<Set<string>>(new Set())

  const counts = useMemo(() => ({
    critical: alerts.filter(a => !a.acknowledged && a.severity === 'critical').length,
    warning:  alerts.filter(a => !a.acknowledged && a.severity === 'warning').length,
    info:     alerts.filter(a => !a.acknowledged && a.severity === 'info').length,
  }), [alerts])

  const filtered = useMemo(() => alerts
    .filter(a => showAck ? true : !a.acknowledged)
    .filter(a => sevFilter === 'all' || a.severity === sevFilter)
    .filter(a => srcFilter === 'All' || a.source === srcFilter)
    .filter(a => a.ageMinutes <= TIME_LIMITS[timeFilter])
    .filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.facility.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.severity] - { critical: 0, warning: 1, info: 2 }[b.severity] || a.ageMinutes - b.ageMinutes))
  , [alerts, sevFilter, srcFilter, timeFilter, showAck, search])

  const toggleSelect = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const bulkAck = async () => {
    for (const id of selected) await acknowledge(id)
    setSelected(new Set())
    toast.success(`${selected.size} alerts acknowledged`)
  }

  const SEV_CHIPS = [
    { value: 'all' as SevFilter,      label: 'All',      count: alerts.filter(a => !a.acknowledged).length },
    { value: 'critical' as SevFilter, label: 'Critical', count: counts.critical },
    { value: 'warning' as SevFilter,  label: 'Warning',  count: counts.warning },
    { value: 'info' as SevFilter,     label: 'Info',     count: counts.info },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-5 cmo-fade-up">
      <CmoPageHeader
        title="Alerts · अलर्ट"
        titleHindi="सभी अलर्ट — 142 सुविधाएं"
        subtitle={`${alerts.filter(a => !a.acknowledged).length} open alerts · ${alerts.filter(a => a.acknowledged).length} acknowledged`}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <MetricTile label="Unacknowledged" value={alerts.filter(a => !a.acknowledged).length} variant="default" />
        <MetricTile label="Critical"       value={counts.critical} variant="critical" />
        <MetricTile label="Avg age"
          value={`${Math.round(alerts.filter(a => !a.acknowledged).reduce((s, a) => s + a.ageMinutes, 0) / Math.max(1, alerts.filter(a => !a.acknowledged).length))}m`}
          variant="default" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-foreground-lighter)]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search alerts..."
            className="pl-8 pr-3 py-1.5 text-[12px] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-surface)] w-44 placeholder:text-[var(--color-foreground-lighter)]" />
        </div>

        {/* Severity chips */}
        <div className="flex gap-1">
          {SEV_CHIPS.map(c => (
            <button key={c.value} onClick={() => setSevFilter(c.value)}
              className={cn(
                'text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all duration-150',
                sevFilter === c.value
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-foreground-muted)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]',
              )}>
              {c.label} {c.count > 0 && <span className="opacity-70">({c.count})</span>}
            </button>
          ))}
        </div>

        {/* Source */}
        <select value={srcFilter} onChange={e => setSrcFilter(e.target.value)}
          className="text-[11px] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 focus:outline-none bg-[var(--color-surface)] text-[var(--color-foreground-muted)] capitalize">
          {SOURCE_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>

        {/* Time */}
        <div className="flex gap-1">
          {(['24h', '7d', '30d'] as TimeFilter[]).map(t => (
            <button key={t} onClick={() => setTimeFilter(t)}
              className={cn('text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all duration-150',
                timeFilter === t
                  ? 'bg-[var(--color-foreground)] text-white border-[var(--color-foreground)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-foreground-muted)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]')}>
              {t}
            </button>
          ))}
        </div>

        {/* Show ack toggle */}
        <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-foreground-muted)] cursor-pointer ml-auto">
          <input type="checkbox" checked={showAck} onChange={e => setShowAck(e.target.checked)} className="rounded" />
          Show acknowledged
        </label>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--color-primary-soft)] border border-[rgba(8,145,178,0.18)] rounded-xl">
          <span className="text-[12px] font-semibold text-[var(--color-primary)]">{selected.size} selected</span>
          <button onClick={bulkAck}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90">
            <CheckSquare size={12} /> Acknowledge all
          </button>
          <button onClick={() => setSelected(new Set())} className="text-[11px] text-[var(--color-primary)] hover:opacity-70">Clear</button>
        </div>
      )}

      {/* Alert table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden"
           style={{ boxShadow: 'var(--shadow-card)' }}>
        {/* Table header */}
        <div className="grid grid-cols-[32px_80px_1fr_140px_100px_80px_100px] gap-0 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
          {['', 'Severity', 'Alert · detail', 'Facility', 'Owner', 'Age', 'Actions'].map((h, i) => (
            <div key={i} className={cn('px-3 py-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-foreground-lighter)]', i === 2 ? 'col-span-1' : '')}>
              {i === 0 ? (
                <input type="checkbox"
                  onChange={e => setSelected(e.target.checked ? new Set(filtered.map(a => a.id)) : new Set())}
                  className="rounded" />
              ) : h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-14 text-[var(--color-foreground-lighter)]">
            <Filter size={28} className="opacity-30" />
            <p className="text-[13px] font-medium">No alerts match the current filters</p>
            <button onClick={() => { setSevFilter('all'); setSrcFilter('All'); setSearch('') }}
              className="text-[11px] text-[var(--color-primary)] font-semibold hover:underline">Clear filters</button>
          </div>
        )}

        {filtered.map((alert, i) => (
          <div
            key={alert.id}
            onClick={() => { setDrill(alert); setDrillTab('details') }}
            className={cn(
              'grid grid-cols-[32px_80px_1fr_140px_100px_80px_100px] gap-0 border-b border-[var(--color-border)] last:border-0',
              'hover:bg-[var(--color-surface-raised)] cursor-pointer transition-colors duration-100',
              alert.acknowledged ? 'opacity-40' : '',
            )}
            style={{ animationDelay: `${i * 20}ms` }}
          >
            {/* Checkbox */}
            <div className="px-3 py-3 flex items-center" onClick={e => e.stopPropagation()}>
              <input type="checkbox" checked={selected.has(alert.id)} onChange={() => toggleSelect(alert.id)} className="rounded" />
            </div>

            {/* Severity */}
            <div className="px-3 py-3 flex items-center">
              <SeverityDot severity={alert.severity} showLabel />
            </div>

            {/* Title + detail */}
            <div className="px-3 py-3 min-w-0">
              <p className="text-[12.5px] font-semibold text-[var(--color-foreground)] leading-snug truncate">{alert.title}</p>
              <p className="text-[11px] text-[var(--color-foreground-lighter)] mt-0.5 truncate">{alert.detail}</p>
            </div>

            {/* Facility */}
            <div className="px-3 py-3 flex items-center">
              <span className="text-[11.5px] text-[var(--color-foreground-muted)] truncate">{alert.facility}</span>
            </div>

            {/* Owner */}
            <div className="px-3 py-3 flex items-center">
              <span className="text-[11.5px] text-[var(--color-foreground-muted)] truncate">
                {alert.owner?.name ?? <span className="text-[var(--color-foreground-lighter)] italic">Unassigned</span>}
              </span>
            </div>

            {/* Age */}
            <div className="px-3 py-3 flex items-center">
              <span className="text-[11.5px] text-[var(--color-foreground-lighter)] tabular-nums">{ageLabel(alert.ageMinutes)}</span>
            </div>

            {/* Actions */}
            <div className="px-3 py-3 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              {!alert.acknowledged && (
                <button
                  onClick={async () => { await acknowledge(alert.id); toast.success('Acknowledged') }}
                  className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground-muted)] hover:border-[rgba(8,145,178,0.18)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-all">
                  Ack
                </button>
              )}
              <button
                onClick={async () => { await dismiss(alert.id); toast.success('Dismissed') }}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 transition-colors">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Drill Card */}
      <DrillCard
        open={!!drill} onClose={() => setDrill(null)}
        title={drill?.title ?? ''} subtitle={`${drill?.facility} · ${drill?.source}`}
        tabs={[
          { id: 'details', label: 'Details' },
          { id: 'timeline', label: 'Timeline' },
          { id: 'actions', label: 'Actions' },
          { id: 'audit', label: 'Audit' },
        ]}
        activeTab={drillTab} onTabChange={setDrillTab}
        footer={
          <>
            {drill && !drill.acknowledged && (
              <button onClick={async () => { await acknowledge(drill.id); toast.success('Acknowledged · audit log updated'); setDrill(null) }}
                className="flex-1 text-[12.5px] font-semibold py-2.5 rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90">
                Acknowledge
              </button>
            )}
            <button onClick={() => { console.info('[CMO Demo] Escalate'); toast.success('Escalated to State PMU') }}
              className="text-[12.5px] font-semibold px-4 py-2.5 rounded-xl border border-[var(--color-border)] hover:bg-slate-50">
              Escalate to State
            </button>
          </>
        }
      >
        {drillTab === 'details' && drill && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-[12.5px]">
              {[['Severity', drill.severity], ['Source', drill.source], ['Facility', drill.facility], ['Age', ageLabel(drill.ageMinutes)], ['Status', drill.acknowledged ? '✓ Acknowledged' : 'Open'], ['Owner', drill.owner?.name ?? 'Unassigned']].map(([k, v]) => (
                <div key={k} className="bg-[var(--color-surface-raised)] rounded-lg px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-foreground-lighter)] mb-0.5">{k}</p>
                  <p className="font-semibold text-[var(--color-foreground)] capitalize">{v}</p>
                </div>
              ))}
            </div>
            <p className="text-[13px] text-[var(--color-foreground-muted)] leading-relaxed bg-[var(--color-surface-raised)] rounded-xl px-4 py-3">{drill.detail}</p>
          </div>
        )}
        {drillTab === 'timeline' && drill && (
          <div className="space-y-0">
            {drill.timeline.map((e, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)] border-2 border-white ring-1 ring-[rgba(8,145,178,0.18)] flex-shrink-0 mt-1" />
                  {i < drill.timeline.length - 1 && <span className="w-px flex-1 bg-[var(--color-border)] my-1" />}
                </div>
                <div className="pb-4">
                  <p className="text-[12.5px] font-semibold text-[var(--color-foreground)]">{e.action}</p>
                  <p className="text-[11px] text-[var(--color-foreground-lighter)]">{e.actor} · {new Date(e.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {drillTab === 'actions' && drill && (
          <div className="space-y-2">
            {drill.recommendedActions.map((action, i) => (
              <button key={i} onClick={() => toast.success('Action initiated')}
                className="w-full text-left flex items-start gap-3 text-[12.5px] px-4 py-3 rounded-xl border border-[rgba(8,145,178,0.18)] bg-[var(--color-primary-soft)] text-[#1E40AF] hover:bg-blue-100/70 transition-colors">
                <span className="font-bold text-[var(--color-primary)] flex-shrink-0">{i + 1}.</span>
                {action}
              </button>
            ))}
          </div>
        )}
        {drillTab === 'audit' && drill && (
          <div className="space-y-1">
            {drill.timeline.map((e, i) => (
              <div key={i} className="text-[11px] font-mono text-[var(--color-foreground-lighter)] py-1.5 border-b border-[var(--color-border)] last:border-0">
                {new Date(e.timestamp).toISOString()} — {e.actor} → {e.action}
              </div>
            ))}
          </div>
        )}
      </DrillCard>
    </div>
  )
}
