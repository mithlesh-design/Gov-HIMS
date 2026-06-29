"use client"

import { useState } from "react"
import { usePatientStore, type Patient } from "@/store/usePatientStore"
import { usePatientProfileStore, type PatientProfile } from "@/store/usePatientProfileStore"
import { VitalsForm } from "@/components/nurse/VitalsForm"
import { FirstVisitWizard } from "@/components/nurse/FirstVisitWizard"
import { news2FromRecord } from "@/lib/vitals"
import { Card } from "@/components/ui/card"
import { StatusPill, type Status } from "@/components/ui/StatusPill"
import { EmptyState } from "@/components/ui/EmptyState"
import { motion, AnimatePresence } from "framer-motion"
import { HeartPulse, Clock, Stethoscope, AlertTriangle, Sparkles, CheckCircle2, UserPlus } from "lucide-react"
import { toast } from "sonner"

const NURSE = "Anjali Desai"

const TRIAGE_RANK: Record<string, number> = { Critical: 3, High: 2, Medium: 1, Low: 0 }

// Triage acuity → clinical status token (inline, not a colour map).
const triageStatus = (t?: string): Status =>
  t === "Critical" ? "critical" : t === "High" ? "urgent" : t === "Medium" ? "caution" : "neutral"

export default function VitalsRequestsPage() {
  const patients = usePatientStore(s => s.patients)
  const recordOpdVitals = usePatientStore(s => s.recordOpdVitals)
  const profiles = usePatientProfileStore(s => s.profiles)
  const saveProfile = usePatientProfileStore(s => s.saveProfile)
  const [editing, setEditing] = useState<Patient | null>(null)
  const profileDone = (id: string) => !!profiles[id]?.completedAt

  // Queue = patients reception sent for vitals, auto-prioritised by acuity then arrival order.
  const queue = patients
    .filter(p => p.queueStatus === "vitals")
    .sort((a, b) => (TRIAGE_RANK[b.triageLevel ?? "Low"] - TRIAGE_RANK[a.triageLevel ?? "Low"]) || (a.token - b.token))

  const advanceToast = (p: Patient, rec: Parameters<typeof recordOpdVitals>[1]) => {
    const news = news2FromRecord(rec)
    if (news.band === "high") toast.error(`${p.name} → doctor's queue · NEWS ${news.score} — fast-track, high acuity`)
    else if (news.band === "medium") toast.warning(`${p.name} → doctor's queue · NEWS ${news.score} — prioritise review`)
    else toast.success(`${p.name} → doctor's queue · NEWS ${news.score} — routine`)
  }

  // Returning patient: just record vitals.
  const handleSave = (p: Patient, rec: Parameters<typeof recordOpdVitals>[1]) => {
    recordOpdVitals(p.id, rec)
    advanceToast(p, rec)
  }

  // First visit: save the completed profile, then record vitals (advances to consulting).
  const handleComplete = (p: Patient, data: { profile: PatientProfile; vitals: Parameters<typeof recordOpdVitals>[1] }) => {
    saveProfile(p.id, data.profile, NURSE)
    recordOpdVitals(p.id, data.vitals)
    toast.success(`Profile completed for ${p.name}`)
    advanceToast(p, data.vitals)
  }

  const wizardInitial = (p: Patient): Partial<PatientProfile> => ({
    payerType: p.insurer ? "Insurance" : undefined, insurer: p.insurer,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="t-body text-foreground-lighter">OPD patients sent by reception for vitals before consultation</p>
        <div className="flex items-center gap-2 text-xs font-semibold text-primary bg-accent-soft border border-primary/20 rounded-full px-3 py-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Auto-prioritised by acuity · {queue.length} waiting
        </div>
      </div>

      {queue.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No vitals requests"
          description="When reception sends a patient for vitals, they appear here."
          size="sm"
        />
      ) : (
        <div className="space-y-3">
          {queue.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="p-5 u-lift">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-12 w-12 rounded-2xl bg-success-bg border border-success/20 flex items-center justify-center flex-shrink-0 font-bold text-sm text-success-strong tabular-nums">
                      #{p.token}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-foreground">{p.name}</h3>
                        <span className="text-xs text-foreground-placeholder">{p.age}y · {p.gender}</span>
                        <StatusPill status={triageStatus(p.triageLevel)} label={`${p.triageLevel ?? "Low"} acuity`} dense />
                      </div>
                      <p className="text-xs text-foreground-lighter mt-1 flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1"><Stethoscope className="h-3 w-3" /> {p.doctor}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.registeredAt}</span>
                        <span>{p.department}</span>
                      </p>
                      {p.symptoms.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                          {p.symptoms.map((s, j) => (
                            <span key={j} className="chip chip-neutral">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditing(p)}
                    className="u-press flex items-center gap-1.5 text-sm font-bold text-white bg-success hover:bg-success-strong px-4 py-2 rounded-xl shadow-xs cursor-pointer transition-colors flex-shrink-0"
                  >
                    {profileDone(p.id) ? <><HeartPulse className="h-4 w-4" /> Record Vitals</> : <><UserPlus className="h-4 w-4" /> Complete profile &amp; vitals</>}
                  </button>
                </div>
                {p.triageLevel === "Critical" || p.triageLevel === "High" ? (
                  <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-urgent">
                    <AlertTriangle className="h-3.5 w-3.5" /> Higher acuity — prioritise this patient
                  </div>
                ) : null}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editing && (profileDone(editing.id) ? (
          <VitalsForm
            title={editing.name}
            subtitle={`Token ${editing.token} · ${editing.department}`}
            priorRecords={editing.opdVitals ? [editing.opdVitals] : []}
            onClose={() => setEditing(null)}
            onSave={(rec) => handleSave(editing, rec)}
          />
        ) : (
          <FirstVisitWizard
            title={editing.name}
            subtitle={`Token ${editing.token} · ${editing.department}`}
            meta={{ age: editing.age, gender: editing.gender }}
            initial={wizardInitial(editing)}
            onClose={() => setEditing(null)}
            onComplete={(data) => handleComplete(editing, data)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
