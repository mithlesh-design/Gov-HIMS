"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Activity, AlertTriangle, Phone, CheckCircle, Clock, Hourglass,
  Sparkles, ArrowRight, Users, ShieldAlert, ClipboardList, PackageCheck, Ambulance,
  Stethoscope, LogOut, ChevronRight, Bed,
} from "lucide-react"
import {
  useERStore, latestVitals,
  type ERPatient,
} from "@/store/useERStore"
import {
  news2, qsofa, TREATMENT_AREAS, ESI_STYLE,
  type TreatmentArea,
} from "@/lib/erClinical"
import { useAuthStore } from "@/store/useAuthStore"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { OnShiftTeam } from "@/components/clinical/OnShiftTeam"

const timeAgo = (iso?: string) => {
  if (!iso) return ""
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  return `${Math.round(mins / 60)}h ago`
}
const minsBetween = (a: string, b: string) =>
  Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000))

export default function ERDashboard() {
  const patients = useERStore(s => s.patients)
  const mci = useERStore(s => s.mciActive)
  const toggleMCI = useERStore(s => s.toggleMCI)
  const logCallback = useERStore(s => s.logCallback)
  const currentUser = useAuthStore(s => s.currentUser)
  const meName = currentUser?.name ?? "ER Incharge"

  const [callbackId, setCallbackId] = useState<string | null>(null)
  const [callbackTo, setCallbackTo] = useState("")

  const m = useMemo(() => {
    const active = patients.filter(p => p.phase !== 'disposed')
    const awaitingTriage = active.filter(p => p.phase === 'awaiting_triage')
    const triaged = active.filter(p => p.phase === 'triaged')
    const inTreatment = active.filter(p => p.phase === 'in_treatment')
    const awaitingDispo = active.filter(p => p.phase === 'awaiting_disposition')
    const disposedToday = patients.filter(p => p.phase === 'disposed' && p.dispositionAt && new Date(p.dispositionAt).toDateString() === new Date().toDateString())
    const mlcOpen = active.filter(p => p.trauma && !p.mlc)

    const high = active.filter(p => {
      const v = latestVitals(p)
      return v ? news2(v).band === 'high' : false
    })
    const sepsisSuspected = active.filter(p => {
      const v = latestVitals(p)
      return v ? qsofa(v).positive : false
    })
    const traumaActive = active.filter(p => p.trauma && p.phase !== 'disposed')

    const claimed = active.filter(p => p.doctorClaimAt)
    const dtdSorted = claimed
      .map(p => minsBetween(p.arrivedAt, p.doctorClaimAt!))
      .sort((a, b) => a - b)
    const dtdMedian = dtdSorted.length ? dtdSorted[Math.floor(dtdSorted.length / 2)] : 0

    const pipeline: Record<TreatmentArea, number> = {
      RESUS: 0, TRAUMA: 0, CRITICAL: 0, ACUTE: 0, SUBACUTE: 0, FAST_TRACK: 0, OBS: 0,
    }
    for (const p of active) if (p.area) pipeline[p.area]++

    const loadMap: Record<string, number> = {}
    for (const p of inTreatment) {
      const n = p.assignedTo?.name ?? 'Unclaimed'
      loadMap[n] = (loadMap[n] ?? 0) + 1
    }
    const techLoad = Object.entries(loadMap).sort((a, b) => b[1] - a[1])

    const stale = active.filter(p => minsBetween(p.arrivedAt, new Date().toISOString()) > 240 && p.phase !== 'awaiting_disposition')

    return {
      kpis: {
        inDept: active.length,
        awaitingTriage: awaitingTriage.length + triaged.length,
        awaitingTriageOnly: awaitingTriage.length,
        triagedOnly: triaged.length,
        inTreatmentCount: inTreatment.length,
        awaitingDispoCount: awaitingDispo.length,
        disposedToday: disposedToday.length,
        mlcOpen: mlcOpen.length,
        high: high.length,
        sepsisSuspected: sepsisSuspected.length,
        traumaActive: traumaActive.length,
        awaitingBed: awaitingDispo.length,
      },
      dtdMedian, pipeline, techLoad, sepsisSuspected, high, awaitingDispo, stale,
    }
  }, [patients])

  const onLogCallback = (p: ERPatient) => {
    const recipient = callbackTo.trim() || 'ordering team'
    logCallback(p.id, meName, recipient)
    setCallbackId(null); setCallbackTo("")
    toast.success(`Callback logged for ${p.name} to ${recipient}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">ER Overview</h1>
          <p className="text-sm text-[#64748B] mt-1">Incharge command center · NEWS2 / qSOFA exception lists · door-to-doctor SLA · MCI toggle</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { toggleMCI(); toast(mci ? 'MCI mode cleared' : 'MCI MODE activated') }}
            className={cn('flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer',
              mci ? 'bg-red-100 text-red-700 ring-1 ring-red-300 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
            <AlertTriangle className="h-3.5 w-3.5" />{mci ? 'MCI ACTIVE' : 'Declare MCI'}
          </button>
          <Link href="/emergency/triage" className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl"><Ambulance className="h-3.5 w-3.5" />Open Triage</Link>
          <Link href="/emergency/floor" className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-2 rounded-xl"
            style={{ background: 'linear-gradient(135deg,#EF4444,#F97316)', boxShadow: '0 2px 8px rgba(239,68,68,0.25)' }}>
            <Activity className="h-3.5 w-3.5" />Open Floor
          </Link>
        </div>
      </div>

      {/* M4.4 — Live ER staff on shift */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <OnShiftTeam
          department="Emergency Room"
          date={new Date().toISOString().split('T')[0]!}
          shift={(() => {
            const h = new Date().getHours()
            if (h >= 6 && h < 14) return 'Morning'
            if (h >= 14 && h < 22) return 'Evening'
            return 'Night'
          })()}
          title="ER team currently on shift"
          emptyMessage="No ER staff currently rostered — escalate to on-call."
          roles={['emergency', 'doctor', 'nurse']}
          compact
        />
      </div>

      {/* M13.3 — Door-to-disposition journey strip.
          Mirrors the actual ER patient journey: arrival → triage → in treatment →
          disposition decided → patient left. The MLC-pending tile is the safety
          backstop: trauma cases cannot be disposed without MLC documentation,
          so it surfaces work that's about to block. */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Activity className="h-4 w-4 text-red-600" />Door-to-disposition journey
          </h2>
          <p className="text-[11px] text-slate-500">
            Arrival → triage → treatment → disposition → disposed{' · '}
            <span className="font-bold text-slate-700">Door-to-doctor median {m.dtdMedian}m</span>
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 items-stretch">
          {[
            { label: 'Awaiting triage', sub: 'Just arrived',         count: m.kpis.awaitingTriageOnly, color: 'border-amber-200 bg-amber-50',      icon: Ambulance,    fg: 'text-amber-700',     href: '/emergency/triage', cta: 'Triage' },
            { label: 'Triaged',         sub: 'Awaiting doctor',      count: m.kpis.triagedOnly,        color: 'border-orange-200 bg-orange-50',    icon: ClipboardList, fg: 'text-orange-700',   href: '/emergency/floor',  cta: 'Claim' },
            { label: 'In treatment',    sub: 'Active care',          count: m.kpis.inTreatmentCount,   color: 'border-[rgba(8,145,178,0.20)] bg-[rgba(8,145,178,0.07)]',        icon: Stethoscope,   fg: 'text-[var(--color-primary)]',     href: '/emergency/floor',  cta: 'Continue' },
            { label: 'Awaiting dispo',  sub: 'Decision pending',     count: m.kpis.awaitingDispoCount, color: 'border-[rgba(8,145,178,0.20)] bg-[rgba(8,145,178,0.07)]',    icon: Hourglass,     fg: 'text-[var(--color-primary)]',   href: '/emergency/floor',  cta: 'Decide' },
            { label: 'Disposed',        sub: 'Today',                count: m.kpis.disposedToday,      color: 'border-emerald-200 bg-emerald-50',  icon: LogOut,        fg: 'text-emerald-700',  href: '/emergency/floor',  cta: 'Review' },
            { label: 'MLC pending',     sub: 'Trauma w/o file',      count: m.kpis.mlcOpen,            color: m.kpis.mlcOpen > 0 ? 'border-red-300 bg-red-50 ring-2 ring-red-100' : 'border-slate-200 bg-white', icon: ShieldAlert, fg: m.kpis.mlcOpen > 0 ? 'text-red-700' : 'text-slate-400', href: '/emergency/floor', cta: 'File MLC' },
          ].map((s, i, arr) => (
            <Link key={s.label} href={s.href}
              className={cn("relative rounded-xl border p-3 hover:shadow-md transition flex flex-col gap-1 cursor-pointer group", s.color)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <s.icon className={cn("h-4 w-4 flex-shrink-0", s.fg)} />
                  <p className={cn("text-xs font-bold truncate", s.fg)}>{s.label}</p>
                </div>
                {i < arr.length - 1 && <ChevronRight className="absolute -right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 hidden lg:block" />}
              </div>
              <p className={cn("text-2xl font-bold leading-none", s.fg)}>{s.count}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{s.sub}</p>
              <p className={cn("text-[10px] font-bold mt-1 inline-flex items-center gap-0.5 group-hover:underline", s.fg)}>
                {s.cta} <ArrowRight className="h-2.5 w-2.5" />
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'In department', value: m.kpis.inDept, icon: Activity, fg: 'text-[var(--color-primary)]', bg: 'bg-[rgba(8,145,178,0.07)]' },
          { label: 'Awaiting triage / placement', value: m.kpis.awaitingTriage, icon: ClipboardList, fg: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'NEWS2 high', value: m.kpis.high, icon: ShieldAlert, fg: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Sepsis suspected (qSOFA)', value: m.kpis.sepsisSuspected, icon: ShieldAlert, fg: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Trauma active', value: m.kpis.traumaActive, icon: AlertTriangle, fg: 'text-[var(--color-primary)]', bg: 'bg-[rgba(8,145,178,0.07)]' },
          { label: 'Awaiting bed', value: m.kpis.awaitingBed, icon: PackageCheck, fg: 'text-[var(--color-primary)]', bg: 'bg-[rgba(8,145,178,0.07)]' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl p-3 flex items-center gap-3', s.bg)}>
            <div className="p-2 rounded-lg bg-white shadow-sm"><s.icon className={cn('h-4 w-4', s.fg)} /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 truncate">{s.label}</p>
              <h3 className="text-xl font-bold text-slate-900">{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
              <h2 className="text-sm font-bold text-slate-800">Pipeline by area</h2>
              <span className="text-[11px] font-bold text-slate-500">Door-to-doctor median: <span className="text-slate-900">{m.dtdMedian}m</span></span>
            </div>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {TREATMENT_AREAS.map(a => (
                <div key={a.code} className="rounded-lg ring-1 ring-slate-200/70 p-2.5">
                  <p className="text-[11px] font-bold text-slate-700">{a.label}</p>
                  <p className="text-lg font-bold text-slate-900 leading-none mt-0.5">{m.pipeline[a.code]}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{a.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {m.high.length > 0 && (
            <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-red-100 bg-red-50 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-600" />
                <h2 className="text-sm font-bold text-red-800">NEWS2 high — emergency response</h2>
                <span className="text-xs text-red-600">{m.high.length}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {m.high.map(p => {
                  const v = latestVitals(p)
                  const n = v ? news2(v) : null
                  return (
                    <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2 flex-wrap">
                          <span className="font-bold">{p.name}</span>
                          <span className="text-[11px] font-bold text-slate-400">{p.age}{p.gender}</span>
                          {p.esi && <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', ESI_STYLE[p.esi].bg, ESI_STYLE[p.esi].fg)}>ESI {p.esi}</span>}
                          {n && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">NEWS2 {n.score}</span>}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{p.chiefComplaint} · in dept {timeAgo(p.arrivedAt)}</p>
                      </div>
                      {callbackId === p.id ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <input value={callbackTo} onChange={e => setCallbackTo(e.target.value)} placeholder="critical care, on-call senior…"
                            className="w-44 h-7 px-2 text-[11px] rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-200" />
                          <button onClick={() => onLogCallback(p)}
                            className="text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded-lg cursor-pointer">Confirm log</button>
                          <button onClick={() => { setCallbackId(null); setCallbackTo("") }}
                            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer">Cancel</button>
                        </div>
                      ) : !p.callbackLogged ? (
                        <button onClick={() => { setCallbackId(p.id); setCallbackTo('') }}
                          className="flex items-center gap-1 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded-lg cursor-pointer">
                          <Phone className="h-3 w-3" />Log callback
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1"><CheckCircle className="h-3 w-3" />called {timeAgo(p.callbackLogged.calledAt)}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {m.sepsisSuspected.length > 0 && (
            <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-orange-100 bg-orange-50 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-orange-600" />
                <h2 className="text-sm font-bold text-orange-800">Sepsis suspected (qSOFA+)</h2>
                <span className="text-xs text-orange-600">{m.sepsisSuspected.length}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {m.sepsisSuspected.map(p => (
                  <div key={p.id} className="px-4 py-2.5 text-sm">
                    <span className="font-bold text-slate-800">{p.name}</span>
                    <span className="text-slate-400 mx-2">·</span>
                    <span className="text-orange-700">{p.chiefComplaint}</span>
                    <span className="text-slate-400 mx-2">·</span>
                    <span className="text-[11px] text-slate-500">in dept {timeAgo(p.arrivedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {m.awaitingDispo.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hourglass className="h-4 w-4 text-[var(--color-primary)]" />
                  <h2 className="text-sm font-bold text-slate-800">Awaiting bed / disposition</h2>
                  <span className="text-xs text-slate-400">{m.awaitingDispo.length}</span>
                </div>
                <Link href="/emergency/floor" className="text-xs font-bold text-red-700 hover:underline flex items-center gap-1">Open Floor <ArrowRight className="h-3 w-3" /></Link>
              </div>
              <div className="divide-y divide-slate-100">
                {m.awaitingDispo.slice(0, 5).map(p => (
                  <div key={p.id} className="px-4 py-2.5 text-sm">
                    <span className="font-bold text-slate-800">{p.name}</span>
                    <span className="text-slate-400 mx-2">·</span>
                    <span className="text-[var(--color-primary)]">{p.disposition ? p.disposition : 'decision pending'}</span>
                    {p.dispositionNote && <>
                      <span className="text-slate-400 mx-2">·</span>
                      <span className="text-[11px] text-slate-500 italic">{p.dispositionNote.slice(0, 80)}</span>
                    </>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-[var(--color-primary)]" />Doctor load</h2>
            {m.techLoad.length === 0 ? (
              <p className="text-xs text-slate-400">No claimed patients.</p>
            ) : (() => {
              const maxLoad = Math.max(...m.techLoad.map(([, n]) => n), 1)
              return (
                <div className="space-y-2">
                  {m.techLoad.map(([name, n]) => (
                    <div key={name}>
                      <p className="text-xs text-slate-600 flex items-center justify-between"><span>{name}</span><b>{n}</b></p>
                      <div className="h-1.5 mt-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: `${(n / maxLoad) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          <div className="rounded-xl border border-orange-200 p-4" style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.06),rgba(249,115,22,0.04))' }}>
            <h2 className="text-sm font-bold flex items-center gap-2 mb-2 text-orange-800"><Sparkles className="h-4 w-4 text-orange-600" />AI exception triage</h2>
            {m.stale.length === 0 ? (
              <p className="text-xs text-slate-500">No long-stays. Throughput is healthy.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {m.stale.map(p => (
                  <p key={p.id} className="text-orange-700">
                    <Clock className="h-3 w-3 inline -mt-0.5 mr-1" />
                    <b>{p.name}</b> · {p.chiefComplaint} · <b>{minsBetween(p.arrivedAt, new Date().toISOString())}m</b> in dept — boarding risk
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-500" />Triage queue: <Link href="/emergency/triage" className="font-bold text-red-700 hover:underline">open</Link></p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1"><Activity className="h-3 w-3 text-red-500" />ER Floor: <Link href="/emergency/floor" className="font-bold text-red-700 hover:underline">open</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}
