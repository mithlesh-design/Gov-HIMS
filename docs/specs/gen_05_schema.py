"""Generate 05_Backend_Schema_v1.0.docx — Tables, keys, ER diagram, indexes."""
from pathlib import Path
from _helpers import *


def build(out: Path) -> None:
    doc = new_doc()
    cover(doc, "05 — Backend Schema", "Backend Schema",
          "PostgreSQL tables, keys, relationships, indexes — target for v1.0")
    toc(doc)

    h1(doc, "1. Overview")
    p(doc, "The current repo has no relational store. All data is held in Zustand and (for 11 stores) "
           "in localStorage. v1.0 introduces a PostgreSQL schema designed to serve every "
           "flow described in 03 App Flow without growing entity types beyond what is "
           "necessary.")
    p(doc, "Design rules:")
    bullet(doc, "Tenant column (tenant_id) on every table, even though v1.0 is single-tenant — preserves multi-branch upgrade path.")
    bullet(doc, "Soft-delete via deleted_at on every patient-facing or audit-bearing table.")
    bullet(doc, "Timestamps created_at, updated_at on every table.")
    bullet(doc, "Identifiers are ULID (26-char text). Human-friendly identifiers (HN, MRN, billNo) are separate columns.")
    bullet(doc, "Append-only audit table; never UPDATE.")
    bullet(doc, "PII columns column-encrypted (AES-256 with rotation).")

    h1(doc, "2. ER Diagram (Core)")
    mermaid(doc, "Core ER diagram", """
erDiagram
    PATIENT ||--o{ VISIT : has
    PATIENT ||--o{ CONSENT : grants
    PATIENT ||--o{ DPDP_LOG : accessed
    PATIENT ||--o{ IPD_STAY : admitted
    VISIT  ||--o{ ENCOUNTER : groups
    ENCOUNTER ||--o{ NOTE : has
    ENCOUNTER ||--o{ ORDER : creates
    ENCOUNTER ||--o{ PRESCRIPTION : signs
    PRESCRIPTION ||--|{ RX_LINE : contains
    RX_LINE }o--|| DRUG : refers
    ORDER  ||--o{ ORDER_ITEM : contains
    ORDER  ||--o| LAB_RESULT : produces
    ORDER  ||--o| RAD_REPORT : produces
    IPD_STAY ||--|{ BED_ASSIGNMENT : occupies
    IPD_STAY ||--o{ VITAL : records
    IPD_STAY ||--o{ MAR_DOSE : nurse
    IPD_STAY ||--o| DISCHARGE : ends
    DISCHARGE ||--|{ DISCHARGE_PILLAR : gates
    VISIT  ||--o| BILL : settles
    BILL   ||--|{ BILL_LINE : itemises
    BILL   ||--o{ PAYMENT : receives
    BILL   ||--o| CLAIM : insures
    CLAIM  ||--o| PREAUTH : approves
    STAFF  ||--o{ SHIFT_ASSIGNMENT : works
    STAFF  ||--o{ CREDENTIAL : holds
    STAFF  ||--o{ LEAVE_REQUEST : requests
    AUDIT  }o--|| STAFF : actor
    AUDIT  }o--o| PATIENT : target
    INCIDENT ||--o{ CAPA : triggers
    NABH_EVIDENCE }o--|| AUDIT : derives
""")

    page_break(doc)

    h1(doc, "3. Core Tables — Patient & Visit")

    h2(doc, "3.1 patient")
    table(doc, ["Column", "Type", "Notes"],
          [
              ["id",              "text (ULID)",      "PK"],
              ["tenant_id",       "text",              "FK tenant; multi-branch upgrade path"],
              ["hn",              "text",              "Hospital number, unique per tenant"],
              ["full_name_enc",   "bytea",             "AES-256, encrypted"],
              ["phone_enc",       "bytea",             "AES-256, indexed via blind index"],
              ["dob",             "date",              ""],
              ["sex",             "text",              "M/F/O"],
              ["address_enc",     "bytea",             "AES-256"],
              ["aadhaar_last4",   "text",              "for verification only"],
              ["primary_payer",   "text",              "cash / insurance / corporate / govt"],
              ["created_at",      "timestamptz",        "default now()"],
              ["updated_at",      "timestamptz",        ""],
              ["deleted_at",      "timestamptz null",  "soft delete; RTBF tombstone"],
          ],
          col_widths_cm=[4.5, 4.0, 8.5])
    bullet(doc, "Indexes: ux_patient_tenant_hn UNIQUE (tenant_id, hn); idx_patient_phone_bi (blind-index hash); idx_patient_dob.")

    h2(doc, "3.2 visit")
    table(doc, ["Column", "Type", "Notes"],
          [
              ["id",              "text (ULID)",      "PK"],
              ["tenant_id",       "text",              "FK"],
              ["patient_id",      "text",              "FK patient.id"],
              ["kind",            "text",              "OPD / ER / IPD"],
              ["doctor_id",       "text",              "FK staff.id"],
              ["status",          "text",              "scheduled / waiting / in_progress / completed / cancelled"],
              ["scheduled_at",    "timestamptz",        ""],
              ["arrived_at",      "timestamptz null",  ""],
              ["served_at",       "timestamptz null",  ""],
              ["completed_at",    "timestamptz null",  ""],
              ["payer_type",      "text",              "denormalised from patient default; per-visit override"],
              ["meta",            "jsonb",             "appointment notes, source"],
              ["created_at",      "timestamptz",        ""],
          ],
          col_widths_cm=[4.5, 4.0, 8.5])

    h2(doc, "3.3 encounter, note, order, prescription, rx_line")
    table(doc, ["Table", "Purpose", "Key columns"],
          [
              ["encounter",     "Doctor-patient touchpoint within a visit", "id, visit_id, doctor_id, started_at, ended_at, kind"],
              ["note",          "SOAP / progress note tied to encounter",   "id, encounter_id, body_md, author_id, signed_at"],
              ["order",         "Lab / radiology / drug / procedure order", "id, encounter_id, kind, urgency, status, sent_at"],
              ["order_item",    "Item line of an order",                    "id, order_id, code, name, qty, meta"],
              ["prescription",  "Signed Rx",                                "id, encounter_id, signed_at, doctor_id, safety_envelope (jsonb)"],
              ["rx_line",       "Drug line on an Rx",                       "id, prescription_id, drug_id, dose, route, freq, days, instructions"],
          ],
          col_widths_cm=[3.5, 7.5, 6.0])

    h2(doc, "3.4 lab_result, rad_report")
    table(doc, ["Table", "Key columns"],
          [
              ["lab_result", "id, order_id, panel_code, results jsonb, qc_status, verified_by, verified_at, released_at, critical bool"],
              ["rad_report", "id, order_id, modality, study_dt, ai_draft (jsonb), final_text, signed_by, signed_at"],
          ],
          col_widths_cm=[3.5, 13.5])

    page_break(doc)

    h1(doc, "4. IPD & Nursing")
    h2(doc, "4.1 ipd_stay, bed_assignment")
    table(doc, ["Table", "Key columns"],
          [
              ["ipd_stay",       "id, visit_id, patient_id, admitting_doctor_id, started_at, ended_at, ward, status"],
              ["bed_assignment", "id, ipd_stay_id, bed_id, from_ts, to_ts (null = current), reason"],
              ["bed",            "id, ward, bed_code, type (gen/icu/iso), status (occupied/clean/cleaning/oos)"],
              ["ward",           "id, name, dept, min_coverage (jsonb per role)"],
          ],
          col_widths_cm=[3.5, 13.5])
    h2(doc, "4.2 vital, mar_dose")
    table(doc, ["Table", "Key columns"],
          [
              ["vital",     "id, patient_id, ipd_stay_id (null for OPD), captured_at, hr, rr, sbp, dbp, temp, spo2, news2, captured_by"],
              ["mar_dose",  "id, ipd_stay_id, rx_line_id, scheduled_at, administered_at (null), administered_by, status (on_time/late/missed/refused), reason"],
          ],
          col_widths_cm=[3.5, 13.5])

    h2(doc, "4.3 discharge & pillars")
    table(doc, ["Table", "Key columns"],
          [
              ["discharge",        "id, ipd_stay_id, initiated_by, initiated_at, completed_at, summary_md, finaliser"],
              ["discharge_pillar", "id, discharge_id, pillar (pharmacy/billing/files/handover), status, cleared_by, cleared_at, notes"],
          ],
          col_widths_cm=[3.5, 13.5])

    page_break(doc)

    h1(doc, "5. Pharmacy, Drug Master, Narcotics")
    table(doc, ["Table", "Key columns"],
          [
              ["drug",            "id, code, name, form, strength, route, class, narcotic_schedule, allergen_tags jsonb, interactions jsonb"],
              ["drug_stock",      "id, drug_id, lot, expiry, qty_on_hand, location"],
              ["pharmacy_claim",  "id, rx_line_id, claimed_by, claimed_at, dispensed_at, status, substitution_drug_id"],
              ["narcotic_log",    "id, drug_id, qty, signed_out_by, witness_id, patient_id, signed_out_at, returned_qty"],
              ["dispense_event",  "id, pharmacy_claim_id, bedside bool, dispensed_to (patient/ward), audit_event_id"],
          ],
          col_widths_cm=[3.5, 13.5])

    h1(doc, "6. Billing & Insurance")
    table(doc, ["Table", "Key columns"],
          [
              ["bill",        "id, visit_id, ipd_stay_id (null for OPD), payer_type, status, total, freeze_at, freeze_override_by, freeze_reason"],
              ["bill_line",   "id, bill_id, source (order/drug/bed/procedure), code, qty, unit_price, total, duplicate_flag_score"],
              ["payment",     "id, bill_id, mode (cash/upi/card), amount, ref, captured_by, captured_at"],
              ["refund",      "id, bill_id, amount, requested_by, approver_id, approver_at, reason"],
              ["preauth",     "id, bill_id, payer (TPA / insurer), draft_md, ai_risk, sent_at, decision, decision_at, decision_payload jsonb"],
              ["claim",       "id, bill_id, preauth_id, submitted_at, status, settled_amount, settled_at"],
          ],
          col_widths_cm=[3.5, 13.5])
    bullet(doc, "Index idx_bill_status_freeze for daily P&L queries.")
    bullet(doc, "Index idx_payment_captured_at for cash position widget.")

    page_break(doc)

    h1(doc, "7. Staff, Shifts, Coverage, Payroll")
    table(doc, ["Table", "Key columns"],
          [
              ["staff",                "id, tenant_id, name, role (FK), dept, primary_dept, mci_no (clinician), contact (jsonb), employment_kind, joined_at"],
              ["staff_role_grant",     "id, staff_id, role, granted_at, granted_by"],
              ["credential",           "id, staff_id, kind (Licence/MCI/ATLS/BLS/ACLS/Custom), number, issued_at, expires_at, status"],
              ["shift_template",       "id, tenant_id, name, weekday_mask, start_t, end_t, role, dept"],
              ["shift_assignment",     "id, staff_id, template_id, date, start_ts, end_ts, overtime bool, on_call bool"],
              ["coverage_minimum",     "id, dept, role, weekday, min_count"],
              ["sick_call",            "id, shift_assignment_id, raised_by, raised_at, resolved_by, resolved_at, status"],
              ["leave_request",        "id, staff_id, kind, from_dt, to_dt, status, approver_id"],
              ["payroll_period",       "id, period_start, period_end, status (open/frozen/exported)"],
              ["payroll_line",         "id, period_id, staff_id, base, overtime, deductions jsonb, net, frozen_at"],
              ["on_call_rotation",     "id, dept, role, week_of, suggested_staff_id, locked_staff_id"],
          ],
          col_widths_cm=[3.5, 13.5])

    h1(doc, "8. Inventory, Vendors, Statutory")
    table(doc, ["Table", "Key columns"],
          [
              ["vendor",                "id, name, category (drug/bmw/sterile/it/etc), mou_at, mou_expiry, contact jsonb"],
              ["vendor_invoice",        "id, vendor_id, raised_at, due_at, paid_at, amount, currency, status"],
              ["po",                    "id, vendor_id, raised_by, raised_at, status"],
              ["statutory_obligation",  "id, kind (PF/ESI/GST/TDS/PT/etc), period, due_at, filed_at, ref"],
              ["statutory_attestation", "id, obligation_id, filed_by, file_url, notes"],
          ],
          col_widths_cm=[4.0, 13.0])

    page_break(doc)

    h1(doc, "9. Compliance — Audit, NABH, DPDP")
    h2(doc, "9.1 audit (append-only)")
    table(doc, ["Column", "Type", "Notes"],
          [
              ["id",            "text (ULID)",  "PK"],
              ["tenant_id",      "text",          ""],
              ["actor_id",       "text",          "FK staff.id (null for system / patient)"],
              ["role",           "text",          "role at time of action"],
              ["action",         "text",          "one of 37+ typed action codes"],
              ["module",         "text",          "one of 24 module codes"],
              ["target_type",    "text",          "patient / bill / rx / etc."],
              ["target_id",      "text null",     ""],
              ["patient_id",     "text null",     ""],
              ["meta",           "jsonb",         "payload (immutable)"],
              ["nabh_chapter",   "text null",     "AAC/COP/MOM/HIC/PRE/IMS/CQI/ROM/HRM"],
              ["created_at",     "timestamptz",   "default now()"],
              ["digest",         "bytea",         "row hash for tamper-evidence"],
          ],
          col_widths_cm=[4.5, 4.0, 8.5])
    bullet(doc, "Indexes: idx_audit_module_time, idx_audit_actor_time, idx_audit_patient_time, idx_audit_nabh_time.")
    bullet(doc, "Daily Merkle-root snapshot of audit table into audit_attestation.")

    h2(doc, "9.2 NABH evidence")
    table(doc, ["Table", "Key columns"],
          [
              ["nabh_evidence",       "id, chapter, action_code, audit_id, captured_at, attestation_id"],
              ["nabh_chapter_status", "tenant_id, chapter, last_evidence_at, ready_pct"],
          ],
          col_widths_cm=[3.5, 13.5])

    h2(doc, "9.3 DPDP & DISHA")
    table(doc, ["Table", "Key columns"],
          [
              ["consent",          "id, patient_id, scope (jsonb), captured_at, captured_by, expires_at, revoked_at"],
              ["dpdp_log",         "id, patient_id, accessor_id, accessor_role, accessed_at, ip, lawful_basis"],
              ["rtbf_request",     "id, patient_id, raised_at, raised_by, status, approver_id, completed_at"],
              ["breach_attestation","id, kind, scope, attested_by, attested_at, mitigation_md, reported_to_dpa_at"],
          ],
          col_widths_cm=[4.0, 13.0])

    h1(doc, "10. Quality")
    table(doc, ["Table", "Key columns"],
          [
              ["incident",        "id, kind, severity, reported_at, reporter_id, status, patient_id null, ipd_stay_id null"],
              ["capa",            "id, incident_id, action, owner_id, due_at, completed_at, evidence_audit_id"],
              ["document_control","id, kind (sop/policy), version, effective_at, review_by, retired_at"],
          ],
          col_widths_cm=[3.5, 13.5])

    h1(doc, "11. Messaging & Notifications")
    table(doc, ["Table", "Key columns"],
          [
              ["thread",        "id, tenant_id, kind (staff/patient/mixed), patient_id null"],
              ["thread_member", "id, thread_id, member_kind (staff/patient), member_id"],
              ["message",       "id, thread_id, author_kind, author_id, body, kind (text/file/image), created_at"],
              ["notification",  "id, recipient_id, kind, payload (jsonb), read_at, created_at"],
          ],
          col_widths_cm=[3.5, 13.5])

    page_break(doc)

    h1(doc, "12. Index, Constraint & FK Summary")
    p(doc, "Highlighted indexes that materially affect listed flows:")
    table(doc, ["Index", "Serves"],
          [
              ["ux_patient_tenant_hn",       "Patient lookup, registration uniqueness"],
              ["idx_patient_phone_bi",       "Phone-based lookup (blind index)"],
              ["idx_visit_status_time",      "OPD queue list, waiting time KPI"],
              ["idx_ipd_stay_active",         "Bed map active list"],
              ["idx_order_status_time",       "Lab / radiology inbox"],
              ["idx_rx_signed_at",            "Doctor-day activity graph"],
              ["idx_mar_due",                 "Nurse MAR queue (due now)"],
              ["idx_audit_module_time",       "Audit trail filter"],
              ["idx_bill_status_freeze",      "Daily P&L"],
              ["idx_payment_captured_at",      "Cash position"],
              ["idx_shift_date_dept",         "Roster grid"],
          ],
          col_widths_cm=[6.0, 11.0])

    h1(doc, "13. Migration Sequence")
    numbered(doc, "v0 — bootstrap: tenants, roles, staff, credentials.")
    numbered(doc, "v1 — patient, visit, encounter, note.")
    numbered(doc, "v2 — order, order_item, lab_result, rad_report.")
    numbered(doc, "v3 — prescription, rx_line, drug, drug_stock, pharmacy_claim, narcotic_log.")
    numbered(doc, "v4 — ipd_stay, bed_assignment, bed, ward, vital, mar_dose.")
    numbered(doc, "v5 — discharge, discharge_pillar.")
    numbered(doc, "v6 — bill, bill_line, payment, refund, preauth, claim.")
    numbered(doc, "v7 — shift_template, shift_assignment, coverage_minimum, sick_call, leave_request, on_call_rotation.")
    numbered(doc, "v8 — payroll_period, payroll_line.")
    numbered(doc, "v9 — vendor, vendor_invoice, po, statutory_obligation, statutory_attestation.")
    numbered(doc, "v10 — audit, audit_attestation, nabh_evidence, nabh_chapter_status.")
    numbered(doc, "v11 — consent, dpdp_log, rtbf_request, breach_attestation.")
    numbered(doc, "v12 — incident, capa, document_control.")
    numbered(doc, "v13 — thread, thread_member, message, notification.")

    h1(doc, "14. How Schema Serves Each Flow")
    table(doc, ["App flow", "Tables touched"],
          [
              ["OPD consult",       "patient, visit, encounter, note, order, prescription, rx_line, audit"],
              ["IPD chart",         "ipd_stay, bed_assignment, vital, mar_dose, order, note, audit"],
              ["Lab order → result", "order, order_item, lab_result, audit"],
              ["Pharmacy dispense",  "rx_line, drug, drug_stock, pharmacy_claim, dispense_event, audit"],
              ["Discharge clearance","discharge, discharge_pillar, bill, audit"],
              ["Billing & insurance","bill, bill_line, payment, preauth, claim, audit"],
              ["Staff lifecycle",     "staff, credential, shift_assignment, leave_request, payroll_line, audit"],
              ["Coverage gauges",     "shift_assignment, coverage_minimum, sick_call"],
              ["Compliance cockpit",  "audit, nabh_evidence, nabh_chapter_status, statutory_obligation, vendor, dpdp_log"],
              ["Quality module",      "incident, capa, document_control"],
              ["Messaging",           "thread, thread_member, message, notification"],
          ],
          col_widths_cm=[5.0, 12.0])

    h1(doc, "A. Version History")
    table(doc, ["Version", "Date", "Author", "Notes"],
          [["v1.0", DOC_DATE, AUTHOR, "Initial target schema; current repo has no DB."]],
          col_widths_cm=[2.0, 3.0, 4.5, 7.5])

    save(doc, out)


if __name__ == "__main__":
    build(Path(__file__).parent / "05_Backend_Schema_v1.0.docx")
