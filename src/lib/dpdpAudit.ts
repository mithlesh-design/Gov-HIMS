/* S10 — DPDP / DISHA self-audit scoring engine.
 *
 * Reads the audit trail and scores the hospital's own data-protection
 * posture against five DPDP / DISHA principles:
 *   1. Consent capture rate (per patient access)
 *   2. RTBF turnaround (Right-To-Be-Forgotten — request → fulfilment)
 *   3. Data-export auditability (every export logged)
 *   4. Breach response (logged within 72h per DPDP §8(6))
 *   5. Role-based access discipline (no rapid same-record cross-role accesses)
 *
 * Each principle returns { score 0–100, tone, drivers, recommendation }.
 * Phase-2 swaps the heuristics for a real DPO audit pipeline.
 */

import type { AuditEntry } from "@/store/useAuditStore"

export type DpdpTone = "ok" | "warn" | "danger"

export interface DpdpDimension {
  id: "consent_rate" | "rtbf_sla" | "export_audit" | "breach_response" | "rbac_discipline"
  title: string
  score: number          // 0..100
  tone: DpdpTone
  metric: { value: string; unit?: string }
  drivers: string[]
  recommendation: string
}

const HRS_72 = 72 * 3600 * 1000

function toneOf(score: number): DpdpTone {
  if (score >= 80) return "ok"
  if (score >= 50) return "warn"
  return "danger"
}

// ── 1. Consent capture rate ───────────────────────────────────────────────
export function scoreConsentRate(entries: AuditEntry[]): DpdpDimension {
  const accesses = entries.filter((e) => e.action === "disha_record_accessed").length
  const captured  = entries.filter((e) => e.action === "disha_consent_captured").length
  const denominator = Math.max(1, accesses + captured)
  const score = Math.min(100, Math.round((captured / denominator) * 100))
  return {
    id: "consent_rate",
    title: "Consent capture rate",
    score,
    tone: toneOf(score),
    metric: { value: `${captured} / ${accesses + captured}` },
    drivers: [
      `Patient records accessed without preceding consent: ${accesses}.`,
      `Consent rows captured: ${captured}.`,
      `Target ≥ 80% — every record access should be preceded by recorded consent.`,
    ],
    recommendation: score >= 80
      ? `Maintain. Spot-audit a random 10 records weekly.`
      : `Train front-desk on the kiosk consent step; turn access gate on for the next sprint.`,
  }
}

// ── 2. RTBF SLA ───────────────────────────────────────────────────────────
export function scoreRtbfSla(entries: AuditEntry[]): DpdpDimension {
  const requests   = entries.filter((e) => e.action === "disha_rtbf_requested")
  const fulfilled  = entries.filter((e) => e.action === "disha_rtbf_fulfilled")
  const fulfilledMap = new Map(fulfilled.map((e) => [e.resourceId, e]))
  const closed = requests.filter((r) => fulfilledMap.has(r.resourceId))
  const open   = requests.filter((r) => !fulfilledMap.has(r.resourceId))
  // SLA = within 30 days per DISHA §28(2)
  const SLA_MS = 30 * 86400 * 1000
  let onTime = 0
  for (const r of closed) {
    const f = fulfilledMap.get(r.resourceId)!
    if (new Date(f.timestamp).getTime() - new Date(r.timestamp).getTime() <= SLA_MS) onTime++
  }
  const score = closed.length === 0 ? (open.length === 0 ? 100 : 60) : Math.round((onTime / closed.length) * 100)
  return {
    id: "rtbf_sla",
    title: "RTBF turnaround",
    score,
    tone: toneOf(score),
    metric: { value: `${closed.length}/${requests.length}` },
    drivers: [
      `RTBF requests: ${requests.length} (${closed.length} fulfilled, ${open.length} open).`,
      `Closed within 30-day SLA: ${onTime} of ${closed.length}.`,
      `DISHA §28(2) requires fulfilment within 30 calendar days.`,
    ],
    recommendation: open.length > 0
      ? `Triage the ${open.length} open RTBF request${open.length === 1 ? '' : 's'} this week; assign DPO owner with deadline.`
      : score >= 80
        ? `On track. Re-check at month-close.`
        : `Add an automation: SLA timer fires at day-25 to nudge DPO.`,
  }
}

// ── 3. Data-export audit coverage ─────────────────────────────────────────
export function scoreExportAudit(entries: AuditEntry[]): DpdpDimension {
  const exports = entries.filter((e) => e.action === "disha_data_export")
  // Heuristic: every export should carry a detail string (purpose / requester).
  const withDetail = exports.filter((e) => (e.detail ?? '').trim().length > 5)
  const denominator = Math.max(1, exports.length)
  const score = Math.round((withDetail.length / denominator) * 100)
  return {
    id: "export_audit",
    title: "Data-export audit coverage",
    score,
    tone: toneOf(score),
    metric: { value: `${withDetail.length}/${exports.length || 0}` },
    drivers: [
      `Data-export events logged: ${exports.length}.`,
      `Exports with a documented purpose (DPDP §11): ${withDetail.length}.`,
      `Target ≥ 80% — every export must capture purpose + requester.`,
    ],
    recommendation: score >= 80
      ? `Maintain. Audit the export-form wording quarterly.`
      : `Block export submit unless purpose is filled — add the gate now.`,
  }
}

// ── 4. Breach response timeliness ─────────────────────────────────────────
export function scoreBreachResponse(entries: AuditEntry[]): DpdpDimension {
  const breaches = entries.filter((e) => e.action === "disha_breach_logged")
  // We don't have a "breach_closed" code so use "detail mentions closed/contained" as proxy.
  // Within-72h compliance = breach logged within 72h of the resource event timestamp.
  let on72h = 0
  for (const b of breaches) {
    // Approximate: an audit row dated within 72h of "now-72h" is considered timely.
    const age = Date.now() - new Date(b.timestamp).getTime()
    if (age <= HRS_72) on72h++
  }
  const denominator = Math.max(1, breaches.length)
  const score = breaches.length === 0 ? 100 : Math.round((on72h / denominator) * 100)
  return {
    id: "breach_response",
    title: "Breach response · 72h",
    score,
    tone: toneOf(score),
    metric: { value: String(breaches.length), unit: "events" },
    drivers: [
      `Breach events logged: ${breaches.length}.`,
      `Within DPDP §8(6) 72-hour window: ${on72h}.`,
      breaches.length === 0
        ? `Clean trail this period.`
        : `Each breach must be reported to the Data Protection Board within 72 hours.`,
    ],
    recommendation: breaches.length === 0
      ? `No breaches. Continue tabletop drills quarterly.`
      : score >= 80
        ? `Process working. Verify DPB acknowledgement letter is on file.`
        : `Tighten the IRT call-tree; 72h gate must auto-page the DPO.`,
  }
}

// ── 5. RBAC discipline ─────────────────────────────────────────────────────
// Detect "rapid cross-role same-record access" (within 5 min of each other) as
// a privacy red-flag (e.g. radiology + billing both pulling a celebrity record).
export function scoreRbacDiscipline(entries: AuditEntry[]): DpdpDimension {
  const accesses = entries.filter((e) => e.action === "disha_record_accessed")
  const byRecord = new Map<string, AuditEntry[]>()
  for (const e of accesses) {
    if (!e.resourceId) continue
    if (!byRecord.has(e.resourceId)) byRecord.set(e.resourceId, [])
    byRecord.get(e.resourceId)!.push(e)
  }
  let flagged = 0
  for (const [, list] of byRecord) {
    const byTime = list.slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    for (let i = 1; i < byTime.length; i++) {
      const dt = new Date(byTime[i].timestamp).getTime() - new Date(byTime[i - 1].timestamp).getTime()
      if (dt < 5 * 60 * 1000 && byTime[i].userId !== byTime[i - 1].userId) { flagged++; break }
    }
  }
  const clean = byRecord.size - flagged
  const denominator = Math.max(1, byRecord.size)
  const score = Math.round((clean / denominator) * 100)
  return {
    id: "rbac_discipline",
    title: "Role-based access discipline",
    score,
    tone: toneOf(score),
    metric: { value: `${flagged} flagged` },
    drivers: [
      `Distinct records accessed: ${byRecord.size}.`,
      `Records with rapid cross-role accesses (< 5 min apart, different users): ${flagged}.`,
      `Pattern suggests need-to-know review.`,
    ],
    recommendation: flagged === 0
      ? `Healthy. Continue least-privilege defaults.`
      : `Open the audit trail filtered to these ${flagged} record${flagged === 1 ? '' : 's'} and verify clinical justification.`,
  }
}

export function scoreAllDimensions(entries: AuditEntry[]): DpdpDimension[] {
  return [
    scoreConsentRate(entries),
    scoreRtbfSla(entries),
    scoreExportAudit(entries),
    scoreBreachResponse(entries),
    scoreRbacDiscipline(entries),
  ]
}

export function overallDpdpScore(dims: DpdpDimension[]): number {
  if (dims.length === 0) return 0
  return Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length)
}
