# Agentix HIMS — AI-First Hospital Management System

A comprehensive AI-augmented hospital management system covering the full operational stack from front-desk through clinical care, finance, compliance, and executive oversight. Built as a production-grade Next.js prototype with every clinical and administrative role wired end-to-end.

**Stack:** Next.js 16 (Turbopack) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Zustand 5 · Framer Motion 12 · Recharts · lucide-react · sonner.

> ⚠ Heads-up — this is a heavily modified Next.js 16. APIs, conventions, and file structure may differ from your training data. See [`AGENTS.md`](AGENTS.md) for project conventions.

---

## What's inside

**24 staff roles + patient portal**, each with its own dashboard, workflows, and audit trail:

| Group | Roles |
|---|---|
| **Clinical** | Doctor · Nurse · Pharmacy · Lab · Radiology · Emergency |
| **Operations** | Reception · Bed Manager · Discharge · OT |
| **Finance** | Billing · Insurance |
| **Management** | Admin (COO) · Quality · Audit Officer · Housekeeping · Inventory |
| **Support** | Blood Bank · CSSD · Dietary · BMW · Mortuary · Ambulance |
| **Patient** | Cross-modal patient portal |

### Key features

- **NABH-ready audit trail** — every meaningful action emits to a cross-module audit log, mapped to all 9 NABH chapters (AAC · COP · MOM · HIC · PRE · IMS · CQI · ROM · HRM)
- **AI assist throughout** — pre-briefs, drug-safety, NEWS2 escalation, AI ESI triage, denial-risk scoring, voice scribe, bottleneck detection, sepsis monitoring, recall-cohort suggestions
- **Doctor Panel** — OPD workspace + IPD command + Online consultation + AI copilot + voice scribe + drug-safety gating + responsive at phone width
- **Pharmacy v3** — unified tagged queue (OPD/IPD/OT/ICU/Discharge), claim model, bedside dispense
- **Lab v2** — 5-bench routing (Hema/Biochem/Immuno/Urine/Micro), multi-tech claim, QC gating, verification chain, microbiology multi-day workflow
- **Admin v2 Command Centre** — staff lifecycle · shifts · coverage · finance · compliance (all phases listed below)

### Admin command centre

7 completed phases delivering a full COO operational nerve centre:

| Phase | Scope |
|---|---|
| **0 — Foundation** | Unified HR store, audit module, RBAC permissions matrix |
| **1 — Staff Lifecycle** | Directory · profile drawer · onboarding wizard · credentials & licence expiry tracker · cross-store sync |
| **2 — Shifts v2** | 4-week roster grid · shift templates · persistent duty assignment · conflict engine · hours & OT tracker · on-call rotation |
| **3 — Coverage & Exceptions** | Configurable dept minimums · real-time gauges · sick-call workflow · swap requests · auto-escalation watcher |
| **4 — Clinical Integration** | Shift-gate on doctor dashboard · ward roster on nurse · team picker on bed manager / ER / OT |
| **5 — Financial Command** | Hospital P&L · revenue reconciliation · billing dispute queue · payroll preview · vendor payments · cash position |
| **6 — Compliance Cmd Centre** | NABH cockpit · DISHA / DPDP audit log · BMW (CPCB) status · statutory calendar · MoU expiry tracker · unified compliance score |

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and pick any role on the login screen to enter that portal.

The default patient identity is **Kiran Patil (PT-20394)** — a 58-year-old male with a full NSTEMI / post-PCI clinical journey seeded across every relevant module.

---

## Repository structure

```
src/
├── app/                       # Next.js app router — one folder per role
│   ├── admin/                 # COO command centre (Staff Mgmt v2 + Finance + Compliance)
│   ├── doctor/                # OPD workspace + IPD + Online + AI assistant
│   ├── nurse/                 # Ward dashboard + rounds + handover
│   ├── pharmacy/              # Unified tagged queue
│   ├── lab/                   # Bench routing + microbiology + QC
│   ├── radiology/             # Inbox → modality → reading → verification
│   ├── emergency/             # Triage + floor + dashboard
│   ├── ot/                    # Pre-op checklist (WHO 2009 verbatim) + dashboard
│   ├── reception/             # OPD queue + appointments + walk-in registration
│   ├── admission/             # Bed manager + admission requests
│   ├── discharge/             # Discharge desk + clearance pillars
│   ├── billing/               # Bills + line items + duplicate-charge AI flags
│   ├── insurance/             # TPA desk + denial-risk AI
│   ├── audit/                 # Cross-module audit trail + NABH evidence reports
│   ├── quality/               # NABH cockpit + CAPA + incidents
│   ├── bloodbank/             # Cross-match + bedside checks + issue
│   ├── cssd/                  # Sterilization cycles + BI gating
│   ├── bmw/                   # CPCB log + vendor handover
│   ├── dietary/               # Diet plans + meal orders
│   ├── mortuary/              # MLC clearance + certificate
│   ├── ambulance/             # Dispatch + trip log
│   ├── housekeeping/          # Bed turnover queue
│   └── patient/               # Patient portal (radiology, IPD, discharge, etc.)
├── components/                # Shared UI + role-specific components
│   ├── admin/                 # StaffProfileDrawer, ShiftTemplateModal, CoverageGauge, etc.
│   ├── clinical/              # OnShiftTeam widget
│   └── ui/                    # Buttons, badges, cards, etc.
├── store/                     # Zustand stores — one per domain
├── lib/                       # Pure utility libraries (clinical scoring, NABH evidence, etc.)
├── ai-services/               # AI service stubs (HITL-style envelopes)
└── types/                     # Shared type definitions

docs/superpowers/              # Design specs + implementation plans
scripts/                       # Puppeteer verification sweeps (one per phase)
```

---

## Verification

Every milestone ships with a Puppeteer verification sweep under `scripts/`. Each sweep:
- Logs in as the role under test
- Walks the user flow
- Asserts the right state at every step
- Targets **0 console errors**

Run any sweep:

```bash
npm run dev    # in one terminal
node scripts/shoot-phase6-admin.cjs    # in another
```

Cumulative test results across all phases: **800+ assertions passing · 0 console errors · typecheck clean**.

---

## Conventions

- **Audit everything** — every mutation emits to `useAuditStore` with a typed action code mapped to its NABH chapter
- **Stores are domain-scoped** — `useHRStore`, `useVendorStore`, `useStatutoryStore`, `useERStore`, etc.
- **Persisted stores use `skipHydration`** — SSR-safe; rehydrated post-mount via `StoreHydrator`
- **Permissions as data** — `src/lib/permissions.ts` matrix; UI calls `canDo(role, action)` rather than hardcoding role checks
- **AI envelopes** — every AI service returns `{ data, confidence, reasoning, model }` with HITL accept / reject / modify flow
- **Cross-store side effects** — one-way via `useOtherStore.getState().action()` — no import cycles

See [`AGENTS.md`](AGENTS.md) for the full conventions doc and [`docs/superpowers/`](docs/superpowers/) for design specs + implementation plans.

---

## License

Private prototype. Not for production deployment.
