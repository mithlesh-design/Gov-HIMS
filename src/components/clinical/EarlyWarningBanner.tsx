"use client"

/* S2 — NEWS2 / qSOFA / Sepsis Ambient Watcher banner.
 *
 * Drops onto any IPD / ER surface that has access to a patient's vitals
 * trail. Computes the NEWS2 score from the most-recent capture using the
 * existing src/lib/vitals.ts engine, shows the score with a transparent
 * per-component reasoning chip, and (above threshold) renders a banner
 * with one-click acknowledge / escalate.
 *
 *   <EarlyWarningBanner
 *     patientName="Anil Kumar Verma"
 *     vitals={{ hr: 112, rr: 22, sbp: 102, dbp: 64, temp: 38.4, spo2: 93 }}
 *     onEscalate={() => router.push('/doctor/ipd/anil')}
 *   />
 *
 * If NEWS2 < threshold, returns null (silent — no clutter).
 */
import { useMemo, useState } from "react"
import { ShieldAlert, Phone, Check, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuditStore } from "@/store/useAuditStore"
import { news2FromRecord, type O2Delivery, type Consciousness } from "@/lib/vitals"

interface VitalsInput {
  hr?: number
  rr?: number
  sbp?: number   // mmHg
  dbp?: number   // mmHg (unused by NEWS2; kept for caller convenience)
  temp?: number  // °F
  spo2?: number
  consciousness?: Consciousness
  o2?: O2Delivery
}

interface Props {
  patientId?: string
  patientName: string
  vitals: VitalsInput
  /** Trigger threshold for the banner (default 5). */
  threshold?: number
  /** Escalate action (e.g. open the chart or page the doctor). */
  onEscalate?: () => void
  className?: string
}

export function EarlyWarningBanner({ patientId, patientName, vitals, threshold = 5, onEscalate, className }: Props) {
  const [ack, setAck] = useState(false)
  const log = useAuditStore((s) => s.log)

  const score = useMemo(() => {
    if (vitals.rr == null && vitals.hr == null && vitals.spo2 == null) return null
    return news2FromRecord({
      rr: vitals.rr,
      spo2: vitals.spo2,
      o2Delivery: vitals.o2,
      temp: vitals.temp,
      systolicBP: vitals.sbp,
      hr: vitals.hr,
      consciousness: vitals.consciousness ?? 'A',
    })
  }, [vitals])

  if (!score || score.score < threshold || ack) return null

  // Decompose the score into the contributing breakdown reasons. The vitals
  // engine itself already emits the high-weight drivers; we surface those
  // plus a couple of extras for completeness.
  const reasons: string[] = [...score.drivers]
  if (vitals.hr != null && (vitals.hr <= 50 || vitals.hr >= 91) && !score.drivers.some((d) => d.startsWith('HR'))) {
    reasons.push(`Heart rate ${vitals.hr} bpm`)
  }
  if (vitals.consciousness && vitals.consciousness !== 'A')           reasons.push(`Consciousness ${vitals.consciousness}`)

  function doEscalate() {
    log({
      userId: 'NU-ACTIVE', userName: 'Nurse on shift',
      action: 'nurse_handover',
      resource: 'early_warning', resourceId: patientId ?? 'unknown',
      detail: `NEWS2 = ${score!.score} for ${patientName} — escalated to doctor on call`,
    })
    onEscalate?.()
  }
  function doAck() {
    setAck(true)
    log({
      userId: 'NU-ACTIVE', userName: 'Nurse on shift',
      action: 'nurse_handover',
      resource: 'early_warning', resourceId: patientId ?? 'unknown',
      detail: `NEWS2 = ${score!.score} for ${patientName} — acknowledged at bedside`,
    })
  }

  const tone = score.score >= 7 ? 'rose' : score.score >= 5 ? 'amber' : 'slate'
  const palette = tone === 'rose'
    ? { bg: 'bg-rose-50',  ring: 'ring-rose-200/80',  ico: 'text-rose-600',  fg: 'text-rose-900', sub: 'text-rose-700' }
    : tone === 'amber'
    ? { bg: 'bg-amber-50', ring: 'ring-amber-200/80', ico: 'text-amber-600', fg: 'text-amber-900', sub: 'text-amber-700' }
    : { bg: 'bg-slate-50', ring: 'ring-slate-200/80', ico: 'text-slate-600', fg: 'text-slate-900', sub: 'text-slate-600' }

  return (
    <div className={cn("rounded-2xl ring-2 px-4 py-3 flex items-start gap-3", palette.bg, palette.ring, className)} role="alert">
      <ShieldAlert className={cn("h-5 w-5 flex-shrink-0 mt-0.5", palette.ico)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={cn("text-[14px] font-bold", palette.fg)}>NEWS2 = {score.score}</p>
          <span className={cn("text-[11px] font-semibold rounded-full px-2 py-0.5 bg-white ring-1", palette.ring, palette.sub)}>
            {score.band} risk
          </span>
          <span className={cn("text-[12px]", palette.sub)}>· {patientName}</span>
        </div>
        <p className={cn("text-[11.5px] mt-1.5", palette.sub)}>
          Why: {reasons.length ? reasons.join(' · ') : 'aggregate score exceeds threshold'}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={doEscalate}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold ring-1 transition",
            tone === 'rose'
              ? 'bg-rose-600 hover:bg-rose-700 text-white ring-rose-700'
              : 'bg-amber-600 hover:bg-amber-700 text-white ring-amber-700',
          )}
        >
          <Phone className="h-3 w-3" /> Escalate
        </button>
        <button
          type="button"
          onClick={doAck}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold bg-white hover:bg-slate-50 text-slate-700 ring-1 ring-slate-200"
        >
          <Check className="h-3 w-3" /> Acknowledge
        </button>
      </div>
    </div>
  )
}

/** A small inline NEWS2 trend chip — for the patient row, NOT the banner. */
export function NEWS2Chip({ score }: { score: number }) {
  const tone = score >= 7 ? 'bg-rose-100 text-rose-700' : score >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold", tone)}>
      <Activity className="h-2.5 w-2.5" /> NEWS2 {score}
    </span>
  )
}
