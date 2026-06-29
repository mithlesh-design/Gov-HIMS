import { latestVitalsRecord, type Inpatient } from "@/store/useInpatientStore"
import { news2FromRecord } from "@/lib/vitals"
import { buildMar, slotStatus } from "@/lib/mar"
import { buildOrders } from "@/lib/orders"
import { deterioration, newsTrendVitals } from "@/lib/escalation"
import { fluidBalance } from "@/lib/fluids"

// AI end-of-shift handover, auto-compiled from the live ward (the same shared
// records the doctor writes). Each patient becomes an SBAR; the recommendation is
// grounded in real pending work (due meds, open orders, fluid balance, acuity).

export type HandoverPatient = {
  patientId: string
  name: string
  bed: string
  ward: string
  condition: string
  urgent: boolean
  situation: string
  background: string
  assessment: string
  recommendation: string
}

export type WardHandover = {
  ward: string
  at: string
  patients: HandoverPatient[]
}

export function buildWardHandover(inpatients: Inpatient[], nowMin: number): WardHandover {
  const active = inpatients.filter(i => i.stage !== "discharged")
  const patients: HandoverPatient[] = active.map(ip => {
    const rec = latestVitalsRecord(ip)
    const news = rec ? news2FromRecord(rec) : undefined
    const det = deterioration(ip)
    const trend = newsTrendVitals(ip).map(t => t.score).join("→") || "n/a"
    const vit = rec
      ? `HR ${rec.hr ?? "—"}, BP ${rec.systolicBP ?? "—"}/${rec.diastolicBP ?? "—"}, RR ${rec.rr ?? "—"}, SpO₂ ${rec.spo2 ?? "—"}%, Temp ${rec.temp ?? "—"}°F`
      : "vitals pending"

    const dueMeds = buildMar([ip]).filter(s => { const st = slotStatus(s, ip.mar, nowMin).status; return st === "due" || st === "missed" }).length
    const openOrders = buildOrders([ip]).length
    const bal = fluidBalance(ip.io)
    const runningIv = (ip.ivLines ?? []).filter(l => l.status === "Running").map(l => l.fluid)

    const recItems: string[] = []
    if (dueMeds > 0) recItems.push(`${dueMeds} medication${dueMeds > 1 ? "s" : ""} due`)
    if (openOrders > 0) recItems.push(`${openOrders} doctor order${openOrders > 1 ? "s" : ""} to action`)
    if (runningIv.length) recItems.push(`IV running: ${runningIv.join(", ")}`)
    if (bal.intake + bal.output > 0) recItems.push(`fluid balance ${bal.net > 0 ? "+" : ""}${bal.net} mL`)
    if (ip.condition === "Discharge-ready") recItems.push("fit for discharge — complete TTO + paperwork")
    if (news?.band === "high") recItems.push("continue close monitoring; escalate if NEWS rises")

    return {
      patientId: ip.patientId, name: ip.name, bed: ip.bed, ward: ip.ward, condition: ip.condition,
      urgent: ip.condition === "Critical" || news?.band === "high",
      situation: `${ip.ward} bed ${ip.bed}, ${ip.gender}, ${ip.age}y. ${ip.diagnosis}. NEWS ${news?.score ?? "?"} (${news?.band ?? "?"}). ${vit}.`,
      background: `Admitted for ${ip.diagnosis}.${ip.comorbidities?.length ? ` PMH: ${ip.comorbidities.join(", ")}.` : ""} Allergies: ${ip.allergies?.join(", ") || "NKDA"}.`,
      assessment: `${det.reason}. NEWS trend ${trend}.`,
      recommendation: recItems.length ? recItems.join("; ") + "." : "Continue current plan; routine observations.",
    }
  })
  // Urgent patients first
  patients.sort((a, b) => Number(b.urgent) - Number(a.urgent))
  return { ward: "All wards", at: new Date().toISOString(), patients }
}
