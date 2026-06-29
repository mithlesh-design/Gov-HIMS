# Agentix HIMS — Complete Project Overview

> **A code-grounded walkthrough of every role, page, process, and system.**
> Generated 2026-05-23 by analyzing the actual source (not just the PRD). Where the
> running code differs from `PRD.md`, this document describes **what the code actually does**
> and flags the difference in the [Reality Check](#19-reality-check--gaps--prd-divergences) section.

---

## Table of Contents

1. [What this project is](#1-what-this-project-is)
2. [How to run it](#2-how-to-run-it)
3. [Tech stack](#3-tech-stack)
4. [Architecture at a glance](#4-architecture-at-a-glance)
5. [Authentication, roles & navigation](#5-authentication-roles--navigation)
6. [The 24 roles (master table)](#6-the-24-roles-master-table)
7. [The AI layer — the `AiEnvelope` contract](#7-the-ai-layer--the-aienvelope-contract)
8. [AI services inventory (~40 functions)](#8-ai-services-inventory-40-functions)
9. [The rules engine (7 deterministic safety modules)](#9-the-rules-engine-7-deterministic-safety-modules)
10. [Human-in-the-loop (HITL) & AI governance loop](#10-human-in-the-loop-hitl--ai-governance-loop)
11. [Module docs — Clinical](#11-module-docs--clinical)
12. [Module docs — Operations & patient flow](#12-module-docs--operations--patient-flow)
13. [Module docs — Finance](#13-module-docs--finance)
14. [Module docs — Management & compliance](#14-module-docs--management--compliance)
15. [Module docs — Support services](#15-module-docs--support-services)
16. [Module docs — Patient-facing](#16-module-docs--patient-facing)
17. [Cross-module data flows](#17-cross-module-data-flows)
18. [Cross-cutting systems](#18-cross-cutting-systems)
19. [Reality check — gaps & PRD divergences](#19-reality-check--gaps--prd-divergences)
20. [Full route map (98 routes)](#20-full-route-map-98-routes)
21. [State stores inventory (31 stores)](#21-state-stores-inventory-31-stores)

---

## 1. What this project is

**Agentix HIMS** (`kailash-hms-prototype`) is an **AI-first Hospital Management System prototype** for Indian
hospitals, built as a single Next.js 16 web application. It unifies **24 role-based portals** across every
hospital function — clinical, operations, finance, management, support services, and patient-facing — into one app.

It is a **front-end prototype / demo**: there is **no backend, no database, and no real authentication**. All
data lives in **in-memory Zustand stores** (lost on page refresh), and all "AI" is served by **~40 mock service
functions** that simulate latency and return canned or lightly-computed results. The genuine deterministic logic
lives in a **7-module rules engine** (the patient-safety net). The whole thing is designed so each AI mock can be
swapped for a real LLM call by replacing one function body.

**Scale:** 241 TypeScript files · 98 page routes · 25 layouts · 31 Zustand stores · ~40 AI services ·
7 rules engines · 2 mock API routes (WhatsApp) · English + Hindi i18n.

---

## 2. How to run it

```bash
npm install      # ~428 packages
npm run dev      # Next.js dev server (Turbopack) on http://localhost:3000
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```

Open **http://localhost:3000** → a role-picker landing page. Pick any role (no credentials needed — it's a demo)
to enter that portal. The public patient kiosk is at **/checkin** (no login).

- **Node:** tested on v24.13.0 / npm 11.10.1.
- **Note:** because state is in-memory, refreshing the browser resets all data to the seeded mock values.

---

## 3. Tech stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16.2.4** (App Router, Turbopack, React Server + Client Components) |
| UI library | **React 19.2.4** |
| Language | TypeScript 5 (strict) |
| Styling | **Tailwind CSS v4** (`@tailwindcss/postcss`), inline style objects for gradients |
| Animation | **Framer Motion 12** (page transitions, cards, modals; respects `useReducedMotion`) |
| State | **Zustand 5** — 31 in-memory domain stores (no `persist` middleware) |
| Forms | React Hook Form 7 + Zod 4 (`@hookform/resolvers`) |
| Charts | **Recharts 3** (Line, Bar, Pie/Donut, Area, RadialBar) |
| i18n | **next-intl 4** (English + Hindi, cookie-based locale) |
| Icons | Lucide React |
| Toasts | Sonner |
| QR codes | `qrcode.react` (kiosk + family tracking) |
| Fonts | Figtree (headings) + Noto Sans (body) via `next/font` |

> ⚠️ Per `AGENTS.md`, this is a **modified Next.js 16** with potential breaking changes vs. public docs — consult
> `node_modules/next/dist/docs/` before writing Next.js code.

---

## 4. Architecture at a glance

```
src/
├── app/                 # Next.js App Router — 24 role portals, 98 routes, 2 API routes
│   ├── page.tsx         # Role-picker landing (login)
│   ├── layout.tsx       # Root layout: fonts, NextIntlClientProvider, Sonner Toaster
│   ├── actions/         # Server actions (locale.ts)
│   ├── api/whatsapp/     # Mock WhatsApp send + webhook routes
│   └── <role>/...        # Per-role layout.tsx (RoleGuard) + page.tsx routes
├── ai-services/         # ~40 mock AI functions, all return Promise<AiEnvelope<T>>
├── rules-engine/        # 7 deterministic, synchronous safety modules
├── store/               # 31 Zustand stores (in-memory)
├── services/            # notification-dispatcher.ts (cross-channel alerts, mocked)
├── components/
│   ├── layout/          # AppShell (sidebar/nav/role-switcher) + RoleGuard
│   ├── features/        # Copilot, HITL review card, pre-brief, patient card …
│   └── ui/              # Design system + AI-presentation primitives
├── config/              # feature-flags.ts (tiered AI gating)
├── i18n/                # routing.ts + request.ts (next-intl)
├── lib/                 # utils (cn), triage color helpers, ai-helpers (envelope builder)
└── types/               # ai.ts (AiEnvelope), roles.ts (24 roles), index.ts (barrel)
```

**The request lifecycle for a role page:**

```
Root layout (fonts, i18n provider, toaster)
  └─ <role>/layout.tsx
       └─ RoleGuard allowedRole="<role>"      ← client-side gate: redirects if no user / wrong role
            └─ AppShell                          ← sidebar nav (per-role), top bar, role switcher
                 └─ [optional] CopilotLayout     ← floating AI assistant if FLAGS.copilotEnabled
                      └─ page.tsx                ← the actual screen
```

**The AI safety model** (the project's central design idea):

```
Clinical / financial event
   │
   ▼
Rules Engine  (synchronous, deterministic — the hard safety net)
   ├── BLOCK if a hard constraint is violated (allergy, dose, OT gate)
   └── PASS → AI Service (async, probabilistic, MOCKED)
                └── returns AiEnvelope { data, confidence, tier, reasoning, requiresReview }
                     └── UI renders it in a HITL review card (confidence badge + Accept/Modify/Reject)
                          └── human decides → decision written to the Audit store + Feedback store
```

So **AI is always advisory**, the **rules engine is the authority**, and the **human keeps the final say** — with
every decision logged.

---

## 5. Authentication, roles & navigation

- **No real auth.** `useAuthStore` (Zustand) holds `currentUser` + `activeRole`. Picking a role on the landing page
  calls `setRole(role)`, which loads a hardcoded **`DEMO_USERS[role]`** identity (e.g. doctor = "Dr. Priya Menon",
  nurse = "Anjali Desai"). Default boot state is the **doctor** role.
- **`RoleGuard`** (`components/layout/RoleGuard.tsx`) wraps each role's pages. On mount it: redirects to `/` if there
  is no `currentUser`; redirects to the role's home dashboard if `activeRole !== allowedRole`. Otherwise it renders
  `AppShell`. *(Note: a few layouts — admission, OT, housekeeping, billing, quality — skip `RoleGuard` and use
  `AppShell` directly; access control is effectively cosmetic in the demo.)*
- **`AppShell`** (`components/layout/AppShell.tsx`) is the chrome shared by all portals:
  - **Per-role sidebar** driven by a `navByRole` map (each role has its own nav items + icons + theme color).
  - **Portal switcher** — a 24-button grid lets you jump to any role instantly (demo convenience).
  - **Top bar** — collapsible-sidebar toggle, breadcrumb, global patient search (decorative), notifications
    dropdown, **LocaleToggle** (EN/हिं), settings.
  - Animated page transitions (Framer Motion), an "AI Active" status chip, and the logged-in user row + logout.
- **Landing page** (`app/page.tsx`) — a polished split-screen: animated brand panel with live mock metrics (queue,
  AI accuracy, bed occupancy, discharges) + trust badges (AI-Powered, DISHA Secure, Real-time, NABH Ready), and a
  tabbed role selector across the 6 functional groups, plus a "Patient Self Check-In (Public Kiosk)" CTA.

---

## 6. The 24 roles (master table)

Roles are defined in `types/roles.ts` (`ALL_ROLES`) and given demo identities in `useAuthStore`.

| # | Role key | Portal label | Demo user | Domain | Home route |
|---|---|---|---|---|---|
| 1 | `doctor` | Doctor Portal | Dr. Priya Menon | Clinical | `/doctor/dashboard` |
| 2 | `nurse` | Nursing Station | Anjali Desai | Clinical | `/nurse/dashboard` |
| 3 | `pharmacy` | Pharmacy | Ritu Sharma | Clinical | `/pharmacy/dashboard` |
| 4 | `lab` | Laboratory | Neha Gupta | Clinical | `/lab/dashboard` |
| 5 | `radiology` | Radiology Dept | Dr. Sameer Khan | Clinical | `/radiology/dashboard` |
| 6 | `emergency` | Emergency Room | Dr. Vikram Rathore | Clinical | `/emergency/dashboard` |
| 7 | `reception` | Reception | Sunita Joshi | Operations | `/reception/dashboard` |
| 8 | `bed_manager` | Admission Desk | Aditi Verma | Operations | `/admission/dashboard` |
| 9 | `discharge` | Discharge Desk | Meena Agarwal | Operations | `/discharge/dashboard` |
| 10 | `ot` | Operation Theater | Dr. Anisha Sharma | Operations | `/ot/dashboard` |
| 11 | `billing` | Billing Dept | Suresh Nair | Finance | `/billing/dashboard` |
| 12 | `insurance` | TPA & Insurance | Karan Patel | Finance | `/insurance/dashboard` |
| 13 | `admin` | Admin Portal (COO) | Rajesh Kulkarni | Management | `/admin/dashboard` |
| 14 | `quality` | Quality & Safety | Dr. Lalitha Iyer | Management | `/quality/dashboard` |
| 15 | `housekeeping` | Housekeeping | Ramesh Kumar | Management | `/housekeeping/dashboard` |
| 16 | `inventory` | Inventory Mgr | Vikram Singh | Management | `/inventory/dashboard` |
| 17 | `blood_bank` | Blood Bank | Dr. Pooja Srivastava | Support | `/bloodbank/dashboard` |
| 18 | `cssd` | CSSD | Shalini Mehta | Support | `/cssd/dashboard` |
| 19 | `dietary` | Dietary Services | Nalini Bose | Support | `/dietary/dashboard` |
| 20 | `bmw` | Bio-Medical Waste | Ganesh Rao | Support | `/bmw/dashboard` |
| 21 | `mortuary` | Mortuary | Shyam Tiwari | Support | `/mortuary/dashboard` |
| 22 | `ambulance` | Ambulance Svc. | Deepak Pandey | Support | `/ambulance/dashboard` |
| 23 | `audit_officer` | Audit & Compliance | Preethi Krishnan | Support | `/audit/dashboard` |
| 24 | `patient` | Patient Portal | Kiran Patil | Patient | `/patient/dashboard` |

---

## 7. The AI layer — the `AiEnvelope` contract

Every AI service returns `Promise<AiEnvelope<T>>` — a typed wrapper (`types/ai.ts`) built by one helper,
`wrapAiResponse()` (`lib/ai-helpers.ts`). This is the **single swap-in seam** for real LLMs.

```ts
interface AiEnvelope<T> {
  data: T
  confidence: number            // 0..1
  confidenceTier: 'high' | 'medium' | 'low'
  reasoning: string
  disclaimer: string            // "AI-generated suggestions are for clinical decision support only…"
  modelVersion: string          // default 'kailash-ai-v1'
  generatedAt: string           // ISO timestamp
  requiresReview: boolean        // true when tier !== 'high'
  actions?: AiAction[]
  sessionId?: string
}
```

**Confidence → tier mapping** (`getConfidenceTier`):

| Confidence | Tier | `requiresReview` | UI label |
|---|---|---|---|
| ≥ 0.85 | **high** | false | "Auto-apply available" |
| 0.60–0.84 | **medium** | true | "Review Required" |
| < 0.60 | **low** | true | "Manual Entry Recommended" |

Supporting types: `AiAction { id, label, type: navigate\|store_mutation\|notification\|external, payload, requiresConfirmation }`
and `HitlDecision { envelopeId, action: accept\|reject\|modify, reason?, userId, timestamp }`.

---

## 8. AI services inventory (~40 functions)

All ~40 services in `src/ai-services/` are **mocks** — they `await setTimeout(...)` and return canned or
lightly-computed data. Some contain **real deterministic logic over their inputs** (marked ✅ "real logic"); the rest
return fully canned data (⚪ "pure mock"). The barrel `index.ts` exports ~37; three more (`validateInsuranceClaim`,
`generateSurgicalRequisition`, `generateIPDCharges`) are imported directly by pages.

### Clinical decision support
| Function | File | Does | Conf. | Logic |
|---|---|---|---|---|
| `generatePreBrief` | pre-brief | Pre-consult brief (conditions, meds, allergies, focus) | 0.88 | ⚪ |
| `suggestDiagnoses` | diagnosis | Differential dx + ICD + probabilities | 0.72 | ⚪ |
| `suggestPrescription` | prescription | CAP prescription draft; drops/flags Amoxiclav if penicillin allergy | 0.91/0.86 | ✅ allergy branch |
| `retrieveProtocol` | clinical-protocol | CAP protocol (CURB-65, IDSA/ATS) | 0.94 | ⚪ |
| `generatePatientSummary` | patient-summary | Headline + problems + metrics + next actions | 0.88 | ⚪ |
| `generateClinicalNote` | documentation-engine | SOAP/narrative note + word count + billing-readiness score | 0.84 | ✅ assembly |

### Triage / risk
| Function | File | Does | Conf. | Logic |
|---|---|---|---|---|
| `assessTriage` | triage | ESI level (ER) — always returns ESI-2 | 0.89 | ⚪ |
| `assessMortalityRisk` | mortality-risk | APACHE-II-style mortality score | 0.78 | ⚪ |
| `assessReadmissionRisk` | readmission-risk | LACE+ 30-day readmission risk | 0.76 | ⚪ |
| `monitorSepsisMarkers` | sepsis-alert | qSOFA / Sepsis-3 alert + bundle | 0.91 | ⚪ |

### Lab / radiology / drug safety
| Function | File | Does | Conf. | Logic |
|---|---|---|---|---|
| `detectLabAnomalies` | lab-anomaly | Flags abnormal labs vs reference ranges | 0.93 | ⚪ |
| `suggestReflexTests` | reflex-test | Reflex test triggers (culture, PCT, D-dimer) | 0.84 | ⚪ |
| `generateRadiologyReport` | radiology-report | Drafts a chest X-ray report | 0.81 | ⚪ |
| `checkDrugInteractionsAi` | drug-interaction | AI "context" layer; defers hard blocks to rules engine | 0.95 | ⚪ |

### OT / discharge / nursing
| Function | File | Does | Conf. | Logic |
|---|---|---|---|---|
| `generateOTBriefing` | ot-briefing | Pre-op briefing (surgeon, blood, risks) | 0.86 | ⚪ |
| `verifyOTChecklist` | ot-checklist | WHO checklist + `canProceed` gate from critical items | 0.97 | ✅ gate |
| `generateSurgicalRequisition` | ot-surgical-requisition | Procedure→template; routes items to pharmacy/CSSD/inventory | 0.91 | ✅ routing |
| `generateDischargeSummary` | discharge-summary | Full summary incl. lab trends + EN & Hindi patient copies | 0.87 | ⚪ (rich) |
| `generateHandoverBrief` | handover-brief | SBAR shift handover for ward patients | 0.85 | ⚪ |

### Billing / insurance
| Function | File | Does | Conf. | Logic |
|---|---|---|---|---|
| `suggestBillingCodes` | billing-suggest | Billing/CPT codes + TPA checklist (OT toggle) | 0.88 | ✅ checklist |
| `generateIPDCharges` | billing-suggest | LOS-scaled ward/OT charges, dedupes existing | 0.89 | ✅ math |
| `detectBillingAnomalies` | fraud-detect | Fraud/upcoding detection (returns none) | 0.94 | ⚪ |
| `draftPreAuth` | insurance-preauth | Insurer pre-auth draft (codes, cost, justification) | 0.83 | ⚪ |
| `validateInsuranceClaim` | insurance-preauth | Claim completeness scan (per-claim scenarios) | 0.88 | ✅ scenarios |
| `draftClaimJustification` | draft-claim-justification | TPA narrative + doc checklist | 0.86 | ✅ conditionals |

### Operations / supply / dietary
| Function | File | Does | Conf. | Logic |
|---|---|---|---|---|
| `forecastBedDemand` | bed-forecast | 7-day occupancy forecast (sine + random) | 0.82 | ⚪ generated |
| `suggestStaffingAdjustments` | bed-forecast | Bumps staff when forecast > 85% occupancy | 0.79 | ✅ math |
| `optimizeAppointmentSlots` | appointment-optimize | Slot optimization (wait/utilization) | 0.79 | ⚪ |
| `detectFlowBottlenecks` | detect-flow-bottlenecks | Aggregates journey states → pressure score + actions | 0.82 | ✅ aggregation |
| `predictPharmacySupply` | supply-predict | 7-day demand + reorder for one item | 0.83 | ⚪ |
| `forecastBloodDemand` | blood-demand | Blood-group demand forecast | 0.77 | ⚪ (O+ branch) |
| `prioritizeCSSDQueue` | cssd-priority | Sterilization queue prioritization | 0.88 | ⚪ |
| `suggestDietPlan` | diet-plan | Diabetic diet plan | 0.87 | ⚪ |

### Quality / patient education / comms / orchestration
| Function | File | Does | Conf. | Logic |
|---|---|---|---|---|
| `suggestCAPA` | suggest-capa | Picks 2–3 CAPA templates + target dates | 0.84 | ✅ selection |
| `runQualityIntelligence` | quality-intelligence | Incident clusters + risk + NABH readiness; calls `suggestCAPA` | 0.86 | ✅ scoring |
| `suggestRecallCohorts` | suggest-recall-cohorts | Chronic-care recall cohorts (DM/HTN/CAD/CKD) | 0.83 | ✅ selection |
| `generatePatientEducation` | generate-patient-education | Condition×format library + Hindi fallback | 0.87 | ✅ lookup |
| `classifyWhatsAppMessage` | whatsapp-assistant | Intent classification, EN/HI detect, bilingual reply | 0.88/0.6 | ✅ rule-NLP |
| `extractIntakeFromVoice` | voice-intake | Extracts name/age/gender/symptoms from transcript | 0.75+ | ✅ rule-NLP |
| `nlpPatientSearch` | nlp-search | NLP fuzzy patient search | 0.90 | ⚪ |
| `invokeCopilot` | copilot-orchestrator | **Role-routed fan-out** — runs role's AI services in parallel, returns insights, audit-logs | — | ✅ orchestration |

**Copilot routing** (`invokeCopilot`): doctor → pre-brief + diagnoses + readmission + lab anomalies; nurse →
sepsis (if alert) + handover + protocol; billing/insurance → billing codes + fraud flags; everyone else → a generic
greeting.

---

## 9. The rules engine (7 deterministic safety modules)

`src/rules-engine/` is the **genuinely deterministic, synchronous** layer — no async, no randomness, hardcoded
clinical/financial thresholds. This is the real safety net the AI defers to.

| Module | Purpose | Core logic |
|---|---|---|
| **triage-thresholds** | ESI 1–5 from vitals | GCS<9 / SBP<70 / SpO2<85 → ESI-1; RR>30, HR>130, SBP<90, SpO2<92 → ESI-2; Temp>39, HR>100 or <50 → ESI-3; else ESI-4. Max waits 0/10/30/60/120 min |
| **drug-interactions** | Pairwise interaction DB | 7 hardcoded pairs (Warfarin+Aspirin/Ibuprofen, Metformin+Contrast, Amiodarone+Warfarin, Amlodipine+Simvastatin, Morphine+Diazepam, Clarithromycin+Atorvastatin) with major/moderate/minor severity |
| **allergy-block** | Hard allergy contraindication | Direct + class cross-reactivity (`ALLERGY_CLASS_MAP`: Penicillin→Amoxicillin/Amoxiclav/…, Sulfonamide, NSAID, Opioid, Benzodiazepine, Statin) |
| **dosage-bounds** | Dose-safety validation | Per-drug max/min daily mg, mg/kg, paediatric & renal flags (Paracetamol, Metformin, Amoxicillin, Morphine, Diazepam, Warfarin, Atorvastatin, Amlodipine). Over-max = error; below-min/renal/paeds = warning |
| **critical-values** | Panic-value lab detection | Critical ranges: K 2.5–6.5, Na 120–160, Glucose 50–500, Hb 7–20, Creatinine 0–8, PLT 20k–1M, INR 0–4, each with an immediate-action note |
| **ot-gate** | WHO checklist proceed-gate | `canProceed = false` if ANY critical checklist item is still pending |
| **billing-math** | Bill computation | GST 5% default (exempt: CONSULT/ROOM/NURSING/LAB-BASIC); payer coverage: insurance 80%, government 100%, corporate 90%, tpa 75%, cash 0% |

> ⚠️ **Wiring caveat:** the engine is only **partially connected** to the UI. Only `/pharmacy/dispense` actually
> calls `allergy-block` + `drug-interactions`. OT critical-gating is re-implemented **inline** in the OT pages
> (not via `ot-gate`); ER triage severity is set **manually** (not via `triage-thresholds`); lab critical gating
> uses a store boolean (not `critical-values`); and billing math lives in the store (not `billing-math`). The
> modules exist and are correct — most just aren't imported yet.

---

## 10. Human-in-the-loop (HITL) & AI governance loop

The project models a complete **AI governance loop** through a few shared components:

- **`HitlReviewCard`** (`components/features/`) — generic `<T>` card that wraps an `AiEnvelope<T>`. Shows the
  confidence badge, reasoning, and **Accept / Modify / Reject** buttons (reject requires a typed reason). Every
  decision is written to `useAuditStore` (`hitl_accept` / `hitl_reject` / `hitl_modify`). Used by the doctor
  registries, nurse handover, lab reflex, radiology templates, pharmacy supply, discharge summary, insurance
  pre-auth, dietary plans, admin flow-bottlenecks, and quality CAPA screens.
- **`CopilotPane` / `CopilotLayout`** — a floating AI assistant (portal-rendered FAB → 380px chat panel). On demand
  it builds a `CopilotContext` from the current user + route and calls `invokeCopilot`, rendering each insight with a
  confidence badge, action buttons, and feedback thumbs. Logs `copilot_invoked` to the audit store.
- **`AiFeedbackButtons`** — 👍/👎 on any AI output → writes to `useFeedbackStore` + audit-logs `ai_feedback_*`.
- **`useFeedbackStore.getPerformanceReport()`** aggregates that feedback into per-feature acceptance rates, which
  the **`/admin/ai-performance`** dashboard visualizes — closing the loop from suggestion → decision → metric.
- **Shadow mode** (`FLAGS.shadowMode`) — when on, Copilot/HITL still *show* suggestions but **disable all actions**
  (observe-only), for safe rollout. Currently off.
- **AI presentation primitives** (`components/ui/`): `AiConfidenceBadge` (pct + tier + reasoning tooltip),
  `AiDisclaimer` (the standing "decision support only" notice), `AiInsightPanel` (collapsible insight list with a
  confidence meter).

---

## 11. Module docs — Clinical

> Doctor & Nurse layouts add a **Copilot** pane; Emergency does not. **None of the clinical pages call the rules
> engine directly**, and most "AI" here is either a mock service, a local heuristic, or a static seeded string.

### 👨‍⚕️ Doctor — *Doctor Portal* (`/doctor`)
Layout: `RoleGuard` + `CopilotLayout role="doctor"`. Nav: Consultations, Patient Records, My Schedule, Consultation, Inbox, Telemedicine, Disease Registries.

| Route | What it does |
|---|---|
| `/doctor/dashboard` | **The real consultation cockpit.** Live OPD queue (left) → select patient → center panel with vitals, AI pre-brief, SOAP-style notes (auto-save), collapsible **order panels** (lab / radiology / refer / admit), right panel with AI suggestion chips + a **prescription builder** ("Send to Pharmacy"). The **Admission modal** bundles Rx + lab + radiology + allergies/comorbidities and sends to the Bed Manager. Writes to `usePharmacyStore`, `useLabStore`, `useRadiologyStore`, `useAdmissionStore`. |
| `/doctor/consultation` | Stub — immediately `router.replace('/doctor/dashboard')`. |
| `/doctor/records` | Grid of all patients as `PatientCard`s (`usePatientStore`). |
| `/doctor/schedule` | Static appointment-slot list (done/in-progress/upcoming/open). |
| `/doctor/inbox` | Notification feed (lab results, referrals, alerts) from `useNotificationStore`; mark read / mark-all-read. |
| `/doctor/telemedicine` | Static video-consult queue ("Join Session" non-functional). |
| `/doctor/registries` | **Disease registries** (Diabetes HbA1c, Hypertension BP bar charts) + "Run AI Recall Analysis" → `suggestRecallCohorts` → cohort cards with suggested WhatsApp campaigns + `HitlReviewCard`. |

### 👩‍⚕️ Nurse — *Nursing Station* (`/nurse`)
Layout: `RoleGuard` + `CopilotLayout role="nurse"`. Nav: Ward Dashboard, My Patients, Doctor Rounds, Daily Tasks, Medication (MAR), Handover Brief.

| Route | What it does |
|---|---|
| `/nurse/dashboard` | Ward command center: stats, **Incoming Transfers** (admission bundles authored by the doctor, "Arrived" → `markAdmitted`), **Family Camera Requests** (approve/decline → audit log), **AI Deterioration Alerts** (static seeded), ward bed cards with vitals + "Update Vitals" modal + "Discharge" (→ `useDischargeStore`). |
| `/nurse/patients` | Read-only inpatient list with vitals + abnormal-value highlighting. |
| `/nurse/rounds` | Per-patient rounds notes with **voice dictation** (`SpeechRecognition`, en-IN) + a debounced **local keyword classifier** (observation/medication/test/instruction) + quick-add meds/tests/instructions. |
| `/nurse/tasks` | Shift task checklist with progress bar (local state). |
| `/nurse/medication` | **MAR** tab (administer meds with identity-verification banner) + **IPD Procurement** tab (request pharmacy procurement for `deferred_ipd` prescriptions → `requestProcurement`). |
| `/nurse/handover` | "Generate Handover Brief" → `generateHandoverBrief` → SBAR per patient inside `HitlReviewCard`. |

### 🚑 Emergency — *Emergency Room* (`/emergency`)
Layout: `RoleGuard` only (no Copilot). Nav: ER Dashboard, Triage Queue. **Severity is set manually** (the `triage-thresholds` and `assessTriage` services are NOT wired in).

| Route | What it does |
|---|---|
| `/emergency/dashboard` | Live triage board sorted by severity (Red→Yellow→Green), masked patient names, EMS-inbound count, computed avg wait, Code Blue badge, "Admit" modal → `admitPatient`. |
| `/emergency/triage` | Triage queue with severity filter + "Add Patient" modal (name, complaint, severity, ETA, ambulance id) → `addToTriage`. |

### 🔬 Laboratory — *Laboratory* (`/lab`)
Layout: `RoleGuard`. Nav: Lab Overview, Sample Tracking, Quality Control, Reflex Tests.

| Route | What it does |
|---|---|
| `/lab/dashboard` | Sample KPIs + **Recharts AreaChart** of TAT trends (Routine/Urgent/STAT) + AI-anomaly alert sidebar (seeded strings). |
| `/lab/samples` | Sample pipeline (Collected→Processing→Analyzing→Completed) with **live TAT timers** + **critical-value gate**: a sample with a critical value must be acknowledged (notified-doctor modal) before "Advance". |
| `/lab/reflex` | "Run Reflex Analysis" → `suggestReflexTests` → results in `HitlReviewCard`. |
| `/lab/qc` | Daily QC run log (Westgard-style) with pass/warning/fail tallies + "do not release" banner. |

### 🩻 Radiology — *Radiology Dept* (`/radiology`)
Layout: `RoleGuard`. Nav: RIS Dashboard, Scan Schedule, DICOM Viewer, Report Templates.

| Route | What it does |
|---|---|
| `/radiology/dashboard` | Scan KPIs + today's modality schedule cards + AI preliminary findings (seeded). |
| `/radiology/scans` | Scan worklist (Scheduled→In Progress→Ready→Reported) with live TAT timers. |
| `/radiology/viewer` | **DICOM viewer placeholder** (black panel; notes Cornerstone/OHIF integration pending). |
| `/radiology/templates` | "AI Fill" a report template → `generateRadiologyReport` → `HitlReviewCard` (findings/impression/recos/critical). |

### 💊 Pharmacy — *Pharmacy* (`/pharmacy`)
Layout: `RoleGuard`. Nav: Pharmacy Queue, Dispense, Inventory, Drug Master, Narcotics Log.

| Route | What it does |
|---|---|
| `/pharmacy/dashboard` | OPD prescription prep queue (queued→preparing→ready→collected); "patient has meds at home?" recomputes billable totals; a fake inline "AI interaction" banner appears at ≥3 meds. |
| `/pharmacy/dispense` | **The only page that uses the rules engine.** OPD tab: on dispense, runs `checkInteractions` + `isAllergyContraindicated` — **allergy blocks** dispense (override required), interactions only warn. IPD tab: quantity adjustments with audit logging + a **supervisor-override gate** when reducing qty >50%. |
| `/pharmacy/inventory` | Stock table with reorder alerts + "AI Supply Forecast" → `predictPharmacySupply` → `HitlReviewCard`. |
| `/pharmacy/master` | Searchable drug catalog (schedule X/H1 badges, dual-signature flag, interactions, allergy classes) from `useDrugMasterStore`. |
| `/pharmacy/narcotics` | Static Schedule H/X controlled-substance register (dual-signature, batch, running stock; NDPS note). |

---

## 12. Module docs — Operations & patient flow

### 🛎️ Reception — *Reception* (`/reception`)
Layout: `RoleGuard`. Nav: Queue Board, Patients, Kiosk System.

| Route | What it does |
|---|---|
| `/reception/dashboard` | **OPD Kanban board** — 6 columns (waiting→vitals→consulting→pharmacy→billing→done), per-card "advance" button, triage coloring, **walk-in registration** modal → `addPatient`. |
| `/reception/patients` | Patient grid (`PatientCard`). |
| `/reception/queue` | **Public "Now Serving" display board** (orphaned — not in sidebar nav) with live clock + kiosk mode + journey flow bar. |

### 📱 Check-in kiosk — *public, no auth* (`/checkin`)
No layout wrapper (standalone full-screen). The only unauthenticated surface besides family-tracking.

| Route | What it does |
|---|---|
| `/checkin` | Kiosk landing with a **real scannable QR** (→ `/checkin/intake`), a 4-step explainer, and a demo family-tracking shortcut. |
| `/checkin/intake` | **4-step self-registration wizard**: (1) details via Manual / **Aadhaar camera-scan simulation** / **voice** (`extractIntakeFromVoice`, EN/HI) with live duplicate detection; (2) symptom chips → local triage score; (3) review + **DISHA family-tracking consent**; (4) token issued (`addPatient`) + shareable **family QR** (`generateFamilyToken`). |

### 🛏️ Admission / Bed Manager — *Admission Desk* (`/admission`)
Layout: `AppShell` (no RoleGuard). Nav: Admissions, Bed Board, Bed Forecast.

| Route | What it does |
|---|---|
| `/admission/dashboard` | Triage admission requests; **bed-recommendation** panel matches available beds to admission type (local heuristic), `assignBed` → `markAdmitted`; expandable admission bundle; >30-min wait alert. |
| `/admission/beds` | Visual **bed board** grouped by ward (Available/Occupied/Cleaning/Reserved/Maintenance). "Mark for Cleaning" also **pushes a task to Housekeeping**; "Mark Ready" → `confirmBedReady`. |
| `/admission/forecast` | On mount calls `forecastBedDemand(7)` → **Recharts LineChart** (occupancy/admissions/discharges) + confidence badge + disclaimer + per-day table. |

### 🔪 Operation Theater — *Operation Theater* (`/ot`)
Layout: `AppShell`. Nav: OT Live, OT Schedule, Pre-Op Checklist. (Critical gate is implemented **inline**, not via `ot-gate`.)

| Route | What it does |
|---|---|
| `/ot/dashboard` | OT room board + procedure lifecycle (Scheduled→Pre-Op→In Progress→Recovery→Completed); **advancing past Pre-Op is blocked if any critical checklist item is unchecked**; expandable "IPD Brief from Ward" + "Coordinate Requirements" dispatcher. |
| `/ot/schedule` | View + schedule procedures ("Add Procedure" auto-creates a 10-item checklist). |
| `/ot/checklist` | Per-procedure **WHO-style safety checklist** (6 critical items) + progress + "safe to proceed" banner + **AI Surgical Requisition** (`generateSurgicalRequisition`) routing items to pharmacy/CSSD/inventory ("Dispatch All"). |

### 🏷️ Discharge — *Discharge Desk* (`/discharge`)
Layout: `AppShell` + `CopilotLayout role="discharge"`. Nav: Discharge Queue.

| Route | What it does |
|---|---|
| `/discharge/dashboard` | **5-pillar clearance** (doctor / nursing / pharmacy / billing / insurance) toggles; add/resolve **blockers**; "AI Draft" summary (local template); doctor "Approve Summary"; **exit gate** requires all 5 pillars + approved summary + zero blockers → `issueExitClearance`. |
| `/discharge/summary/[id]` | (Not in nav) On mount `generateDischargeSummary` → `HitlReviewCard`; after accept, 3 tabs: **Clinical View** (incl. lab-trend table), **Patient Copy** (plain language), **हिंदी** (Hindi summary). |

### 🧹 Housekeeping — *Housekeeping* (`/housekeeping`)
Layout: `AppShell`. Nav: Cleaning Queue.

| Route | What it does |
|---|---|
| `/housekeeping/dashboard` | Cleaning task lifecycle (Pending→In Progress→Done→Verified); assign staff; **Verify also calls `useAdmissionStore.confirmBedReady`** — flipping the bed back to Available (closes the discharge→clean→ready loop). |

---

## 13. Module docs — Finance

### 💳 Billing — *Billing Dept* (`/billing`)
Layout: `AppShell` + `CopilotLayout role="billing"`. Nav: Billing Overview, Packages, Refunds, Discounts.

| Route | What it does |
|---|---|
| `/billing/dashboard` | KPIs (outstanding, collected, pending-freeze, settled) + **Recharts BarChart** (Collected vs Outstanding) + bill list → "View Bill". |
| `/billing/patient/[id]` | (Not in nav) Itemized invoice grouped by 9 charge types; **AI Suggest Charges** (`generateIPDCharges`, IPD drafts only) with per-line accept/reject; Freeze Bill; Apply Insurance Coverage (80% for cashless); **Collect Payment** (Cash/UPI/Card/Insurance) → receipt + auto-settle. |
| `/billing/packages` | Static surgical/care package catalog (buttons non-functional). |
| `/billing/refunds` | Refund approval queue (pending→approved/rejected→processed; local state). |
| `/billing/discounts` | Discount authorization queue (computes net; pending→approve/reject; local state). |

### 📄 Insurance / TPA — *TPA & Insurance* (`/insurance`)
Layout: `RoleGuard` + `CopilotLayout role="insurance"`. Nav: TPA Overview, Active Claims, Pre-Auth, Documents.

| Route | What it does |
|---|---|
| `/insurance/dashboard` | **Insurance card verification** (local mock + AI approval-probability) + claims pipeline table with per-claim probability bars. |
| `/insurance/claims` | "Validate & Submit" → `validateInsuranceClaim` → completeness panel (per-field flags); if `canSubmit`, **Submit to TPA** generates a reference; ReviewModal to approve/reject. |
| `/insurance/preauth` | "Draft Pre-Auth" → `draftPreAuth` → `HitlReviewCard` (ICD codes, procedures, cost band, justification); accept → "submitted to insurer portal". |
| `/insurance/documents` | Claim document checklist (required/uploaded/verified/rejected) + "Submit Complete Claim Package" once mandatory docs are met. |

---

## 14. Module docs — Management & compliance

### 🏢 Admin / COO — *Admin Portal* (`/admin`)
Layout: `RoleGuard` + `CopilotLayout role="admin"`. Nav: COO Dashboard, Staff Management, Operations, Analytics, HR Roster, Duty Assignment, Staffing Overview, Quality, NABH Cockpit, AI Performance.

| Route | What it does |
|---|---|
| `/admin/dashboard` | **The integration hub.** 4 hero KPIs + a **7-tab COO Command Center** (Patient Access, IPD Operations, Clinical Reliability, Finance & Claims, Quality & Compliance, **Journey Flow** with "Run AI Analysis" → `detectFlowBottlenecks`, **WhatsApp** threads). Aggregates ~9 stores. |
| `/admin/ai-performance` | **AI adoption analytics** from `useFeedbackStore.getPerformanceReport()` — overall acceptance %, per-feature **BarChart**, accepted/rejected **donut PieChart**, feature detail list. |
| `/admin/operations` | **Notification channel matrix** (events × in_app/push/whatsapp/sms/email toggles, ≥1 must stay on) + active-patient grid. |
| `/admin/analytics` | Static AI weekly narrative + **Recharts** LineChart (OPD volume by specialty), BarChart (bed occupancy), PieChart (payer mix) + revenue/disease panels. |
| `/admin/staffing` | Headcount vs `DEPT_REQUIREMENTS` by shift (critical/low/ok) from `useHRStore`; static AI staffing card. |
| `/admin/roster` | 7-day editable shift grid + **leave approval** flow + understaffing alerts. |
| `/admin/duty` | Assign staff to wards per shift (AssignModal); ward-coverage summary (local state). |
| `/admin/users` | Static RBAC user table (add/edit/delete non-functional). |
| `/admin/patients` | Searchable/filterable all-patients registry (read-only). |

### ✅ Quality — *Quality & Safety* (`/quality`)
Layout: `AppShell` + `CopilotLayout role="quality"` (no RoleGuard). Nav: QI Dashboard, Incidents. (NABH Cockpit reached via admin nav.)

| Route | What it does |
|---|---|
| `/quality/dashboard` | QI metric cards (Falls, Med Errors, HAI, Avg LOS vs targets), critical-incident banner, open-incident list, **daily audit checklist** (→ `completeAuditTask`), monthly QI panel. |
| `/quality/incidents` | **Incident register** — log incident (increments matching metric) → inline **resolve with corrective-action note** (the CAPA entry point); severity filters. |
| `/quality/nabh` | **NABH cockpit** — 7 indicators as **RadialBar gauges** vs benchmarks + 2 trend LineCharts + "Run AI CAPA Analysis" → `suggestCAPA` → priority-coded CAPA cards + `HitlReviewCard`. |

### 📋 Audit — *Audit & Compliance* (`/audit`)
Layout: `RoleGuard`. Nav: Audit Dashboard, Audit Trail, Compliance Reports. **No seed data** — these pages render from the runtime `useAuditStore` trail (immutable, prepend-only, IP-stubbed) that other features write to.

| Route | What it does |
|---|---|
| `/audit/dashboard` | Counts HITL decisions / events / feedback votes / clinical orders; **compliance score** half-gauge (RadialBar); recent events. |
| `/audit/log` | Full searchable audit trail table (timestamp/user/action/resource/detail). |
| `/audit/reports` | AI accept-rate %, audit coverage, NABH readiness ("Beta" placeholder). |

### 📦 Inventory — *Inventory Mgr* (`/inventory`)
Layout: `RoleGuard` (no Copilot). Nav: Asset Overview, Stock Levels.

| Route | What it does |
|---|---|
| `/inventory/dashboard` | Asset KPIs + critical-assets table + **predictive-maintenance alerts** (pre-baked strings, e.g. MRI "failure in 5 days"). |
| `/inventory/stock` | Asset/consumable list with status filters; RepairModal (schedule maintenance) + Reorder (toast-only). |

---

## 15. Module docs — Support services

### 🩸 Blood Bank — *Blood Bank* (`/bloodbank`)
Layout: `RoleGuard`. Nav: BB Dashboard, Inventory, Cross-Match Requests, Donor Registry.

| Route | What it does |
|---|---|
| `/bloodbank/dashboard` | Inventory by group (**PieChart donut** + 8 group tiles, LOW/OUT badges), expiry-<7-days alerts, pending cross-match list. |
| `/bloodbank/inventory` | Tabular bag list with expiry warnings ("Add Unit" stub). |
| `/bloodbank/donors` | **Self-contained (local state)** donor registry + registration modal + static AI demand forecast banner. |
| `/bloodbank/requests` | Cross-match worklist — "Mark Compatible/Incompatible" → `updateRequest`. |

### 🧼 CSSD — *CSSD* (`/cssd`)
Layout: `RoleGuard`. Nav: CSSD Dashboard, Sterilization Cycles, Instruments.

| Route | What it does |
|---|---|
| `/cssd/dashboard` | Cycle status (running/passed/failed) + instrument status grid. |
| `/cssd/cycles` | Cycle audit table with **biological + chemical indicator** pass/fail logging. |
| `/cssd/instruments` | Instrument-set cards (status, qty, last-sterilized, assigned OT). |

### 🍽️ Dietary — *Dietary Services* (`/dietary`)
Layout: `RoleGuard`. Nav: Dietary Dashboard, Diet Plans, Meal Orders.

| Route | What it does |
|---|---|
| `/dietary/dashboard` | Active plans + today's meal orders (date-filtered) + allergy flags. |
| `/dietary/plans` | "Generate AI Diet Plan" → `suggestDietPlan` → `HitlReviewCard` → `addPlan`. |
| `/dietary/orders` | Full meal-order list with "Mark Delivered". |

### ♻️ Bio-Medical Waste — *BMW* (`/bmw`)
Layout: `RoleGuard`. Nav: BMW Dashboard, Waste Log, Compliance Reports.

| Route | What it does |
|---|---|
| `/bmw/dashboard` | Daily **colour-coded waste totals** (Yellow/Red/Blue/Black/White/Cytotoxic) + compliance status (date-filtered). |
| `/bmw/log` | Cradle-to-grave log table (collected→treated→disposed) — disposal auto-generates a manifest number. |
| `/bmw/reports` | Static CPCB monthly-report placeholder. |

### ⚰️ Mortuary — *Mortuary* (`/mortuary`)
Layout: `RoleGuard`. Nav: Mortuary Dashboard, Deceased Records, Legal Clearances.

| Route | What it does |
|---|---|
| `/mortuary/dashboard` | Slot occupancy + current deceased records with MLC/clearance status. |
| `/mortuary/records` | Detailed record cards (cause, legal status, certifier, slot, death-certificate #). |
| `/mortuary/clearances` | **MLC clearance + death-certificate issuance + body release** workflow (MLC cases can't self-certify). |

### 🚐 Ambulance — *Ambulance Svc.* (`/ambulance`)
Layout: `RoleGuard`. Nav: Fleet Dashboard, Dispatch, Trip Log.

| Route | What it does |
|---|---|
| `/ambulance/dashboard` | Fleet status (available/on_trip/maintenance) with fuel gauges + active trips. |
| `/ambulance/dispatch` | Dispatch console — assign an available vehicle to an emergency call → `dispatch` (vehicle flips to on_trip). No live GPS map. |
| `/ambulance/log` | Historical trip table with response times. |

---

## 16. Module docs — Patient-facing

### 🧑‍🦱 Patient Portal (`/patient`)
Layout: `RoleGuard allowedRole="patient"` + `AppShell`. Nav: Dashboard, Appointments, Waiting Room, My Records, Billing, Post-Discharge, Find a Doctor. **No AI service is called anywhere in the patient scope** — all "AI" framing is cosmetic.

| Route | What it does |
|---|---|
| `/patient/dashboard` | Token card, **live OPD position** ("ahead of you" count), 5-step journey stepper, vitals with abnormal flagging, simulated AI brief, two `ProgressRing`s. |
| `/patient/queue` | Live OPD queue list (sorted by token) + the patient's own `StatusStepper`. |
| `/patient/waiting` | Digital waiting room with two modes: **OPD queue status** (per-minute wait countdown, cycling "AI engine" messages) and **IPD family tracker** (journey from clearance counts, OT banner, clearance pillars). |
| `/patient/records` | Visit history + discharge summary (diagnosis, meds, red-flags, diet, claim docs). |
| `/patient/appointments` | View/book/cancel — 3-step booking wizard with a hand-built `MiniCalendar` + slot picker → `bookAppointment`. |
| `/patient/billing` | Bill list with "Pay with UPI / at Counter" (UI-only). |
| `/patient/followup` | Post-discharge hub: book follow-up, request callback, **post-discharge timeline** (WhatsApp/SMS/in-app), **medicine-reminder schedule** (frequency→clock times), **red-flag self-check**, claim docs, emergency `tel:` contacts. |
| `/patient/family-track/[token]` | Identical to the public family-track page below (sits inside the patient segment). |

### 👪 Family Tracking — *public, token-gated* (`/family-track/[token]`)
No layout / no RoleGuard. **Possession of the token IS the access control** (not login). Renders only if the patient
exists AND `dishaConsentGiven` AND a `familyAccessToken` is set — otherwise an "Access Not Available" screen. Shows
**non-clinical** status (condition badge, journey, location, est. wait) + a **nurse-approved live camera** flow
(request → pending → approved `CameraFeedStub` / declined). Every view & camera action is audit-logged. The same
component exists at both `/family-track/[token]` and `/patient/family-track/[token]` (duplicated).

### 🔎 Discovery — *public* (`/discovery`)
No layout / no RoleGuard. A **"Find the Right Doctor"** hub with three tabs: **Find a Doctor** (search + symptom→specialty
suggestions via a static map + doctor cards → "Book"), **Cashless Eligibility** (insurer in-network check), and
**Document Checklist** (required docs by visit type). Also the patient nav's "Find a Doctor" target.

---

## 17. Cross-module data flows

The prototype's most interesting behavior is how stores connect departments into real workflows:

```
DOCTOR consultation dashboard  ──┬─► usePharmacyStore   (Rx → Pharmacy queue & Nurse MAR)
                                 ├─► useLabStore         (lab orders → Lab dept)
                                 ├─► useRadiologyStore   (scan orders → Radiology dept)
                                 └─► useAdmissionStore   (admission BUNDLE → Bed Manager → shown on Nurse "Incoming Transfers")

NURSE dashboard ──► useDischargeStore (Discharge)   ──► useAuditStore (camera approvals)   ──► usePharmacyStore (MAR procurement)

ADMISSION "Mark for Cleaning" ──► useHousekeepingStore (new task)
HOUSEKEEPING "Verify" ───────────► useAdmissionStore.confirmBedReady   ← closes the discharge→clean→ready loop

CHECK-IN intake ──► usePharmacy/usePatientStore.addPatient (new token → Reception queue)  +  generateFamilyToken → /family-track/[token]

JOURNEY store ──► /admin COO "Journey Flow" tab ──► detectFlowBottlenecks (AI)
HITL decisions + AI feedback ──► useAuditStore + useFeedbackStore ──► /admin/ai-performance dashboard
```

**The core clinical pathway** the system models end-to-end: **Reception → Doctor (AI pre-brief → e-prescription) →
[Admit?] → Bed Manager → Nurse (MAR/vitals/rounds) → Lab/Radiology → OT (WHO checklist) → Discharge (5-pillar
clearance + AI summary) → Billing/Insurance**, with the **Patient Portal** tracking each stage and **Audit**
recording every significant action.

---

## 18. Cross-cutting systems

- **Feature flags** (`config/feature-flags.ts`) — three tiers: **`core`** (all AI off), **`ai_assist`** (copilot,
  journey tracking, patient education, WhatsApp, family tracking, voice intake, documentation engine), **`ai_command`**
  (everything + quality cockpit, registry dashboard, AI performance dashboard). **Currently hardcoded to `ai_command`**
  with `shadowMode: false`.
- **i18n** (`i18n/` + `app/actions/locale.ts` + `messages/`) — English + Hindi via **next-intl**. Locale is stored in
  a **cookie** (`locale`), set by the `setLocale` server action (no URL prefix). Only a curated catalog (nav, common,
  the AI block, billing/discharge/insurance labels, all 24 role names) is translated; most page copy is hardcoded,
  though some AI mocks emit Hindi directly (discharge summary, WhatsApp, patient education).
- **Notifications** (`services/notification-dispatcher.ts`) — pure function that picks channels per event type
  (bed_allocated, ot_confirmed, medicines_ready, discharge_*, followup_reminder) and builds WhatsApp/SMS templates.
  **WhatsApp/SMS are `console.log` stubs**; in-app/push/email just record. Paired with `useNotificationStore`
  channel config (configurable from `/admin/operations`).
- **WhatsApp API routes** (`app/api/whatsapp/`) — `send` (mock outbound, logs instead of calling the WhatsApp Business
  API) and `webhook` (mock inbound; keeps an in-memory conversation `Map`, calls `classifyWhatsAppMessage`, returns
  intent/language/suggested-response/escalation). A `useWhatsAppStore` surfaces threads on the admin dashboard.
- **Audit trail** (`useAuditStore`) — immutable, prepend-only, IP-stubbed. Starts empty and fills as you use HITL
  cards, copilot, feedback buttons, and certain clinical/pharmacy actions.

---

## 19. Reality check — gaps & PRD divergences

Honest notes so you know what's real vs. aspirational. (The PRD describes the *intended* product; this section
reflects the *running code*.)

- **It's a front-end demo.** No backend, no DB, no real auth. State is in-memory Zustand → **a browser refresh resets
  everything** to seeded mock data.
- **All ~40 AI services are mocks.** They simulate latency and return canned/lightly-computed data; none call a real
  LLM. `wrapAiResponse` is the single swap-in seam.
- **The rules engine is real but under-wired.** Only `/pharmacy/dispense` actually invokes it (allergy + interactions).
  OT gating is inline (not `ot-gate`), ER triage is manual (not `triage-thresholds`), lab critical gating uses a store
  flag (not `critical-values`), billing math is in the store (not `billing-math`).
- **PRD counts differ from code:** PRD says "31 AI services / 24 portals / ~110 routes"; code has **~40 AI service
  functions, 24 roles, 98 routes**, plus modules the PRD doesn't list: `/admin/ai-performance`, `/admin/operations`,
  `/doctor/registries`, `/quality/nabh`, `/family-track/[token]`, and the WhatsApp API routes.
- **Date-sensitive dashboards:** Dietary and BMW dashboards filter to the *system date*, but mock data is dated
  `2026-05-09`, so their "today" sections look empty on other dates.
- **Hardcoded patient identities vary per page** in the patient portal (`PT-20391/20392/20394`), so "me" isn't always
  derived from the logged-in user.
- **Orphaned/by-URL-only routes:** `/reception/queue`, `/discharge/summary/[id]`, `/billing/patient/[id]` are real
  pages not shown in any sidebar nav.
- **Non-functional / placeholder UI:** DICOM viewer, several "Add/Edit/Delete" admin buttons, billing "Packages"
  actions, inventory "Reorder", patient "Pay" buttons, telemedicine "Join" — cosmetic stubs.
- **Inconsistent guards/layouts:** several role layouts skip `RoleGuard`; only doctor/nurse/discharge/billing/insurance/
  admin/quality mount the Copilot pane.
- **Known risks from the PRD** still apply: add Zustand `persist` for session durability, add real auth (NextAuth/SSO)
  before production, and ensure DISHA data-residency.

---

## 20. Full route map (98 routes)

| Module | Routes |
|---|---|
| Login / Role Select | `/` |
| Patient Kiosk *(public)* | `/checkin`, `/checkin/intake` |
| Doctor | `/doctor/dashboard`, `/doctor/consultation`, `/doctor/schedule`, `/doctor/records`, `/doctor/inbox`, `/doctor/telemedicine`, `/doctor/registries` |
| Nurse | `/nurse/dashboard`, `/nurse/patients`, `/nurse/rounds`, `/nurse/tasks`, `/nurse/medication`, `/nurse/handover` |
| Emergency | `/emergency/dashboard`, `/emergency/triage` |
| Pharmacy | `/pharmacy/dashboard`, `/pharmacy/dispense`, `/pharmacy/inventory`, `/pharmacy/master`, `/pharmacy/narcotics` |
| Lab | `/lab/dashboard`, `/lab/samples`, `/lab/reflex`, `/lab/qc` |
| Radiology | `/radiology/dashboard`, `/radiology/scans`, `/radiology/viewer`, `/radiology/templates` |
| Admission | `/admission/dashboard`, `/admission/beds`, `/admission/forecast` |
| OT | `/ot/dashboard`, `/ot/schedule`, `/ot/checklist` |
| Discharge | `/discharge/dashboard`, `/discharge/summary/[id]` |
| Billing | `/billing/dashboard`, `/billing/patient/[id]`, `/billing/discounts`, `/billing/packages`, `/billing/refunds` |
| Insurance | `/insurance/dashboard`, `/insurance/claims`, `/insurance/preauth`, `/insurance/documents` |
| Reception | `/reception/dashboard`, `/reception/patients`, `/reception/queue` |
| Admin | `/admin/dashboard`, `/admin/analytics`, `/admin/operations`, `/admin/patients`, `/admin/staffing`, `/admin/roster`, `/admin/duty`, `/admin/users`, `/admin/ai-performance` |
| Quality | `/quality/dashboard`, `/quality/incidents`, `/quality/nabh` |
| Audit | `/audit/dashboard`, `/audit/log`, `/audit/reports` |
| Blood Bank | `/bloodbank/dashboard`, `/bloodbank/inventory`, `/bloodbank/donors`, `/bloodbank/requests` |
| CSSD | `/cssd/dashboard`, `/cssd/cycles`, `/cssd/instruments` |
| Dietary | `/dietary/dashboard`, `/dietary/plans`, `/dietary/orders` |
| BMW | `/bmw/dashboard`, `/bmw/log`, `/bmw/reports` |
| Mortuary | `/mortuary/dashboard`, `/mortuary/records`, `/mortuary/clearances` |
| Ambulance | `/ambulance/dashboard`, `/ambulance/dispatch`, `/ambulance/log` |
| Housekeeping | `/housekeeping/dashboard` |
| Inventory | `/inventory/dashboard`, `/inventory/stock` |
| Patient Portal | `/patient/dashboard`, `/patient/queue`, `/patient/waiting`, `/patient/records`, `/patient/appointments`, `/patient/billing`, `/patient/followup`, `/patient/family-track/[token]` |
| Family Tracking *(public)* | `/family-track/[token]` |
| Discovery *(public)* | `/discovery` |
| API *(mock)* | `/api/whatsapp/send`, `/api/whatsapp/webhook` |

---

## 21. State stores inventory (31 stores)

All `src/store/*` are Zustand `create()` stores, in-memory only (no persistence).

| Store | Purpose |
|---|---|
| `useAuthStore` | Current user + active role; `setRole` swaps to a `DEMO_USERS[role]` identity. |
| `useAuditStore` | Append-only audit trail; `log()` stamps id/timestamp/ipStub. |
| `useFeedbackStore` | AI 👍/👎 feedback; `getPerformanceReport()` → per-feature acceptance rates. |
| `useNotificationStore` | In-app notifications + per-type channel config + dispatch records. |
| `useJourneyStore` | Patient journey state machine; `getBottlenecks`, `getSlaBreaches`. |
| `usePatientStore` | Patients, OPD queue, visits, appointments, family-token generation. |
| `useConsultationStore` | Active doctor consultation: notes, dx, AI suggestions, orders, Rx. |
| `useAdmissionStore` | Beds + admission requests + admission bundles. |
| `useWardStore` | Inpatient beds, vitals, rounds notes, meds, IV drips. |
| `useDischargeStore` | Discharge queue, clearance pillars, blockers, summary, exit clearance. |
| `useFollowupStore` | Post-discharge follow-up patients + event timeline. |
| `useLabStore` | Lab samples, TAT config, order intake, critical-value ack. |
| `useRadiologyStore` | Radiology scans, TAT config, order intake, status advance. |
| `usePharmacyStore` | Prescriptions, prep/collection, qty adjustments, procurement. |
| `useDrugMasterStore` | Drug catalog (schedule, ATC, interactions, allergy classes); `search`. |
| `useBillingStore` | Bills + charge line items, freeze, insurance coverage, payments. |
| `useInsuranceStore` | Claims, AI validation storage, submission status. |
| `useOTStore` | OT procedures + rooms, WHO checklist, pre-op requirements. |
| `useEmergencyStore` | ER triage queue (Red/Yellow/Green), trauma/code-blue counts. |
| `useBloodBankStore` | Blood units, cross-match requests, inventory summary. |
| `useCSSDStore` | Sterilization cycles + instruments. |
| `useDietaryStore` | Diet plans (incl. AI flag) + meal orders. |
| `useBMWStore` | Bio-medical waste logs (colour categories), daily summary. |
| `useMortuaryStore` | Deceased records (incl. MLC), slot availability. |
| `useAmbulanceStore` | Vehicles + trips (dispatch/status), response times. |
| `useHRStore` | Staff, shifts, leave requests, shift updates. |
| `useHousekeepingStore` | Cleaning tasks lifecycle + staff. |
| `useInventoryStore` | Assets/consumables, low-stock, AI maintenance alerts. |
| `useQualityStore` | Incidents, audit tasks, quality metrics, NABH indicators. |
| `useWhatsAppStore` | WhatsApp threads/messages, intents, human escalation. |
| `useCameraStore` | Family camera-view requests (request/approve/decline/end). |

---

*End of overview. For the original product vision (some of which is aspirational vs. the current code), see
[`PRD.md`](PRD.md). Generated by reverse-engineering the source under `src/`.*
