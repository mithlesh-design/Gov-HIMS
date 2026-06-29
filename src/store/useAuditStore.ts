import { create } from 'zustand'

export type AuditAction =
  | 'hitl_accept' | 'hitl_reject' | 'hitl_modify'
  | 'ai_feedback_up' | 'ai_feedback_down'
  | 'prescription_create' | 'lab_order' | 'radiology_order'
  | 'billing_charge' | 'discharge_clearance' | 'exit_clearance_issued'
  | 'role_switch' | 'login' | 'logout'
  | 'blood_issue' | 'drug_dispense' | 'waste_log'
  | 'pharmacy_qty_adjusted' | 'pharmacy_supervisor_override' | 'pharmacy_substituted'
  | 'lab_critical_callback' | 'lab_result_released' | 'lab_qc_override'
  | 'radiology_report_verified' | 'radiology_critical_callback'
  | 'ot_clearance_set' | 'ot_who_checklist' | 'ot_count_discrepancy' | 'ot_specimen_logged'
  | 'er_triage' | 'er_disposition' | 'er_mci_declared'
  | 'insurance_doc_upload' | 'insurance_claim_submitted' | 'insurance_denial_risk_run'
  | 'nurse_handover' | 'nurse_med_administered'
  | 'incident_reported' | 'incident_resolved'
  | 'cssd_cycle_started' | 'cssd_cycle_passed' | 'cssd_cycle_failed' | 'cssd_bi_negative'
  | 'bmw_waste_collected' | 'bmw_handover_to_vendor'
  | 'dietary_plan_assigned' | 'dietary_meal_served'
  | 'mortuary_body_received' | 'mortuary_mlc_cleared' | 'mortuary_body_released'
  | 'ambulance_dispatched' | 'ambulance_completed'
  | 'housekeeping_room_cleaned' | 'housekeeping_bed_turned'
  | 'admission_admit' | 'admission_transfer' | 'admission_discharge'
  | 'reception_registered' | 'reception_queue_advance' | 'reception_emergency_escalation'
  | 'hr_staff_created' | 'hr_staff_updated' | 'hr_staff_role_changed'
  | 'hr_staff_deactivated' | 'hr_staff_reactivated' | 'hr_staff_terminated'
  | 'hr_credential_added' | 'hr_credential_expired'
  | 'hr_shift_set' | 'hr_shift_pattern_applied' | 'hr_shift_bulk_update'
  | 'hr_duty_assigned' | 'hr_duty_cleared'
  | 'hr_leave_requested' | 'hr_leave_approved' | 'hr_leave_rejected'
  | 'hr_swap_requested' | 'hr_swap_approved' | 'hr_swap_rejected'
  | 'hr_sick_call' | 'hr_replacement_assigned'
  | 'hr_overtime_logged' | 'coverage_critical_breach'
  | 'finance_invoice_received' | 'finance_invoice_approved' | 'finance_vendor_paid'
  | 'finance_dispute_opened' | 'finance_dispute_resolved'
  | 'finance_payroll_locked' | 'finance_period_closed'
  | 'disha_record_accessed' | 'disha_consent_captured' | 'disha_consent_revoked'
  | 'disha_data_export' | 'disha_rtbf_requested' | 'disha_rtbf_fulfilled'
  | 'disha_breach_logged'
  | string

// Map an action to its module — drives the module filter and dashboard breakdown.
export const MODULE_FOR_ACTION: Record<string, string> = {
  hitl_accept: 'AI HITL', hitl_reject: 'AI HITL', hitl_modify: 'AI HITL',
  ai_feedback_up: 'AI HITL', ai_feedback_down: 'AI HITL',
  prescription_create: 'Doctor',
  pharmacy_qty_adjusted: 'Pharmacy', pharmacy_supervisor_override: 'Pharmacy', pharmacy_substituted: 'Pharmacy',
  drug_dispense: 'Pharmacy',
  lab_order: 'Doctor', lab_critical_callback: 'Lab', lab_result_released: 'Lab', lab_qc_override: 'Lab',
  radiology_order: 'Doctor', radiology_report_verified: 'Radiology', radiology_critical_callback: 'Radiology',
  ot_clearance_set: 'OT', ot_who_checklist: 'OT', ot_count_discrepancy: 'OT', ot_specimen_logged: 'OT',
  er_triage: 'Emergency', er_disposition: 'Emergency', er_mci_declared: 'Emergency',
  insurance_doc_upload: 'Insurance', insurance_claim_submitted: 'Insurance', insurance_denial_risk_run: 'Insurance',
  billing_charge: 'Billing',
  discharge_clearance: 'Discharge', exit_clearance_issued: 'Discharge',
  blood_issue: 'Blood Bank',
  waste_log: 'BMW', bmw_waste_collected: 'BMW', bmw_handover_to_vendor: 'BMW',
  nurse_handover: 'Nursing', nurse_med_administered: 'Nursing',
  incident_reported: 'Quality', incident_resolved: 'Quality',
  cssd_cycle_started: 'CSSD', cssd_cycle_passed: 'CSSD', cssd_cycle_failed: 'CSSD', cssd_bi_negative: 'CSSD',
  dietary_plan_assigned: 'Dietary', dietary_meal_served: 'Dietary',
  mortuary_body_received: 'Mortuary', mortuary_mlc_cleared: 'Mortuary', mortuary_body_released: 'Mortuary',
  ambulance_dispatched: 'Ambulance', ambulance_completed: 'Ambulance',
  housekeeping_room_cleaned: 'Housekeeping', housekeeping_bed_turned: 'Housekeeping',
  admission_admit: 'Admission', admission_transfer: 'Admission', admission_discharge: 'Admission',
  reception_registered: 'Reception', reception_queue_advance: 'Reception', reception_emergency_escalation: 'Reception',
  hr_staff_created: 'HR', hr_staff_updated: 'HR', hr_staff_role_changed: 'HR',
  hr_staff_deactivated: 'HR', hr_staff_reactivated: 'HR', hr_staff_terminated: 'HR',
  hr_credential_added: 'HR', hr_credential_expired: 'HR',
  hr_shift_set: 'HR', hr_shift_pattern_applied: 'HR', hr_shift_bulk_update: 'HR',
  hr_duty_assigned: 'HR', hr_duty_cleared: 'HR',
  hr_leave_requested: 'HR', hr_leave_approved: 'HR', hr_leave_rejected: 'HR',
  hr_swap_requested: 'HR', hr_swap_approved: 'HR', hr_swap_rejected: 'HR',
  hr_sick_call: 'HR', hr_replacement_assigned: 'HR',
  hr_overtime_logged: 'HR', coverage_critical_breach: 'HR',
  finance_invoice_received: 'Finance', finance_invoice_approved: 'Finance', finance_vendor_paid: 'Finance',
  finance_dispute_opened: 'Finance', finance_dispute_resolved: 'Finance',
  finance_payroll_locked: 'Finance', finance_period_closed: 'Finance',
  disha_record_accessed: 'DISHA', disha_consent_captured: 'DISHA', disha_consent_revoked: 'DISHA',
  disha_data_export: 'DISHA', disha_rtbf_requested: 'DISHA', disha_rtbf_fulfilled: 'DISHA',
  disha_breach_logged: 'DISHA',
  role_switch: 'System', login: 'System', logout: 'System',
}

export const moduleOf = (action: string): string => MODULE_FOR_ACTION[action] ?? 'Other'

// Severity hint for visual treatment + report aggregation.
export const SEVERITY_FOR_ACTION: Record<string, 'info' | 'warning' | 'critical'> = {
  pharmacy_supervisor_override: 'warning',
  lab_qc_override: 'warning',
  lab_critical_callback: 'critical',
  radiology_critical_callback: 'critical',
  ot_count_discrepancy: 'critical',
  er_mci_declared: 'critical',
  incident_reported: 'warning',
  cssd_cycle_failed: 'critical',
  cssd_bi_negative: 'critical',
  mortuary_mlc_cleared: 'warning',
  reception_emergency_escalation: 'warning',
  hr_staff_terminated: 'warning',
  hr_credential_expired: 'warning',
  hr_sick_call: 'warning',
  coverage_critical_breach: 'critical',
  finance_dispute_opened: 'warning',
  disha_breach_logged: 'critical',
  disha_rtbf_requested: 'warning',
  disha_consent_revoked: 'warning',
}
export const severityOf = (action: string): 'info' | 'warning' | 'critical' =>
  SEVERITY_FOR_ACTION[action] ?? 'info'

export interface AuditEntry {
  id: string
  userId: string
  userName: string
  action: AuditAction
  resource: string
  resourceId?: string
  detail?: string
  before?: unknown
  after?: unknown
  timestamp: string
  ipStub: string
}

interface AuditState {
  entries: AuditEntry[]
  log: (entry: Omit<AuditEntry, 'id' | 'timestamp' | 'ipStub'>) => void
  clear: () => void
}

// ─── Seed entries — representative cross-module activity ─────────────────

const minsAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString()
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString()

let _seedSeq = 0
const seed = (
  partial: Omit<AuditEntry, 'id' | 'ipStub'>
): AuditEntry => ({ ...partial, id: `AUD-seed-${++_seedSeq}`, ipStub: '192.168.1.x' })

const SEED_ENTRIES: AuditEntry[] = [
  seed({ userId: 'PH-301', userName: 'Ritu Sharma', action: 'pharmacy_substituted',
    resource: 'pharmacy_prescription', resourceId: 'RX003',
    detail: 'Amoxicillin 250mg → Amoxicillin 500mg (out of stock, substituted)',
    timestamp: minsAgo(15) }),
  seed({ userId: 'PH-301', userName: 'Ritu Sharma', action: 'pharmacy_qty_adjusted',
    resource: 'pharmacy_prescription', resourceId: 'RX003',
    detail: 'Diclofenac 50mg: 10 → 9 (Partial fill)',
    timestamp: minsAgo(13) }),
  seed({ userId: 'PH-302', userName: 'Anil Kumar', action: 'pharmacy_supervisor_override',
    resource: 'pharmacy_prescription', resourceId: 'RX002',
    detail: 'Supervisor override approved for Atorvastatin 10mg (>50% reduction)',
    timestamp: minsAgo(22) }),
  seed({ userId: 'PH-301', userName: 'Ritu Sharma', action: 'drug_dispense',
    resource: 'pharmacy_prescription', resourceId: 'RX-C-001',
    detail: 'Dispensed to Self (patient) · Sanjay Gupta',
    timestamp: hoursAgo(3) }),

  seed({ userId: 'LP-201', userName: 'Dr. Asha Rao', action: 'lab_result_released',
    resource: 'lab_test_run', resourceId: 'LT-405-1',
    detail: 'Troponin I released — critical-high (0.92 ng/mL CH) · Kiran Patil',
    timestamp: minsAgo(12) }),
  seed({ userId: 'LT-101', userName: 'Ravi Menon', action: 'lab_qc_override',
    resource: 'analyzer', resourceId: 'Roche c311',
    detail: '1-3s violation overridden — manual recal verified, repeat passed',
    timestamp: minsAgo(45) }),
  seed({ userId: 'LB-992', userName: 'Neha Gupta', action: 'lab_critical_callback',
    resource: 'lab_test_run', resourceId: 'LT-402-4',
    detail: 'Called Dr. Vikram Rathore — CRP 155 mg/L critical · Sunita Sharma',
    timestamp: minsAgo(8) }),

  seed({ userId: 'RAD-304', userName: 'Dr. Sameer Khan', action: 'radiology_report_verified',
    resource: 'radiology_study', resourceId: 'RS-108',
    detail: 'CT Head verified & released — no acute intracranial pathology · Sunita Devi',
    timestamp: minsAgo(30) }),

  seed({ userId: 'OT-901', userName: 'Dr. Anisha Sharma', action: 'ot_clearance_set',
    resource: 'ot_procedure', resourceId: 'OT-001',
    detail: 'Blood bank cleared · Arvind Gupta (TKR)',
    timestamp: hoursAgo(2) }),
  seed({ userId: 'OT-901', userName: 'Dr. Anisha Sharma', action: 'ot_who_checklist',
    resource: 'ot_procedure', resourceId: 'OT-001',
    detail: 'Sign In phase 7/7 items confirmed',
    timestamp: hoursAgo(1) }),
  seed({ userId: 'OT-901', userName: 'Dr. Anisha Sharma', action: 'ot_specimen_logged',
    resource: 'ot_procedure', resourceId: 'OT-002',
    detail: 'Appendix - HPE collected (Histopathology)',
    timestamp: minsAgo(20) }),

  seed({ userId: 'ER-110', userName: 'Dr. Vikram Rathore', action: 'er_triage',
    resource: 'er_patient', resourceId: 'PT-30003',
    detail: 'Lalita Devi triaged ESI 2 — qSOFA positive sepsis suspected',
    timestamp: minsAgo(35) }),
  seed({ userId: 'ER-110', userName: 'Dr. Vikram Rathore', action: 'er_disposition',
    resource: 'er_patient', resourceId: 'PT-30006',
    detail: 'Mohan Lal · Admit ward — Cardiology · stabilised on IV diuretics + O2',
    timestamp: minsAgo(20) }),

  seed({ userId: 'INS-011', userName: 'Karan Patel', action: 'insurance_doc_upload',
    resource: 'insurance_claim', resourceId: 'CLM-2026-0098',
    detail: 'Stent invoice & implant sticker uploaded · Kiran Patil',
    timestamp: hoursAgo(24) }),
  seed({ userId: 'INS-011', userName: 'Karan Patel', action: 'insurance_denial_risk_run',
    resource: 'insurance_claim', resourceId: 'CLM-2026-0098',
    detail: 'AI denial-risk computed: 53/100 moderate · 2 documents pending',
    timestamp: minsAgo(5) }),

  seed({ userId: 'DC-701', userName: 'Meena Agarwal', action: 'discharge_clearance',
    resource: 'discharge_patient', resourceId: 'DC-003',
    detail: 'Pharmacy clearance set to cleared · Kiran Patil',
    timestamp: hoursAgo(1) }),

  seed({ userId: 'QA-1101', userName: 'Dr. Lalitha Iyer', action: 'incident_reported',
    resource: 'incident', resourceId: 'INC-2026-009',
    detail: 'Medication error — wrong route documented; no harm; CAPA initiated',
    timestamp: hoursAgo(48) }),
  seed({ userId: 'QA-1101', userName: 'Dr. Lalitha Iyer', action: 'incident_resolved',
    resource: 'incident', resourceId: 'INC-2026-007',
    detail: 'Equipment failure (infusion pump) — replaced, biomedical sign-off',
    timestamp: hoursAgo(36) }),

  seed({ userId: 'NR-402', userName: 'Anjali Desai', action: 'nurse_handover',
    resource: 'shift', resourceId: 'GW-A',
    detail: 'Shift handover complete to Day team — 14 patients · 2 escalations flagged',
    timestamp: hoursAgo(7) }),

  seed({ userId: 'DR-1012', userName: 'Dr. Priya Nair', action: 'hitl_accept',
    resource: 'ai_suggestion', resourceId: 'aiprebrief',
    detail: 'AI pre-brief accepted as written for patient Meera Pillai',
    timestamp: minsAgo(58) }),
  seed({ userId: 'DR-1012', userName: 'Dr. Priya Nair', action: 'hitl_modify',
    resource: 'ai_suggestion', resourceId: 'prescription-draft',
    detail: 'Doctor edited AI prescription draft — replaced statin dose',
    timestamp: minsAgo(40) }),

  seed({ userId: 'BB-1201', userName: 'Dr. Pooja Srivastava', action: 'blood_issue',
    resource: 'blood_bag', resourceId: 'BAG-B+-44021',
    detail: '1 unit Packed RBC (B+) issued to OT-001 · Arvind Gupta',
    timestamp: hoursAgo(2) }),

  seed({ userId: 'BW-1501', userName: 'Ganesh Rao', action: 'waste_log',
    resource: 'bmw_log', resourceId: 'BMW-2026-05-29',
    detail: 'Yellow category — 12.4 kg disposed via authorised vendor (CPCB compliant)',
    timestamp: hoursAgo(5) }),

  seed({ userId: 'CS-1301', userName: 'Rajesh Yadav', action: 'cssd_cycle_passed',
    resource: 'sterilization_cycle', resourceId: 'BATCH-20260530-02',
    detail: 'Plasma cycle passed · BI pass · Chem pass · 1 instrument set',
    timestamp: hoursAgo(2) }),

  seed({ userId: 'DT-1701', userName: 'Sneha Iyer', action: 'dietary_meal_served',
    resource: 'meal_order', resourceId: 'MO-001',
    detail: 'Breakfast delivered to Kiran Patil (G-12) · Diabetic',
    timestamp: hoursAgo(6) }),

  seed({ userId: 'AMB-DISP-01', userName: 'Dispatch Console', action: 'ambulance_dispatched',
    resource: 'ambulance_trip', resourceId: 'TRIP-001',
    detail: 'MH-01-AA-5678 (BLS) → Andheri East · Chest pain · 8 min response',
    timestamp: minsAgo(30) }),

  seed({ userId: 'HK-VERIFY', userName: 'Head Nurse', action: 'housekeeping_bed_turned',
    resource: 'bed', resourceId: 'BED-201',
    detail: 'Bed 201 verified ready by Head Nurse · NABH HIC',
    timestamp: hoursAgo(1) }),

  seed({ userId: 'MOR-1601', userName: 'Mortuary Officer', action: 'mortuary_body_received',
    resource: 'mortuary_record', resourceId: 'MRT-001',
    detail: 'Ramchandra Sharma (PT-19001) · Natural · slot 1',
    timestamp: hoursAgo(8) }),

  seed({ userId: 'ADM-1801', userName: 'Bed Manager', action: 'admission_admit',
    resource: 'admission_request', resourceId: 'ADM-REQ-OLD',
    detail: 'Vikram Nair (PT-10210) → ICU bed · Acute MI post-PCI',
    timestamp: hoursAgo(4) }),

  seed({ userId: 'RC-1101', userName: 'Reception', action: 'reception_registered',
    resource: 'opd_patient', resourceId: 'PT-10234',
    detail: 'Aarav Sharma (Token 7) registered · General Medicine',
    timestamp: hoursAgo(2) }),
  seed({ userId: 'RC-1101', userName: 'Reception', action: 'reception_queue_advance',
    resource: 'opd_patient', resourceId: 'PT-10234',
    detail: 'Aarav Sharma → vitals · Low acuity',
    timestamp: hoursAgo(1) }),

  seed({ userId: 'BL-2001', userName: 'Billing Officer', action: 'billing_charge',
    resource: 'bill', resourceId: 'BILL-2026-KP1',
    detail: 'PCI bill aggregated · Kiran Patil · ₹2,48,500',
    timestamp: hoursAgo(2) }),

  // ─── HR module seed ────────────────────────────────────────────────
  seed({ userId: 'ADM-01', userName: 'Rajesh Kulkarni', action: 'hr_leave_approved',
    resource: 'leave', resourceId: 'LV-DR-1014',
    detail: 'Dr. Ananya Iyer · dermatology conference · 3 days approved',
    timestamp: hoursAgo(72) }),
  seed({ userId: 'ADM-01', userName: 'Rajesh Kulkarni', action: 'hr_duty_assigned',
    resource: 'duty', resourceId: 'DU-NR-403-ICU',
    detail: 'Pooja Shetty assigned ICU Morning shift today',
    timestamp: hoursAgo(48) }),
  seed({ userId: 'ADM-01', userName: 'Rajesh Kulkarni', action: 'hr_shift_pattern_applied',
    resource: 'shift_pattern', resourceId: 'TMPL-1',
    detail: '5-on / 2-off Morning applied to Reception + Billing staff · 4 weeks',
    timestamp: hoursAgo(96) }),

  // ─── Finance module seed ───────────────────────────────────────────
  seed({ userId: 'ADM-01', userName: 'Rajesh Kulkarni', action: 'finance_vendor_paid',
    resource: 'vendor_invoice', resourceId: 'INV-004',
    detail: 'Sodexo · SOD-2026-0512 paid via NEFT-2026-A8821 · ₹2,85,000',
    timestamp: hoursAgo(192) }),
  seed({ userId: 'ADM-01', userName: 'Rajesh Kulkarni', action: 'finance_dispute_opened',
    resource: 'vendor_invoice', resourceId: 'INV-005',
    detail: 'Clean Linen Co. · CL-2026-0998 disputed · weight discrepancy 940 vs 1180kg',
    timestamp: hoursAgo(36) }),

  // ─── DISHA / DPDP module seed ──────────────────────────────────────
  seed({ userId: 'DR-1012', userName: 'Dr. Priya Nair', action: 'disha_record_accessed',
    resource: 'patient_record', resourceId: 'PT-20394',
    detail: 'Kiran Patil chart accessed · clinical review · OPD context',
    timestamp: hoursAgo(4) }),
  seed({ userId: 'RC-204', userName: 'Sunita Joshi', action: 'disha_consent_captured',
    resource: 'patient_record', resourceId: 'PT-20394',
    detail: 'Kiran Patil · DPDP consent v2.1 captured · data processing + sharing scopes',
    timestamp: hoursAgo(72) }),
  seed({ userId: 'ADM-01', userName: 'Rajesh Kulkarni', action: 'disha_rtbf_requested',
    resource: 'patient_record', resourceId: 'PT-10234',
    detail: 'Aarav Sharma · Right to Erasure requested · 30-day review window opened',
    timestamp: hoursAgo(24) }),
]

// ─── API-backed persistence ────────────────────────────────────────────
// The mock API layer (src/lib/api) is the source of truth for audit. This
// store keeps an in-memory mirror for fast renders. On bootstrap we hydrate
// from the API; every `log()` writes through to the API; the API in turn
// re-broadcasts via onAudit() so any other tab / surface stays in sync.
//
// The seed entries below are used only if the API has nothing yet (first
// load, fresh DB). The demo seed in src/lib/api/_seed.ts will normally
// populate the API table before this store mounts.

interface AuditState {
  entries: AuditEntry[]
  log: (entry: Omit<AuditEntry, 'id' | 'timestamp' | 'ipStub'>) => void
  clear: () => void
  hydrate: (rows: AuditEntry[]) => void
  push: (entry: AuditEntry) => void
}

export const useAuditStore = create<AuditState>((set) => ({
  entries: SEED_ENTRIES,
  log: (entry) => {
    // The api/audit bridge (when installed) will create the persisted entry
    // and `push` it back here. If no bridge yet (SSR / very early), keep the
    // legacy in-memory fallback so callers still get a snapshot row.
    if (typeof window !== 'undefined') {
      void import('@/lib/api').then(({ Audit, installAuditBridge }) => {
        installAuditBridge()
        const persisted: AuditEntry = {
          ...entry,
          id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          ipStub: '192.168.1.x',
        }
        void Audit.put(persisted)
        set((state) => ({ entries: [persisted, ...state.entries] }))
      })
      return
    }
    set((state) => ({
      entries: [
        {
          ...entry,
          id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          ipStub: '192.168.1.x',
        },
        ...state.entries,
      ],
    }))
  },
  clear: () => set({ entries: [] }),
  hydrate: (rows) =>
    set(() => ({
      // De-dup by id; rows arrive sorted newest-first from the API.
      entries: rows.length ? rows : SEED_ENTRIES,
    })),
  push: (entry) =>
    set((state) => ({
      entries: state.entries.some((e) => e.id === entry.id)
        ? state.entries
        : [entry, ...state.entries],
    })),
}))
