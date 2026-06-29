"""Generate 01_BRD_v1.0.docx — Business Requirements Document."""
from pathlib import Path
from _helpers import *


def build(out: Path) -> None:
    doc = new_doc()
    cover(doc, "01 — BRD", "Business Requirements Document",
          "Umang HIMS — business intent, scope, requirements")
    toc(doc)

    # ── 1 Executive Summary ───────────────────────────────────────────────
    h1(doc, "1. Executive Summary")
    p(doc,
      "Umang HIMS is an AI-first, NABH-aligned Hospital Management System designed to run "
      "the operational, clinical, financial, and compliance workflows of a 200-bed multi-specialty "
      "hospital from a single integrated platform.")
    p(doc,
      "Twenty-four staff roles and a patient self-service portal share one audit-traceable "
      "data backbone. AI assistance is woven through every clinical surface — pre-briefs, "
      "drug-safety gating, NEWS2 escalation, triage prediction, denial-risk scoring, voice "
      "scribing — with a Human-In-The-Loop accept / reject / modify envelope on every output.")
    p(doc,
      "The current prototype demonstrates the complete UI and audit fabric end-to-end on "
      "client-side seeded data. v1.0 will replace seed data with a real backend, real auth, "
      "real AI vendor wiring, and externally-hosted integrations (WhatsApp, payments, lab "
      "instrument interfaces) — see §6 of this document and 06 Implementation Plan.")

    h2(doc, "1.1 Business Outcomes")
    table(doc, ["Outcome", "Measure", "Target"],
          [
              ["Reduce time from arrival to first consult",         "Median minutes",                "≤ 18 min"],
              ["Eliminate hand-written prescriptions",              "% e-Rx",                        "100 %"],
              ["Catch medication errors before dispense",           "Drug-safety blocks fired / day", "Reported per shift"],
              ["NABH evidence pack ready any day",                  "Chapters with evidence",        "9 / 9"],
              ["DPDP / DISHA audit readiness",                      "Days to assemble pack",          "≤ 1 working day"],
              ["First-pass insurance claim acceptance",             "% accepted on first submission","≥ 85 %"],
              ["Bed turnover after discharge",                      "Median minutes",                "≤ 45 min"],
              ["AI clinical suggestions adopted",                    "% accept-or-modify",            "≥ 60 %"],
          ],
          col_widths_cm=[7.0, 5.0, 5.0])

    page_break(doc)

    # ── 2 Purpose and Scope ───────────────────────────────────────────────
    h1(doc, "2. Purpose & Scope")
    h2(doc, "2.1 Purpose")
    p(doc,
      "Provide a single integrated system that covers every staff function in a multi-specialty "
      "hospital from the moment a patient (or relative) reaches out, through registration, "
      "triage, consultation, investigation, admission, surgery, billing, discharge, and "
      "follow-up — with all data linked, auditable, and shareable with the patient.")
    h2(doc, "2.2 In Scope (v1.0)")
    for s in [
        "All 24 staff portals (clinical, operations, finance, management, support) plus the patient portal.",
        "OPD, IPD, ER, OT, ICU, blood-bank, lab, radiology, pharmacy, dietary, CSSD, BMW, mortuary, ambulance.",
        "Bed management, admission requests, discharge clearances (pharmacy / billing / files / handover).",
        "Cashless and cash billing with line-item itemisation, payer-type routing, duplicate-charge detection.",
        "Insurance pre-auth and claim lifecycle with TPA desk, denial-risk scoring, AI-drafted justifications.",
        "NABH evidence streaming across 9 chapters (AAC, COP, MOM, HIC, PRE, IMS, CQI, ROM, HRM).",
        "DPDP / DISHA access logging, consent capture, Right-To-Erasure queue, breach attestation.",
        "Statutory return calendar (PF / ESI / GST / TDS / PT / etc.) with file-action logging.",
        "Quality module — incidents, CAPA, audit trail viewer, NABH cockpit.",
        "AI services (38 surfaces): triage, drug-safety, NEWS2 escalation, pre-briefs, summarisation, "
        "denial risk, voice scribe — all HITL-gated.",
        "i18n in English and Hindi (extensible).",
        "Audit trail of every state-changing action, immutable, queryable by module / actor / patient / time.",
    ]:
        bullet(doc, s)

    h2(doc, "2.3 Out of Scope (v1.0)")
    for s in [
        "Tele-radiology vendor PACS integration (read-only DICOM view assumed via the standard viewer).",
        "Hospital information signage / queue display screens.",
        "Patient mobile native apps (PWA only).",
        "Multi-branch federated reporting (single-branch deployment in v1; multi-branch is v2 — see GAP-031).",
        "Financial ERP integration (Tally / SAP export-only).",
        "Telemedicine video bridge of own implementation — third-party iframe integration only.",
        "Doctor revenue-share calculator (display-only in v1 — see GAP-035).",
        "Live ICU device telemetry (manual vitals only in v1 — see GAP-029).",
    ]:
        bullet(doc, s)

    page_break(doc)

    # ── 3 Stakeholders ────────────────────────────────────────────────────
    h1(doc, "3. Stakeholders")
    table(doc, ["Stakeholder", "Interest", "Influence"],
          [
              ["Hospital Owner / Trust Board",   "ROI, regulatory exposure, brand",                 "Decision authority"],
              ["Chief Operating Officer (COO)",  "Day-to-day operations, financial visibility",     "Approves scope"],
              ["Medical Superintendent",         "Clinical safety, MoM, NABH conformance",          "Sign-off on clinical flows"],
              ["Chief Nursing Officer",          "Nursing rosters, MAR, handovers",                 "Sign-off on nursing flows"],
              ["Finance Head / CFO",             "Revenue cycle, claim acceptance, payroll",        "Sign-off on finance flows"],
              ["Quality Manager",                "NABH evidence, incidents, CAPA",                  "Sign-off on quality flows"],
              ["DPO (Data Protection Officer)",  "DPDP / DISHA conformance, breach response",       "Veto on data flows"],
              ["IT Head",                        "Architecture, integrations, uptime, security",    "Tech approval"],
              ["End users (24 roles)",           "Daily productivity",                              "Champions / blockers"],
              ["Patients & Relatives",           "Transparent care, billing, records access",       "Voice via feedback module"],
              ["External auditors (NABH, DPDP, GST, PF)", "Periodic evidence",                       "Audit verdicts"],
              ["Vendors (instrument, drug, BMW)", "Order placement, payment timelines",             "Service continuity"],
          ],
          col_widths_cm=[5.5, 8.0, 4.0])

    page_break(doc)

    # ── 4 User Roles ──────────────────────────────────────────────────────
    h1(doc, "4. User Roles & Responsibilities")
    p(doc, "Twenty-four staff roles plus the patient portal. Each role is keyed in "
           "src/types/roles.ts and granted access via the RBAC matrix at src/lib/permissions.ts.")

    h2(doc, "4.1 Clinical roles")
    table(doc, ["Role", "Primary responsibility", "Key surface"],
          [
              ["Doctor",      "Consult, prescribe, admit, discharge, sign-off",        "/doctor/dashboard"],
              ["Nurse",       "Rounds, MAR, vitals, handover, alerts",                 "/nurse/dashboard"],
              ["Pharmacy",    "Verify Rx, drug-safety, dispense (OPD/IPD/OT/ICU)",     "/pharmacy/queue"],
              ["Lab",         "Sample routing, bench testing, QC, verification",       "/lab/dashboard"],
              ["Radiology",   "Inbox → modality → reading → verification",             "/radiology/dashboard"],
              ["Emergency",   "ESI triage, floor, doctor allocation",                  "/emergency/dashboard"],
          ],
          col_widths_cm=[3.5, 9.0, 4.5])

    h2(doc, "4.2 Operations roles")
    table(doc, ["Role", "Primary responsibility", "Key surface"],
          [
              ["Reception",     "Register / queue OPD walk-ins & appointments",         "/reception/dashboard"],
              ["Bed Manager",   "Bed assignment, admission requests, transfers",         "/admission/dashboard"],
              ["Discharge",     "Pharmacy / billing / files / handover clearance",       "/discharge/dashboard"],
              ["OT",            "Pre-op checklist (WHO 2009), scheduling",                "/ot/dashboard"],
              ["Housekeeping",  "Bed turnover queue, biohazard, terminal clean",          "/housekeeping/dashboard"],
              ["Ambulance",     "Dispatch, trip log, ER pre-notify",                       "/ambulance/dashboard"],
          ],
          col_widths_cm=[3.5, 9.0, 4.5])

    h2(doc, "4.3 Finance roles")
    table(doc, ["Role", "Primary responsibility", "Key surface"],
          [
              ["Billing",     "Bills, line items, payer routing, duplicate-charge",       "/billing/dashboard"],
              ["Insurance",   "Pre-auth, claim submission, denial-risk, TPA desk",         "/insurance/dashboard"],
          ],
          col_widths_cm=[3.5, 9.0, 4.5])

    h2(doc, "4.4 Management roles")
    table(doc, ["Role", "Primary responsibility", "Key surface"],
          [
              ["Admin (COO)",      "Hospital P&L, staff lifecycle, compliance cockpit, finance",     "/admin/dashboard"],
              ["Quality",          "NABH cockpit, incidents, CAPA",                                  "/quality/dashboard"],
              ["Audit Officer",    "Cross-module audit trail, NABH evidence packs",                 "/audit/dashboard"],
              ["Inventory",        "Drug master, stock, vendors",                                    "/inventory/dashboard"],
          ],
          col_widths_cm=[3.5, 9.5, 4.0])

    h2(doc, "4.5 Support roles")
    table(doc, ["Role", "Primary responsibility", "Key surface"],
          [
              ["Blood Bank",    "Cross-match, bedside checks, issue, recall",                       "/bloodbank/dashboard"],
              ["CSSD",          "Sterilisation cycles, BI gating, traceability",                    "/cssd/dashboard"],
              ["Dietary",       "Diet orders, meal counts",                                          "/dietary/dashboard"],
              ["BMW",           "CPCB waste log, vendor handover",                                  "/bmw/dashboard"],
              ["Mortuary",      "MLC clearance, certificate issue",                                  "/mortuary/dashboard"],
          ],
          col_widths_cm=[3.5, 9.5, 4.0])

    h2(doc, "4.6 Patient portal")
    p(doc, "Patient self-service: view chart, lab results (after release), bills, "
           "discharge documents, give feedback, message care team, online consult, family-track. "
           "Access surface: /patient/dashboard and several deep links such as /patient/radiology, "
           "/patient/ipd, /patient/discharge.")

    page_break(doc)

    # ── 5 Business Rules ─────────────────────────────────────────────────
    h1(doc, "5. Business Rules")
    h2(doc, "5.1 Universal rules")
    bullet(doc, "Every state-changing action MUST emit to the audit log with actor, role, target, timestamp, and an NABH chapter tag (where applicable). See src/store/useAuditStore.ts (37 typed action codes, 9 NABH chapter mappings).")
    bullet(doc, "Permissions are data, not code. UI calls canDo(role, action) — see src/lib/permissions.ts. No role checks should be hard-coded.")
    bullet(doc, "Every AI output is a suggestion. A clinician must accept / reject / modify before the suggestion takes effect.")
    bullet(doc, "PII is masked in lists by default. Full PII is unmasked on explicit drawer / detail open, which itself audits a DISHA access event.")
    bullet(doc, "Soft-delete only. Hard delete is reserved for RTBF (DPDP §13) and follows the documented workflow in /admin/disha.")

    h2(doc, "5.2 Clinical rules")
    bullet(doc, "Doctor cannot consult outside their shift window unless they elect 'override-on-call'. The shift gate fires before the consult ticket loads.")
    bullet(doc, "Prescription is gated by the drug-safety engine. Allergy, interaction, dosage range, narcotic schedule — at least one must be cleared before submit.")
    bullet(doc, "NEWS2 ≥ 5 triggers nurse escalation and a doctor banner. Threshold configurable per ward.")
    bullet(doc, "OT proceeds only with: WHO 2009 sign-in + time-out + sign-out completed, anaesthetist confirmed, blood-bank confirmed where flagged.")
    bullet(doc, "Discharge cannot complete unless all four pillars are green: Pharmacy returns, Final bill cleared, Files signed, Handover acknowledged.")
    bullet(doc, "Lab result is releasable only after QC pass + verifier sign-off + critical-value path completion.")

    h2(doc, "5.3 Financial rules")
    bullet(doc, "Bills freeze on discharge approval; subsequent edits require a freeze-override (audited).")
    bullet(doc, "Cashless visits route through insurance; cash patients route through billing direct. Mixed-payer split is allowed.")
    bullet(doc, "Duplicate-charge AI runs on every bill on save. Flagged lines block submit until reviewed.")
    bullet(doc, "Refunds are a separate workflow gated by COO / Finance Head approval.")

    h2(doc, "5.4 Compliance rules")
    bullet(doc, "NABH evidence emits automatically from action codes. A chapter is 'ready' if every required evidence type has at least one event in the last 90 days.")
    bullet(doc, "DPDP record-access events fire on patient chart open. Consent is mandatory before first chart open and renewed annually.")
    bullet(doc, "RTBF is processed within 30 days of request acknowledgement (DPDP §13).")
    bullet(doc, "Breach: any DPO-attested incident must be filed within 72 hours of discovery (DPDP §8(6)).")
    bullet(doc, "BMW handovers must produce a CPCB Form-IV-compatible export.")

    h2(doc, "5.5 HR / Staff rules")
    bullet(doc, "A staff member with an expired licence cannot be assigned a clinical shift (gate fires at roster save).")
    bullet(doc, "Coverage minimums per department are configurable. A shift falling below the minimum triggers a sick-call workflow + auto-escalation watcher.")
    bullet(doc, "On-call rotation is auto-suggested but locks on manual override.")

    page_break(doc)

    # ── 6 Functional Requirements ─────────────────────────────────────────
    h1(doc, "6. Functional Requirements")
    p(doc, "FR-IDs are stable, referenced from 06 Implementation Plan and 07 Gap Analysis.")

    h2(doc, "6.1 Registration & Front-Desk (FR-100s)")
    table(doc, ["ID", "Requirement", "Acceptance"],
          [
              ["FR-101", "Walk-in registration in ≤ 60 seconds",                 "Time-to-token ≤ 60 s on a clean form"],
              ["FR-102", "Appointment booking with doctor availability gate",    "Slot only offered if doctor is on duty"],
              ["FR-103", "OPD queue with served / waiting / cancelled states",   "State changes audited; queue refreshes ≤ 5 s"],
              ["FR-104", "Aadhaar / phone OTP-based identity verification",      "Verification stored on the visit record"],
              ["FR-105", "Returning patient lookup by phone or HN",               "Match within 2 s on indexed phone"],
          ],
          col_widths_cm=[1.6, 9.5, 5.5])

    h2(doc, "6.2 Doctor OPD & IPD (FR-200s)")
    table(doc, ["ID", "Requirement", "Acceptance"],
          [
              ["FR-201", "Single-row OPD queue with patient summary on hover",   "Hover summary returns ≤ 200 ms"],
              ["FR-202", "Comprehensive IPD chart: vitals, MAR, orders, notes",   "Chart full-page; phone-responsive"],
              ["FR-203", "AI pre-brief on opening a chart",                       "Pre-brief renders ≤ 3 s; HITL accept/reject"],
              ["FR-204", "Drug-safety on every Rx submit",                         "All four checks (allergy/interaction/dose/narcotic)"],
              ["FR-205", "Voice scribe with HITL approval",                       "Transcript editable before save"],
              ["FR-206", "Doctor copilot with tool-calling",                       "Tools: schedule, order, refer, summarise"],
              ["FR-207", "Online consultation: one-row-per-patient",              "Tile collapses; expand for vitals + Rx"],
              ["FR-208", "Activity graph (consults/day, accept-rate)",            "Configurable date range; CSV export"],
          ],
          col_widths_cm=[1.6, 9.5, 5.5])

    h2(doc, "6.3 Nursing (FR-300s)")
    table(doc, ["ID", "Requirement", "Acceptance"],
          [
              ["FR-301", "Ward dashboard with bed map",                       "Status (occupied / clean / cleaning) live"],
              ["FR-302", "Rounds: vitals capture, NEWS2 auto-compute",       "Score visible on capture"],
              ["FR-303", "MAR with on-time / late / missed states",          "Late > 30 min flags red"],
              ["FR-304", "Handover brief, structured + AI-summarised",       "Save and read back on next shift"],
              ["FR-305", "Sepsis & deterioration alerts",                    "qSOFA / NEWS2 thresholds configurable"],
          ],
          col_widths_cm=[1.6, 9.5, 5.5])

    h2(doc, "6.4 Lab, Radiology, Pharmacy (FR-400s)")
    table(doc, ["ID", "Requirement", "Acceptance"],
          [
              ["FR-401", "Lab 5-bench routing (Hema/Biochem/Immuno/Urine/Micro)", "Routing rules per analyte"],
              ["FR-402", "Lab multi-tech claim + QC + verification chain",         "All three steps audited"],
              ["FR-403", "Reflex testing rules engine",                            "Auto-add panel on positive result"],
              ["FR-404", "Microbiology multi-day workflow",                        "Stages: gram → culture → sens → report"],
              ["FR-405", "Radiology inbox → modality → reading → verify",         "Status transitions audited"],
              ["FR-406", "Pharmacy unified queue (OPD/IPD/OT/ICU/Discharge)",      "Tags filter, claim model, bedside dispense"],
              ["FR-407", "Drug interaction & substitution at dispense",            "Block + suggest substitute"],
              ["FR-408", "Narcotic register with sign-out trail",                 "Schedule X separate ledger"],
          ],
          col_widths_cm=[1.6, 9.5, 5.5])

    h2(doc, "6.5 Billing & Insurance (FR-500s)")
    table(doc, ["ID", "Requirement", "Acceptance"],
          [
              ["FR-501", "Itemised bill per encounter / IPD stay",              "Lines from orders, drugs, beds, procedures"],
              ["FR-502", "Payer routing (cash / corporate / insurance / govt)", "Default by patient profile, override per bill"],
              ["FR-503", "Duplicate-charge AI flag",                            "Block submit on red flag until reviewed"],
              ["FR-504", "Insurance pre-auth lifecycle",                        "Draft → sent → approved / rejected / pending"],
              ["FR-505", "Denial-risk AI score on submit",                      "Score ≥ 0.7 surfaces guidance"],
              ["FR-506", "AI-drafted claim justification (HITL)",               "Doctor must approve before send"],
              ["FR-507", "Refund workflow with approver gate",                  "Two-step approval"],
              ["FR-508", "UPI / cash payment capture",                          "Receipt + audit"],
          ],
          col_widths_cm=[1.6, 9.5, 5.5])

    h2(doc, "6.6 OT, ER, Bed Mgmt, Discharge (FR-600s)")
    table(doc, ["ID", "Requirement", "Acceptance"],
          [
              ["FR-601", "ER triage with ESI 1–5 + AI suggest",            "AI suggestion always editable"],
              ["FR-602", "ER floor with bay status",                       "Resuscitation / observation / discharge"],
              ["FR-603", "Bed map with assignment, transfer, swap",       "Auto-cascade housekeeping on free"],
              ["FR-604", "OT WHO 2009 checklist (verbatim)",              "Sign-in + time-out + sign-out all required"],
              ["FR-605", "Discharge clearance: 4 pillars",                "Pharmacy / billing / files / handover"],
              ["FR-606", "Discharge summary draft (AI) with HITL",        "Doctor accepts; patient + GP copy"],
          ],
          col_widths_cm=[1.6, 9.5, 5.5])

    h2(doc, "6.7 Admin / COO Cockpit (FR-700s)")
    table(doc, ["ID", "Requirement", "Acceptance"],
          [
              ["FR-701", "Hospital P&L by day / week / month",                  "Revenue, cost, contribution per dept"],
              ["FR-702", "Staff directory + profile drawer",                    "Cross-store sync; deep links to roster / payroll"],
              ["FR-703", "4-week roster grid with templates",                   "Drag-and-drop; conflict engine fires inline"],
              ["FR-704", "Coverage gauges per department",                       "Below-minimum → sick-call workflow"],
              ["FR-705", "Compliance cockpit with overall score + 5 streams",    "NABH / DISHA / Statutory / MoUs / BMW"],
              ["FR-706", "Statutory return calendar",                            "PF, ESI, GST, TDS, PT due in next 14 d"],
              ["FR-707", "Vendor MoU expiry tracker",                            "30 / 60 / 90-day warnings"],
              ["FR-708", "Payroll preview (HRMS export)",                        "Run, freeze, export"],
          ],
          col_widths_cm=[1.6, 9.5, 5.5])

    h2(doc, "6.8 Compliance, Audit, Quality (FR-800s)")
    table(doc, ["ID", "Requirement", "Acceptance"],
          [
              ["FR-801", "Full cross-module audit trail with filters",           "Module / role / actor / patient / date"],
              ["FR-802", "Per-NABH-chapter evidence pack export",                "PDF + CSV"],
              ["FR-803", "DISHA / DPDP recent activity log",                      "Record access, consent, RTBF, breaches"],
              ["FR-804", "Incident reporting + CAPA workflow",                   "Lifecycle: report → investigate → CAPA → close"],
              ["FR-805", "Document control (SOP / policy versions)",              "Approval, expiry, retrieval audit"],
          ],
          col_widths_cm=[1.6, 9.5, 5.5])

    h2(doc, "6.9 Patient Portal (FR-900s)")
    table(doc, ["ID", "Requirement", "Acceptance"],
          [
              ["FR-901", "Dashboard with active visits, last vitals, next appt", "Personalised view"],
              ["FR-902", "Lab & radiology results (released only)",              "Notify on release"],
              ["FR-903", "IPD stay overview, photo journal",                     "Role-permitted photos only"],
              ["FR-904", "Discharge documents, follow-up plan",                  "Downloadable PDF"],
              ["FR-905", "Messaging with care team",                             "Inbox unified with staff messaging"],
              ["FR-906", "Feedback & complaint capture",                         "Linked to quality module"],
              ["FR-907", "Family-track read-only summary",                       "Shareable by patient consent"],
          ],
          col_widths_cm=[1.6, 9.5, 5.5])

    page_break(doc)

    # ── 7 Non-Functional Requirements ─────────────────────────────────────
    h1(doc, "7. Non-Functional Requirements")
    table(doc, ["ID", "Category", "Requirement"],
          [
              ["NFR-01", "Performance",   "p95 page load ≤ 2 s on broadband; ≤ 4 s on 4G"],
              ["NFR-02", "Performance",   "Interaction-to-feedback ≤ 200 ms for click / type"],
              ["NFR-03", "Availability", "99.5 % monthly during clinical hours (07:00–22:00)"],
              ["NFR-04", "Availability", "Read-only fallback on backend outage (cached lists, no writes)"],
              ["NFR-05", "Security",     "All PII at rest encrypted (AES-256) — see TRD §8"],
              ["NFR-06", "Security",     "All inter-service traffic over TLS 1.2+"],
              ["NFR-07", "Security",     "OWASP Top 10 controls evidenced via TRD §8"],
              ["NFR-08", "Privacy",      "DPDP-compliant consent + RTBF; DPO-attested breaches in 72 h"],
              ["NFR-09", "Auditability", "Every state-changing action audited, immutable, 7-year retention"],
              ["NFR-10", "Usability",    "All primary surfaces operable on 390-wide phones"],
              ["NFR-11", "Accessibility","WCAG 2.1 AA on staff portals; AAA contrast in clinical surfaces"],
              ["NFR-12", "i18n",         "English + Hindi at launch; locale-switch hot"],
              ["NFR-13", "Scalability",  "Designed for 100 concurrent staff / 500 daily visits"],
              ["NFR-14", "Maintainability","TypeScript strict; no any escapes; lint clean; conventions in AGENTS.md"],
              ["NFR-15", "Observability","Structured logs, request IDs, audit log queryable in real time"],
              ["NFR-16", "Disaster Recovery", "RPO 1 h, RTO 4 h on production"],
              ["NFR-17", "Compliance",   "NABH evidence streaming across 9 chapters always-ready"],
              ["NFR-18", "AI",           "Every AI suggestion HITL with reasoning + confidence visible"],
          ],
          col_widths_cm=[1.8, 3.5, 11.0])

    page_break(doc)

    # ── 8 Assumptions ─────────────────────────────────────────────────────
    h1(doc, "8. Assumptions")
    bullet(doc, "Single-tenant single-branch deployment at go-live; multi-branch federated reporting deferred (see GAP-031).")
    bullet(doc, "All clinical staff have an India Medical Council registration; pharmacists have a Pharmacy Council number; nurses have a State Nursing Council reg.")
    bullet(doc, "Hospital has executed an MoU with at least one TPA, one BMW vendor, one drug distributor, and one diagnostic backup partner.")
    bullet(doc, "Hospital network is wired-or-Wi-Fi at every staff station; bedside data entry assumed on shared tablet, not personal mobile.")
    bullet(doc, "Patient consent for digital record processing is captured at first visit; renewal cadence is annual.")
    bullet(doc, "Backups are taken nightly to an off-site DR location; restore tested quarterly.")

    h1(doc, "9. Dependencies")
    bullet(doc, "External LLM vendor — pending decision (see Q2 in 00 INDEX §8).")
    bullet(doc, "WhatsApp Business API account.")
    bullet(doc, "Payment gateway (UPI mandatory; cards optional).")
    bullet(doc, "Government identity verification (Aadhaar OTP / DigiLocker).")
    bullet(doc, "Lab analyser middleware (HL7 / ASTM bridge — not in v1; manual result entry until that integration ships).")

    h1(doc, "10. Acceptance & Sign-off")
    p(doc,
      "The BRD is accepted when the COO, Medical Superintendent, Finance Head, DPO, and IT Head "
      "have signed off in writing and the six open questions in 00 INDEX §8 are resolved.")

    h1(doc, "A. Version History")
    table(doc, ["Version", "Date", "Author", "Notes"],
          [["v1.0", DOC_DATE, AUTHOR, "Initial issue grounded in repo state on 2026-06-01"]],
          col_widths_cm=[2.0, 3.0, 4.5, 7.5])

    save(doc, out)


if __name__ == "__main__":
    build(Path(__file__).parent / "01_BRD_v1.0.docx")
