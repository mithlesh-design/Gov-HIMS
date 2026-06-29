"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useCmoSessionStore }    from '@/store/useCmoSessionStore'
import { useCmoAlertsStore }     from '@/store/useCmoAlertsStore'
import { useCmoApprovalsStore }  from '@/store/useCmoApprovalsStore'
import { useCmoFacilitiesStore } from '@/store/useCmoFacilitiesStore'
import { mockCmoApi }            from '@/lib/mocks/cmo/api'
import { CmoPageHeader }  from '@/components/cmo/layout/CmoPageHeader'
import { MetricTile }     from '@/components/shared/MetricTile'
import { AlertRow }       from '@/components/shared/AlertRow'
import { ApprovalRow }    from '@/components/shared/ApprovalRow'
import { FacilityRow }    from '@/components/shared/FacilityRow'
import { DrillCard }      from '@/components/shared/DrillCard'
import { HindiText }      from '@/components/shared/HindiText'
import {
  Sparkles, RefreshCw, Volume2, ArrowRight,
  AlertTriangle, BedDouble, Ambulance, Activity, Baby, HeartPulse,
} from 'lucide-react'
import type { Alert, Approval, Facility, DashboardSummary, AiBrief } from '@/types/cmo'
import { cn } from '@/lib/utils'

const LIVE_OPS = [
  { key: 'opd',            label: 'OPD visits',       route: '/cmo/facilities', icon: <Activity size={14} /> },
  { key: 'ipdCensus',      label: 'IPD census',        route: '/cmo/beds',       icon: <BedDouble size={14} /> },
  { key: 'erArrivals',     label: 'ER arrivals',       route: '/cmo/emergency',  icon: <AlertTriangle size={14} /> },
  { key: 'deliveries',     label: 'Deliveries',        route: '/cmo/mch',        icon: <Baby size={14} /> },
  { key: 'ambulanceTrips', label: 'Ambulance trips',   route: '/cmo/ambulance',  icon: <Ambulance size={14} /> },
  { key: 'deathsAll',      label: 'Deaths · all',      route: '/cmo/quality',    icon: <HeartPulse size={14} /> },
]

function ageLabel(m: number) {
  if (m < 60)   return `${Math.round(m)}m ago`
  if (m < 1440) return `${Math.round(m / 60)}h ago`
  return `${Math.round(m / 1440)}d ago`
}

function SectionHeader({ title, hindi, action, onAction }: { title: string; hindi?: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <h2 className="text-[14px] font-bold text-[var(--color-foreground)]"
            style={{ fontFamily: 'var(--font-heading)' }}>
          {title}
        </h2>
        {hindi && (
          <p className="text-[10.5px] text-[var(--color-foreground-lighter)]"
             style={{ fontFamily: 'var(--cmo-font-devanagari)' }}>
            {hindi}
          </p>
        )}
      </div>
      {action && (
        <button onClick={onAction}
          className="flex items-center gap-1 text-[11.5px] font-semibold text-[var(--color-primary)] hover:opacity-80 transition-opacity">
          {action} <ArrowRight size={11} />
        </button>
      )}
    </div>
  )
}

export default function CmoHomePage() {
  const router         = useRouter()
  const session        = useCmoSessionStore(s => s.session)
  const alerts         = useCmoAlertsStore(s => s.alerts)
  const fetchAlerts    = useCmoAlertsStore(s => s.fetchAlerts)
  const acknowledge    = useCmoAlertsStore(s => s.acknowledge)
  const approvals      = useCmoApprovalsStore(s => s.approvals)
  const approve        = useCmoApprovalsStore(s => s.approve)
  const reject         = useCmoApprovalsStore(s => s.reject)
  const fetchApprovals = useCmoApprovalsStore(s => s.fetchApprovals)
  const { facilities, fetchFacilities } = useCmoFacilitiesStore()

  const [summary, setSummary]           = useState<DashboardSummary | null>(null)
  const [brief, setBrief]               = useState<AiBrief | null>(null)
  const [loading, setLoading]           = useState(true)
  const [drillAlert, setDrillAlert]     = useState<Alert | null>(null)
  const [drillFacility, setDrillFacility] = useState<Facility | null>(null)
  const [drillApproval, setDrillApproval] = useState<Approval | null>(null)
  const [drillTab, setDrillTab]         = useState('details')

  const loadAll = async () => {
    setLoading(true)
    const [s, b] = await Promise.all([mockCmoApi.getDashboardSummary(), mockCmoApi.getAiBrief()])
    setSummary(s); setBrief(b)
    fetchAlerts(); fetchApprovals(); fetchFacilities()
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const criticalAlerts = alerts
    .filter(a => !a.acknowledged)
    .sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.severity] - { critical: 0, warning: 1, info: 2 }[b.severity] || a.ageMinutes - b.ageMinutes))
    .slice(0, 4)

  const pendingApprovals = approvals.filter(a => a.status === 'pending').slice(0, 3)
  const topFacilities    = [...facilities].sort((a, b) => b.alertsCount - a.alertsCount).slice(0, 5)

  const pendingCount  = approvals.filter(a => a.status === 'pending').length
  const criticalCount = alerts.filter(a => !a.acknowledged && a.severity === 'critical').length

  return (
    <div className="max-w-5xl mx-auto space-y-6 cmo-fade-up">

      {/* ── Page header ──────────────────────────────────────── */}
      <CmoPageHeader
        title={`Namaste, ${session?.name ?? 'Dr. Rajesh Sharma'}`}
        titleHindi={`नमस्ते, ${session?.nameHindi ?? 'डॉ. राजेश शर्मा'} · ${session?.designation ?? 'CMHO'}`}
        subtitle={`${session?.facilitiesCount ?? 142} facilities · ${session?.populationLakhs ?? 38.4}L population · Bhopal district`}
        actions={
          <button
            onClick={loadAll}
            className="flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-foreground-muted)] hover:border-[rgba(8,145,178,0.18)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-all duration-150"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {/* ── Hero KPI row ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <MetricTile
          label="District health score"
          value={summary?.districtHealthScore ?? 73}
          delta={summary?.districtHealthScoreDelta ?? 2}
          hint="↑ from 71 last week"
          variant="default"
        />
        <MetricTile
          label="Unacknowledged alerts"
          value={summary?.criticalAlertsCount ?? criticalCount}
          hint={`${criticalCount} critical · need action`}
          variant="critical"
        />
        <MetricTile
          label="Pending approvals"
          value={summary?.pendingApprovalsCount ?? pendingCount}
          hint="indents · transfers · leaves"
          variant="warning"
        />
      </div>

      {/* ── AI 8 AM brief ────────────────────────────────────── */}
      <div
        className="rounded-2xl border border-[rgba(8,145,178,0.18)] overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)', boxShadow: 'var(--shadow-card)' }}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[rgba(8,145,178,0.18)]/60">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
              <Sparkles size={13} className="text-white" />
            </div>
            <div>
              <p className="text-[12.5px] font-bold text-[var(--color-foreground)]"
                 style={{ fontFamily: 'var(--font-heading)' }}>
                AI सुबह की संक्षिप्ति · 8 AM Brief
              </p>
              <p className="text-[10px] text-[var(--color-foreground-lighter)]">
                {brief ? new Date(brief.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Generating...'} · AI generated
              </p>
            </div>
          </div>
          <button
            onClick={() => console.info('[CMO Demo] Play audio brief')}
            className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-[rgba(8,145,178,0.18)] text-[var(--color-primary)] bg-white hover:bg-[var(--color-primary-soft)] transition-colors"
          >
            <Volume2 size={11} /> Play audio
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-[13.5px] text-[var(--color-foreground)] leading-[1.7]">
            <HindiText>
              {brief?.bodyText ?? 'कल रात OPD में 4,127 मरीज, IPD में 412 भर्ती, 38 deliveries, 2 maternal deaths under review. Dengue cases wards 14/17/19 में 3.2× baseline — outbreak management में देखें. Hamidia DH में oxygen 4 hrs से कम. 12 doctors AWOL across 4 PHCs. कलेक्टर ब्रीफिंग 10:30 बजे · draft तैयार है.'}
            </HindiText>
          </p>

          {/* Action chips */}
          <div className="flex gap-2 mt-3.5 flex-wrap">
            {(brief?.chips ?? [
              { label: 'Open Bhopal map', action: 'map' },
              { label: 'Brief Collector', action: 'brief' },
              { label: 'View dengue cluster', action: 'surveillance' },
            ]).map(chip => (
              <button
                key={chip.action}
                onClick={() => chip.action === 'surveillance' ? router.push('/cmo/surveillance') : console.info('[CMO Demo]', chip.action)}
                className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-white border border-[rgba(8,145,178,0.18)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white hover:border-[var(--color-primary)] transition-all duration-150"
              >
                {chip.label} <ArrowRight size={9} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2-column grid ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left col — alerts + facility status */}
        <div className="lg:col-span-3 space-y-6">

          {/* Critical alerts */}
          <div>
            <SectionHeader
              title="Critical alerts"
              action="View all"
              onAction={() => router.push('/cmo/alerts')}
            />
            <div className="space-y-2">
              {criticalAlerts.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-4 bg-[var(--color-success-bg)] border border-[border-green-200] rounded-xl text-[12px] text-[#065F46] font-medium">
                  ✓ No unacknowledged alerts
                </div>
              ) : criticalAlerts.map((alert, i) => (
                <div key={alert.id} style={{ animationDelay: `${i * 40}ms` }} className="cmo-fade-up">
                  <AlertRow
                    severity={alert.severity}
                    title={alert.title}
                    detail={alert.detail}
                    ageLabel={ageLabel(alert.ageMinutes)}
                    facility={alert.facility}
                    source={alert.source}
                    isNew={alert.ageMinutes < 2}
                    acknowledged={alert.acknowledged}
                    onAcknowledge={async () => {
                      await acknowledge(alert.id)
                      toast.success('Alert acknowledged · audit log updated')
                    }}
                    onClick={() => { setDrillAlert(alert); setDrillTab('details') }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Facility status */}
          <div>
            <SectionHeader
              title="Facility status"
              hindi="शीर्ष 5 सुविधाएं · टैप करें"
              action="All 142"
              onAction={() => router.push('/cmo/facilities')}
            />
            <div className="space-y-2">
              {topFacilities.map((f, i) => (
                <div key={f.id} style={{ animationDelay: `${i * 30}ms` }} className="cmo-fade-up">
                  <FacilityRow
                    name={f.name} type={f.type} block={f.block} status={f.status}
                    summary={`${f.beds.used}/${f.beds.total} beds · OPD ${f.opdToday}`}
                    alertCount={f.alertsCount}
                    onClick={() => { setDrillFacility(f); setDrillTab('overview') }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right col — live ops + approvals */}
        <div className="lg:col-span-2 space-y-6">

          {/* Live operations */}
          <div>
            <SectionHeader title="Live operations" hindi="आज का लाइव डेटा" />
            <div className="grid grid-cols-2 gap-2.5">
              {LIVE_OPS.map(tile => (
                <button
                  key={tile.key}
                  onClick={() => router.push(tile.route)}
                  className="group flex flex-col gap-1 px-3.5 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-left hover:border-[rgba(8,145,178,0.18)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-150"
                  style={{ boxShadow: 'var(--shadow-card)' }}
                >
                  <div className="flex items-center gap-1.5 text-[var(--color-foreground-lighter)] group-hover:text-[var(--color-primary)] transition-colors">
                    {tile.icon}
                  </div>
                  <p className="text-[20px] font-bold text-[var(--color-foreground)] leading-none"
                     style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
                    {summary?.liveOps[tile.key as keyof typeof summary.liveOps]?.toLocaleString('en-IN') ?? '—'}
                  </p>
                  <p className="text-[10.5px] font-medium text-[var(--color-foreground-lighter)]">{tile.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Pending approvals */}
          <div>
            <SectionHeader
              title="Pending approvals"
              hindi="हस्ताक्षर की आवश्यकता"
              action="All"
              onAction={() => router.push('/cmo/approvals')}
            />
            <div className="space-y-2">
              {pendingApprovals.length === 0 ? (
                <div className="px-4 py-4 bg-[var(--color-success-bg)] border border-[border-green-200] rounded-xl text-[12px] text-[#065F46] font-medium text-center">
                  ✓ All clear
                </div>
              ) : pendingApprovals.map(apv => (
                <ApprovalRow
                  key={apv.id}
                  title={apv.title}
                  subtitle={apv.subtitle}
                  ageLabel={`${apv.ageHours}h ago`}
                  status={apv.status}
                  onOpen={() => { setDrillApproval(apv); setDrillTab('details') }}
                  onApprove={async () => { await approve(apv.id); toast.success('Approved · audit log updated') }}
                  onReject={async (r) => { await reject(apv.id, r); toast.success('Rejected · audit log updated') }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Alert DrillCard ───────────────────────────────────── */}
      <DrillCard
        open={!!drillAlert} onClose={() => setDrillAlert(null)}
        title={drillAlert?.title ?? ''} subtitle={`${drillAlert?.facility} · ${drillAlert?.source}`}
        tabs={[
          { id: 'details', label: 'Details' },
          { id: 'timeline', label: 'Timeline' },
          { id: 'actions', label: 'Actions' },
          { id: 'audit', label: 'Audit' },
        ]}
        activeTab={drillTab} onTabChange={setDrillTab}
        footer={
          <>
            {drillAlert && !drillAlert.acknowledged && (
              <button onClick={async () => {
                await acknowledge(drillAlert.id)
                toast.success('Alert acknowledged')
                setDrillAlert(null)
              }}
                className="flex-1 text-[12.5px] font-semibold py-2.5 rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity">
                Acknowledge
              </button>
            )}
            <button onClick={() => { console.info('[CMO Demo] Escalate to state'); toast.success('Escalated to State PMU') }}
              className="text-[12.5px] font-semibold px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-[var(--color-foreground-muted)] hover:bg-slate-50 transition-colors">
              Escalate to State
            </button>
          </>
        }
      >
        {drillTab === 'details' && drillAlert && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-[12.5px]">
              {[
                ['Severity', <span className="capitalize font-semibold">{drillAlert.severity}</span>],
                ['Source',   <span className="capitalize font-semibold">{drillAlert.source}</span>],
                ['Facility', <span className="font-semibold">{drillAlert.facility}</span>],
                ['Age',      <span className="font-semibold">{ageLabel(drillAlert.ageMinutes)}</span>],
                ['Status',   <span className="font-semibold">{drillAlert.acknowledged ? '✓ Acknowledged' : 'Open'}</span>],
                ['Owner',    <span className="font-semibold">{drillAlert.owner?.name ?? 'Unassigned'}</span>],
              ].map(([k, v]) => (
                <div key={String(k)} className="bg-[var(--color-surface-raised)] rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-[var(--color-foreground-lighter)] font-medium uppercase tracking-wide mb-0.5">{k}</p>
                  <div>{v}</div>
                </div>
              ))}
            </div>
            <div className="bg-[var(--color-surface-raised)] rounded-xl px-4 py-3 text-[13px] text-[var(--color-foreground-muted)] leading-relaxed">
              {drillAlert.detail}
            </div>
          </div>
        )}
        {drillTab === 'timeline' && drillAlert && (
          <div className="space-y-0">
            {drillAlert.timeline.map((entry, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)] border-2 border-white ring-1 ring-[rgba(8,145,178,0.18)] flex-shrink-0 mt-1" />
                  {i < drillAlert.timeline.length - 1 && <span className="w-px flex-1 bg-[var(--color-border)] my-1" />}
                </div>
                <div className="pb-4 min-w-0">
                  <p className="text-[12.5px] font-semibold text-[var(--color-foreground)]">{entry.action}</p>
                  <p className="text-[11px] text-[var(--color-foreground-lighter)] mt-0.5">
                    {entry.actor} · {new Date(entry.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {drillTab === 'actions' && drillAlert && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-[var(--color-foreground-lighter)] uppercase tracking-wider mb-3">Recommended actions</p>
            {drillAlert.recommendedActions.map((action, i) => (
              <button key={i}
                onClick={() => { console.info('[CMO Demo] Action:', action); toast.success('Action initiated') }}
                className="w-full text-left flex items-start gap-3 text-[12.5px] font-medium px-4 py-3 rounded-xl border border-[rgba(8,145,178,0.18)] bg-[var(--color-primary-soft)] text-[#1E40AF] hover:bg-blue-100/70 transition-colors">
                <span className="text-[var(--color-primary)] font-bold flex-shrink-0">{i + 1}.</span>
                {action}
              </button>
            ))}
          </div>
        )}
        {drillTab === 'audit' && drillAlert && (
          <div className="space-y-1">
            {drillAlert.timeline.map((entry, i) => (
              <div key={i} className="text-[11px] text-[var(--color-foreground-lighter)] font-mono py-2 border-b border-[var(--color-border)] last:border-0">
                <span className="text-[var(--color-foreground-lighter)/70]">{new Date(entry.timestamp).toISOString()}</span>
                <span className="mx-2 text-[var(--color-border-hover)]">—</span>
                <span className="text-[var(--color-foreground-muted)]">{entry.actor} → {entry.action}</span>
              </div>
            ))}
          </div>
        )}
      </DrillCard>

      {/* ── Facility DrillCard ────────────────────────────────── */}
      <DrillCard
        open={!!drillFacility} onClose={() => setDrillFacility(null)}
        title={drillFacility?.name ?? ''} subtitle={`${drillFacility?.type} · ${drillFacility?.block}`}
        tabs={[{ id: 'overview', label: 'Overview' }, { id: 'beds', label: 'Beds' }, { id: 'stock', label: 'Stock' }, { id: 'staff', label: 'Staff' }]}
        activeTab={drillTab} onTabChange={setDrillTab}
        footer={
          <>
            <button onClick={() => router.push('/cmo/facilities')}
              className="flex-1 text-[12.5px] font-semibold py-2.5 rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity">
              Open in live ops
            </button>
            <button onClick={() => router.push('/cmo/field-visits')}
              className="text-[12.5px] font-semibold px-4 py-2.5 rounded-xl border border-[var(--color-border)] hover:bg-slate-50 transition-colors">
              Schedule visit
            </button>
          </>
        }
      >
        {drillFacility && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <MetricTile label="Beds occupied" value={`${drillFacility.beds.used}/${drillFacility.beds.total}`} />
              <MetricTile label="OPD today" value={drillFacility.opdToday} />
              <MetricTile label="IPD census" value={drillFacility.ipdCensusToday} />
              <MetricTile label="Active alerts" value={drillFacility.alertsCount} variant={drillFacility.alertsCount > 0 ? 'critical' : 'success'} />
            </div>
            <div className="bg-[var(--color-surface-raised)] rounded-xl px-4 py-3 space-y-2 text-[12.5px]">
              {[
                ['Staff count', drillFacility.staffCount],
                ['NQAS score', drillFacility.nqasScore ?? 'N/A'],
                ['Last visited', drillFacility.lastVisited ?? 'Not on record'],
                ['Population', drillFacility.population.toLocaleString('en-IN')],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between">
                  <span className="text-[var(--color-foreground-lighter)]">{k}</span>
                  <span className="font-semibold text-[var(--color-foreground)]">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DrillCard>

      {/* ── Approval DrillCard ────────────────────────────────── */}
      <DrillCard
        open={!!drillApproval} onClose={() => setDrillApproval(null)}
        title={drillApproval?.title ?? ''} subtitle={`${drillApproval?.raisedByRole} · ${drillApproval?.ageHours}h ago`}
        footer={
          <>
            <button onClick={async () => {
              if (drillApproval) { await approve(drillApproval.id); toast.success('Approved · audit log updated'); setDrillApproval(null) }
            }}
              className="flex-1 text-[12.5px] font-semibold py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
              स्वीकार करें · Approve
            </button>
            <button onClick={() => setDrillApproval(null)}
              className="text-[12.5px] font-semibold px-4 py-2.5 rounded-xl border border-[var(--color-border)] hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </>
        }
      >
        {drillApproval && (
          <div className="space-y-4 text-[12.5px]">
            <div className="bg-[var(--color-surface-raised)] rounded-xl px-4 py-3 space-y-2">
              {[
                ['Type',      drillApproval.type],
                ['Raised by', drillApproval.raisedBy],
                ['Role',      drillApproval.raisedByRole],
                ...(drillApproval.amount ? [['Amount', `₹${drillApproval.amount.toLocaleString('en-IN')}`]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-[var(--color-foreground-lighter)]">{k}</span>
                  <span className="font-semibold text-[var(--color-foreground)] capitalize">{v}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[var(--color-foreground-lighter)] uppercase tracking-wide mb-2">Justification</p>
              <p className="text-[var(--color-foreground-muted)] leading-relaxed">{drillApproval.justification}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[var(--color-foreground-lighter)] uppercase tracking-wide mb-2">Documents</p>
              <div className="space-y-1.5">
                {drillApproval.documents.map(doc => (
                  <div key={doc.name} className="flex items-center gap-2 text-[var(--color-primary)] cursor-pointer hover:opacity-80">
                    <span className="text-[11px]">📄</span>
                    <span className="text-[12px] font-medium underline underline-offset-2">{doc.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DrillCard>
    </div>
  )
}
