"use client"

import { useMemo } from "react"
import {
  ClipboardList, Activity, Stethoscope, FlaskConical, ScanLine,
  Pill, Building2, Bed, LogOut, Receipt, ShieldCheck, AlertTriangle,
  CheckCircle2, Info,
} from "lucide-react"
import { aggregateJourney, DEPT_COLOR, type Department, type JourneyEvent } from "@/lib/journeyAggregator"
import { cn } from "@/lib/utils"

const DEPT_ICON: Record<Department, React.ElementType> = {
  Reception: ClipboardList, Emergency: AlertTriangle, Nursing: Activity, Doctor: Stethoscope,
  Lab: FlaskConical, Radiology: ScanLine, Pharmacy: Pill, OT: Building2,
  IPD: Bed, Discharge: LogOut, Billing: Receipt, Insurance: ShieldCheck,
}

const SEV_RING: Record<JourneyEvent['severity'], string> = {
  info: 'ring-slate-200', success: 'ring-emerald-200',
  warning: 'ring-amber-200', critical: 'ring-red-300',
}

const fmtAbs = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

const fmtRel = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 0) return 'in the future'
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

interface Props {
  patientId: string
  patientName: string
  /** "compact" hides relative-time + departments filter (for drawers). */
  variant?: 'full' | 'compact'
  /** Filter to a subset of departments — optional. */
  onlyDepts?: Department[]
  /** Max number of events to render. */
  limit?: number
  className?: string
}

/**
 * Unified patient journey timeline — what every paperless HMS needs to show
 * at a glance. Reads from every department store, sorts chronologically,
 * renders each touchpoint with department, actor, severity.
 *
 * Use in: patient detail drawers, /journey/[patientId], discharge summary,
 * audit-officer record view, family portal.
 */
export function PatientJourneyTimeline({
  patientId, patientName, variant = 'full', onlyDepts, limit, className,
}: Props) {
  const events = useMemo(() => {
    let evts = aggregateJourney(patientId, patientName)
    if (onlyDepts && onlyDepts.length > 0) {
      evts = evts.filter(e => onlyDepts.includes(e.dept))
    }
    if (limit) evts = evts.slice(-limit)
    return evts
  }, [patientId, patientName, onlyDepts, limit])

  // Header strip: count per dept (visible in full variant only).
  const deptCounts = useMemo(() => {
    const m = new Map<Department, number>()
    for (const e of events) m.set(e.dept, (m.get(e.dept) ?? 0) + 1)
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
  }, [events])

  if (events.length === 0) {
    return (
      <div className={cn("rounded-xl bg-slate-50 border border-slate-200 p-6 text-center", className)}>
        <Info className="h-6 w-6 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-500">No journey events yet</p>
        <p className="text-xs text-slate-400 mt-1">Touchpoints from every department will appear here as the patient moves through care.</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {variant === 'full' && deptCounts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {deptCounts.map(([dept, count]) => (
            <span key={dept}
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ background: DEPT_COLOR[dept] }}>
              {dept} <span className="text-white/80">{count}</span>
            </span>
          ))}
        </div>
      )}

      <div className="relative pl-7">
        {/* Spine */}
        <div className="absolute left-2.5 top-2 bottom-2 w-px bg-slate-200" />

        <ul className="space-y-3.5">
          {events.map((e, i) => {
            const Icon = DEPT_ICON[e.dept]
            const dotColor = DEPT_COLOR[e.dept]
            return (
              <li key={`${e.at}-${i}`} className="relative">
                {/* Dot */}
                <span
                  className={cn("absolute -left-7 top-0.5 h-5 w-5 rounded-full ring-4 flex items-center justify-center flex-shrink-0", SEV_RING[e.severity])}
                  style={{ background: dotColor }}
                  aria-hidden
                >
                  {e.severity === 'critical' && <AlertTriangle className="h-2.5 w-2.5 text-white" />}
                  {e.severity === 'success' && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                  {(e.severity === 'info' || e.severity === 'warning') && <Icon className="h-2.5 w-2.5 text-white" />}
                </span>

                {/* Card */}
                <div className={cn(
                  "rounded-xl bg-white ring-1 p-3",
                  e.severity === 'critical' ? 'ring-red-200 bg-red-50/40'
                  : e.severity === 'warning' ? 'ring-amber-200'
                  : 'ring-slate-200/70'
                )}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded text-white"
                          style={{ background: dotColor }}
                        >
                          {e.dept}
                        </span>
                        <p className="text-sm font-bold text-slate-900">{e.title}</p>
                      </div>
                      {e.detail && (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{e.detail}</p>
                      )}
                      {e.actor && (
                        <p className="text-[11px] text-slate-400 mt-1">by {e.actor}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[11px] font-bold text-slate-700" suppressHydrationWarning>
                        {fmtAbs(e.at)}
                      </p>
                      {variant === 'full' && (
                        <p className="text-[10px] text-slate-400" suppressHydrationWarning>{fmtRel(e.at)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
