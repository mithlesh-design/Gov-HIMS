"""Generate 06_Implementation_Plan_v1.0.docx — phased UI-first roadmap."""
from pathlib import Path
from _helpers import *


def build(out: Path) -> None:
    doc = new_doc()
    cover(doc, "06 — Plan", "Implementation Plan",
          "UI-first → data → backend → integrations — phased delivery roadmap")
    toc(doc)

    h1(doc, "1. Strategy")
    p(doc, "v1.0 is delivered in four overlapping arcs. The UI fabric is already built; "
           "the priority is to wire it to a real backend without breaking the design language.")
    bullet(doc, "Arc A — UI polish & gaps: close the remaining UX gaps (GAP-040 … 049) without changing data shape.")
    bullet(doc, "Arc B — Data layer: introduce DB + repositories; switch reads from in-memory to API.")
    bullet(doc, "Arc C — Backend & auth: REST + Server Actions + OIDC; complete RBAC server-side.")
    bullet(doc, "Arc D — Integrations & AI: real LLM gateway, payment, WhatsApp, lab/HL7, observability.")

    h1(doc, "2. Phasing Overview")
    table(doc, ["Phase", "Length", "Goal", "Exit"],
          [
              ["P1 UI close-out",     "2 weeks", "Close UX / responsive gaps; freeze design tokens.",     "All UI gaps Closed; Storybook live."],
              ["P2 DB & repos",        "3 weeks", "Postgres + repositories + read-only API.",              "All staff pages render against API; localStorage off."],
              ["P3 Write paths",       "4 weeks", "All mutations hit API; audit-log is the source of truth.","Audit chip counts match DB; soft-delete only."],
              ["P4 Auth & RBAC",       "2 weeks", "OIDC, refresh-token rotation, server-side canDo.",      "Login through IdP; role grants from JWT claims."],
              ["P5 AI gateway",        "2 weeks", "Real LLM vendor; HITL preserved; per-service config.",  "All 38 services route through gateway; logs in DB."],
              ["P6 Integrations",      "3 weeks", "UPI / WhatsApp prod / Email-SMS / Aadhaar OTP.",        "Pre-auth via TPA stub; UPI test mode complete."],
              ["P7 Observability & DR","1 week",  "Logs/metrics/traces; backup-restore drill.",            "SLOs publishing; restore evidence."],
              ["P8 Hardening & UAT",   "2 weeks", "OWASP, security review, UAT cycle.",                    "Sign-off from COO / MS / DPO / Finance."],
          ],
          col_widths_cm=[3.5, 2.0, 6.5, 5.0])

    page_break(doc)

    h1(doc, "3. Sprint Plan")

    h2(doc, "Sprint 1 — UI close-out (Phase 1)")
    table(doc, ["Task", "Closes", "Acceptance"],
          [
              ["Storybook for ui/* and clinical/*",                                       "GAP-040", "All shared components have stories"],
              ["WCAG sweep — focus rings, ARIA labels, live regions",                      "GAP-041", "Lighthouse a11y ≥ 95 on key pages"],
              ["Phone (390 px) walk-through of doctor + nurse + ER",                       "GAP-042", "Puppeteer phone sweep green"],
              ["i18n key audit; add missing Hindi strings",                                "GAP-043", "next-intl test passes; no missing-key warnings"],
              ["Replace alert() / confirm() with Dialog component (statutory, refund)",    "GAP-044", "Zero alert/confirm in src/"],
              ["Empty / loading / error state coverage on every list",                     "GAP-045", "Visual sweep finds no spinner-only states"],
              ["Activity graph: server-side aggregation prep",                              "GAP-046", "Endpoint shape agreed with backend"],
          ],
          col_widths_cm=[8.5, 2.5, 6.0])

    h2(doc, "Sprint 2 — DB foundation (Phase 2)")
    table(doc, ["Task", "Closes", "Acceptance"],
          [
              ["Postgres v0 migration: tenants, roles, staff, credentials",                "GAP-010", "Migration green on dev + staging"],
              ["Repository pattern (tsx + zod schemas mirror DB tables)",                  "GAP-011", "Repos covered by unit tests"],
              ["Read-only API for staff (admin), shift, credential",                       "GAP-012", "Admin pages render from API"],
              ["Replace localStorage in useHRStore / useShiftStore / useVendorStore",       "GAP-013", "StoreHydrator no longer touches these stores"],
          ],
          col_widths_cm=[8.5, 2.5, 6.0])

    h2(doc, "Sprint 3 — Patient & visit (Phase 2 cont.)")
    table(doc, ["Task", "Closes", "Acceptance"],
          [
              ["Migrations v1 — patient, visit, encounter, note",                          "GAP-015", "Patient CRUD in admin"],
              ["Reception walk-in registration writes to DB",                               "GAP-016", "Front-desk e2e green"],
              ["Doctor OPD reads queue + writes note via API",                              "GAP-017", "Doctor e2e green"],
              ["DPDP record-access log fires on chart open",                                "GAP-020", "Audit + DISHA event visible"],
          ],
          col_widths_cm=[8.5, 2.5, 6.0])

    h2(doc, "Sprint 4 — Orders, Rx, Pharmacy (Phase 3)")
    table(doc, ["Task", "Closes", "Acceptance"],
          [
              ["Migrations v2-v3 — order, prescription, drug, pharmacy_claim",              "GAP-019", "Drug master loaded"],
              ["Drug-safety engine runs server-side; envelope returned to client",          "GAP-021", "All 4 checks fire; deterministic"],
              ["Pharmacy queue + dispense events end-to-end",                               "GAP-022", "Bedside dispense recorded"],
              ["Narcotic register with sign-out trail",                                     "GAP-026", "Two-signatory enforced; audited"],
          ],
          col_widths_cm=[8.5, 2.5, 6.0])

    h2(doc, "Sprint 5 — Lab & Radiology (Phase 3)")
    table(doc, ["Task", "Closes", "Acceptance"],
          [
              ["Migrations + APIs for lab_result + rad_report",                              "GAP-025", "Lab inbox / verify chain green"],
              ["Reflex rules engine on server (no client guesswork)",                       "GAP-028", "Reflex panel auto-added in tests"],
              ["Critical-value notification path to doctor + nurse",                        "GAP-029", "Pager + audit + banner"],
          ],
          col_widths_cm=[8.5, 2.5, 6.0])

    h2(doc, "Sprint 6 — IPD, MAR, Discharge (Phase 3)")
    table(doc, ["Task", "Closes", "Acceptance"],
          [
              ["IPD stay + bed assignment + vitals",                                        "GAP-030", "Bed map live; transfers cascade"],
              ["MAR — due / on-time / late / missed states",                                "GAP-032", "Nurse e2e green"],
              ["Discharge 4-pillar gate; freeze bill on confirm",                            "GAP-033", "Discharge e2e green"],
              ["AI discharge summary (HITL) calls gateway",                                 "GAP-034", "Doctor signs the summary"],
          ],
          col_widths_cm=[8.5, 2.5, 6.0])

    h2(doc, "Sprint 7 — Billing & Insurance (Phase 3)")
    table(doc, ["Task", "Closes", "Acceptance"],
          [
              ["Bill line auto-population from orders / drugs / bed / procedures",          "GAP-023", "Bills reconcile to lines"],
              ["Duplicate-charge AI flag with deterministic checks (server)",                "GAP-024", "Block submit on flagged lines"],
              ["Pre-auth lifecycle + denial-risk AI envelope",                              "GAP-036", "Risk score visible; gated approval"],
              ["Refund two-step approval",                                                  "GAP-037", "Audit + state machine"],
          ],
          col_widths_cm=[8.5, 2.5, 6.0])

    h2(doc, "Sprint 8 — Auth & RBAC (Phase 4)")
    table(doc, ["Task", "Closes", "Acceptance"],
          [
              ["OIDC integration; password fallback removed at IdP",                        "GAP-001", "All roles login via IdP"],
              ["JWT + refresh rotation; reuse detection",                                    "GAP-002", "Test for stolen refresh fails closed"],
              ["Server-side canDo on every mutation",                                        "GAP-003", "RBAC bypass attempts denied + audited"],
              ["Aadhaar OTP / DigiLocker patient onboarding (opt-in)",                        "GAP-004", "Patient verified end-to-end"],
          ],
          col_widths_cm=[8.5, 2.5, 6.0])

    h2(doc, "Sprint 9 — AI gateway (Phase 5)")
    table(doc, ["Task", "Closes", "Acceptance"],
          [
              ["src/ai-services/_gateway.ts — vendor abstraction",                          "GAP-014", "All 38 services route through it"],
              ["Per-service config (model, budget, fallback) in admin UI",                  "GAP-038", "Switching vendor takes < 1 minute"],
              ["AI evidence table + DPDP-aware redaction in logs",                          "GAP-039", "PHI not stored verbatim"],
              ["Recall-cohort and quality-intelligence services",                            "GAP-047", "Real outputs in /quality"],
          ],
          col_widths_cm=[8.5, 2.5, 6.0])

    h2(doc, "Sprint 10 — Integrations (Phase 6)")
    table(doc, ["Task", "Closes", "Acceptance"],
          [
              ["WhatsApp Business API production wire-up",                                  "GAP-018", "OTP + reminders fire in staging"],
              ["UPI payment gateway test-mode",                                              "GAP-024", "Bill paid via UPI captured"],
              ["Email + SMS service abstraction",                                            "GAP-048", "OTP and notifications send"],
              ["Lab analyser bridge (HL7 v2) — read-only spec",                              "GAP-005", "Decision deferred to v2; spec written"],
          ],
          col_widths_cm=[8.5, 2.5, 6.0])

    h2(doc, "Sprint 11 — Observability + DR (Phase 7)")
    table(doc, ["Task", "Closes", "Acceptance"],
          [
              ["Pino structured logs + request IDs everywhere",                              "GAP-049", "Log search returns by request_id"],
              ["Prometheus metrics + Grafana board (latency / errors)",                      "GAP-050", "SLOs computed; dashboard URL in TRD"],
              ["Backup nightly + restore drill",                                              "GAP-051", "Restore drill green; evidence captured"],
          ],
          col_widths_cm=[8.5, 2.5, 6.0])

    h2(doc, "Sprint 12 — Hardening + UAT (Phase 8)")
    table(doc, ["Task", "Closes", "Acceptance"],
          [
              ["Pen-test + OWASP Top-10 sweep",                                              "GAP-052", "Critical / High findings = 0"],
              ["NABH evidence pack rehearsal (all 9 chapters)",                              "GAP-053", "Pack reviewed by QM"],
              ["UAT cycle by COO / MS / Finance / DPO",                                      "GAP-054", "Sign-off recorded"],
              ["Production cutover plan + runbook",                                          "GAP-055", "Runbook executed in DR drill"],
          ],
          col_widths_cm=[8.5, 2.5, 6.0])

    page_break(doc)

    h1(doc, "4. Milestones & Dates (illustrative)")
    table(doc, ["Milestone", "Sprint", "Target"],
          [
              ["UI gaps closed; Storybook live",          "S1",  "Wk 02"],
              ["DB read-only for staff / shift / vendor",  "S2",  "Wk 05"],
              ["Patient + Visit live",                     "S3",  "Wk 08"],
              ["Rx + drug-safety + pharmacy live",         "S4",  "Wk 12"],
              ["Lab + radiology live",                     "S5",  "Wk 15"],
              ["IPD + MAR + Discharge live",               "S6",  "Wk 18"],
              ["Billing + Insurance live",                  "S7",  "Wk 21"],
              ["OIDC + server-side RBAC",                  "S8",  "Wk 23"],
              ["AI gateway",                                "S9",  "Wk 25"],
              ["Integrations",                              "S10", "Wk 28"],
              ["Observability + DR",                       "S11", "Wk 29"],
              ["UAT + cutover",                             "S12", "Wk 31"],
          ],
          col_widths_cm=[7.5, 2.0, 7.5])

    h1(doc, "5. Resourcing (indicative)")
    table(doc, ["Role", "Headcount"],
          [
              ["Tech Lead",                  "1"],
              ["Senior frontend engineer",    "2"],
              ["Senior backend engineer",     "3"],
              ["DevOps / SRE",                "1"],
              ["UX designer",                 "1"],
              ["QA engineer (incl. e2e)",     "2"],
              ["Domain analyst (clinical)",   "1"],
              ["DPO / Compliance",            "0.5 (shared)"],
              ["Project manager",             "1"],
          ],
          col_widths_cm=[7.5, 9.5])

    h1(doc, "6. Risk Register (top 10)")
    table(doc, ["#", "Risk", "Mitigation"],
          [
              ["R1", "LLM vendor decision delayed",        "Lock gateway abstraction first; pluggable vendors."],
              ["R2", "IdP integration drags",              "Allow internal-OIDC stub for staging; cutover late."],
              ["R3", "Drug master licensing",              "Engage with ICDR/Pharmacy Council early."],
              ["R4", "DPDP rules change",                   "Keep consent + RTBF tables generic; quarterly review."],
              ["R5", "Lab analyser vendor lock-in",         "Defer to v2; manual entry in v1."],
              ["R6", "Multi-branch creep",                  "Keep BranchId enum; v2 only."],
              ["R7", "AI hallucination on safety surfaces", "Deterministic gates for safety; LLM never blocks."],
              ["R8", "Audit table volume",                  "Partition by month; cold-tier > 1 yr."],
              ["R9", "Phone-mode regressions",              "Phone sweep in every release."],
              ["R10","Pen-test findings late",              "Run an early hardening sprint (S11.5)."],
          ],
          col_widths_cm=[1.0, 7.5, 8.5])

    h1(doc, "7. Definition of Done (per sprint)")
    bullet(doc, "Typecheck clean; lint clean; unit tests added for new logic.")
    bullet(doc, "Puppeteer e2e sweep for the affected role passes 0 errors.")
    bullet(doc, "Audit chip counts match DB row counts on a fresh smoke test.")
    bullet(doc, "All acceptance criteria in the sprint table green.")
    bullet(doc, "Documentation updated — BRD / TRD / Schema / Gap rows flipped to Closed.")
    bullet(doc, "Per-feature gate: visible screenshot proof attached to PR.")

    h1(doc, "A. Version History")
    table(doc, ["Version", "Date", "Author", "Notes"],
          [["v1.0", DOC_DATE, AUTHOR, "Initial issue. Dates are sprint-relative, not calendar-locked."]],
          col_widths_cm=[2.0, 3.0, 4.5, 7.5])

    save(doc, out)


if __name__ == "__main__":
    build(Path(__file__).parent / "06_Implementation_Plan_v1.0.docx")
