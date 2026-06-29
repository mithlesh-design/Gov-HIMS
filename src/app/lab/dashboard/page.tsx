"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  FlaskConical, Users, AlertTriangle, Phone, CheckCircle, Clock, Hourglass,
  ShieldX, Sparkles, ArrowRight, Microscope, Activity, PackageCheck,
  ClipboardList, Droplet, ShieldCheck, Send,
} from "lucide-react"
import { useLabOrdersStore, type LabOrder, type TestRun, type TestStatus } from "@/store/useLabOrdersStore"
import { useLabQCStore, ANALYZERS } from "@/store/useLabQCStore"
import { useAuthStore } from "@/store/useAuthStore"
import { LAB_CATALOG, type Bench } from "@/lib/labCatalog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { notifyAndAudit, notifyAndAuditMany } from "@/lib/notifyAndAudit"

const BENCH_LABELS: Record<Bench, string> = {
  HEMA: "Hematology", BIOCHEM: "Biochemistry", IMMUNO: "Immunology",
  URINE: "Urinalysis", MICRO: "Microbiology", HISTO: "Histopathology",
}

const timeAgo = (iso?: string) => {
  if (!iso) return ""
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  return `${Math.round(mins / 60)}h ago`
}
const minsElapsed = (iso: string) => Math.round((Date.now() - new Date(iso).getTime()) / 60000)
const daysElapsed = (iso: string) => (Date.now() - new Date(iso).getTime()) / (24 * 3600_000)

function isStuck(t: TestRun): boolean {
  const cat = LAB_CATALOG[t.code]
  if (cat?.micro && cat.expectedDays) return daysElapsed(t.orderedAt) > 2 * cat.expectedDays
  return minsElapsed(t.orderedAt) > 2 * t.expectedTATmin
}
function isOverdue(t: TestRun): boolean {
  const cat = LAB_CATALOG[t.code]
  if (cat?.micro && cat.expectedDays) return daysElapsed(t.orderedAt) > cat.expectedDays
  return minsElapsed(t.orderedAt) > t.expectedTATmin
}

const ACTIVE_STATUSES: TestStatus[] = ["awaiting_collection", "collected", "on_bench", "in_progress", "entered", "verified"]
const PIPELINE_STATUSES: TestStatus[] = ["awaiting_collection", "on_bench", "in_progress", "entered", "verified"]
const CALLBACK_WINDOW_MS = 24 * 3600_000

export default function LabOverview() {
  const orders = useLabOrdersStore(s => s.orders)
  const logCallback = useLabOrdersStore(s => s.logCallback)
  const qcViolations = useLabQCStore(s => s.violations)
  const currentUser = useAuthStore(s => s.currentUser)
  const meName = currentUser?.name ?? "Lab"

  const [callbackId, setCallbackId] = useState<string | null>(null)
  const [callbackTo, setCallbackTo] = useState("")

  const m = useMemo(() => {
    const tests: { order: LabOrder; test: TestRun }[] = []
    for (const o of orders) for (const t of o.tests) tests.push({ order: o, test: t })

    const awaiting = tests.filter(x => x.test.status === "awaiting_collection")
    const onBench = tests.filter(x => x.test.status === "on_bench" || x.test.status === "collected")
    const inProgress = tests.filter(x => x.test.status === "in_progress")
    const entered = tests.filter(x => x.test.status === "entered")
    const released = tests.filter(x => x.test.status === "released")
    const releasedToday = released.filter(x => x.test.releasedAt && new Date(x.test.releasedAt).toDateString() === new Date().toDateString())
    const callbackCutoff = Date.now() - CALLBACK_WINDOW_MS
    const criticalPendingCallback = released.filter(x =>
      !x.test.callback &&
      x.test.analytes.some(a => a.flag === "CH" || a.flag === "CL") &&
      x.test.releasedAt !== undefined &&
      new Date(x.test.releasedAt).getTime() >= callbackCutoff
    )
    const tatBreaches = tests.filter(x => x.test.status !== "released" && isOverdue(x.test))

    const pipeline: Record<Bench, Record<TestStatus, number>> = {} as Record<Bench, Record<TestStatus, number>>
    for (const b of Object.keys(BENCH_LABELS) as Bench[]) {
      pipeline[b] = { awaiting_collection: 0, collected: 0, on_bench: 0, in_progress: 0, entered: 0, verified: 0, released: 0, rejected: 0, recollect_requested: 0 }
    }
    for (const { test } of tests) {
      if (ACTIVE_STATUSES.includes(test.status)) pipeline[test.bench][test.status]++
    }

    const techLoadMap: Record<string, number> = {}
    for (const x of inProgress) {
      const name = x.test.assignedTo?.name ?? "Unclaimed"
      techLoadMap[name] = (techLoadMap[name] ?? 0) + 1
    }
    const techLoad = Object.entries(techLoadMap).sort((a, b) => b[1] - a[1])

    const overOverdue = tests.filter(x => x.test.status !== "released" && isStuck(x.test))
    const criticalCounts: Record<string, number> = {}
    for (const x of releasedToday) {
      if (x.test.analytes.some(a => a.flag === "CH" || a.flag === "CL")) {
        criticalCounts[x.order.patientName] = (criticalCounts[x.order.patientName] ?? 0) + 1
      }
    }
    const repeatCriticals = Object.entries(criticalCounts).filter(([, n]) => n >= 2)

    return {
      kpis: {
        awaiting: awaiting.length,
        onBench: onBench.length + inProgress.length,
        pendingVerify: entered.length,
        critPending: criticalPendingCallback.length,
        releasedToday: releasedToday.length,
        tatBreaches: tatBreaches.length,
      },
      pipeline, criticalPendingCallback, entered, techLoad, overOverdue, repeatCriticals, awaiting,
    }
  }, [orders])

  const activeQCViolations = ANALYZERS.flatMap(a => (qcViolations[a] ?? []).map(v => ({ analyzer: a, ...v })))

  const onLogCallback = (testId: string, patient: string) => {
    const recipient = callbackTo.trim() || "ordering doctor"
    logCallback(testId, meName, recipient)
    setCallbackId(null); setCallbackTo("")
    notifyAndAudit({
      to: 'doctor', type: 'critical_value', priority: 'critical',
      title: `Critical value callback · ${patient}`,
      body: `Lab notified ${recipient} of critical result for ${patient}. Read-receipt at bedside.`,
      patientName: patient,
      audit: { action: 'lab_critical_callback', resource: 'lab_test', resourceId: testId, detail: `Callback to ${recipient}`, userName: meName },
    })
    toast.success(`Callback logged for ${patient} to ${recipient} · SLA closed`)
  }

  function escalateTatBreaches() {
    const overdue = m.kpis.tatBreaches
    if (overdue === 0) { toast("No TAT breaches right now"); return }
    notifyAndAuditMany(['doctor', 'admin'], {
      type: 'system', priority: 'high',
      title: `${overdue} lab TAT breach${overdue === 1 ? '' : 'es'}`,
      body: `Lab has ${overdue} test${overdue === 1 ? '' : 's'} past TAT. Pulling on-call lab tech to clear.`,
      audit: { action: 'lab_critical_callback', resource: 'lab_tat', detail: `${overdue} TAT breaches escalated`, userName: meName },
    })
    toast.success(`Escalated ${overdue} TAT breach${overdue === 1 ? '' : 'es'} · admin + doctor notified`)
  }

  const SOURCE_COLORS: Record<string, string> = {
    OPD: 'bg-blue-100 text-blue-700',
    ER:  'bg-red-100 text-red-700',
    ICU: 'bg-cyan-100 text-cyan-700',
    OT:  'bg-orange-100 text-orange-700',
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Lab Overview</h1>
          <p className="text-sm text-slate-400 mt-0.5">Pipeline · critical-value SLA · AI exception triage</p>
        </div>
        <div className="flex gap-2">
          <Link href="/lab/inbox"
            className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)] bg-[rgba(8,145,178,0.07)] hover:bg-[rgba(8,145,178,0.12)] border border-[rgba(8,145,178,0.15)] px-3 py-2 rounded-xl transition-colors">
            <ClipboardList className="h-3.5 w-3.5" />Inbox
          </Link>
          <Link href="/lab/benches"
            className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-2 rounded-xl transition-colors"
            style={{ background: "linear-gradient(135deg,var(--color-primary-dark),var(--color-primary))", boxShadow: "0 2px 8px rgba(8,145,178,0.25)" }}>
            <Microscope className="h-3.5 w-3.5" />Benches
          </Link>
        </div>
      </div>

      {/* Pipeline — single authoritative KPI source */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-2 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--color-primary)]" />Sample-to-release pipeline
          </h2>
          <p className="text-xs text-slate-400 hidden sm:block">Order → collect → bench → verify → release</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {[
            { key: 'phleb',    label: 'Phlebotomy',    sub: 'Awaiting collection',  count: m.kpis.awaiting,       icon: Droplet,     fg: 'text-amber-600',  href: '/lab/phlebotomy',    cta: 'Collect now'  },
            { key: 'bench',    label: 'On bench',       sub: 'Running / in progress', count: m.kpis.onBench,        icon: Microscope,  fg: 'text-[var(--color-primary)]',  href: '/lab/analyzer-feed', cta: 'Push results' },
            { key: 'verify',   label: 'Verification',   sub: 'Pending sign-off',      count: m.kpis.pendingVerify,  icon: ShieldCheck, fg: 'text-[var(--color-primary)]',  href: '/lab/verify',        cta: 'Sign off'     },
            { key: 'released', label: 'Released today', sub: 'Reports dispatched',    count: m.kpis.releasedToday,  icon: Send,        fg: 'text-emerald-600',href: '/lab/inbox',         cta: 'View inbox'   },
            { key: 'callback', label: 'Critical',       sub: 'Awaiting callback',     count: m.kpis.critPending,    icon: Phone,       fg: m.kpis.critPending > 0 ? 'text-red-600' : 'text-slate-300', href: '#callback', cta: 'Log callback' },
          ].map(s => (
            <Link key={s.key} href={s.href}
              className="group flex flex-col gap-1.5 px-5 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-1.5">
                <s.icon className={cn("h-3.5 w-3.5 flex-shrink-0", s.fg)} />
                <p className={cn("text-[11px] font-bold uppercase tracking-wide", s.fg)}>{s.label}</p>
              </div>
              <p className={cn("text-3xl font-bold tracking-tight leading-none", s.fg)}>{s.count}</p>
              <p className="text-xs text-slate-400">{s.sub}</p>
              <p className={cn("text-[11px] font-semibold flex items-center gap-0.5 group-hover:underline mt-0.5", s.fg)}>
                {s.cta} <ArrowRight className="h-3 w-3" />
              </p>
            </Link>
          ))}
        </div>

        {/* TAT breaches — inline, not a separate section */}
        {m.kpis.tatBreaches > 0 && (
          <div className="px-5 py-3 border-t border-orange-100 bg-orange-50 flex items-center justify-between gap-3">
            <p className="text-xs text-orange-700 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <b>{m.kpis.tatBreaches}</b> test{m.kpis.tatBreaches !== 1 ? 's' : ''} past TAT target
            </p>
            <button onClick={escalateTatBreaches}
              className="text-xs font-bold text-orange-700 bg-white border border-orange-200 rounded-lg px-3 py-1.5 hover:bg-orange-50 transition-colors">
              Escalate
            </button>
          </div>
        )}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: action queues */}
        <div className="lg:col-span-2 space-y-5">

          {/* Incoming requests */}
          <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-amber-100 bg-amber-50 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-bold text-amber-800">Awaiting collection</h2>
                {m.awaiting.length > 0 && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                    {m.awaiting.length}
                  </span>
                )}
              </div>
              <Link href="/lab/phlebotomy" className="text-xs font-semibold text-amber-700 hover:underline flex items-center gap-1">
                Phlebotomy queue <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {m.awaiting.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <CheckCircle className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No pending collections</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {m.awaiting.slice(0, 10).map(({ order, test }) => (
                  <div key={test.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-slate-900">{order.patientName}</p>
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">{test.name}</span>
                        <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded-md", SOURCE_COLORS[order.source] ?? 'bg-slate-100 text-slate-600')}>
                          {order.source}
                        </span>
                        {test.priority !== 'Routine' && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-red-100 text-red-700">{test.priority}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {order.doctorName} · {test.bench} · {timeAgo(test.orderedAt)}{order.wardBed ? ` · ${order.wardBed}` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-slate-300 font-mono flex-shrink-0">#{order.id}</span>
                  </div>
                ))}
                {m.awaiting.length > 10 && (
                  <div className="px-5 py-3">
                    <Link href="/lab/phlebotomy" className="text-xs font-bold text-[var(--color-primary)] hover:underline">
                      +{m.awaiting.length - 10} more in phlebotomy queue
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Critical pending callback */}
          <div className="bg-white rounded-2xl border border-red-200 overflow-hidden" id="callback">
            <div className="px-5 py-3.5 border-b border-red-100 bg-red-50 flex items-center gap-2">
              <Phone className="h-4 w-4 text-red-600" />
              <h2 className="text-sm font-bold text-red-800">Critical — pending callback</h2>
              <span className="text-xs font-bold text-red-600 bg-red-100 border border-red-200 rounded-full px-2 py-0.5 ml-0.5">
                {m.criticalPendingCallback.length}
              </span>
            </div>
            {m.criticalPendingCallback.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <CheckCircle className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No critical results awaiting callback</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {m.criticalPendingCallback.map(({ order, test }) => {
                  const crit = test.analytes.find(a => a.flag === "CH" || a.flag === "CL")
                  return (
                    <div key={test.id} className="px-5 py-3.5 flex items-center justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-900">{order.patientName}</p>
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-red-100 text-red-700">{test.name}</span>
                          {crit && (
                            <span className="text-xs font-bold text-red-700">{crit.analyte} {crit.value} {crit.unit} {crit.flag}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{order.doctorName} · released {timeAgo(test.releasedAt)}</p>
                      </div>
                      {callbackId === test.id ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            value={callbackTo}
                            onChange={e => setCallbackTo(e.target.value)}
                            placeholder={`Notifying ${order.doctorName}…`}
                            className="w-44 h-8 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-200"
                          />
                          <button onClick={() => onLogCallback(test.id, order.patientName)}
                            className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-xl transition-colors">
                            Confirm
                          </button>
                          <button onClick={() => { setCallbackId(null); setCallbackTo("") }}
                            className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setCallbackId(test.id); setCallbackTo(order.doctorName) }}
                          className="flex items-center gap-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-xl transition-colors">
                          <Phone className="h-3.5 w-3.5" />Log callback
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pending verification */}
          {m.entered.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hourglass className="h-4 w-4 text-[var(--color-primary)]" />
                  <h2 className="text-sm font-bold text-slate-800">Pending verification</h2>
                  <span className="text-xs text-slate-400">{m.entered.length}</span>
                </div>
                <Link href="/lab/benches" className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                  Open Benches <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {m.entered.slice(0, 5).map(({ order, test }) => (
                  <div key={test.id} className="px-5 py-3 flex items-center gap-3">
                    <p className="text-sm font-bold text-slate-800">{order.patientName}</p>
                    <span className="text-slate-200">·</span>
                    <p className="text-sm text-[var(--color-primary)]">{test.name}</p>
                    <span className="text-slate-200">·</span>
                    <p className="text-xs text-slate-400">entered by {test.enteredBy?.name ?? "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">

          {/* Pipeline by bench */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">Pipeline by bench</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {(Object.keys(BENCH_LABELS) as Bench[]).filter(b => b !== "HISTO").map(b => {
                const counts = m.pipeline[b]
                const total = PIPELINE_STATUSES.reduce((s, st) => s + counts[st], 0)
                const running = counts.on_bench + counts.collected + counts.in_progress
                const toVerify = counts.entered + counts.verified
                return (
                  <div key={b} className="px-4 py-3 flex items-center gap-3">
                    <p className="text-sm font-semibold text-slate-700 w-28 flex-shrink-0">{BENCH_LABELS[b]}</p>
                    <div className="flex-1 flex items-center gap-2 justify-end flex-wrap text-xs">
                      {counts.awaiting_collection > 0 && <span className="text-amber-600"><b>{counts.awaiting_collection}</b> waiting</span>}
                      {running > 0 && <span className="text-[var(--color-primary)]"><b>{running}</b> running</span>}
                      {toVerify > 0 && <span className="text-cyan-600"><b>{toVerify}</b> verify</span>}
                      {total === 0 && <span className="text-slate-300 text-xs">idle</span>}
                    </div>
                    <p className="text-base font-bold text-slate-900 w-6 text-right flex-shrink-0">{total}</p>
                  </div>
                )
              })}
            </div>
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex gap-4">
              <Link href="/lab/reflex" className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                <PackageCheck className="h-3.5 w-3.5" />Reflex queue
              </Link>
              <Link href="/lab/microbiology" className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                <FlaskConical className="h-3.5 w-3.5" />Microbiology
              </Link>
            </div>
          </div>

          {/* QC alerts */}
          <div className={cn("rounded-2xl border overflow-hidden", activeQCViolations.length > 0 ? "border-red-200" : "border-slate-200 bg-white")}>
            <div className={cn("px-4 py-3.5 border-b flex items-center gap-2", activeQCViolations.length > 0 ? "border-red-100 bg-red-50" : "border-slate-100")}>
              <ShieldX className={cn("h-4 w-4", activeQCViolations.length > 0 ? "text-red-600" : "text-slate-400")} />
              <h2 className={cn("text-sm font-bold", activeQCViolations.length > 0 ? "text-red-800" : "text-slate-800")}>QC alerts</h2>
              <span className="text-xs text-slate-400 ml-auto">{activeQCViolations.length}</span>
            </div>
            {activeQCViolations.length === 0 ? (
              <div className="px-4 py-4 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <p className="text-xs text-slate-500">All analyzers passing</p>
              </div>
            ) : (
              <div className="px-4 py-3 space-y-2">
                {activeQCViolations.map((v, i) => (
                  <p key={i} className="text-xs text-red-700">
                    <b>{v.analyzer}</b> · {v.rule.toUpperCase()} · {v.note}
                  </p>
                ))}
                <Link href="/lab/qc" className="text-xs font-bold text-red-700 hover:underline flex items-center gap-1 pt-1">
                  Open Quality Control <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          {/* AI exception triage */}
          <div
            className="rounded-2xl border border-[rgba(8,145,178,0.20)] overflow-hidden"
            style={{ background: "linear-gradient(135deg,rgba(8,145,178,0.06),rgba(14,159,110,0.03))" }}
          >
            <div className="px-4 py-3.5 border-b border-[rgba(8,145,178,0.12)] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
              <h2 className="text-sm font-bold text-[var(--color-primary-dark)]">AI exception triage</h2>
            </div>
            {m.overOverdue.length === 0 && m.repeatCriticals.length === 0 ? (
              <div className="px-4 py-4 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <p className="text-xs text-slate-500">No exceptions — pipeline healthy</p>
              </div>
            ) : (
              <div className="px-4 py-3 space-y-2.5">
                {m.overOverdue.map(({ order, test }) => (
                  <div key={test.id} className="flex items-start gap-2">
                    <Clock className="h-3.5 w-3.5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[var(--color-primary)] leading-snug">
                      <b>{order.patientName}</b> · {test.name} · <b>{minsElapsed(test.orderedAt)}m</b> elapsed (TAT {test.expectedTATmin}m) — likely stuck
                    </p>
                  </div>
                ))}
                {m.repeatCriticals.map(([patient, n]) => (
                  <div key={patient} className="flex items-start gap-2">
                    <Activity className="h-3.5 w-3.5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[var(--color-primary)] leading-snug">
                      <b>{patient}</b> — {n} criticals today, delta-check recommended
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Technician workload */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-[var(--color-primary)]" />Technician workload
            </h2>
            {m.techLoad.length === 0 ? (
              <p className="text-xs text-slate-400">No active in-progress tests</p>
            ) : (() => {
              const maxLoad = Math.max(...m.techLoad.map(([, n]) => n), 1)
              return (
                <div className="space-y-3">
                  {m.techLoad.map(([name, n]) => (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs text-slate-600">{name}</p>
                        <p className="text-xs font-bold text-slate-800">{n}</p>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${(n / maxLoad) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

        </div>
      </div>
    </div>
  )
}
