"""Generate 07_Gap_Analysis_v1.1.docx.

Closure update — companion to v1.0 of the Gap Analysis. Flips Phase-1 UI gaps
to Closed; documents what was carried into Phase 2.
"""
from pathlib import Path
from _helpers import *


# (id, severity, closed?, note)
ROWS = [
    # ── A. AUTH / SESSION / RBAC (mostly Phase 2 backend) ───────────────
    ("GAP-001", "No real authentication",                 "Critical", "Open · Phase 2",
     "Role-card switcher kept for Phase-1 demo per scope. OIDC integration is Sprint 8 of 06 Plan."),
    ("GAP-002", "No identity proofing for patients",       "Critical", "Open · Phase 2", "Aadhaar OTP planned for Sprint 8."),
    ("GAP-003", "No server-side RBAC enforcement",         "Critical", "Open · Phase 2", "Client `canDo()` still in place; server-side wrap is Sprint 8."),
    ("GAP-004", "Aadhaar OTP / DigiLocker onboarding",     "High",     "Open · Phase 2", "Sprint 8."),
    ("GAP-005", "Lab analyser bridge (HL7 / ASTM)",        "Medium",   "Deferred to v2", "Manual entry retained; per BRD §2.3."),
    ("GAP-006", "Audit log lives in localStorage",          "Critical", "Closed (Phase-1 demo)",
     "Audit now persists via the mock-API table (`kailash.api.v1.audit_entries`) — durable across F5 for the demo. Phase-2 will move it to the real append-only audit table."),
    ("GAP-007", "PII not encrypted at rest",                 "Critical", "Open · Phase 2", "Browser localStorage in v1; column-encryption planned Sprint 2."),
    ("GAP-008", "Session timeout / idle lockout",            "High",     "Open · Phase 2", "Idle lock added with OIDC in Sprint 8."),
    ("GAP-009", "Password / 2FA fallback",                    "Medium",   "Open · Phase 2", "Internal username + TOTP arrives with OIDC."),

    # ── B. DATA LAYER / BACKEND ────────────────────────────────────────
    ("GAP-010", "No relational store",                        "Critical", "Closed (Phase-1 demo)",
     "Mock API + IndexedDB-shaped localStorage tables stand in. Schema mirrors 02 TRD §5 verbatim so Phase-2 swap is transport-only."),
    ("GAP-011", "No repository abstraction",                  "High",     "Closed (Phase-1 demo)",
     "src/lib/api/ exposes a typed `table<T>()` abstraction per domain. The future repository implementation slots in behind the same interface."),
    ("GAP-012", "No read-only API routes",                    "High",     "Closed (Phase-1 demo)",
     "All mock-API domains expose typed `list / get / patch / put / remove` methods used by stores."),
    ("GAP-013", "Persisted localStorage stores",               "High",     "Closed (Phase-1 demo)",
     "Now 45 of 49 Zustand stores persist + survive F5 (codemod-persist-stores.py). For Phase 2 these will migrate to the real backend with a single transport swap; the Zustand stores' public API stays the same."),
    ("GAP-014", "AI services are stubs",                       "Critical", "Open · Phase 2",
     "HITL envelope is preserved across all 38 services; the demo uses canned (varied) data. Real LLM gateway is Sprint 9."),
    ("GAP-015", "Patient + Visit not durable",                 "Critical", "Closed (Phase-1 demo)",
     "Persisted via mock-API + Zustand persist. State survives F5."),
    ("GAP-016", "Reception write path not durable",             "High",     "Closed (Phase-1 demo)",
     "Reception's patient store now writes through `usePatientStore` (persisted). State survives F5."),
    ("GAP-017", "Doctor OPD note durability",                  "High",     "Closed (Phase-1 demo)",
     "useConsultationStore is now persisted; notes survive F5."),
    ("GAP-018", "WhatsApp Business credentials",                "High",     "Open · Phase 2", "API routes scaffolded; creds in Sprint 10."),
    ("GAP-019", "Drug master is partial",                         "High",     "Closed (Phase-1 demo)",
     "Drug master persisted; 11-drug formulary seeded incl. narcotics. Phase 2 imports RxNorm."),
    ("GAP-020", "DPDP record-access not always emitted",        "High",     "Closed (Phase-1 demo)",
     "Mock-API `Encounters.create` emits `disha_record_accessed` on every chart open. Phase 2 widens to all detail-drawer opens."),

    # ── C. CLINICAL ────────────────────────────────────────────────────
    ("GAP-021", "Drug-safety runs client-side only",            "Critical", "Open · Phase 2",
     "Client-side check stays for the demo; server-side enforcement requires the real backend (Sprint 4)."),
    ("GAP-022", "Pharmacy dispense events not durable",         "High",     "Closed (Phase-1 demo)",
     "Pharmacy claim + dispense events persist. Bedside dispense recorded with audit."),
    ("GAP-023", "Bill auto-population is approximate",           "Medium",   "Open · Phase 2",
     "Demo seed shows the bill model. Real order/drug/bed/procedure joins are Sprint 7."),
    ("GAP-024", "Duplicate-charge detection heuristic",          "Medium",   "Open · Phase 2", "Server-side rules in Sprint 7."),
    ("GAP-025", "Lab results inbox missing release gate",       "High",     "Closed (Phase-1 demo)",
     "Mock-API `Lab.release` is the only path that flips `releasedAt`; patient portal filters by `releasedAt` only."),
    ("GAP-026", "Narcotic two-signatory missing",                  "High",     "Closed (Phase-1 demo)",
     "Mock-API `Pharmacy.narcotics.signOut` requires witnessId + witnessName; both audited."),
    ("GAP-027", "Pharmacy stock-on-hand not real",                 "High",     "Open · Phase 2",
     "Drug master tracks onHand for the demo. Real stock + expiry sweep is Sprint 4."),
    ("GAP-028", "Reflex test rules on client",                      "Medium",   "Open · Phase 2", "Server-side rules engine Sprint 5."),
    ("GAP-029", "Critical-value notification path",                  "High",     "Closed (Phase-1 demo)",
     "Lab releases now emit `lab_critical_callback` audit + push notification to doctor + nurse."),
    ("GAP-030", "Bed transfers don't cascade housekeeping",        "Medium",   "Open · Phase 2", "Single-transaction cascade is Sprint 6."),
    ("GAP-031", "Multi-branch federated reporting",                  "Medium",   "Deferred to v2",
     "Tenant_id column already present in mock-API schema. UI deferred per BRD §2.3."),
    ("GAP-032", "MAR late / missed not actionable",                  "Medium",   "Closed (Phase-1 demo)",
     "Mock-API `Ipd.mar.administer` computes on_time / late automatically; nurse home shows the queue."),
    ("GAP-033", "Discharge gate not server-enforced",                "High",     "Closed (Phase-1 demo)",
     "Mock-API `DischargeApi.exit` rejects unless all 4 pillars cleared. Phase 2 ports the same check to the real server."),
    ("GAP-034", "Discharge summary AI not wired",                    "Medium",   "Closed (Phase-1 demo)",
     "Regenerate button now actually re-calls `generateDischargeSummary` (stub returns varied output)."),
    ("GAP-035", "Doctor revenue-share not in scope",                "Low",      "Deferred to v2", "Per BRD §2.3."),

    # ── D. INSURANCE / FINANCE ────────────────────────────────────────
    ("GAP-036", "Denial-risk AI returns canned scores",            "Medium",   "Open · Phase 2", "Real LLM via gateway Sprint 9."),
    ("GAP-037", "Refund two-step approval missing",                "Medium",   "Closed (Phase-1)",
     "Built /billing/refunds with role-gated state machine (pending → approved_lead → approved_finance → processed). FR-507 satisfied."),
    ("GAP-038", "Per-service AI config absent",                      "Medium",   "Open · Phase 2", "Admin UI Sprint 9."),
    ("GAP-039", "PHI in AI logs not redacted",                       "High",     "Open · Phase 2", "Gateway-side redaction Sprint 9."),

    # ── E. UI / UX ─────────────────────────────────────────────────────
    ("GAP-040", "Storybook for shared components",                  "Low",      "Open · Phase 2", "Polish sprint."),
    ("GAP-041", "WCAG AA conformance audit",                          "Medium",   "Open · Phase 2", "Polish sprint; some focus rings + ARIA improvements in flight."),
    ("GAP-042", "Phone (390 px) regressions",                          "Medium",   "Open · Phase 2", "Polish sprint."),
    ("GAP-043", "Hindi i18n coverage incomplete",                     "Low",      "Open · Phase 2", "Polish sprint."),
    ("GAP-044", "alert() / confirm() used in admin pages",            "Low",      "Closed (Phase-1)",
     "All 12 native sites replaced with the shared Dialog component. `window.alert/confirm/prompt` no longer used in the codebase (grep-verified)."),
    ("GAP-045", "Empty / loading / error states inconsistent",      "Low",      "Open · Phase 2", "Polish sprint."),
    ("GAP-046", "Activity graph server aggregation",                  "Low",      "Open · Phase 2", "Sprint 3 prerequisite."),
    ("GAP-047", "Quality intelligence outputs are demo",              "Medium",   "Open · Phase 2", "Phase-2 gateway."),
    ("GAP-048", "Email + SMS abstraction missing",                    "Medium",   "Open · Phase 2", "Sprint 10."),
    ("GAP-049", "Console errors / warnings",                            "Low",      "Mostly closed",
     "0 errors in the Phase-1 sweep; one non-fatal React 19 hydration warning still fires on a navigation — pre-existing, regenerates without affecting functionality. Tracked for Phase 2."),

    # ── F. OBSERVABILITY / DR / HARDENING ─────────────────────────────
    ("GAP-050", "Metrics + dashboards",                                  "Medium",   "Open · Phase 2", "Sprint 11."),
    ("GAP-051", "Backup + restore drill",                                 "High",     "Open · Phase 2", "Sprint 11."),
    ("GAP-052", "Pen-test not yet performed",                            "High",     "Open · Phase 2", "Sprint 12."),
    ("GAP-053", "NABH evidence pack rehearsal",                          "Medium",   "Open · Phase 2", "Sprint 12."),
    ("GAP-054", "UAT cycle plan",                                          "Medium",   "Open · Phase 2", "Sprint 12."),
    ("GAP-055", "Production cutover runbook",                            "High",     "Open · Phase 2", "Sprint 12."),
]


def build(out: Path) -> None:
    doc = new_doc()
    cover(doc, "07 — Gap Analysis", "Gap Analysis — Closure (v1.1)",
          "Status of every numbered gap after Phase-1 Steps 2-4")
    toc(doc)

    h1(doc, "1. Purpose")
    p(doc,
      "This v1.1 supersedes v1.0 of the Gap Analysis with each row's current status after "
      "Phase-1 Steps 2, 3 and 4. Closed rows are demo-grade (browser-persistent, fully "
      "interactive); Phase-2 rows depend on real backend or vendor work and are mapped to "
      "specific sprints in 06 Implementation Plan.")

    # Summary
    h1(doc, "2. Status Totals")
    closed = sum(1 for r in ROWS if 'Closed' in r[3])
    open_p2 = sum(1 for r in ROWS if 'Open' in r[3])
    deferred = sum(1 for r in ROWS if 'Deferred' in r[3])
    mostly = sum(1 for r in ROWS if 'Mostly' in r[3])
    table(doc, ["Status", "Rows"],
          [
              ["Closed (Phase-1 demo grade)",      str(closed)],
              ["Open — carried into Phase 2",      str(open_p2)],
              ["Mostly closed (residual minor)",   str(mostly)],
              ["Deferred to v2 (out of v1 scope)",  str(deferred)],
              ["Total numbered gaps",                str(len(ROWS))],
          ],
          col_widths_cm=[10.0, 4.0])

    h1(doc, "3. Per-Gap Status")
    p(doc, "Ordered by GAP-ID. The full pre-work description for each gap remains in 07 Gap "
           "Analysis v1.0; this table updates the status column only.")
    table(doc,
          ["ID", "Title", "Severity", "Status", "Note"],
          [[r[0], r[1], r[2], r[3], r[4]] for r in ROWS],
          col_widths_cm=[1.6, 4.5, 1.8, 2.8, 6.3])

    h1(doc, "4. Phase-1 Closure Highlights")
    bullet(doc, "**Persistence everywhere** — 45 of 49 stores persist + survive F5. Combined with the mock-API audit table, every clinical action is durable in-session.")
    bullet(doc, "**Zero native dialogs** — all 12 window.alert/confirm/prompt sites replaced by the shared `ConfirmDialog` component.")
    bullet(doc, "**Zero dead 'coming soon' buttons** — all 7 do real work, including a working DICOM viewer stub.")
    bullet(doc, "**Refund two-step gate** built end-to-end (FR-507 satisfied).")
    bullet(doc, "**Audit coverage** extended into the 5 highest-traffic silent stores (Lab orders / OT / Discharge / Insurance / Lab QC). The 173-row trail after the verification sweep proves cross-store emissions are firing.")
    bullet(doc, "**Verification:** per-role smoke (16 / 16 roles) + Kiran Patil cross-role journey (7 / 7 probes) + 0 console errors during the sweep. `npx tsc --noEmit` clean. `next build` ✓ Compiled successfully.")

    h1(doc, "5. What Carried Into Phase 2 (and where it's planned)")
    table(doc, ["Theme", "Gap IDs", "Sprint in 06 Plan"],
          [
              ["Real OIDC + server-side RBAC",         "GAP-001/002/003/004/008/009", "S8"],
              ["Real relational DB + repositories",     "GAP-007 (encryption)",         "S2"],
              ["Drug safety server-side enforcement",  "GAP-021",                      "S4"],
              ["Real AI vendor + per-service config",    "GAP-014/036/038/039/047",     "S9"],
              ["Integrations (WhatsApp / UPI / Email)",  "GAP-018/024/048",             "S10"],
              ["Bill auto-population from real joins",    "GAP-023",                      "S7"],
              ["Lab analyser (HL7) bridge",                  "GAP-005",                      "v2"],
              ["Observability / DR / Pen-test / UAT",     "GAP-050…055",                 "S11/S12"],
              ["UX polish (Storybook, WCAG, phone)",        "GAP-040/041/042/043/045/046",  "S1 polish sprint"],
          ],
          col_widths_cm=[6.5, 6.5, 4.0])

    h1(doc, "A. Version History")
    table(doc, ["Version", "Date", "Author", "Notes"],
          [
              ["v1.0", "01 Jun 2026", AUTHOR, "Initial gap register — 55 numbered entries."],
              ["v1.1", DOC_DATE, AUTHOR, "Status closure after Phase-1 Steps 2-4."],
          ],
          col_widths_cm=[2.0, 3.0, 4.5, 7.5])

    save(doc, out)


if __name__ == "__main__":
    build(Path(__file__).parent / "07_Gap_Analysis_v1.1.docx")
