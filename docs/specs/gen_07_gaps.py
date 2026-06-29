"""Generate 07_Gap_Analysis_v1.0.docx — numbered gap register with severity + fix."""
from pathlib import Path
from _helpers import *


def build(out: Path) -> None:
    doc = new_doc()
    cover(doc, "07 — Gaps", "Gap Analysis",
          "End-to-end delta between intent (BRD / TRD) and current code")
    toc(doc)

    h1(doc, "1. How to Read This Document")
    p(doc, "This document is the single source of truth for every delta between the agreed "
           "intent and the current code base. Every gap is numbered (GAP-NNN) and ties back to "
           "a requirement in 01 BRD or 02 TRD; sprint references trace into 06 Implementation Plan.")
    h2(doc, "1.1 Severity")
    table(doc, ["Level", "Definition", "Examples"],
          [
              ["Critical", "Patient safety, legal exposure, or no-go.",        "Auth, drug-safety, audit integrity"],
              ["High",     "Core workflow blocked or evidence broken.",         "DB layer, RBAC, NABH evidence gaps"],
              ["Medium",   "Important but workarounds exist.",                  "AI gateway, integrations, observability"],
              ["Low",      "UX polish, debt, nice-to-have.",                    "Storybook, i18n key gaps, Tailwind cleanup"],
          ],
          col_widths_cm=[2.5, 7.5, 7.0])
    h2(doc, "1.2 Status")
    bullet(doc, "Open — gap exists; sprint assigned in 06.")
    bullet(doc, "In progress — actively being worked.")
    bullet(doc, "Closed — verified in production / staging.")

    h1(doc, "2. Top 10 Critical Gaps (executive read)")
    table(doc, ["#", "Title", "Severity"],
          [
              ["GAP-001", "No real authentication (login is a role-switcher)",          "Critical"],
              ["GAP-003", "No server-side RBAC enforcement",                              "Critical"],
              ["GAP-010", "No relational store; everything is client-side seed data",    "Critical"],
              ["GAP-014", "AI services are stubs; no real LLM wired",                    "Critical"],
              ["GAP-021", "Drug-safety logic runs only client-side",                    "Critical"],
              ["GAP-006", "Audit log is not append-only (lives in localStorage)",        "Critical"],
              ["GAP-007", "PII not encrypted at rest",                                    "Critical"],
              ["GAP-018", "WhatsApp credentials and channels not provisioned",          "High"],
              ["GAP-029", "Critical lab value notification path absent",                  "High"],
              ["GAP-033", "Discharge clearance not enforced as a server-side gate",      "High"],
          ],
          col_widths_cm=[2.0, 12.0, 3.0])

    page_break(doc)

    # ── helpers for gap rows ──────────────────────────────────────────────
    def gap(id_, title, severity, location, why, fix, sprint):
        h3(doc, f"{id_} — {title}")
        kv(doc, "Severity", severity)
        kv(doc, "Where", location)
        kv(doc, "Why it matters", why)
        kv(doc, "Fix", fix)
        kv(doc, "Sprint", sprint)
        doc.add_paragraph("")

    # ── A — AUTH / SESSION / RBAC ─────────────────────────────────────────
    h1(doc, "3. Authentication, Session, RBAC (GAP-001 … 009)")
    gap("GAP-001", "No real authentication",
        "Critical",
        "src/store/useAuthStore.ts (DEMO_USERS), src/components/layout/RoleGuard.tsx",
        "Any user can become any role by clicking a card on /. There is no password, no token, "
        "no session. Unacceptable for clinical data.",
        "OIDC integration (hospital IdP), JWT access + rotating refresh, RoleGuard checks the JWT instead of useAuthStore.",
        "S8 (Auth)")
    gap("GAP-002", "No identity proofing for patients",
        "Critical",
        "src/app/reception/walk-in/* and patient portal entry",
        "Patient lookups by phone number alone are spoofable; DPDP §11 requires reasonable verification.",
        "Aadhaar OTP via UIDAI or DigiLocker linkage at first chart open.",
        "S8")
    gap("GAP-003", "No server-side RBAC enforcement",
        "Critical",
        "src/lib/permissions.ts is consumed client-side only",
        "Even with real auth, mutations would be possible by direct API call without the UI guard.",
        "Wrap every API route + Server Action in canDo(role, action); audit denied attempts.",
        "S8")
    gap("GAP-004", "Aadhaar OTP / DigiLocker patient onboarding",
        "High",
        "No code; spec only",
        "Identity onboarding is the trust foundation for the patient portal.",
        "Integrate with UIDAI / DigiLocker via OAuth.",
        "S8")
    gap("GAP-005", "Lab analyser bridge (HL7 / ASTM)",
        "Medium",
        "Not in code",
        "Without it, lab results are entered manually — slower and error-prone.",
        "Deferred to v2; manual entry workflow stays in v1.",
        "v2")
    gap("GAP-006", "Audit log lives in localStorage",
        "Critical",
        "src/store/useAuditStore.ts persists to localStorage",
        "Local-only audit fails the NABH expectation of immutable cross-actor evidence.",
        "Move to append-only audit table (see 05 Schema §9.1). Outbox emits from each mutation.",
        "S3")
    gap("GAP-007", "PII not encrypted at rest",
        "Critical",
        "No DB; future schema must encrypt",
        "DPDP §8 requires reasonable safeguards on personal data.",
        "Column-encryption (AES-256) with annual key rotation; blind-index for phone search.",
        "S2")
    gap("GAP-008", "Session timeout / idle lockout",
        "High",
        "Not implemented",
        "Required for shared-station security.",
        "Idle 30 min hard logout; soft 15 min lock.",
        "S8")
    gap("GAP-009", "Password / 2FA fallback for stations without IdP",
        "Medium",
        "Not implemented",
        "Some kiosks (registration counter) may not have IdP access.",
        "Internal username + TOTP behind admin grant.",
        "S8")

    page_break(doc)

    # ── B — BACKEND DATA LAYER ────────────────────────────────────────────
    h1(doc, "4. Data Layer & Backend (GAP-010 … 020)")
    gap("GAP-010", "No relational store; all data client-seeded",
        "Critical",
        "Repo has no DB folder, no ORM, no migrations",
        "Stops every downstream concern: durability, search, reporting, audit.",
        "Postgres + migrations (see 05 Schema §13). Repo pattern in src/db/.",
        "S2")
    gap("GAP-011", "No repository abstraction or zod-to-DB schema mapping",
        "High",
        "Stores currently mutate freely",
        "Without repos, swapping seed → API becomes a 49-store refactor instead of a single switch.",
        "Introduce repos under src/db/* with zod inputs / outputs.",
        "S2")
    gap("GAP-012", "No read-only API routes",
        "High",
        "Only /api/whatsapp/*",
        "Every UI list ultimately needs to read from the DB.",
        "Build out REST endpoints listed in 02 TRD §5.",
        "S2")
    gap("GAP-013", "Persisted localStorage stores",
        "High",
        "11 stores persisted (see StoreHydrator.tsx)",
        "Stores expose PII on the device; lost on browser clear; conflicts with real backend.",
        "Phase-out plan in S2 / S3; cache-only after API.",
        "S2")
    gap("GAP-014", "AI services are stubs",
        "Critical",
        "src/ai-services/* — all 38 services",
        "No real value from suggestions today.",
        "Build _gateway.ts; route every service; preserve HITL.",
        "S9")
    gap("GAP-015", "Patient + Visit not durable",
        "Critical",
        "src/store/usePatientStore.ts in-memory",
        "Front-desk registrations lost on refresh.",
        "Migrations v1; reception writes through API.",
        "S3")
    gap("GAP-016", "Reception write path not wired to backend",
        "High",
        "src/app/reception/walk-in/page.tsx",
        "Patients are lost on refresh; no audit trail of registration.",
        "Server Action / API + audit emit on save.",
        "S3")
    gap("GAP-017", "Doctor OPD note durability",
        "High",
        "src/app/doctor/opd/[id]/page.tsx",
        "Clinical notes vanish without API.",
        "POST /api/notes; audit + DPDP log.",
        "S3")
    gap("GAP-018", "WhatsApp Business credentials and channels",
        "High",
        "src/app/api/whatsapp/* (routes exist, env vars missing)",
        "OTP and reminders flag as 'configured' but cannot send.",
        "Provision creds in vault; smoke-test in staging.",
        "S10")
    gap("GAP-019", "Drug master is in-memory and partial",
        "High",
        "src/store/useDrugMasterStore.ts seeded",
        "Drug-safety quality scales with drug master completeness.",
        "Source from RxNorm/Indian formulary + storage in drug table.",
        "S4")
    gap("GAP-020", "DPDP record-access not always emitted",
        "High",
        "Patchy across modules",
        "DISHA requires logging of every access to identified data.",
        "Wrap patient chart open + drawer open in DPDP audit emit.",
        "S3")

    page_break(doc)

    # ── C — CLINICAL ──────────────────────────────────────────────────────
    h1(doc, "5. Clinical Surfaces (GAP-021 … 035)")
    gap("GAP-021", "Drug-safety runs client-side only",
        "Critical",
        "src/lib/drugSafety.ts",
        "Bypassable by direct API call; cannot block writes server-side.",
        "Run the same engine server-side at /api/prescriptions; return envelope to UI.",
        "S4")
    gap("GAP-022", "Pharmacy dispense events not durable",
        "High",
        "src/store/usePharmacyStore.ts",
        "Bedside dispense becomes a verbal record only.",
        "DB + API; bedside route requires barcode or nurse co-sign.",
        "S4")
    gap("GAP-023", "Bill auto-population is approximate",
        "Medium",
        "src/store/useBillingStore.ts",
        "Lines derived heuristically without real order/drug joins.",
        "Server-side aggregation of orders + dispense + bed + procedures.",
        "S7")
    gap("GAP-024", "Duplicate-charge detection is heuristic",
        "Medium",
        "src/lib/utils.ts duplicate flag",
        "False positives waste billing time.",
        "Deterministic rules + ML flag both on server.",
        "S7")
    gap("GAP-025", "Lab results inbox missing release gate",
        "High",
        "src/store/useLabStore.ts",
        "Results may appear to patient before verification.",
        "Server-side release gate; patient portal only sees released rows.",
        "S5")
    gap("GAP-026", "Narcotic two-signatory missing",
        "High",
        "src/store/useNarcoticsStore.ts",
        "Drug-licensing exposure under NDPS rules.",
        "Witness signature column + UI; audit + immutable trail.",
        "S4")
    gap("GAP-027", "Pharmacy stock-on-hand not real",
        "High",
        "src/store/usePharmacyInventoryStore.ts",
        "Dispense ‘in stock’ flag is informational only.",
        "Drug-stock table + lot + expiry; expiry sweep at end of day.",
        "S4")
    gap("GAP-028", "Reflex test rules engine on client",
        "Medium",
        "src/lib/reflexRules.ts",
        "Lab can disable client; rules need to fire even via API.",
        "Server-side rule engine; client only displays.",
        "S5")
    gap("GAP-029", "Critical-value notification path absent",
        "High",
        "No notify on critical bool",
        "Critical results (e.g. K+ < 2.5) must page someone.",
        "Server emits a high-priority notification to ordering doctor + nurse; banner; audit.",
        "S5")
    gap("GAP-030", "Bed transfers don't cascade housekeeping reliably",
        "Medium",
        "useAdmissionStore + useHousekeepingStore",
        "Beds may stay 'occupied' after transfer.",
        "Transfer triggers a housekeeping event in one transaction.",
        "S6")
    gap("GAP-031", "Multi-branch federated reporting",
        "Medium",
        "BranchId enum, no UI",
        "Multi-branch is a v2 commitment; v1 single-branch only.",
        "Tenant_id column already present (see Schema). UI deferred to v2.",
        "v2")
    gap("GAP-032", "MAR late / missed not actionable",
        "Medium",
        "src/lib/mar.ts",
        "Nurses need an actionable queue, not just a colour.",
        "Server computes due / late / missed; nurse home shows queue.",
        "S6")
    gap("GAP-033", "Discharge gate not server-enforced",
        "High",
        "src/app/discharge/*",
        "Discharge could complete even if a pillar is open.",
        "Server-side gate on POST /api/discharge.",
        "S6")
    gap("GAP-034", "Discharge summary AI not wired",
        "Medium",
        "src/ai-services/discharge-summary stub",
        "Doctors get no draft to edit.",
        "Wire through gateway; HITL accept/edit; emit audit.",
        "S6")
    gap("GAP-035", "Doctor revenue-share not in scope for v1",
        "Low",
        "Spec only",
        "Sometimes wanted; not committed.",
        "v2; design with finance during sprint 12 review.",
        "v2")

    page_break(doc)

    # ── D — INSURANCE / FINANCE ──────────────────────────────────────────
    h1(doc, "6. Insurance & Finance (GAP-036 … 039)")
    gap("GAP-036", "Denial-risk AI returns canned scores",
        "Medium",
        "src/ai-services/draft-claim-justification stub",
        "Insurance desk cannot prioritise.",
        "Real model via gateway; expose score + reasoning.",
        "S7 / S9")
    gap("GAP-037", "Refund two-step approval missing",
        "Medium",
        "src/app/billing/refund missing approver gate",
        "Single user can refund — segregation of duties broken.",
        "Approver gate + state machine + audit.",
        "S7")
    gap("GAP-038", "Per-service AI config absent",
        "Medium",
        "AI services hardcode model 'stub'",
        "Cannot route certain services through cheaper / on-prem models.",
        "Admin UI to set per-service vendor + model + budget.",
        "S9")
    gap("GAP-039", "PHI in AI logs not redacted",
        "High",
        "No gateway logs yet",
        "DPDP & DISHA prefer minimal-PHI retention.",
        "Token-level redaction + pseudonymisation in gateway log path.",
        "S9")

    page_break(doc)

    # ── E — UI / UX ───────────────────────────────────────────────────────
    h1(doc, "7. UI / UX (GAP-040 … 049)")
    gap("GAP-040", "Storybook for shared components",
        "Low",
        "No .stories.tsx files",
        "Onboarding new designers / engineers is slower; visual regressions go undetected.",
        "Storybook for src/components/ui/ + clinical/.",
        "S1")
    gap("GAP-041", "WCAG AA conformance audit",
        "Medium",
        "Several focus rings missing; some buttons icon-only",
        "Accessibility for non-mouse users.",
        "Lighthouse + manual sweep; remediate.",
        "S1")
    gap("GAP-042", "Phone (390 px) regressions on nurse / ER",
        "Medium",
        "Some tables don't collapse cleanly at 390",
        "On-floor staff use phones one-handed.",
        "Phone sweep in CI; design tokens drive table → card collapse.",
        "S1")
    gap("GAP-043", "Hindi i18n coverage incomplete",
        "Low",
        "messages/hi.json mirrors keys but not all are translated",
        "Hindi-first staff lose locale value.",
        "Translation pass + missing-key warning in CI.",
        "S1")
    gap("GAP-044", "alert() / confirm() used in admin pages",
        "Low",
        "src/app/admin/statutory + refund pages",
        "Native dialogs are unbranded and untranslatable.",
        "Use the shared Dialog component.",
        "S1")
    gap("GAP-045", "Empty / loading / error states inconsistent",
        "Low",
        "Several lists show spinners only",
        "Skeletons preserve layout and clarity.",
        "Adopt the Skeleton + Empty pattern uniformly.",
        "S1")
    gap("GAP-046", "Activity graph server aggregation",
        "Low",
        "src/app/doctor/activity computes client-side",
        "Slow on real data volume.",
        "Server aggregation behind /api/doctors/:id/activity.",
        "S1 / S3")
    gap("GAP-047", "Quality intelligence outputs are demo data",
        "Medium",
        "src/app/admin/ai-performance falls back to DEMO_FEATURE_DATA",
        "Quality dashboards show fabricated values when feedback store empty.",
        "Real AI quality logs from gateway; remove fallback.",
        "S9")
    gap("GAP-048", "Email + SMS abstraction missing",
        "Medium",
        "No code",
        "OTP, reminders, claim status updates require email/SMS.",
        "Adapter under src/lib/notify/; provider configurable.",
        "S10")
    gap("GAP-049", "Console errors / warnings on a few admin pages",
        "Low",
        "Verified via Puppeteer sweeps",
        "Console noise hides real failures.",
        "Resolve in S1 sweep.",
        "S1")

    page_break(doc)

    # ── F — OBSERVABILITY / DR ───────────────────────────────────────────
    h1(doc, "8. Observability, DR, Hardening (GAP-050 … 055)")
    gap("GAP-050", "Metrics + dashboards",
        "Medium",
        "No metrics emitted; no dashboards",
        "Cannot prove SLOs.",
        "Prometheus + Grafana; SLO targets from TRD §9.",
        "S11")
    gap("GAP-051", "Backup + restore drill",
        "High",
        "No DB so no backup",
        "Required to attest DR readiness.",
        "Nightly DB backup, monthly restore drill, evidence in NABH cockpit.",
        "S11")
    gap("GAP-052", "Pen-test not yet performed",
        "High",
        "—",
        "Mandatory before go-live.",
        "Engage external testers; remediate Critical / High before cutover.",
        "S12")
    gap("GAP-053", "NABH evidence pack rehearsal",
        "Medium",
        "—",
        "First exposure of streams to QM before live audit reduces risk.",
        "Dry-run export across all 9 chapters.",
        "S12")
    gap("GAP-054", "UAT cycle plan",
        "Medium",
        "—",
        "Stakeholders need to sign off before cutover.",
        "Two UAT cycles with structured scripts.",
        "S12")
    gap("GAP-055", "Production cutover runbook",
        "High",
        "—",
        "Cutover without a tested runbook is high risk.",
        "Author + dry-run in staging; record evidence.",
        "S12")

    # ── Summary cross-ref ────────────────────────────────────────────────
    page_break(doc)
    h1(doc, "9. Gap → Requirement → Sprint Matrix")
    p(doc, "Compact cross-reference. Each gap rolls up to one or more requirements and exactly one sprint.")
    table(doc, ["GAP", "Requirement(s)", "Sprint", "Severity"],
          [
              ["GAP-001", "FR-101, FR-104, NFR-05",          "S8",   "Critical"],
              ["GAP-002", "FR-104, FR-901",                   "S8",   "Critical"],
              ["GAP-003", "All FR — write paths",             "S8",   "Critical"],
              ["GAP-004", "FR-104, FR-901",                   "S8",   "High"],
              ["GAP-005", "FR-401 … 405",                     "v2",   "Medium"],
              ["GAP-006", "NFR-09, FR-801",                  "S3",   "Critical"],
              ["GAP-007", "NFR-05, NFR-08",                  "S2",   "Critical"],
              ["GAP-008", "NFR-05",                           "S8",   "High"],
              ["GAP-009", "FR-101",                           "S8",   "Medium"],
              ["GAP-010", "All FR — durability",              "S2",   "Critical"],
              ["GAP-011", "TR-002",                           "S2",   "High"],
              ["GAP-012", "TR-001",                           "S2",   "High"],
              ["GAP-013", "NFR-05, TR-002",                  "S2",   "High"],
              ["GAP-014", "FR-203, FR-606, FR-505, FR-505",   "S9",   "Critical"],
              ["GAP-015", "FR-101, FR-201",                   "S3",   "Critical"],
              ["GAP-016", "FR-101",                           "S3",   "High"],
              ["GAP-017", "FR-201, FR-203",                   "S3",   "High"],
              ["GAP-018", "FR-905, FR-908 (not in BRD), NFR-08", "S10","High"],
              ["GAP-019", "FR-204, FR-407",                   "S4",   "High"],
              ["GAP-020", "FR-803, NFR-08",                  "S3",   "High"],
              ["GAP-021", "FR-204, FR-407",                   "S4",   "Critical"],
              ["GAP-022", "FR-406, FR-407",                   "S4",   "High"],
              ["GAP-023", "FR-501",                           "S7",   "Medium"],
              ["GAP-024", "FR-503",                           "S7",   "Medium"],
              ["GAP-025", "FR-401 … 405, FR-902",             "S5",   "High"],
              ["GAP-026", "FR-408",                           "S4",   "High"],
              ["GAP-027", "FR-407, FR-707",                   "S4",   "High"],
              ["GAP-028", "FR-403",                           "S5",   "Medium"],
              ["GAP-029", "FR-405",                           "S5",   "High"],
              ["GAP-030", "FR-603",                           "S6",   "Medium"],
              ["GAP-031", "—",                                  "v2",   "Medium"],
              ["GAP-032", "FR-303",                           "S6",   "Medium"],
              ["GAP-033", "FR-605",                           "S6",   "High"],
              ["GAP-034", "FR-606",                           "S6",   "Medium"],
              ["GAP-035", "—",                                  "v2",   "Low"],
              ["GAP-036", "FR-505",                           "S7/S9", "Medium"],
              ["GAP-037", "FR-507",                           "S7",   "Medium"],
              ["GAP-038", "TR-014",                           "S9",   "Medium"],
              ["GAP-039", "NFR-08",                           "S9",   "High"],
              ["GAP-040 … 049", "NFR-10, NFR-11, NFR-12",     "S1",   "Low–Med"],
              ["GAP-050 … 055", "NFR-03 / NFR-15 / NFR-07",   "S11/S12", "Med–High"],
          ],
          col_widths_cm=[2.5, 6.5, 3.0, 3.0])

    h1(doc, "A. Version History")
    table(doc, ["Version", "Date", "Author", "Notes"],
          [["v1.0", DOC_DATE, AUTHOR, "Initial gap register, 55 entries. Cross-referenced to BRD/TRD/Schema/Plan."]],
          col_widths_cm=[2.0, 3.0, 4.5, 7.5])

    save(doc, out)


if __name__ == "__main__":
    build(Path(__file__).parent / "07_Gap_Analysis_v1.0.docx")
