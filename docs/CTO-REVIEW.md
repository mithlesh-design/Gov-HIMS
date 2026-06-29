# Agentix HIMS — CTO-Level Product, Architecture & Roadmap Review

> Reviewed: 2026-06-05 · Lenses: CTO · Product Owner · Hospital Operations Consultant · UX Strategist
> Target business model: **Multi-hospital SaaS** · Current build phase: **Frontend-only** (backend deferred)

## Context

A full end-to-end review of the Hospital Management System, and a roadmap to turn it into a world-class, AI-powered platform that "solves real human problems by reducing friction, saving time, and creating a seamless experience for every stakeholder."

The eventual business model is **multi-hospital SaaS**, which informs the target architecture (Section 4). However, the **current build phase is frontend-only** — all near-term work stays in the client (Next.js UI + Zustand stores + mocked AI services). The backend in Section 4 is the documented *future* state.

---

## 1. Honest assessment of what exists today

Agentix HIMS is an **exceptionally complete, high-fidelity front-end prototype** — and genuinely impressive as product thinking. It is also, today, a **presentation layer with no backend**.

**Strengths (rare for a prototype):**
- **Breadth:** 24 role portals, 98 routes, 31 domain stores, ~104 components. Covers OPD, IPD, ER, OT, pharmacy, lab, radiology, blood bank, CSSD, dietary, BMW, mortuary, ambulance, billing, insurance/TPA, admission/beds, discharge, HR, quality, audit, and a patient portal + public family-tracking page.
- **AI-first design done right:** Every AI output is wrapped in an `AiEnvelope<T>` (confidence + tier + reasoning + `requiresReview`), surfaced through **HITL review cards** (Accept / Reject / Modify), with decisions logged to an audit + feedback store. This is the correct governance model for clinical AI.
- **Deterministic safety net:** 7 synchronous `rules-engine` modules (allergy block, dosage bounds, drug interactions, critical values, triage thresholds, billing math, OT gate) sit *under* the probabilistic AI. Right architecture: hard rules can't be "talked out of" by a model.
- **Compliance scaffolding:** Single audit fan-in (`audit.emit`), NABH chapter mapping, DPDP/DISHA consent + RTBF scoring, statutory calendar (PF/ESI/GST/TDS), BMW/CPCB logs.
- **Engineering hygiene:** TypeScript strict throughout, Zod schemas, Hindi i18n, Framer Motion polish, a deliberate **repository boundary** (`src/lib/api/_core.ts`) explicitly built so the eventual backend swap is "a transport change, not an API change" — with a `tenantId` seam already present.

**The foundational gaps (all of them backend):**

| Gap | Reality today |
|---|---|
| **No database** | All state is in-memory Zustand + `localStorage` (5 MB/browser). Data is per-device and evaporates on clear. |
| **No real authentication** | `setRole(role)` is a client-side switch over 24 hardcoded `DEMO_USERS`. Any JS console can become admin. |
| **No server/API layer** | Only mock WhatsApp routes + a locale action. UI mutates stores directly; no server-side authorization. |
| **No transactions / concurrency control** | Bed allocation, queue tokens, bill freezing, lab reflex all read-modify-write with no locks → silent lost updates under 2+ users. |
| **No multi-tenancy** | Single global namespace. Required for the SaaS model. |
| **No real-time** | "Live" = `setInterval` polling every 10s; re-aggregates the whole journey each tick. |
| **Public PHI exposure (design intent)** | `/p/[uhid]` uses the UHID as the *only* credential — no token, expiry, consent, or rate-limit. Harmless today (reads local store) but a brute-forceable PHI leak the instant a real backend serves it. |

**Readiness scorecard (today):**

| Dimension | Score |
|---|---|
| Product & domain modeling | 9/10 |
| UX / interaction design | 8.5/10 |
| AI governance design | 9/10 |
| Persistence & data integrity | 1/10 |
| Security & auth | 2/10 |
| Scalability / multi-tenancy | 1.5/10 |
| Test coverage (safety-critical) | 2/10 (Puppeteer sweeps only; zero unit tests on rules-engine) |

**Bottom line:** ~80% of the *product risk* (knowing what to build, how it should feel, how staff actually work) is already retired. ~90% of the *engineering risk* (making it real, safe, multi-tenant, and scalable) is still ahead — but the clean repository boundary means it's a **swap, not a rewrite.**

---

## 2. End-to-end review by stakeholder (friction → opportunity)

The product is broad but still **portal-centric and click-heavy**: each role works its own screen, and the patient is re-identified and re-entered at every handoff. World-class HMS reduces this to *event-driven flow* where finishing one step auto-prepares the next.

### Patient
- **Friction:** Registration re-keys demographics already known; waiting with no visibility (mitigated by the family-track page, which is a standout); no self-service intake/pre-registration; no unified digital record across visits; payments are manual.
- **Opportunity:** Pre-arrival digital registration (ABHA/QR), self-check-in kiosk/phone, real-time token + wait-time ETA, one consolidated longitudinal record, tap-to-pay (UPI), AI discharge instructions in the patient's language with medication reminders.

### Doctor
- **Friction:** Context-gathering before each consult; manual order entry across lab/radiology/pharmacy; notes typed by hand; discharge summaries assembled manually.
- **Opportunity:** AI **pre-brief** (already stubbed) becomes the default landing for every encounter; **ambient voice scribe** drafts the note (stubbed `voiceScribe`); one-line order sets ("admit CAP" → bed + antibiotics + labs + diet auto-staged); discharge summary auto-drafted from the chart for one-click sign-off.

### Nurse
- **Friction:** Vitals/MAR re-entry; manual escalation; shift handover rebuilt by hand.
- **Opportunity:** Device-fed vitals; **NEWS2/sepsis** auto-escalation (stubbed) that pages the right person; **auto-generated SBAR handover** from the shift's events; closed-loop barcode medication administration.

### Front-desk / Reception
- **Friction:** The busiest manual hub — registration, appointments, queueing, billing, TPA, all hand-driven; same patient typed into multiple modules.
- **Opportunity:** Shift work *to the patient* (self-registration) and *to automation* (auto queue routing, insurance eligibility pre-check). Front desk becomes exception-handling, not data-entry.

### Pharmacy
- **Friction:** Manual queue triage; manual stock/substitution; narcotics logging.
- **Opportunity:** The unified tagged queue (OPD/IPD/OT/ICU/Discharge) is already good; add **auto drug-interaction/allergy gating at dispense** (rules-engine exists), auto-substitution suggestions on stock-out, and predictive reorder from consumption.

### Lab & Radiology
- **Friction:** Specimen→result is multi-touch; results manually reviewed; reflex ordering manual.
- **Opportunity:** **Analyzer auto-feed** (M13.9, stubbed) becomes real HL7/ASTM ingestion; **critical-value auto-callback** with closed-loop acknowledgement (rules-engine exists); reflex testing auto-suggested; radiology AI triage prioritizes the worklist.

### Hospital administrator / Management
- **Friction:** No live operational command center; compliance evidence assembled manually; revenue leakage (untracked charges, denied claims) invisible.
- **Opportunity:** Real-time **ops command center** (census, ER load, OT utilization, ALOS, denials, revenue), AI **denial-risk** + charge-capture reconciliation, auto-generated NABH/DPDP evidence packs, predictive staffing from the HR + census data.

---

## 3. The ideal end-to-end journey (zero-friction target)

A single patient thread, event-driven, where each completed step auto-stages the next and AI removes the manual middle:

1. **Pre-arrival** — Patient books online; ABHA/QR pulls demographics; AI symptom intake pre-fills chief complaint; insurance eligibility checked automatically. *No counter typing.*
2. **Arrival** — QR self-check-in → digital token with live ETA → family-track link auto-sent. Front desk only handles exceptions.
3. **Triage (ER)** — Vitals from devices → rules-engine assigns ESI → AI flags sepsis/STEMI and pre-pages the team and pre-stages STAT orders.
4. **Consult** — Doctor opens to an **AI pre-brief**; **ambient scribe** writes the note; **order sets** fire labs/imaging/pharmacy/diet/bed in one action; safety rules gate every order in real time.
5. **Diagnostics** — Orders flow to lab/radiology worklists; analyzers auto-feed results; critical values auto-callback with acknowledgement; AI drafts the radiology report for verification.
6. **Treatment / IPD** — Bed auto-assigned (with locking); MAR barcode-verified; NEWS2 auto-escalation; nurse handover auto-SBAR'd.
7. **Discharge** — AI drafts discharge summary + patient-language instructions + e-prescription + follow-up booking; the 5-pillar clearance board auto-checks pharmacy/billing/nursing/records/consent.
8. **Billing & claims** — Charges captured automatically as orders execute; AI denial-risk pre-flights the TPA claim; UPI tap-to-pay; itemized bill to the patient's phone.
9. **Post-discharge** — Medication reminders, AI readmission-risk follow-up outreach, feedback capture, longitudinal record updated.

Every arrow above is **automatic** unless a human exception is required. That is the difference between "digitized paper" and a platform that saves time.

---

## 4. Target architecture for multi-hospital SaaS — *future / deferred*

> Documents the eventual backend target so frontend work stays compatible with it. **No backend is built in the current phase.** The repository boundary (`src/lib/api/_core.ts`) is the single most important asset for getting here cheaply later.

- **Backend:** Server-side API (Next.js Route Handlers / server actions, or a dedicated Node service) implementing the same `Table<T>` contract the stores already call — so the swap is transport-only.
- **Database:** **PostgreSQL + Prisma**, **row-level multi-tenancy** (`tenant_id` on every table + Postgres RLS policies). Encryption at rest; PITR backups.
- **Auth:** Real authentication (NextAuth/Auth.js or Clerk/WorkOS) with **per-tenant** OIDC/SAML SSO, server-enforced RBAC reusing the existing `permissions.ts` matrix (action keys already defined — just move enforcement server-side).
- **Multi-tenancy:** Tenant resolved from subdomain/JWT; every query scoped; per-tenant config (branding, modules, feature flags via existing `config/feature-flags.ts`).
- **Real-time:** Replace polling with SSE/WebSockets (or Postgres LISTEN/NOTIFY → channel) for live worklists, census, and the family-track page.
- **Concurrency:** Optimistic concurrency (version column) + DB transactions for bed allocation, token issuance, bill freeze, lab reflex.
- **Integrations layer:** HL7/ASTM (analyzers), FHIR (interop/ABDM), DICOM (PACS), payment gateway (Razorpay/UPI), WhatsApp Business + SMS, TPA/EDI claims.
- **Ops:** Docker + managed Postgres, CI/CD, Sentry + metrics/logs, secrets manager, per-tenant audit export.

**Critical: keep the rules-engine authoritative on the server.** Today it's advisory (a doctor can reject a critical-value alert silently). In production, overrides must be *allowed but logged and escalated* — never silently bypassable.

---

## 5. AI & automation roadmap (where it removes manual effort)

The ~40 AI services are already stubbed with the right contract — they need a real model behind them (use latest Claude models; add prompt caching). Prioritize by time-saved:

| Tier | Capability | Effort | Impact |
|---|---|---|---|
| **Now** | Ambient voice scribe; AI pre-brief; discharge-summary auto-draft | Med | Hours/day per doctor |
| **Now** | Critical-value auto-callback; NEWS2/sepsis auto-escalation | Low | Patient safety + nurse time |
| **Now** | Denial-risk + charge-capture reconciliation | Med | Direct revenue recovery |
| **Next** | Analyzer HL7 auto-feed; reflex auto-ordering; radiology AI triage | High | Lab/radiology throughput |
| **Next** | Order-set / NL ordering ("admit CAP"); auto drug-substitution | Med | Doctor + pharmacy time |
| **Later** | Predictive staffing & bed forecasting; readmission outreach; ops copilot | High | Margin + outcomes |

Governance is already correct (HITL + confidence tiers + audit). The work is wiring real inference + a feedback loop that tunes prompts from the recorded Accept/Reject/Modify decisions.

---

## 6. Business impact & revenue opportunities

- **Revenue capture:** Automatic charge-capture as orders execute closes the #1 leak in Indian hospitals (untracked consumables/procedures). AI denial-risk recovers TPA write-offs.
- **Throughput:** Self-registration + auto-routing + AI scribe increase OPD/encounter volume without adding staff.
- **SaaS monetization:** Tiered modules (the `feature-flags.ts` MVP/CLINICAL/ENTERPRISE tiers map cleanly to pricing), per-bed or per-encounter pricing, AI as a premium add-on.
- **Stickiness/moat:** NABH/DPDP evidence automation + the longitudinal record + the AI feedback loop create switching costs and a data moat per tenant.
- **Outcomes:** Sepsis/NEWS2 escalation and closed-loop critical values are directly defensible patient-safety wins (and marketable to accreditation bodies).

---

## 7. Roadmap (frontend-first)

**Frontend Phase 1 (current).** Four tracks, all client-side, on existing Zustand stores + mocked AI services:
- **(A) Reduce journey friction** — self/assisted check-in with dedup, one-action order sets, auto-stage next step, live token + wait-time ETA.
- **(B) Activate stubbed AI in the UI** — pre-brief on consult open, voice-scribe note draft, discharge auto-summary, critical-value callback + NEWS2/sepsis cards, denial-risk flag — all via the HITL `AiEnvelope` review card.
- **(C) Ops command center** — live management dashboard (census, ER load, OT utilization, ALOS, denials, revenue, staffing) from existing stores.
- **(D) UX polish + accessibility** — consistency, WCAG, loading/empty/error states, mobile, patient-facing pages, across the 24 portals.
- **Plus:** a frontend family-track consent/token affordance on `/p/[uhid]` matching the future backend's data shape.

**Later (deferred — Section 4).** Real persistence + multi-tenant backend, real auth + server-enforced RBAC, transactions, real-time, and integrations (HL7/FHIR/DICOM/payments/WhatsApp). Documented now so frontend work stays compatible; not built in the current phase.
