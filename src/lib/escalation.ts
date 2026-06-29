import { useMessagingStore, DIRECTORY } from "@/store/useMessagingStore"
import { useNotificationStore } from "@/store/useNotificationStore"
import { useInpatientStore, latestVitalsRecord, type Inpatient } from "@/store/useInpatientStore"
import { news2FromRecord, type Band } from "@/lib/vitals"

// Early-warning escalation: NEWS trend off the unified vitals timeline, an
// AI-drafted SBAR, and a one-call `escalate` that pushes it to the doctor over
// the messaging bus + the notification bell + the patient's chart.

const NURSE_ID = "NR-402"

export function newsTrendVitals(ip: Inpatient): { at: string; score: number }[] {
  return (ip.vitals ?? []).slice().sort((a, b) => a.at.localeCompare(b.at)).map(r => ({ at: r.at, score: news2FromRecord(r).score }))
}

export function trendArrow(trend: { score: number }[]): "↑" | "↓" | "→" {
  if (trend.length < 2) return "→"
  const a = trend[trend.length - 2].score, b = trend[trend.length - 1].score
  return b > a ? "↑" : b < a ? "↓" : "→"
}

export type Deterioration = { band: Band; score: number; rising: boolean; reason: string }

export function deterioration(ip: Inpatient): Deterioration {
  const rec = latestVitalsRecord(ip)
  const news = rec ? news2FromRecord(rec) : { score: 0, band: "low" as Band, drivers: [], partial: true }
  const trend = newsTrendVitals(ip)
  const rising = trend.length >= 2 && trend[trend.length - 1].score > trend[trend.length - 2].score
  const criticalResult = ip.tests.some(t => t.critical && t.status === "Ready")
  let reason = "Stable on current observations"
  if (news.band === "high") reason = `High NEWS ${news.score}${news.drivers[0] ? ` — ${news.drivers[0]}` : ""}`
  else if (criticalResult) reason = "Critical investigation result outstanding"
  else if (rising) reason = `Rising NEWS trend (${trend.map(t => t.score).join("→")})`
  else if (news.band === "medium") reason = `NEWS ${news.score} — increased monitoring`
  return { band: news.band, score: news.score, rising, reason }
}

// AI-drafted SBAR grounded in the patient's real record.
export function buildSBAR(ip: Inpatient): string {
  const rec = latestVitalsRecord(ip)
  const news = rec ? news2FromRecord(rec) : undefined
  const det = deterioration(ip)
  const vit = rec
    ? `HR ${rec.hr ?? "—"}, BP ${rec.systolicBP ?? "—"}/${rec.diastolicBP ?? "—"}, RR ${rec.rr ?? "—"}, SpO₂ ${rec.spo2 ?? "—"}%${rec.o2Delivery && rec.o2Delivery !== "Room air" ? ` on ${rec.o2Delivery}` : ""}, Temp ${rec.temp ?? "—"}°F`
    : "vitals pending"
  const trend = newsTrendVitals(ip).map(t => t.score).join("→") || "n/a"
  const S = `S: ${ip.name}, ${ip.age}${ip.gender[0]}, ${ip.ward} bed ${ip.bed}. NEWS ${news?.score ?? "?"} (${news?.band ?? "?"}). ${vit}.`
  const B = `B: Admitted for ${ip.diagnosis}.${ip.comorbidities?.length ? ` PMH: ${ip.comorbidities.join(", ")}.` : ""} Allergies: ${ip.allergies?.join(", ") || "NKDA"}.`
  const A = `A: ${det.reason}. NEWS trend ${trend}.${ip.tests.some(t => t.critical && t.status === "Ready") ? " Critical result flagged." : ""}`
  const R = `R: Request urgent medical review. ${det.band === "high" ? "Consider ICU / senior input and escalation of treatment." : "Recommend reassessment and review of the plan."}`
  return `AI-SBAR — ${ip.name}\n${S}\n${B}\n${A}\n${R}`
}

const docIdFor = (ip: Inpatient) => DIRECTORY.find(c => c.role === "doctor" && c.name === ip.admittingDoctor)?.id ?? "DR-1012"

// Push an escalation to the doctor: SBAR over the messaging bus + critical
// notification + a chart event. Returns the SBAR sent.
export function escalate(ip: Inpatient): { sbar: string; doctor: string } {
  const sbar = buildSBAR(ip)
  const det = deterioration(ip)
  const docId = docIdFor(ip)
  useMessagingStore.getState().startConversation(NURSE_ID, docId, sbar)
  useNotificationStore.getState().add({
    type: "deterioration", priority: "critical",
    title: `Deterioration — ${ip.name}`,
    body: `${det.reason}. AI-SBAR sent to ${ip.admittingDoctor}.`,
    targetRole: "doctor", patientName: ip.name, channels: ["in_app"],
  })
  useInpatientStore.getState().logEvent(ip.patientId, {
    type: "condition_change", actor: "Nurse",
    title: "Escalated to doctor — AI-SBAR sent", detail: det.reason,
    severity: "critical", patientText: "Your nurse alerted the doctor to review you promptly.",
  })
  return { sbar, doctor: ip.admittingDoctor }
}
