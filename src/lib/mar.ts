import type { Inpatient, MarRecord } from "@/store/useInpatientStore"

// Derive the day's Medication Administration Record (MAR) from the doctor's
// active orders. Each order is expanded into scheduled dose slots by frequency;
// continuous infusions and PRN orders are special-cased. The nurse's
// administration records (given/held) are matched against these slots so status
// is fully computed — the MAR always reflects the live prescription.

export type MarKind = "scheduled" | "continuous" | "prn"
export type MarStatus = "given" | "held" | "missed" | "due" | "scheduled" | "running" | "prn"

export type MarSlot = {
  key: string
  patientId: string
  patientName: string
  bed: string
  ward: string
  medName: string
  dose: string
  route: string
  freq: string
  slot: string          // 'HH:MM' | 'Continuous' | 'PRN'
  kind: MarKind
  scheduledMin?: number // minutes-of-day, for scheduled slots
}

const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m }

// Frequency string → schedule. Order matters (check specific patterns first).
function parseSchedule(freq: string): { kind: MarKind; slots: string[] } {
  const f = freq.toLowerCase()
  if (/infus|continuous|titrat|drip/.test(f)) return { kind: "continuous", slots: [] }
  if (/prn|sos|as needed|as required/.test(f)) return { kind: "prn", slots: [] }
  if (/(night|hs|nocte)/.test(f) && /(od|once|daily)/.test(f)) return { kind: "scheduled", slots: ["22:00"] }
  if (/q6h|6 ?hourly/.test(f)) return { kind: "scheduled", slots: ["00:00", "06:00", "12:00", "18:00"] }
  if (/q8h|8 ?hourly/.test(f)) return { kind: "scheduled", slots: ["06:00", "14:00", "22:00"] }
  if (/q12h|12 ?hourly/.test(f)) return { kind: "scheduled", slots: ["08:00", "20:00"] }
  if (/qid|q4|4 ?times/.test(f)) return { kind: "scheduled", slots: ["06:00", "12:00", "18:00", "22:00"] }
  if (/tds|tid|thrice|3 ?times/.test(f)) return { kind: "scheduled", slots: ["08:00", "14:00", "20:00"] }
  if (/bd|bid|twice/.test(f)) return { kind: "scheduled", slots: ["08:00", "20:00"] }
  if (/od|once|daily|hs|nocte/.test(f)) return { kind: "scheduled", slots: ["08:00"] }
  return { kind: "scheduled", slots: ["08:00"] }
}

export function buildMar(inpatients: Inpatient[]): MarSlot[] {
  const out: MarSlot[] = []
  for (const ip of inpatients) {
    if (ip.stage === "discharged") continue
    for (const m of ip.meds) {
      if (m.status !== "active") continue
      const base = { patientId: ip.patientId, patientName: ip.name, bed: ip.bed, ward: ip.ward, medName: m.name, dose: m.dose, route: m.route, freq: m.freq }
      const { kind, slots } = parseSchedule(m.freq)
      if (kind === "continuous") out.push({ ...base, key: `${ip.patientId}|${m.name}|cont`, slot: "Continuous", kind })
      else if (kind === "prn") out.push({ ...base, key: `${ip.patientId}|${m.name}|prn`, slot: "PRN", kind })
      else slots.forEach(s => out.push({ ...base, key: `${ip.patientId}|${m.name}|${s}`, slot: s, kind, scheduledMin: toMin(s) }))
    }
  }
  return out
}

// Resolve the live status of a slot from administration records + clock.
// A scheduled dose unadministered >3h past its time is treated as missed.
export function slotStatus(slot: MarSlot, recs: MarRecord[] | undefined, nowMin: number): { status: MarStatus; rec?: MarRecord } {
  const rec = (recs ?? []).find(r => r.medName === slot.medName && r.slot === slot.slot)
  if (rec) return { status: rec.action, rec }
  if (slot.kind === "continuous") return { status: "running" }
  if (slot.kind === "prn") return { status: "prn" }
  const delta = nowMin - (slot.scheduledMin ?? 0)
  if (delta < 0) return { status: "scheduled" }
  if (delta <= 180) return { status: "due" }
  return { status: "missed" }
}
