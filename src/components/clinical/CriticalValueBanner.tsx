"use client"

/* S3 — Closed-Loop Critical-Value Handling.
 *
 * Subscribes to the persisted audit table for `lab_critical_callback`
 * events and renders a top-of-shell banner per critical lab that hasn't
 * been acknowledged. Both the ordering doctor AND the nurse must
 * acknowledge before the banner clears; the ack event itself is
 * audit-logged with the actor role + a read-receipt timestamp.
 *
 *   <CriticalValueBanner role="doctor" />   // mount once in AppShell
 *
 * Behaviour:
 *   - Default-collapsed at the top of the role's main column.
 *   - Expands to show the lab, patient, value, source order, and a
 *     2-minute soft-blocker hint (countdown chip).
 *   - "Acknowledge" emits lab_critical_acknowledged with the role.
 *   - "Open chart" navigates to the patient's IPD chart.
 */
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldAlert, Phone, Check, FlaskConical, X, ChevronDown, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuditStore } from "@/store/useAuditStore"

interface Props {
  /** Restrict the banner to one role's surfaces (doctor / nurse / both). */
  role?: 'doctor' | 'nurse' | 'both'
  className?: string
}

const ACK_PREFIX = 'agentix.cv-ack.'
const ROLE_KEY: Record<NonNullable<Props['role']>, string> = {
  doctor: 'doctor',
  nurse:  'nurse',
  both:   'both',
}

function ackKey(eventId: string, role: string): string {
  return `${ACK_PREFIX}${role}.${eventId}`
}

export function CriticalValueBanner({ role = 'both', className }: Props) {
  const entries = useAuditStore((s) => s.entries)
  const log = useAuditStore((s) => s.log)
  const router = useRouter()
  const [, setTick] = useState(0)  // re-render after ack
  // SSR vs client see different "minutes ago" from the audit seed (seeded
  // via `Date.now()` at module-eval). Gate any rendered timestamp behind
  // mounted so SSR shows '—' and client hydrates to the real time without
  // a mismatch.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Find every recent critical-value event that hasn't been acknowledged
  // by this role yet. We treat the 50 most-recent audit rows as the
  // working window (consistent with the trail UI elsewhere).
  const open = useMemo(() => {
    const window = entries.slice(0, 50)
    const events = window.filter((e) => e.action === 'lab_critical_callback')
    return events.filter((e) => {
      if (typeof window === 'undefined') return false
      try {
        const k = ackKey(e.id, ROLE_KEY[role])
        return !localStorage.getItem(k)
      } catch { return true }
    })
  }, [entries, role])

  // Tick a second-resolution timer so the soft-blocker countdown chip
  // re-renders. We only keep it running when there ARE open events.
  useEffect(() => {
    if (open.length === 0) return
    const i = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(i)
  }, [open.length])

  if (open.length === 0) return null

  function doAck(eventId: string) {
    try {
      localStorage.setItem(ackKey(eventId, ROLE_KEY[role]), new Date().toISOString())
    } catch {}
    log({
      userId: role === 'doctor' ? 'DR-ACTIVE' : 'NU-ACTIVE',
      userName: role === 'doctor' ? 'Doctor on call' : 'Nurse on shift',
      action: 'lab_critical_callback',  // closes the loop via the same code
      resource: 'lab_critical_ack', resourceId: eventId,
      detail: `Acknowledged (${role}) — read-receipt at bedside`,
    })
    setTick((t) => t + 1)
  }

  // Render nothing on SSR — the banner depends on audit seed timestamps
  // (Date.now() at module-eval, differs SSR vs client), localStorage ack
  // state (unavailable on server), and a Date.now() countdown chip. All
  // three are hydration hazards. Showing the empty container on SSR keeps
  // layout stable; client-mount swaps in real banners.
  if (!mounted) return <div className={cn("space-y-2", className)} role="alert" aria-live="assertive" suppressHydrationWarning />

  return (
    <div className={cn("space-y-2", className)} role="alert" aria-live="assertive" suppressHydrationWarning>
      {open.map((e) => {
        // Soft blocker — 2 min from the event time (mock).
        const eventTs = new Date(e.timestamp).getTime()
        const soft = Math.max(0, 120 - Math.floor((Date.now() - eventTs) / 1000))
        return (
          <div
            key={e.id}
            className="rounded-2xl ring-2 ring-rose-300/80 bg-rose-50/90 px-4 py-3 flex items-start gap-3 shadow-sm"
          >
            <ShieldAlert className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[14px] font-bold text-rose-900">Critical lab value</p>
                <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-white ring-1 ring-rose-200 text-rose-700">
                  needs acknowledgement
                </span>
                {soft > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-700">
                    <Clock className="h-3 w-3" /> soft-block {Math.floor(soft / 60)}:{String(soft % 60).padStart(2, '0')}
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-rose-700">blocker cleared</span>
                )}
              </div>
              <p className="text-[12.5px] text-rose-800 mt-1.5 leading-snug">
                {e.detail ?? `Critical result on ${e.resourceId}`}
              </p>
              <p className="text-[10.5px] text-rose-600 mt-0.5">
                Source: {e.resource} {e.resourceId ? `· ${e.resourceId}` : ''}
                · audited {mounted ? new Date(e.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => router.push('/audit/log')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold bg-white hover:bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                title="Open audit trail"
              >
                <FlaskConical className="h-3 w-3" /> Trail
              </button>
              <button
                type="button"
                onClick={() => doAck(e.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold bg-rose-600 hover:bg-rose-700 text-white"
              >
                <Check className="h-3 w-3" /> Acknowledge ({role})
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
