"use client"

import { useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ShieldCheck, Calendar, Trash2, Lock, FileText, AlertTriangle,
  CheckCircle2, ChevronRight, Sparkles, Truck, BadgeCheck, ArrowRight,
} from "lucide-react"
import { useAuditStore, severityOf } from "@/store/useAuditStore"
import { useStatutoryStore, STATUTORY_LABEL, type StatutoryStatus } from "@/store/useStatutoryStore"
import { useVendorStore } from "@/store/useVendorStore"
import { useBMWStore } from "@/store/useBMWStore"
import { useHRStore } from "@/store/useHRStore"
import { buildNabhEvidence } from "@/lib/nabhEvidence"
import { cn } from "@/lib/utils"
import { NabhEvidenceLiveCockpit } from "@/components/admin/NabhEvidenceLiveCockpit"

const today = () => new Date().toISOString().split('T')[0]!
const daysUntil = (s: string) => Math.round((new Date(s + 'T00:00:00').getTime() - new Date(today() + 'T00:00:00').getTime()) / 86400000)
const fmtDate = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

function liveStatutoryStatus(entry: { status: StatutoryStatus; dueDate: string }): StatutoryStatus {
  if (entry.status === 'filed' || entry.status === 'exempted') return entry.status
  const d = daysUntil(entry.dueDate)
  if (d < 0) return 'overdue'
  if (d <= 7) return 'due_soon'
  return 'upcoming'
}

export default function ComplianceCockpit() {
  const auditEntries = useAuditStore(s => s.entries)
  const statutoryEntries = useStatutoryStore(s => s.entries)
  const vendors = useVendorStore(s => s.vendors)
  const bmwLogs = useBMWStore(s => s.wasteLogs)
  const credentials = useHRStore(s => s.staff)

  // ─── NABH readiness ──────────────────────────────────────────────────
  const nabh = useMemo(() => {
    const ev = buildNabhEvidence(auditEntries)
    const ready = ev.filter(c => c.ready).length
    const totalEvents = ev.reduce((sum, c) => sum + c.count, 0)
    return { chapters: ev, ready, total: ev.length, totalEvents }
  }, [auditEntries])

  // ─── DISHA / DPDP status ─────────────────────────────────────────────
  const disha = useMemo(() => {
    const all = auditEntries.filter(e => e.action.startsWith('disha_'))
    const rtbfRequested = all.filter(e => e.action === 'disha_rtbf_requested')
    const rtbfFulfilled = new Set(all.filter(e => e.action === 'disha_rtbf_fulfilled').map(e => e.resourceId))
    const breaches = all.filter(e => e.action === 'disha_breach_logged').length
    const rtbfOpen = rtbfRequested.filter(r => !rtbfFulfilled.has(r.resourceId)).length
    const consents = all.filter(e => e.action === 'disha_consent_captured').length
    return { total: all.length, rtbfOpen, breaches, consents }
  }, [auditEntries])

  // ─── BMW compliance ──────────────────────────────────────────────────
  const bmw = useMemo(() => {
    const thisMonth = today().slice(0, 7)
    const monthLogs = bmwLogs.filter(l => l.date.startsWith(thisMonth))
    const disposed = monthLogs.filter(l => l.status === 'disposed').length
    const nonCompliant = monthLogs.filter(l => l.status === 'non_compliant').length
    const score = monthLogs.length ? Math.round((disposed / monthLogs.length) * 100) : 100
    const yellowKg = monthLogs.filter(l => l.category === 'Yellow').reduce((s, l) => s + l.weightKg, 0)
    const redKg = monthLogs.filter(l => l.category === 'Red').reduce((s, l) => s + l.weightKg, 0)
    return { count: monthLogs.length, disposed, nonCompliant, score, yellowKg, redKg }
  }, [bmwLogs])

  // ─── Statutory returns ───────────────────────────────────────────────
  const statutory = useMemo(() => {
    const counts: Record<StatutoryStatus, number> = { upcoming: 0, due_soon: 0, overdue: 0, filed: 0, exempted: 0 }
    const live = statutoryEntries.map(e => ({ ...e, status: liveStatutoryStatus(e) }))
    for (const e of live) counts[e.status]++
    const next14 = live.filter(e => e.status === 'upcoming' || e.status === 'due_soon')
      .filter(e => daysUntil(e.dueDate) <= 14)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6)
    return { counts, next14 }
  }, [statutoryEntries])

  // ─── Vendor MoUs expiring ────────────────────────────────────────────
  const mous = useMemo(() => {
    const expiring = vendors
      .map(v => ({ ...v, days: daysUntil(v.mouExpiry) }))
      .filter(v => v.days >= 0 && v.days <= 90)
      .sort((a, b) => a.days - b.days)
    const expired = vendors.map(v => ({ ...v, days: daysUntil(v.mouExpiry) })).filter(v => v.days < 0)
    return { expiring, expired, total: vendors.length }
  }, [vendors])

  // ─── Credentials expiring (cross-link to HR phase) ───────────────────
  const creds = useMemo(() => {
    const t = today()
    let expiringSoon = 0
    let expired = 0
    for (const member of credentials) {
      if (member.status === 'terminated') continue
      for (const c of member.credentials) {
        if (c.expiryDate.startsWith('2099')) continue
        const d = daysUntil(c.expiryDate)
        if (d < 0) expired++
        else if (d <= 90) expiringSoon++
      }
    }
    return { expiringSoon, expired }
  }, [credentials])

  // ─── Overall compliance score (heuristic) ────────────────────────────
  const overallScore = useMemo(() => {
    let score = 100
    if (statutory.counts.overdue > 0) score -= statutory.counts.overdue * 8
    if (disha.breaches > 0) score -= disha.breaches * 15
    if (disha.rtbfOpen > 0) score -= disha.rtbfOpen * 3
    if (mous.expired.length > 0) score -= mous.expired.length * 5
    if (creds.expired > 0) score -= creds.expired * 4
    if (bmw.nonCompliant > 0) score -= bmw.nonCompliant * 3
    if (nabh.ready < nabh.total) score -= (nabh.total - nabh.ready) * 2
    return Math.max(0, Math.min(100, score))
  }, [statutory, disha, mous, creds, bmw, nabh])

  const scoreTint = overallScore >= 90 ? 'text-emerald-700 bg-emerald-50 ring-emerald-200'
    : overallScore >= 75 ? 'text-amber-700 bg-amber-50 ring-amber-200'
    : 'text-red-700 bg-red-50 ring-red-200'

  return (
    <div className="space-y-5 p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[var(--color-primary)]" />Compliance Command Centre
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            NABH · DISHA / DPDP · BMW (CPCB) · Statutory returns · MoUs · Credentials — all in one cockpit
          </p>
        </div>
        <div className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-xl ring-1', scoreTint)}>
          <ShieldCheck className="h-5 w-5" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">Overall score</p>
            <p className="text-2xl font-black tabular-nums leading-none">{overallScore}<span className="text-sm font-bold opacity-70"> / 100</span></p>
          </div>
        </div>
      </div>

      {/* M4-W4 — S9: NABH Evidence Live Cockpit. Live evidence per chapter
          with AI-suggested next-action + HITL accept/dismiss. */}
      <NabhEvidenceLiveCockpit />

      {/* 6-stream KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StreamTile
          label="NABH chapters"
          value={`${nabh.ready} / ${nabh.total}`}
          sub={`${nabh.totalEvents} evidence events`}
          icon={ShieldCheck}
          tint={nabh.ready === nabh.total ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}
          href="/quality/nabh"
        />
        <StreamTile
          label="DISHA / DPDP"
          value={disha.breaches > 0 ? 'BREACH' : 'Clean'}
          sub={`${disha.rtbfOpen} RTBF · ${disha.consents} consents`}
          icon={Lock}
          tint={disha.breaches > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}
          href="/admin/disha"
        />
        <StreamTile
          label="BMW / CPCB"
          value={`${bmw.score}%`}
          sub={`${(bmw.yellowKg + bmw.redKg).toFixed(1)}kg disposed`}
          icon={Trash2}
          tint={bmw.score >= 90 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}
          href="/bmw/reports"
        />
        <StreamTile
          label="Statutory"
          value={statutory.counts.overdue > 0 ? `${statutory.counts.overdue} overdue` : `${statutory.counts.due_soon} due`}
          sub={`${statutory.counts.filed} filed YTD`}
          icon={Calendar}
          tint={statutory.counts.overdue > 0 ? 'bg-red-50 border-red-200 text-red-700' : statutory.counts.due_soon > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}
          href="/admin/statutory"
        />
        <StreamTile
          label="MoUs"
          value={`${mous.expired.length + mous.expiring.length}`}
          sub={`${mous.expired.length} expired · ${mous.expiring.length} ≤90d`}
          icon={Truck}
          tint={mous.expired.length > 0 ? 'bg-red-50 border-red-200 text-red-700' : mous.expiring.length > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}
          href="/admin/vendors"
        />
        <StreamTile
          label="Credentials"
          value={`${creds.expiringSoon + creds.expired}`}
          sub={`${creds.expired} expired · ${creds.expiringSoon} ≤90d`}
          icon={BadgeCheck}
          tint={creds.expired > 0 ? 'bg-red-50 border-red-200 text-red-700' : creds.expiringSoon > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}
          href="/admin/credentials"
        />
      </div>

      {/* NABH detail card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />NABH chapter readiness
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-primary)] bg-[rgba(8,145,178,0.07)] px-2 py-0.5 rounded">
              {nabh.ready}/{nabh.total} ready
            </span>
          </h3>
          <Link href="/audit/reports" className="text-[11px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
            Full evidence report <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {nabh.chapters.map(c => (
            <div key={c.chapter} className={cn('rounded-lg p-2.5 border',
              c.ready ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200')}>
              <p className={cn('text-[10px] font-bold tabular-nums uppercase',
                c.ready ? 'text-emerald-700' : 'text-slate-500')}>{c.chapter}</p>
              <p className="text-sm font-black text-slate-800 mt-0.5 tabular-nums">{c.count}</p>
              <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{c.title.slice(0, 28)}{c.title.length > 28 ? '…' : ''}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Statutory next 14d */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--color-primary)]" />Statutory · next 14 days
            </h3>
            <Link href="/admin/statutory" className="text-[11px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
              Calendar <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {statutory.next14.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-3 text-center">Nothing due in the next 2 weeks.</p>
          ) : (
            <div className="space-y-1.5">
              {statutory.next14.map(e => {
                const d = daysUntil(e.dueDate)
                return (
                  <div key={e.id} className={cn('flex items-center justify-between p-2 rounded-lg border',
                    e.status === 'overdue' ? 'bg-red-50 border-red-200' :
                    e.status === 'due_soon' ? 'bg-amber-50 border-amber-200' :
                    'bg-slate-50 border-slate-200')}>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{STATUTORY_LABEL[e.type]}</p>
                      <p className="text-[10px] text-slate-500">{e.periodLabel} · {fmtDate(e.dueDate)}</p>
                    </div>
                    <span className={cn('text-[10px] font-black tabular-nums',
                      d < 0 ? 'text-red-700' : d <= 7 ? 'text-amber-700' : 'text-slate-600')}>
                      {d === 0 ? 'TODAY' : d > 0 ? `${d}d` : `-${Math.abs(d)}d`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* MoUs expiring */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Truck className="h-4 w-4 text-amber-600" />Vendor MoUs · expiring soon
            </h3>
            <Link href="/admin/vendors" className="text-[11px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
              Vendors <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {[...mous.expired, ...mous.expiring.slice(0, 5)].length === 0 ? (
            <p className="text-xs text-slate-400 italic py-3 text-center">All MoUs current.</p>
          ) : (
            <div className="space-y-1.5">
              {[...mous.expired, ...mous.expiring.slice(0, 5)].slice(0, 6).map(v => (
                <div key={v.id} className={cn('flex items-center justify-between p-2 rounded-lg border',
                  v.days < 0 ? 'bg-red-50 border-red-200' :
                  v.days <= 30 ? 'bg-amber-50 border-amber-200' :
                  'bg-slate-50 border-slate-200')}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{v.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">MoU expires {fmtDate(v.mouExpiry)}</p>
                  </div>
                  <span className={cn('text-[10px] font-black tabular-nums flex-shrink-0',
                    v.days < 0 ? 'text-red-700' : v.days <= 30 ? 'text-amber-700' : 'text-slate-600')}>
                    {v.days < 0 ? `-${Math.abs(v.days)}d` : `${v.days}d`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BMW snapshot */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-amber-700" />BMW / CPCB this month
            </h3>
            <Link href="/bmw/reports" className="text-[11px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
              Reports <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Yellow</p>
              <p className="text-base font-black text-amber-700 mt-1 tabular-nums">{bmw.yellowKg.toFixed(1)}<span className="text-[10px] font-bold">kg</span></p>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-red-700">Red</p>
              <p className="text-base font-black text-red-700 mt-1 tabular-nums">{bmw.redKg.toFixed(1)}<span className="text-[10px] font-bold">kg</span></p>
            </div>
            <div className={cn('rounded-lg p-3 text-center border',
              bmw.score >= 90 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200')}>
              <p className={cn('text-[10px] font-bold uppercase tracking-wide',
                bmw.score >= 90 ? 'text-emerald-700' : 'text-amber-700')}>Compliance</p>
              <p className={cn('text-base font-black mt-1 tabular-nums',
                bmw.score >= 90 ? 'text-emerald-700' : 'text-amber-700')}>{bmw.score}%</p>
            </div>
          </div>
        </div>

        {/* DISHA recent */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Lock className="h-4 w-4 text-rose-600" />DISHA / DPDP recent activity
            </h3>
            <Link href="/admin/disha" className="text-[11px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
              Full log <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {(() => {
            const dishaRecent = auditEntries.filter(e => e.action.startsWith('disha_')).slice(0, 5)
            if (dishaRecent.length === 0) {
              return <p className="text-xs text-slate-400 italic py-3 text-center">No DISHA events yet.</p>
            }
            return (
              <div className="space-y-1.5">
                {dishaRecent.map(e => {
                  const sev = severityOf(e.action)
                  return (
                    <div key={e.id} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50/50 border border-slate-100">
                      {sev === 'critical' && <span className="h-2 w-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />}
                      {sev === 'warning' && <span className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />}
                      {sev === 'info' && <span className="h-2 w-2 rounded-full bg-slate-300 mt-1.5 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800">{e.action.replace(/^disha_/, '').replace(/_/g, ' ')}</p>
                        <p className="text-[11px] text-slate-600 truncate">{e.detail}</p>
                        <p className="text-[10px] text-slate-400">{e.userName} · {new Date(e.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </div>

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <Sparkles className="h-3 w-3" />
        Overall score is heuristic: 100 minus penalties for overdue statutory (×8), breaches (×15), open RTBF (×3),
        expired MoUs (×5), expired credentials (×4), BMW non-compliant logs (×3), missing NABH chapters (×2).
      </p>
    </div>
  )
}

function StreamTile({ label, value, sub, icon: Icon, tint, href }: {
  label: string; value: string | number; sub: string; icon: React.ElementType; tint: string; href: string
}) {
  return (
    <Link href={href} className={cn('rounded-xl border p-4 cursor-pointer hover:shadow-md transition', tint)}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 opacity-80" />
        <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">{label}</p>
      </div>
      <p className="text-xl font-black mt-1 tabular-nums">{value}</p>
      <p className="text-[10px] opacity-70 mt-0.5">{sub}</p>
    </Link>
  )
}
