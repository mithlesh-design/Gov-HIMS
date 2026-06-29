/* S8 — Revenue-Cycle Growth engine.
 *
 * Reads existing insurance + billing stores; surfaces growth levers each
 * with reasoning, an ₹-impact estimate, and a recommended single action.
 * Same envelope as predictiveOps — Phase-2 swaps the heuristics for ML.
 */

export type GrowthTone = "ok" | "warn" | "danger"

export interface GrowthFinding {
  id: string
  title: string
  headline: string
  metric: { value: string; unit?: string }
  impactInr: number          // estimated rupees of opportunity / recovery
  tone: GrowthTone
  confidence: number
  drivers: string[]
  recommendation: string
}

// ── Shapes (loose) ────────────────────────────────────────────────────────
interface ClaimLite {
  id: string
  status: "Pending Pre-Auth" | "Approved" | "Rejected" | "In Process"
  amount: number
  aiDenialRisk?: { score: number; reasons: string[] }
  submittedAt?: string
  submissionStatus?: string
  documents?: { status: string }[]
}
interface BillLite {
  id: string
  status: "draft" | "frozen" | "settled" | "dispute"
  subtotal: number
  patientDue: number
  insuranceCovered: number
  visitType: string
  dischargeDate?: string
}

const FMT_INR = (n: number) => '₹' + (n >= 100000 ? (n / 100000).toFixed(2) + 'L' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n))

// ── 1. Denial-risk heatmap — claims with score >= 50 ─────────────────────
export function findDenialRiskClaims(claims: ClaimLite[]): GrowthFinding {
  const atRisk = claims.filter(c => (c.aiDenialRisk?.score ?? 0) >= 50 && (c.status === "Pending Pre-Auth" || c.status === "In Process"))
  const exposure = atRisk.reduce((s, c) => s + c.amount, 0)
  const tone: GrowthTone = exposure > 500000 ? "danger" : exposure > 150000 ? "warn" : "ok"
  return {
    id: "denial_risk_heatmap",
    title: "Denial-risk exposure",
    headline: atRisk.length === 0
      ? `No active claims above denial-risk threshold`
      : `${atRisk.length} active claim${atRisk.length === 1 ? '' : 's'} flagged — ${FMT_INR(exposure)} at risk`,
    metric: { value: FMT_INR(exposure) },
    impactInr: exposure,
    tone,
    confidence: 0.82,
    drivers: [
      `Claims with AI denial-risk score ≥ 50: ${atRisk.length}.`,
      `Top driver across these claims: "${atRisk[0]?.aiDenialRisk?.reasons?.[0] ?? 'Document completeness'}"`,
      `Total claim value at risk: ${FMT_INR(exposure)}.`,
    ],
    recommendation: atRisk.length === 0
      ? `Maintain — re-score the queue after the next pre-auth batch.`
      : `Open the insurance dashboard, sort by risk-score desc, and clear the top 3 missing docs today.`,
  }
}

// ── 2. Days-in-AR — claims sitting In Process / Pending ───────────────────
export function findDaysInAr(claims: ClaimLite[], now: Date = new Date()): GrowthFinding {
  const open = claims.filter(c => c.status === "Pending Pre-Auth" || c.status === "In Process")
  const ages = open.map(c => {
    const t = c.submittedAt ? new Date(c.submittedAt).getTime() : (now.getTime() - 3 * 86400 * 1000)
    return Math.max(0, Math.round((now.getTime() - t) / 86400000))
  })
  const avgAge = ages.length ? Math.round(ages.reduce((s, n) => s + n, 0) / ages.length) : 0
  const over30 = open.filter((_, i) => ages[i] >= 30)
  const lockedValue = over30.reduce((s, c) => s + c.amount, 0)
  const tone: GrowthTone = avgAge >= 30 ? "danger" : avgAge >= 14 ? "warn" : "ok"
  return {
    id: "days_in_ar",
    title: "Days in AR",
    headline: avgAge === 0
      ? `No open AR — nothing aged today`
      : `Average ${avgAge} days · ${over30.length} claim${over30.length === 1 ? '' : 's'} over 30 days (${FMT_INR(lockedValue)})`,
    metric: { value: String(avgAge), unit: "days" },
    impactInr: lockedValue,
    tone,
    confidence: 0.86,
    drivers: [
      `Open claims: ${open.length}.`,
      `Claims aged ≥30 days: ${over30.length} (${FMT_INR(lockedValue)} locked).`,
      `Industry benchmark for hospital AR: ≤ 35 days.`,
    ],
    recommendation: over30.length > 0
      ? `Escalate the ${over30.length} aged claim${over30.length === 1 ? '' : 's'} to the TPA escalation desk; copy CFO on >₹2L exposures.`
      : `On track. Continue weekly aging review.`,
  }
}

// ── 3. Charge-capture gaps — frozen bills with low coverage ───────────────
export function findChargeCaptureGaps(bills: BillLite[]): GrowthFinding {
  // Frozen-but-low-coverage = strong proxy for missed line items (consumables, OT add-ons).
  const frozen = bills.filter(b => b.status === "frozen")
  const suspicious = frozen.filter(b => {
    if (b.visitType !== "IPD") return false
    return b.subtotal < 25000     // sub-25k IPD bill is implausibly low for an Indian tertiary
  })
  const lostEstimate = suspicious.reduce((s, b) => s + Math.max(0, 30000 - b.subtotal), 0)
  const tone: GrowthTone = suspicious.length >= 3 ? "warn" : "ok"
  return {
    id: "charge_capture_gaps",
    title: "Charge-capture gaps",
    headline: suspicious.length === 0
      ? `No suspicious under-charged IPD bills detected`
      : `${suspicious.length} IPD bill${suspicious.length === 1 ? '' : 's'} look under-charged — est. ${FMT_INR(lostEstimate)} leakage`,
    metric: { value: FMT_INR(lostEstimate) },
    impactInr: lostEstimate,
    tone,
    confidence: 0.68,
    drivers: [
      `IPD bills frozen below ₹25k: ${suspicious.length}.`,
      `Heuristic flags likely missed consumables / OT add-ons / nursing.`,
      `Estimated leakage at ~₹30k mean per case: ${FMT_INR(lostEstimate)}.`,
    ],
    recommendation: suspicious.length > 0
      ? `Run the charge-capture audit checklist on these bills before settlement releases.`
      : `Looks clean — repeat audit at end of week.`,
  }
}

// ── 4. Payer-mix concentration — % revenue from top single payer ──────────
export function findPayerMixConcentration(claims: ClaimLite[]): GrowthFinding {
  // We don't have a provider field in ClaimLite to keep this loose — count by amount banding.
  const total = claims.reduce((s, c) => s + c.amount, 0)
  const high = claims.filter(c => c.amount > 100000).reduce((s, c) => s + c.amount, 0)
  const pct = total > 0 ? Math.round((high / total) * 100) : 0
  const tone: GrowthTone = pct >= 60 ? "warn" : "ok"
  return {
    id: "payer_mix_concentration",
    title: "High-value claim concentration",
    headline: pct >= 60
      ? `${pct}% of claim value sits in claims > ₹1L — concentration risk`
      : `${pct}% of claim value is high-value — balanced mix`,
    metric: { value: String(pct), unit: "%" },
    impactInr: high,
    tone,
    confidence: 0.74,
    drivers: [
      `Claims > ₹1L: ${claims.filter(c => c.amount > 100000).length}.`,
      `Their share of total claim value: ${pct}%.`,
      `Healthy concentration is < 55% for tertiary care.`,
    ],
    recommendation: pct >= 60
      ? `Diversify — push OPD-payer onboarding for 2 new corporates this quarter.`
      : `Balanced. Re-run after monthly close.`,
  }
}
