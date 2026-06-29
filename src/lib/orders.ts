import type { Inpatient, Condition } from "@/store/useInpatientStore"

// Derive the nurse's "orders to action" queue from the doctor's live orders on
// the shared record. Anything the doctor adds (tests, new meds, IV lines,
// referrals, ICU transfers, OT bookings) surfaces here until the nurse
// acknowledges it. Priority is an AI blend of order urgency + patient acuity.

export type OrderKind = "test" | "med" | "iv" | "referral" | "icu" | "ot"
export type OrderUrgency = "high" | "medium" | "low"

export type NurseOrder = {
  key: string
  patientId: string
  patientName: string
  ward: string
  bed: string
  condition: Condition
  kind: OrderKind
  label: string          // the action the nurse must take (imperative)
  detail?: string
  requestedBy: string    // the ordering doctor
  urgency: OrderUrgency
  at: string
  aiReason: string
}

const hoursSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3600000
const condBump = (c: Condition) => (c === "Critical" ? 2 : c === "Serious" ? 1 : 0)
const band = (score: number): OrderUrgency => (score >= 3 ? "high" : score >= 2 ? "medium" : "low")

export function buildOrders(inpatients: Inpatient[]): NurseOrder[] {
  const out: NurseOrder[] = []
  for (const ip of inpatients) {
    if (ip.stage === "discharged") continue
    const ack = new Set(ip.nurseAck ?? [])
    const base = { patientId: ip.patientId, patientName: ip.name, ward: ip.ward, bed: ip.bed, condition: ip.condition, requestedBy: ip.admittingDoctor }
    const push = (key: string, kind: OrderKind, label: string, points: number, at: string, detail?: string) => {
      if (ack.has(key)) return
      const score = points + condBump(ip.condition)
      const urgency = band(score)
      const aiReason = urgency === "high"
        ? `Prioritised — ${ip.condition === "Critical" || ip.condition === "Serious" ? `${ip.condition.toLowerCase()} patient` : "time-critical order"}`
        : urgency === "medium" ? "Action this shift" : "Routine — action when able"
      out.push({ ...base, key, kind, label, detail, urgency, at, aiReason })
    }

    // Investigations the doctor ordered but the ward hasn't arranged yet.
    for (const t of ip.tests) {
      if (t.status !== "Ordered") continue
      push(`test:${t.id}`, "test", `Arrange ${t.name}`, t.priority === "Urgent" ? 2 : 1, t.orderedAt, t.priority === "Urgent" ? "Urgent" : "Routine")
    }
    // Newly started medications — verify and add to the MAR.
    for (const m of ip.meds) {
      if (m.status !== "active" || hoursSince(m.startedAt) > 4) continue
      push(`med:${m.name}:${m.startedAt}`, "med", `New order — ${m.name} ${m.dose}`, 1, m.startedAt, `${m.freq} · ${m.route}`)
    }
    // Recently started IV lines — set up / verify / document.
    for (const l of ip.ivLines ?? []) {
      if (hoursSince(l.startedAt) > 6) continue
      push(`iv:${l.id}`, "iv", `Verify IV line — ${l.fluid}`, 1, l.startedAt, l.rate)
    }
    for (const r of ip.referrals ?? []) {
      if (r.status !== "sent") continue
      push(`ref:${r.id}`, "referral", `Coordinate referral — ${r.specialty}`, r.urgent ? 2 : 1, r.at, r.reason)
    }
    if (ip.icuTransfer && ip.icuTransfer.status === "requested") {
      push(`icu:${ip.icuTransfer.id}`, "icu", "Prepare ICU transfer", 3, ip.icuTransfer.at, ip.icuTransfer.reason)
    }
    if (ip.otBooking && ip.otBooking.status === "requested") {
      push(`ot:${ip.otBooking.id}`, "ot", `Pre-op prep — ${ip.otBooking.procedure}`, 2, ip.otBooking.scheduledAt, `${ip.otBooking.surgeon} · ${ip.otBooking.ot}`)
    }
  }
  const rank: Record<OrderUrgency, number> = { high: 0, medium: 1, low: 2 }
  return out.sort((a, b) => (rank[a.urgency] - rank[b.urgency]) || a.at.localeCompare(b.at))
}
