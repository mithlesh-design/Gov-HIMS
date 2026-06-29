"""Generate 02_TRD_v1.0.docx — Technical Requirements Document."""
from pathlib import Path
from _helpers import *


def build(out: Path) -> None:
    doc = new_doc()
    cover(doc, "02 — TRD", "Technical Requirements Document",
          "Umang HIMS — architecture, stack, contracts, security")
    toc(doc)

    h1(doc, "1. Architecture Overview")
    p(doc,
      "Umang HIMS is a single Next.js 16 App-Router application using React 19 server / client "
      "components, Zustand for client state, and a designed-but-not-yet-built backend tier. "
      "All UI is in place against client-seeded data; the backend layer is the priority of v1.0.")

    mermaid(doc, "System landscape (target v1.0)", """
flowchart LR
    subgraph Client
        Web[Next.js Web App<br/>React 19 + Zustand]
        PWA[Patient Portal PWA]
    end
    subgraph Edge
        LB[Reverse Proxy<br/>TLS termination]
    end
    subgraph App
        SSR[Next.js Node server<br/>App Router + API routes]
        Server[Domain Services<br/>Node/TS]
        Audit[Audit Service]
        AI[AI Gateway]
    end
    subgraph Data
        PG[(PostgreSQL)]
        Cache[(Redis)]
        Blob[(Object Storage)]
        Search[(Search index)]
    end
    subgraph External
        LLM[LLM Vendor]
        WA[WhatsApp Business API]
        Pay[UPI / Payment Gateway]
        Lab[Lab analyser middleware]
        Pacs[(PACS / DICOM)]
        SMTP[Email / SMS]
    end
    Web -->|HTTPS| LB --> SSR
    PWA --> LB
    SSR --> Server
    Server --> PG
    Server --> Cache
    Server --> Blob
    Server --> Audit
    Server --> AI --> LLM
    Server --> WA
    Server --> Pay
    Server --> Lab
    Server --> Pacs
    Server --> SMTP
""")

    h2(doc, "1.1 Current state vs. target state")
    table(doc, ["Layer", "Current (repo)", "Target (v1.0)"],
          [
              ["Web app", "Next.js 16 + React 19 + Zustand, ✅ done", "Unchanged"],
              ["Auth", "Client-side role-switcher, ❌ no real auth", "OIDC / SSO + JWT refresh"],
              ["API", "2 routes (WhatsApp send/webhook)", "REST + Server Actions, full coverage"],
              ["Persistence", "Zustand + localStorage", "PostgreSQL + Redis + object store"],
              ["Audit", "useAuditStore (client only)", "Audit service, append-only, signed"],
              ["AI", "38 stub services returning canned data", "Anthropic / OpenAI / on-prem gateway, HITL preserved"],
              ["Integrations", "WhatsApp scaffolded", "WhatsApp + UPI + Lab + DICOM live"],
              ["Multi-branch", "BranchId enum, no UI", "Single-branch in v1; multi-branch v2 (GAP-031)"],
              ["Observability", "Console logs, Puppeteer sweeps", "Structured logs, metrics, traces, dashboards"],
          ],
          col_widths_cm=[3.5, 6.5, 7.0])

    page_break(doc)

    h1(doc, "2. Tech Stack")
    table(doc, ["Concern", "Choice", "Version", "Rationale"],
          [
              ["Web framework",       "Next.js (App Router, Turbopack)",   "16.2.4",  "SSR/RSC + edge-friendly; matches team strength"],
              ["UI library",          "React",                             "19.2.4",  "Concurrent + server components"],
              ["Language",            "TypeScript (strict)",               "5.7+",     "Type safety end-to-end"],
              ["Styling",             "Tailwind CSS",                       "v4",      "Tokens + utility; consistent design"],
              ["State (client)",      "Zustand",                           "5.0.13",  "Lightweight, per-domain stores"],
              ["Motion",              "Framer Motion",                      "12.38",   "Microinteractions"],
              ["Charts",              "Recharts",                           "3.8.1",   "Composable, RSC-friendly"],
              ["Icons",               "lucide-react",                        "1.14",    "Consistent, tree-shakable"],
              ["Toasts",              "sonner",                              "2.0.7",   "Accessible toast pattern"],
              ["Validation",          "zod",                                 "4.4.3",   "Type-safe schemas + form & API"],
              ["i18n",                "next-intl",                           "latest",   "App-router-aware"],
              ["Forms",               "react-hook-form + zod",               "latest",   "Performance + type safety"],
              ["E2E tests",           "puppeteer-core",                       "25.0.4",  "Headless verification sweeps"],
              ["DB (target)",         "PostgreSQL",                          "16",      "ACID, JSONB, full-text"],
              ["Cache / queue",        "Redis",                               "7",       "Sessions, queues, rate-limiting"],
              ["Object store",         "S3-compatible",                       "—",        "Documents, images, exports"],
              ["AI vendor",            "TBD (see Q2)",                        "—",        "HITL preserved either way"],
              ["Auth (target)",        "OIDC + JWT",                          "—",        "SSO-ready"],
          ],
          col_widths_cm=[3.5, 6.0, 2.5, 5.0])

    page_break(doc)

    h1(doc, "3. Module Inventory")
    p(doc, "162 page routes, 49 Zustand stores, 73 components, 31 lib utilities, 38 AI services.")

    h2(doc, "3.1 Page routes by role (representative)")
    table(doc, ["Role", "Routes", "Headline pages"],
          [
              ["Admin",      "21",  "/admin/dashboard, /admin/roster, /admin/coverage, /admin/finance, /admin/compliance, /admin/disha, /admin/statutory, /admin/payroll, /admin/vendors, /admin/credentials, /admin/duty, /admin/ai-performance"],
              ["Doctor",     "13",  "/doctor/dashboard, /doctor/opd/[id], /doctor/ipd, /doctor/online, /doctor/activity, /doctor/settings, /doctor/copilot"],
              ["Nurse",      "8",   "/nurse/dashboard, /nurse/rounds, /nurse/mar, /nurse/handover, /nurse/escalation"],
              ["Pharmacy",   "6",   "/pharmacy/queue, /pharmacy/dispense, /pharmacy/inventory, /pharmacy/narcotics"],
              ["Lab",        "9",   "/lab/dashboard, /lab/bench/[k], /lab/qc, /lab/micro, /lab/reflex"],
              ["Radiology",  "7",   "/radiology/dashboard, /radiology/inbox, /radiology/reading, /radiology/studies"],
              ["Emergency",  "6",   "/emergency/dashboard, /emergency/triage, /emergency/floor"],
              ["Reception",  "5",   "/reception/dashboard, /reception/queue, /reception/walk-in"],
              ["Bed Mgmt",   "4",   "/admission/dashboard, /admission/requests"],
              ["Discharge",  "4",   "/discharge/dashboard, /discharge/clearance/[id]"],
              ["Billing",    "5",   "/billing/dashboard, /billing/bills, /billing/refund"],
              ["Insurance",  "4",   "/insurance/dashboard, /insurance/claims, /insurance/preauth"],
              ["OT",         "3",   "/ot/dashboard, /ot/checklist"],
              ["Audit",      "3",   "/audit/dashboard, /audit/trail, /audit/nabh"],
              ["Quality",    "4",   "/quality/dashboard, /quality/incidents, /quality/capa"],
              ["Support roles", "9",  "/bloodbank, /cssd, /dietary, /bmw, /mortuary, /ambulance, /housekeeping, /inventory"],
              ["Patient",    "8",   "/patient/dashboard, /patient/lab, /patient/radiology, /patient/ipd, /patient/discharge, /patient/feedback, /patient/family-track"],
              ["Top-level",  "Misc.","/, /login, /checkin (kiosk), /api/whatsapp/*"],
          ],
          col_widths_cm=[3.5, 1.5, 12.0])

    h2(doc, "3.2 Zustand stores (49)")
    p(doc, "All under src/store/. One store per domain. Eleven are persisted to localStorage via skipHydration + StoreHydrator.")
    code_block(doc,
"""useAdmissionStore  useAmbulanceStore  useAssistantStore*  useAuditStore     useAuthStore
useBMWStore        useBillingStore    useBloodBankStore   useCSSDStore      useCameraStore
useConsultationStore useDietaryStore  useDischargeStore   useDoctorProfileStore*
useDoctorStatsStore useDrugMasterStore useERStore         useEmergencyStore
useFeedbackStore   useFollowupStore   useHRStore*         useHousekeepingStore
useInpatientStore* useInsuranceStore  useInventoryStore   useJourneyStore
useLabOrdersStore  useLabQCStore      useLabStore         useMessagingStore*
useMortuaryStore   useNarcoticsStore  useNotificationStore* useNursingStore*
useOTStore         usePatientLiveStore usePatientOrdersStore usePatientProfileStore*
usePatientStore    usePharmacyInventoryStore  usePharmacyStore  useQualityStore
useRadiologyStore  useRadiologyStudiesStore  useShiftStore*  useStatutoryStore*
useVendorStore*    useWardStore       useWhatsAppStore

* = persisted via persist({ skipHydration: true }) + StoreHydrator rehydrate()
""", label="src/store/ inventory")

    h2(doc, "3.3 Utility libraries (src/lib/)")
    code_block(doc,
"""ai-helpers          copilotLLM          copilotTools        doctorCopilot
drugSafety          earlyWarning        erClinical          escalation
fluids              handover            intake              ipdFormat
labCatalog          mar                 nabhEvidence        nursing
opd                 orders              patientProfile      permissions
printDoc            radiologyCatalog    reflexRules         resultsInbox
shiftConflicts      triage              useCoverageWatcher  useWard
utils               vitals              voiceScribe
""", label="src/lib/ — 31 pure utilities")

    h2(doc, "3.4 AI services (src/ai-services/) — 38 stubs")
    code_block(doc,
"""appointment-optimize  bed-forecast       billing-suggest         blood-demand
clinical-protocol     copilot-orchestrator  cssd-priority         detect-flow-bottlenecks
diagnosis             diet-plan          discharge-summary       documentation-engine
draft-claim-justification  drug-interaction  fraud-detect          generate-patient-education
handover-brief        insurance-preauth  lab-anomaly             mortality-risk
nlp-search            ot-briefing        ot-checklist            ot-surgical-requisition
patient-summary       pre-brief          prescription            quality-intelligence
radiology-report      readmission-risk   reflex-test             sepsis-alert
suggest-capa          suggest-recall-cohorts  supply-predict     triage
voice-intake          whatsapp-assistant
""", label="src/ai-services/ — every service returns the HITL envelope")
    callout(doc, "Honest gap",
            "All 38 services are stubs returning canned data. v1.0 wires a real LLM via "
            "src/ai-services/_gateway.ts. See GAP-014.", kind="warn")

    page_break(doc)

    h1(doc, "4. Data Flow")
    h2(doc, "4.1 State management pattern")
    p(doc, "Zustand domain-scoped stores. Cross-store side effects use the imperative form to avoid import cycles:")
    code_block(doc,
"""// In useFooStore.ts
import { useBarStore } from './useBarStore'

doSomething: () => {
  set({ foo: 'updated' })
  // one-way side effect into another store, no static import cycle
  useBarStore.getState().notifyFooChanged(get().foo)
  useAuditStore.getState().log({ action: 'foo.update', module: 'foo' })
}
""", label="Cross-store side effect pattern")

    h2(doc, "4.2 Hydration pattern (SSR-safe persistence)")
    p(doc, "Persisted stores use skipHydration: true so the server render and the initial client "
           "render share identical markup. After mount, src/components/StoreHydrator.tsx calls "
           "useXStore.persist.rehydrate() to load from localStorage. This eliminates hydration "
           "mismatches caused by client-only state.")

    h2(doc, "4.3 Audit pattern")
    p(doc, "Every mutation emits to useAuditStore.log({...}). Typed action codes (37 today) map to "
           "modules (24) and NABH chapters (9). See src/lib/nabhEvidence.ts.")
    code_block(doc,
"""useAuditStore.getState().log({
  action: 'prescription.signed',   // typed action code
  module: 'doctor',                 // 24-module enum
  actorId: currentUser.id,
  role: 'doctor',
  patientId: patient.id,
  meta: { rxId, drugs: rx.lines.map(l => l.drugName) },
  evidence: { nabhChapter: 'COP' }, // optional, populates evidence stream
})
""", label="Audit emit shape")

    h2(doc, "4.4 AI HITL envelope")
    code_block(doc,
"""// Every AI service returns:
type AiEnvelope<T> = {
  data: T
  confidence: number       // 0..1
  reasoning: string        // human-readable
  model: { name: string; version: string }
  alternates?: T[]         // optional, picked from on reject
}

// UI never auto-applies. User flow: review → accept | reject | modify → emit audit
""", label="HITL envelope — src/ai-services/*")

    page_break(doc)

    h1(doc, "5. API Contracts")
    p(doc, "Today only two REST routes exist; the rest of the system runs against client state. "
           "v1.0 introduces a full API surface organised by domain. Conventions:")
    bullet(doc, "RESTful by default; Server Actions for safe form submissions.")
    bullet(doc, "Resource URIs are plural nouns; identifiers are opaque ULIDs.")
    bullet(doc, "JSON only. Request and response bodies are zod-validated end-to-end.")
    bullet(doc, "All write endpoints require Idempotency-Key header.")
    bullet(doc, "Pagination via cursor (?after=…&limit=…); never offset for unbounded queries.")
    bullet(doc, "Response envelope { data, meta? } on success; { error: { code, message } } on failure.")

    h2(doc, "5.1 Endpoint plan (v1.0 target)")
    table(doc, ["Group", "Routes (illustrative)"],
          [
              ["Auth",            "POST /api/auth/login, POST /api/auth/refresh, POST /api/auth/logout, GET /api/auth/me"],
              ["Patients",        "GET/POST /api/patients, GET/PATCH /api/patients/:id, GET /api/patients/:id/visits"],
              ["Visits & OPD",    "POST /api/visits, GET /api/visits/:id, POST /api/visits/:id/queue-action"],
              ["IPD",             "POST /api/ipd/admissions, PATCH /api/ipd/admissions/:id, GET /api/ipd/:id/chart"],
              ["Prescriptions",   "POST /api/prescriptions (drug-safety pre-check), PATCH /api/prescriptions/:id"],
              ["Orders",          "POST /api/orders (lab, rad, drug, procedure), GET /api/orders/:id"],
              ["Lab",             "PATCH /api/lab/orders/:id (route/bench/QC/verify), GET /api/lab/results/:id"],
              ["Pharmacy",        "GET /api/pharmacy/queue, POST /api/pharmacy/dispense, POST /api/pharmacy/narcotics"],
              ["Billing",         "POST /api/bills, PATCH /api/bills/:id, POST /api/payments"],
              ["Insurance",       "POST /api/insurance/preauth, POST /api/insurance/claims"],
              ["Audit",           "GET /api/audit?module=&role=&patientId=&from=&to= (cursor pagination)"],
              ["Admin",           "GET /api/admin/finance, GET /api/admin/coverage, GET /api/admin/compliance"],
              ["DPDP / DISHA",    "POST /api/disha/consent, POST /api/disha/rtbf, POST /api/disha/breach-attest"],
              ["AI",              "POST /api/ai/:service (gateway → vendor + HITL emit)"],
              ["WhatsApp",        "POST /api/whatsapp/send (live), POST /api/whatsapp/webhook (live)"],
          ],
          col_widths_cm=[3.0, 14.0])

    page_break(doc)

    h1(doc, "6. AI Service Gateway")
    p(doc, "AI services run client-only stubs today. v1.0 routes every call through "
           "src/ai-services/_gateway.ts which:")
    bullet(doc, "Resolves vendor + model from server config (see TR-014).")
    bullet(doc, "Applies rate-limits and per-role budgets.")
    bullet(doc, "Persists the prompt, response, model name, confidence to a log table for evidence.")
    bullet(doc, "Emits an audit event ai.suggestion.created.")
    bullet(doc, "Returns the standard envelope; the UI accept / reject / modify flow remains identical.")
    callout(doc, "Constraint",
            "Clinical advice services (drug-safety, NEWS2, sepsis, triage) MUST stay deterministic. "
            "LLMs may pre-summarise but the final block / alert is computed in code, never the model.")

    h1(doc, "7. Integrations")
    table(doc, ["System", "Direction", "Protocol", "Status"],
          [
              ["WhatsApp Business API", "Out + In",   "HTTPS webhook + REST",   "Routes scaffolded"],
              ["UPI / Payments",        "Out",         "REST + redirect",         "Spec only (GAP-024)"],
              ["Aadhaar / DigiLocker",  "Out",         "OAuth + REST",            "Spec only (GAP-002)"],
              ["Lab analyser bridge",   "In",          "HL7 v2 / ASTM",           "Out of v1 — manual entry"],
              ["PACS / DICOM",          "Out (link)",  "URI launch",              "Read-only viewer link"],
              ["Email / SMS",           "Out",         "SMTP / vendor REST",      "Spec only (GAP-018)"],
              ["LLM vendor",            "Out",         "REST (Anthropic/OpenAI)", "Pending vendor decision (Q2)"],
              ["Tally / SAP (Finance)", "Out",         "CSV / Excel export",      "Manual export only"],
              ["HRMS payroll",          "Out",         "CSV export",              "Display only in v1"],
              ["Govt portals (GST/PF)", "Out",         "Manual / portal upload",  "Reminder + file action only"],
          ],
          col_widths_cm=[4.0, 2.5, 4.5, 6.0])

    page_break(doc)

    h1(doc, "8. Security Model")
    h2(doc, "8.1 Authentication & session")
    bullet(doc, "OIDC against the hospital IdP; fallback to internal username + TOTP for legacy stations.")
    bullet(doc, "Access token (JWT) 15 min; refresh token (rotating) 12 hours; idle session timeout 30 min.")
    bullet(doc, "Sessions bound to device fingerprint + IP; soft-reuse-detection on refresh.")

    h2(doc, "8.2 Authorisation")
    bullet(doc, "RBAC matrix as data (src/lib/permissions.ts) — 51 actions × 24 roles.")
    bullet(doc, "UI calls canDo(role, action); API performs the same check server-side. Both audited.")
    bullet(doc, "Special grants (e.g. on-call override) are time-bound and audited.")

    h2(doc, "8.3 Data protection")
    bullet(doc, "At rest: AES-256 column-level for PII; transparent encryption on the DB volume.")
    bullet(doc, "In transit: TLS 1.2+ everywhere; mTLS for service-to-service in cluster.")
    bullet(doc, "Secrets in a managed vault; no secrets in repo (verified clean).")
    bullet(doc, "Soft-delete tombstones; hard delete only via RTBF workflow.")

    h2(doc, "8.4 OWASP Top-10 controls")
    table(doc, ["Risk", "Control"],
          [
              ["A01 Broken access control", "Server-side canDo + per-row tenant filter"],
              ["A02 Cryptographic failures", "TLS + AES-256 + Argon2 password hash"],
              ["A03 Injection",              "Parameterised queries (no string SQL); zod-validated input"],
              ["A04 Insecure design",         "Threat model in arch review; abuse cases recorded"],
              ["A05 Security misconfiguration","Hardened base images; CSP + HSTS + frame-ancestors"],
              ["A06 Vulnerable components",   "npm audit gate in CI; lock-file commits required"],
              ["A07 ID & Auth failures",      "OIDC + refresh-token rotation + soft-reuse-detection"],
              ["A08 Software & data integrity","Signed builds; tamper-evident audit log"],
              ["A09 Logging & monitoring",    "Structured logs + audit DB + alert on anomalies"],
              ["A10 SSRF",                    "Outbound allow-list per service; URL fetch via vetted client"],
          ],
          col_widths_cm=[6.0, 11.0])

    h2(doc, "8.5 Audit guarantees")
    bullet(doc, "Append-only audit table; periodic Merkle-root snapshots for tamper evidence.")
    bullet(doc, "7-year retention by default; per-record overrides for clinical and financial.")
    bullet(doc, "DPDP §13 RTBF events log the lawful basis and approver; data is tombstoned then purged.")

    page_break(doc)

    h1(doc, "9. Performance & Scalability")
    table(doc, ["Surface", "p50 target", "p95 target"],
          [
              ["Page load (broadband)",      "0.8 s", "2.0 s"],
              ["Page load (4G)",              "1.5 s", "4.0 s"],
              ["Click → feedback",           "60 ms", "200 ms"],
              ["Prescription drug-safety",   "180 ms","500 ms"],
              ["Lab result lookup",          "120 ms","350 ms"],
              ["Audit trail page",           "180 ms","600 ms"],
              ["AI suggestion (LLM)",        "1.2 s", "3.0 s"],
          ],
          col_widths_cm=[7.0, 4.0, 4.0])
    bullet(doc, "Scale target v1.0: 100 concurrent staff, 500 daily visits, 1000 prescriptions / day, 4000 lab tests / day.")
    bullet(doc, "Horizontal scale-out by adding stateless Next.js pods behind the LB; DB vertically scaled with read-replicas.")
    bullet(doc, "Hot data in Redis (queues, sessions, served-counter); cold archived to object store quarterly.")

    h1(doc, "10. Environment & Deployment")
    bullet(doc, "Environments: local · dev · staging · prod (and a dedicated DR replica).")
    bullet(doc, "CI: typecheck → lint → unit tests → e2e Puppeteer sweep → build → image push.")
    bullet(doc, "CD: blue/green to prod; automatic rollback on red probes.")
    bullet(doc, "Containers: distroless Node image; non-root user; read-only FS for app code.")
    bullet(doc, "Secrets via vault; configuration via 12-factor env vars.")
    bullet(doc, "Backups nightly to off-site; PITR window 24 h; restore drill quarterly.")

    h1(doc, "11. Observability")
    bullet(doc, "Structured JSON logs with request ID, actor ID, role, route.")
    bullet(doc, "Metrics: latency / errors / saturation per route; clinical SLOs (Rx round-trip, lab QC pass-rate).")
    bullet(doc, "Tracing across SSR → API → DB on every request.")
    bullet(doc, "Alerts: pager on 5xx > 1 %, audit-emit failure, AI-vendor 5xx, payment-gateway 5xx, latency p95 breach.")

    h1(doc, "12. Coding Standards (from AGENTS.md)")
    bullet(doc, "TypeScript strict. No any escape hatches.")
    bullet(doc, "Audit everything — every mutation emits with a typed action code.")
    bullet(doc, "Stores are domain-scoped — useHRStore, useVendorStore, etc.")
    bullet(doc, "Persisted stores use skipHydration; rehydrate post-mount via StoreHydrator.")
    bullet(doc, "Permissions as data — call canDo(role, action) instead of hard-coding role checks.")
    bullet(doc, "AI envelopes — { data, confidence, reasoning, model } with accept / reject / modify.")
    bullet(doc, "Cross-store side effects — one-way via useOtherStore.getState().action(). No static import cycles.")
    bullet(doc, "Verify UI visually — screenshot the actual pages, do not claim done on a clean build alone.")
    bullet(doc, "Conventions are checked into AGENTS.md and tested via Puppeteer sweeps.")

    h1(doc, "13. Technical Requirements Register")
    table(doc, ["ID", "Requirement"],
          [
              ["TR-001", "All API write endpoints require Idempotency-Key header"],
              ["TR-002", "All DB writes audited via outbox table; never via DB triggers"],
              ["TR-003", "All cross-service calls carry x-request-id"],
              ["TR-004", "All PII columns column-encrypted; key rotated annually"],
              ["TR-005", "Tenant filter applied to every read in multi-branch mode (v2)"],
              ["TR-006", "Append-only audit table with daily Merkle-root attestation"],
              ["TR-007", "Service-to-service mTLS in the cluster"],
              ["TR-008", "CSP, HSTS, Referrer-Policy, Permissions-Policy headers"],
              ["TR-009", "No console.log in production code — pino/winston only"],
              ["TR-010", "Server Actions used only for safe forms; everything else REST"],
              ["TR-011", "Per-tenant rate-limits enforced at edge"],
              ["TR-012", "Backup restore drill executed quarterly; success recorded as evidence"],
              ["TR-013", "Vault is the only source of truth for secrets"],
              ["TR-014", "AI vendor + model configurable per service in admin UI"],
              ["TR-015", "Feature flags via a simple kv table; rollouts auditable"],
          ],
          col_widths_cm=[2.0, 15.0])

    h1(doc, "A. Version History")
    table(doc, ["Version", "Date", "Author", "Notes"],
          [["v1.0", DOC_DATE, AUTHOR, "Initial issue grounded in repo state on 2026-06-01"]],
          col_widths_cm=[2.0, 3.0, 4.5, 7.5])

    save(doc, out)


if __name__ == "__main__":
    build(Path(__file__).parent / "02_TRD_v1.0.docx")
