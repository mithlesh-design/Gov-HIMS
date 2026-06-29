// Single source of truth for NABH chapter → qualifying audit action codes.
// Consumed by /audit/dashboard, /audit/reports, /quality/nabh.

import type { AuditEntry } from '@/store/useAuditStore'

export type NabhChapter = {
  chapter: string
  title: string
  blurb: string
  actions: string[]
}

export const NABH_CHAPTERS: NabhChapter[] = [
  {
    chapter: 'AAC',
    title: 'Access, Assessment & Continuity of Care',
    blurb: 'Triage, disposition, handovers, admission/transfer, and discharge clearance evidence.',
    actions: [
      'er_triage', 'er_disposition',
      'admission_admit', 'admission_transfer', 'admission_discharge',
      'discharge_clearance', 'exit_clearance_issued', 'nurse_handover',
      'reception_registered', 'reception_queue_advance', 'reception_emergency_escalation',
    ],
  },
  {
    chapter: 'COP',
    title: 'Care of Patients',
    blurb: 'Clinical orders, critical-result callbacks, OT checklists, ambulance dispatch, and dietary plans.',
    actions: [
      'prescription_create', 'lab_order', 'radiology_order',
      'lab_critical_callback', 'radiology_critical_callback',
      'ot_who_checklist', 'ot_clearance_set', 'nurse_med_administered',
      'ambulance_dispatched', 'ambulance_completed',
      'dietary_plan_assigned', 'dietary_meal_served',
    ],
  },
  {
    chapter: 'MOM',
    title: 'Management of Medication',
    blurb: 'Dispense, substitutions, qty adjustments, and supervisor overrides.',
    actions: ['drug_dispense', 'pharmacy_qty_adjusted', 'pharmacy_supervisor_override', 'pharmacy_substituted'],
  },
  {
    chapter: 'HIC',
    title: 'Hospital Infection Control',
    blurb: 'BMW disposal, CSSD sterilization cycles, housekeeping turnover, and lab QC overrides.',
    actions: [
      'waste_log', 'bmw_waste_collected', 'bmw_handover_to_vendor',
      'lab_qc_override',
      'cssd_cycle_started', 'cssd_cycle_passed', 'cssd_cycle_failed', 'cssd_bi_negative',
      'housekeeping_room_cleaned', 'housekeeping_bed_turned',
    ],
  },
  {
    chapter: 'PRE',
    title: 'Patient Rights & Education',
    blurb: 'Insurance docs, claim submissions, AI denial-risk, DISHA / DPDP consent + data access.',
    actions: [
      'insurance_doc_upload', 'insurance_claim_submitted', 'insurance_denial_risk_run',
      'disha_record_accessed', 'disha_consent_captured', 'disha_consent_revoked',
      'disha_data_export', 'disha_rtbf_requested', 'disha_rtbf_fulfilled',
      'disha_breach_logged',
    ],
  },
  {
    chapter: 'IMS',
    title: 'Information Management',
    blurb: 'HITL acceptance / modification, verified clinical reports, financial audit trail.',
    actions: [
      'hitl_accept', 'hitl_reject', 'hitl_modify',
      'ai_feedback_up', 'ai_feedback_down',
      'radiology_report_verified', 'lab_result_released',
      'finance_invoice_received', 'finance_invoice_approved', 'finance_vendor_paid',
      'finance_dispute_opened', 'finance_dispute_resolved',
      'finance_payroll_locked', 'finance_period_closed',
    ],
  },
  {
    chapter: 'CQI',
    title: 'Continuous Quality Improvement',
    blurb: 'Incidents reported and resolved with CAPA trail.',
    actions: ['incident_reported', 'incident_resolved'],
  },
  {
    chapter: 'ROM',
    title: 'Responsibilities of Management',
    blurb: 'Surgical count discrepancies, MCI declarations, blood-bank issues, and mortuary releases.',
    actions: [
      'ot_count_discrepancy', 'er_mci_declared', 'blood_issue',
      'mortuary_body_received', 'mortuary_mlc_cleared', 'mortuary_body_released',
    ],
  },
  {
    chapter: 'HRM',
    title: 'Human Resource Management',
    blurb: 'Staff lifecycle, credentials, shifts, leave, swaps, and coverage breaches.',
    actions: [
      'hr_staff_created', 'hr_staff_updated', 'hr_staff_role_changed',
      'hr_staff_deactivated', 'hr_staff_reactivated', 'hr_staff_terminated',
      'hr_credential_added', 'hr_credential_expired',
      'hr_shift_set', 'hr_shift_pattern_applied', 'hr_shift_bulk_update',
      'hr_duty_assigned', 'hr_duty_cleared',
      'hr_leave_requested', 'hr_leave_approved', 'hr_leave_rejected',
      'hr_swap_requested', 'hr_swap_approved', 'hr_swap_rejected',
      'hr_sick_call', 'hr_replacement_assigned',
      'hr_overtime_logged', 'coverage_critical_breach',
    ],
  },
]

export type NabhChapterEvidence = NabhChapter & {
  count: number
  events: AuditEntry[]
  ready: boolean
}

export function buildNabhEvidence(entries: AuditEntry[]): NabhChapterEvidence[] {
  return NABH_CHAPTERS.map((c) => {
    const events = entries.filter((e) => c.actions.includes(e.action))
    return { ...c, events, count: events.length, ready: events.length > 0 }
  })
}
