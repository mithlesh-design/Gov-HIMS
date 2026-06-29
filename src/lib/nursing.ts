import { latestVitalsRecord, type Inpatient } from "@/store/useInpatientStore"
import { news2FromRecord } from "@/lib/vitals"
import { buildMar, slotStatus } from "@/lib/mar"
import { buildOrders } from "@/lib/orders"
import type { NurseTask } from "@/store/useNursingStore"

type SuggestedTask = Omit<NurseTask, "id" | "createdAt" | "done">

// AI shift-list builder: derives nursing tasks from the live ward — acuity-driven
// monitoring/assessment, due medications, and pending doctor orders. Each task
// carries a stable `key` so re-running doesn't duplicate.
export function suggestTasks(inpatients: Inpatient[], nowMin: number): SuggestedTask[] {
  const out: SuggestedTask[] = []
  for (const ip of inpatients) {
    if (ip.stage === "discharged") continue
    const acuityHigh = ip.condition === "Critical" || ip.condition === "Serious"
    const base = { patientId: ip.patientId, patientName: ip.name, source: "ai" as const }

    const rec = latestVitalsRecord(ip)
    const news = rec ? news2FromRecord(rec) : undefined
    if (news && news.band !== "low") {
      out.push({ ...base, key: `ai:${ip.patientId}:vitals`, title: `Recheck vitals — NEWS ${news.score} (${news.band})`, category: "Vitals", priority: news.band === "high" ? "High" : "Medium" })
    }
    if (ip.condition === "Critical") {
      out.push({ ...base, key: `ai:${ip.patientId}:assess`, title: "Focused assessment — critical patient", category: "Assessment", priority: "High" })
    }

    const mar = buildMar([ip])
    const dueCount = mar.filter(slot => { const st = slotStatus(slot, ip.mar, nowMin).status; return st === "due" || st === "missed" }).length
    if (dueCount > 0) {
      out.push({ ...base, key: `ai:${ip.patientId}:meds`, title: `Administer ${dueCount} due medication${dueCount > 1 ? "s" : ""}`, category: "Medication", priority: acuityHigh ? "High" : "Medium" })
    }

    const orders = buildOrders([ip])
    if (orders.length > 0) {
      out.push({ ...base, key: `ai:${ip.patientId}:orders`, title: `Action ${orders.length} pending doctor order${orders.length > 1 ? "s" : ""}`, category: "Procedure", priority: orders.some(o => o.urgency === "high") ? "High" : "Medium" })
    }
  }
  // High priority first
  const rank = { High: 0, Medium: 1, Low: 2 } as const
  return out.sort((a, b) => rank[a.priority] - rank[b.priority])
}

// Realistic sample used by the "Dictate" control (voice capture is simulated in
// this environment; in production this would be the speech-to-text transcript).
export const SAMPLE_DICTATION =
  "Patient reports mild chest discomfort rated 3 out of 10. Administered prescribed analgesia and repositioned for comfort. Encouraged deep breathing. Patient tolerated well and is now resting comfortably with stable vitals."

const INTERVENTION = /\b(gave|administered|repositioned|assisted|changed|cleaned|inserted|removed|encouraged|educated|provided|started|flushed|suctioned|dressed|ambulated)\b/i
const RESPONSE = /\b(tolerated|improved|stable|settled|responded|comfortable|comfortably|no distress|denies|relief|reduced|resolved|resting)\b/i

// "AI structuring": turn a free-text dictation into a structured nursing note
// (Assessment / Intervention / Response), grounded only in what was said.
export function structureNote(raw: string, patientName: string): string {
  const sentences = raw.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean)
  const assessment: string[] = [], intervention: string[] = [], response: string[] = []
  for (const s of sentences) {
    if (RESPONSE.test(s)) response.push(s)
    else if (INTERVENTION.test(s)) intervention.push(s)
    else assessment.push(s)
  }
  const lines = [`Nursing note — ${patientName}`]
  if (assessment.length) lines.push(`Assessment: ${assessment.join(" ")}`)
  if (intervention.length) lines.push(`Intervention: ${intervention.join(" ")}`)
  if (response.length) lines.push(`Response & plan: ${response.join(" ")}`)
  if (lines.length === 1) lines.push(raw.trim())
  return lines.join("\n")
}
