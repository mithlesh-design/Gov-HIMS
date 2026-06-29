/* S13 — Proactive Patient Nudges engine.
 *
 * Reads the patient's profile + active journey + recent audit/order
 * history; emits a prioritised feed of nudges the portal home renders.
 * Each nudge has a tone + cta + linked surface. Phase-2 swaps the
 * heuristics for a real recommender; envelope shape stays.
 */

import type { AuditEntry } from "@/store/useAuditStore"
import type { PatientProfile } from "@/store/usePatientProfileStore"

export type NudgeTone = "ok" | "info" | "warn"

export interface PatientNudge {
  id: string
  kind: "followup" | "medication" | "result" | "preauth" | "lifestyle" | "consent" | "appointment"
  title: string
  body: string
  cta: string
  href: string
  tone: NudgeTone
  priority: number       // 1 (high) .. 10 (low)
}

interface BuildCtx {
  patientId: string
  profile?: PatientProfile
  entries: AuditEntry[]
  stage?: string
  pendingOrders?: { kind: 'test' | 'medicine' | string; paid?: boolean }[]
  now?: Date
}

const ofKind = (e: AuditEntry, code: string) => e.action === code

export function buildPatientNudges(ctx: BuildCtx): PatientNudge[] {
  const { profile, entries, stage, pendingOrders } = ctx
  const now = ctx.now ?? new Date()
  const out: PatientNudge[] = []
  const sinceHrs = (h: number) => Date.now() - h * 3600 * 1000
  const recent = entries.filter((e) => new Date(e.timestamp).getTime() >= sinceHrs(72))

  // 1. Lab/imaging result ready ─────────────────────────────────────────────
  const resultsOut = recent.filter((e) => ofKind(e, 'lab_result_released') || ofKind(e, 'radiology_report_verified'))
  if (resultsOut.length > 0) {
    out.push({
      id: 'nudge_result_ready',
      kind: 'result',
      title: `${resultsOut.length} new result${resultsOut.length === 1 ? '' : 's'} ready`,
      body: `Your latest ${resultsOut[0].action === 'radiology_report_verified' ? 'scan' : 'lab'} report has been verified by the doctor — open it to read the plain-language summary.`,
      cta: 'View results',
      href: '/patient/records',
      tone: 'info',
      priority: 2,
    })
  }

  // 2. Unpaid orders ──────────────────────────────────────────────────────
  const unpaid = (pendingOrders ?? []).filter((o) => !o.paid)
  if (unpaid.length > 0) {
    out.push({
      id: 'nudge_unpaid_orders',
      kind: 'medication',
      title: `${unpaid.length} order${unpaid.length === 1 ? '' : 's'} waiting on payment`,
      body: `Your doctor's prescription is ready, but the pharmacy can dispense only after payment. Tap to settle.`,
      cta: 'Pay & dispense',
      href: '/patient/orders',
      tone: 'warn',
      priority: 1,
    })
  }

  // 3. Pre-auth status ─────────────────────────────────────────────────────
  const preauthRecent = recent.find((e) => e.resource === 'insurance' && /preauth|approved/i.test(e.detail ?? ''))
  if (preauthRecent) {
    out.push({
      id: 'nudge_preauth_status',
      kind: 'preauth',
      title: 'Insurance pre-auth update',
      body: preauthRecent.detail ?? 'Your pre-authorisation status changed — open the insurance dashboard to see the latest.',
      cta: 'See pre-auth',
      href: '/patient/insurance',
      tone: 'info',
      priority: 3,
    })
  }

  // 4. Follow-up due (mock — 7 days post-discharge) ─────────────────────────
  const dischargeEvt = entries.find((e) => e.action === 'admission_discharge' || e.action === 'exit_clearance_issued')
  if (dischargeEvt) {
    const daysSince = Math.round((now.getTime() - new Date(dischargeEvt.timestamp).getTime()) / 86400000)
    if (daysSince >= 5 && daysSince <= 10) {
      out.push({
        id: 'nudge_followup_due',
        kind: 'followup',
        title: 'Follow-up consultation is due',
        body: `It's been ${daysSince} days since your discharge. Book the post-op review with your doctor to stay on track.`,
        cta: 'Book follow-up',
        href: '/patient/appointments',
        tone: 'warn',
        priority: 2,
      })
    }
  }

  // 5. Medication refill reminder ──────────────────────────────────────────
  const meds = profile?.currentMedications ?? []
  if (meds.length > 0) {
    out.push({
      id: 'nudge_refill_reminder',
      kind: 'medication',
      title: `${meds[0]} refill — running low`,
      body: `Based on your dispense history, you have ~5 days of ${meds[0]} left. Pre-order so the pharmacy can have it ready.`,
      cta: 'Pre-order',
      href: '/patient/pharmacy',
      tone: 'info',
      priority: 4,
    })
  }

  // 6. Lifestyle nudge tied to chronic conditions ──────────────────────────
  const conds = profile?.chronicConditions ?? []
  if (conds.some((c) => /diabetes|hba1c/i.test(c))) {
    out.push({
      id: 'nudge_hba1c_due',
      kind: 'lifestyle',
      title: 'HbA1c quarterly check is due',
      body: 'Your last HbA1c was over 3 months ago — a quick lab visit helps your diabetes team adjust your plan if needed.',
      cta: 'Book lab visit',
      href: '/patient/pathology',
      tone: 'info',
      priority: 5,
    })
  }
  if (conds.some((c) => /hypertension|blood pressure/i.test(c))) {
    out.push({
      id: 'nudge_bp_log',
      kind: 'lifestyle',
      title: 'Log your home BP this week',
      body: 'Adding 3 BP readings this week (morning / evening) helps your doctor titrate your medication safely.',
      cta: 'Add reading',
      href: '/patient/health-story',
      tone: 'ok',
      priority: 6,
    })
  }

  // 7. Consent reminder — when family consent not on file ──────────────────
  if (profile && profile.consentFamily === false) {
    out.push({
      id: 'nudge_family_consent',
      kind: 'consent',
      title: 'Family-share consent is off',
      body: 'You can let your nominated family member receive status updates without sharing medical data. Toggle it whenever you like.',
      cta: 'Manage consent',
      href: '/patient/profile',
      tone: 'info',
      priority: 7,
    })
  }

  // 8. Stage-aware "your turn" cue ─────────────────────────────────────────
  if (stage === 'vitals' || stage === 'consulting' || stage === 'pharmacy') {
    out.push({
      id: 'nudge_stage_action',
      kind: 'appointment',
      title: stage === 'pharmacy' ? 'Pharmacy is dispensing your medicines'
                                  : stage === 'consulting' ? 'You’re with the doctor — your live notes appear in records'
                                  : 'You’re at the vitals desk — share the band on your wrist if asked',
      body: 'Live updates appear here as soon as each step completes. Family-track stays in sync too.',
      cta: 'View live journey',
      href: '/patient/dashboard',
      tone: 'ok',
      priority: 3,
    })
  }

  // Sort by priority (lower number = higher priority).
  return out.sort((a, b) => a.priority - b.priority)
}
