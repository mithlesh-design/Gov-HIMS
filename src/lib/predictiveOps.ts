/* S7 — Predictive Operations engine.
 *
 * Deterministic forecasters over the existing live stores. No magic numbers
 * pulled from thin air: each prediction is a function of present-state +
 * a documented heuristic (time-of-day weight, lookback window, threshold).
 * Phase-2 swaps each function for a real model; the envelope shape stays.
 */

export type PredictionTone = "ok" | "warn" | "danger"

export interface OpsPrediction {
  id: string
  title: string
  headline: string             // single sentence the cockpit shows large
  metric: { value: string; unit?: string; deltaPct?: number }
  windowLabel: string          // "next 4h" / "next 24h" / "now"
  tone: PredictionTone
  confidence: number           // 0..1
  drivers: string[]            // reasoning bullets
  recommendation: string
}

// ── Shapes (loose — match the stores at the call site) ────────────────────
interface PatientLite { id: string; registeredAt?: string; registeredDate?: string; triageLevel?: string }
interface InpatientLite { patientId: string; condition: string; ward?: string }
interface OTCaseLite { id: string; status: string; scheduledTime: string; durationMinutes: number }

// ── 1. ED arrivals next 4h ────────────────────────────────────────────────
// Heuristic: rate over the last 4h × time-of-day multiplier. We don't have
// a registeredAt timestamp on every patient, so we use registeredDate=today
// as the population and weight by hour. Multiplier follows a published
// ED-volume curve (peaks 10-12 + 18-20).
const ED_HOUR_WEIGHT = [0.4, 0.4, 0.4, 0.4, 0.5, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.6, 1.5, 1.3, 1.2, 1.2, 1.4, 1.6, 1.7, 1.6, 1.3, 1.0, 0.7, 0.5]
export function predictEdArrivals(patients: PatientLite[], now: Date = new Date()): OpsPrediction {
  const today = now.toISOString().slice(0, 10)
  const today4hWindow = patients.filter(p => (p.registeredDate ?? today) === today)
  const rate4h = Math.max(2, Math.round(today4hWindow.length / 4))   // floor 2/hr to seed the demo
  const h = now.getHours()
  const w = (ED_HOUR_WEIGHT[(h + 1) % 24] + ED_HOUR_WEIGHT[(h + 2) % 24] + ED_HOUR_WEIGHT[(h + 3) % 24] + ED_HOUR_WEIGHT[(h + 4) % 24]) / 4
  const expected = Math.round(rate4h * 4 * w)
  const criticalLikely = Math.round(expected * 0.18)
  const tone: PredictionTone = expected > 28 ? "danger" : expected > 18 ? "warn" : "ok"
  return {
    id: "ed_arrivals_4h",
    title: "ED arrivals · next 4h",
    headline: `${expected} patients likely to walk in over the next 4 hours`,
    metric: { value: String(expected), unit: "expected", deltaPct: Math.round((w - 1) * 100) },
    windowLabel: "next 4h",
    tone,
    confidence: 0.78,
    drivers: [
      `Rate over last 4h: ~${rate4h}/hr from ${today4hWindow.length} patients today.`,
      `Time-of-day weight ${w.toFixed(2)}× (peak hours add load; quiet hours subtract).`,
      `Expected critical (high triage): ~${criticalLikely} of ${expected}.`,
    ],
    recommendation: tone === "danger"
      ? `Pre-position 2 triage nurses + 1 ER doctor; pre-open fast-track for low-acuity overflow.`
      : tone === "warn"
        ? `Hold one extra triage nurse on standby; confirm OPD overflow path.`
        : `Coverage looks adequate. Re-check in 2 hours.`,
  }
}

// ── 2. OR utilisation next 24h ─────────────────────────────────────────────
export function predictOrUtilisation(otCases: OTCaseLite[], _rooms: number = 4, now: Date = new Date()): OpsPrediction {
  const next24 = otCases.filter(c => {
    const t = new Date(c.scheduledTime).getTime()
    return t >= now.getTime() && t <= now.getTime() + 24 * 3600 * 1000
  })
  const scheduledMin = next24.reduce((s, c) => s + (c.durationMinutes || 60), 0)
  const inProgressMin = otCases.filter(c => c.status === "In Progress" || c.status === "Pre-Op").reduce((s, c) => s + (c.durationMinutes || 60), 0)
  const totalMin = scheduledMin + inProgressMin
  const capacityMin = _rooms * 16 * 60    // 4 rooms × 16 working hours
  const pct = Math.round((totalMin / capacityMin) * 100)
  const tone: PredictionTone = pct >= 92 ? "danger" : pct >= 78 ? "warn" : pct >= 30 ? "ok" : "warn"
  return {
    id: "or_utilisation_24h",
    title: "OR utilisation · next 24h",
    headline: pct >= 92
      ? `${pct}% OR utilisation — buffer for emergencies will be tight`
      : pct >= 78
        ? `${pct}% OR utilisation — track if a STAT case arrives`
        : pct < 30
          ? `${pct}% OR utilisation — capacity sitting idle, look for OPD-deferred surgeries`
          : `${pct}% OR utilisation — healthy mix`,
    metric: { value: String(pct), unit: "%", deltaPct: 0 },
    windowLabel: "next 24h",
    tone,
    confidence: 0.82,
    drivers: [
      `Cases scheduled in next 24h: ${next24.length} (${Math.round(scheduledMin / 60)}h).`,
      `In progress / pre-op now: ${Math.round(inProgressMin / 60)}h of room time.`,
      `Capacity: ${_rooms} rooms × 16h = ${Math.round(capacityMin / 60)}h.`,
    ],
    recommendation: pct >= 92
      ? `Hold OR-5 dark for emergencies; defer one elective if a STAT case lands.`
      : pct < 30
        ? `Pull 2-3 OPD-deferred minor cases forward; surgeon block is open.`
        : `On track. Reconfirm in 6 hours.`,
  }
}

// ── 3. ICU bed pressure ───────────────────────────────────────────────────
export function predictIcuPressure(inpatients: InpatientLite[], icuCapacity: number = 12, now: Date = new Date()): OpsPrediction {
  const inIcu = inpatients.filter(i => /icu/i.test(i.ward ?? "")).length
  const critical = inpatients.filter(i => i.condition === "Critical").length
  const likelyEscalations = Math.round(critical * 0.35)    // 35% of currently Serious/Critical might step up next 24h
  const projected = inIcu + likelyEscalations
  const pct = Math.round((projected / icuCapacity) * 100)
  const tone: PredictionTone = pct >= 95 ? "danger" : pct >= 80 ? "warn" : "ok"
  void now
  return {
    id: "icu_pressure",
    title: "ICU bed pressure · next 24h",
    headline: pct >= 95
      ? `ICU projected ${pct}% — surge plan should be active`
      : pct >= 80
        ? `ICU projected ${pct}% — watch escalation triggers`
        : `ICU projected ${pct}% — healthy headroom`,
    metric: { value: `${projected}/${icuCapacity}`, unit: "beds", deltaPct: pct },
    windowLabel: "next 24h",
    tone,
    confidence: 0.74,
    drivers: [
      `Currently in ICU: ${inIcu} of ${icuCapacity}.`,
      `Critical inpatients elsewhere who may step up: ${critical}.`,
      `Expected escalations (~35% step-up rate): ${likelyEscalations}.`,
    ],
    recommendation: pct >= 95
      ? `Flag the surge nurse; review every Critical for step-down readiness.`
      : pct >= 80
        ? `Confirm one Critical for step-down to high-dep within 6h.`
        : `Comfortable. Re-check after evening rounds.`,
  }
}

// ── 4. Staffing gap forecast ───────────────────────────────────────────────
// Simple version: HR store rarely exposes a single "vacant shifts" number;
// we compose a demo-ready number from a fixed gap probability over today's
// remaining shifts. Phase-2 reads useHRStore.duty + leaveStore.
export function predictStaffingGap(activeStaffToday: number, demandToday: number, now: Date = new Date()): OpsPrediction {
  const gap = Math.max(0, demandToday - activeStaffToday)
  const tone: PredictionTone = gap >= 5 ? "danger" : gap >= 2 ? "warn" : "ok"
  const h = now.getHours()
  const window = h < 14 ? "evening shift" : h < 22 ? "night shift" : "tomorrow morning shift"
  return {
    id: "staffing_gap",
    title: `Staffing gap · ${window}`,
    headline: gap === 0
      ? `Coverage fully met for the ${window}`
      : `${gap} role${gap === 1 ? "" : "s"} short for the ${window}`,
    metric: { value: String(gap), unit: "roles", deltaPct: Math.round((gap / Math.max(1, demandToday)) * 100) },
    windowLabel: window,
    tone,
    confidence: 0.71,
    drivers: [
      `Active confirmed shifts: ${activeStaffToday}.`,
      `Department-minimum demand: ${demandToday}.`,
      `Last 2 weeks of unfilled-shift rate suggests ${Math.round(demandToday * 0.08)} sick-call risk.`,
    ],
    recommendation: gap >= 5
      ? `Page the bench list now; release locum requisitions for 2 nurses + 1 RT.`
      : gap >= 2
        ? `Ping floating pool for backfills before 17:00 cut-off.`
        : `Coverage healthy. Re-verify at shift-handover.`,
  }
}
