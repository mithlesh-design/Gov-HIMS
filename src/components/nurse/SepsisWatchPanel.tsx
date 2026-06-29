"use client"

import { useState } from "react"
import { Bot, Loader2, Siren, CheckCircle2, ListChecks } from "lucide-react"
import { HitlReviewCard } from "@/components/features/HitlReviewCard"
import { monitorSepsisMarkers, type SepsisAlert } from "@/ai-services/sepsis-alert"
import type { AiEnvelope } from "@/types/ai"
import { useNotificationStore } from "@/store/useNotificationStore"
import { toast } from "sonner"

// Track B — surfaces the (stubbed) sepsis-alert AI at the nurse station.
// Screens vitals against Sepsis-3 qSOFA criteria; on accept it pages the
// doctor + ICU bed manager to activate the Sepsis-6 bundle. Decisions are
// audit-logged by HitlReviewCard.

export function SepsisWatchPanel({ patientName }: { patientName?: string }) {
  const [env, setEnv] = useState<AiEnvelope<SepsisAlert> | null>(null)
  const [loading, setLoading] = useState(false)
  const addNotif = useNotificationStore(s => s.add)

  const run = async () => {
    setLoading(true)
    setEnv(await monitorSepsisMarkers({}))
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <button
        onClick={run}
        disabled={loading}
        aria-busy={loading}
        className="flex items-center gap-2 px-3.5 py-2 bg-rose-600 text-white text-[13px] font-semibold rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Bot className="h-4 w-4" aria-hidden="true" />}
        {loading ? 'Screening…' : 'Run sepsis screen'}
      </button>

      {env && (
        <HitlReviewCard
          envelope={env}
          title="AI Sepsis Watch (qSOFA)"
          featureId="sepsis-alert"
          renderContent={(d) => (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={d.isSepsisAlert
                  ? "inline-flex items-center gap-1 text-[11px] font-bold uppercase bg-rose-600 text-white px-2 py-0.5 rounded"
                  : "inline-flex items-center gap-1 text-[11px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded"}>
                  <Siren className="h-3 w-3" />{d.isSepsisAlert ? 'Sepsis alert' : 'No alert'}
                </span>
                <span className="text-[13px] font-bold text-slate-900">qSOFA {d.qSofaScore}/3</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Triggering criteria</p>
                <ul className="space-y-0.5">
                  {d.triggeringCriteria.map((c, i) => (
                    <li key={i} className="text-[12px] text-slate-700 flex items-start gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />{c}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1"><ListChecks className="h-3 w-3" />Immediate actions (Sepsis-6)</p>
                <ul className="space-y-0.5">
                  {d.immediateActions.map((a, i) => (
                    <li key={i} className="text-[12px] text-slate-700 flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />{a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          onAccept={(d) => {
            addNotif({
              type: 'critical_value', priority: 'critical',
              title: 'Sepsis bundle activated',
              body: `${patientName ? `${patientName} — ` : ''}qSOFA ${d.qSofaScore}/3. Initiate Sepsis-6: ${d.immediateActions.slice(0, 3).join('; ')}.`,
              targetRole: 'doctor', patientName, channels: ['in_app'],
            })
            addNotif({
              type: 'bed_request', priority: 'critical',
              title: 'ICU escalation — sepsis',
              body: `${patientName ? `${patientName} — ` : ''}sepsis bundle activated. ICU bed likely required.`,
              targetRole: 'bed_manager', patientName, channels: ['in_app'],
            })
            toast.success('Sepsis-6 activated — doctor & ICU paged')
            setEnv(null)
          }}
          onReject={() => setEnv(null)}
        />
      )}
    </div>
  )
}
