# Agentix HIMS — Product Requirements Document

**Version:** 2.0  
**Date:** 2026-05-22  
**Status:** Active  
**Owner:** Agentix HIMS Healthcare Group

---

## 1. Executive Summary

Agentix HIMS is an AI-first, enterprise-grade Hospital Management System built for modern Indian hospitals. It unifies 24 role-based portals across every hospital function — clinical, operational, financial, support, and patient-facing — into a single web application. The platform embeds 31 AI-powered clinical decision-support services and a deterministic rules engine for patient safety, while meeting NABH accreditation standards and DISHA data-security requirements.

---

## 2. Problem Statement

Indian hospitals — particularly secondary and tertiary-care facilities — operate on fragmented, department-siloed systems. Clinical decisions are delayed by manual handoffs. Bed management, OT scheduling, lab results, pharmacy dispensing, and billing happen in isolation. Staff spend significant time on paperwork that could be automated. Patients have zero visibility into their care journey. The resulting gaps lead to medical errors, revenue leakage, compliance risk, and poor patient experience.

Agentix HIMS eliminates these gaps by providing a unified, real-time platform with AI-assisted workflows at every care touchpoint.

---

## 3. Goals & Non-Goals

### Goals
- Provide a single application covering the full patient lifecycle: OPD → IPD → OT → Discharge
- Embed clinical AI at the point of care for diagnosis support, prescriptions, triage, and risk scoring
- Give every department — billing, pharmacy, lab, radiology, blood bank, CSSD, dietary, BMW, mortuary, ambulance — a purpose-built portal
- Support NABH accreditation and DISHA compliance out of the box
- Deliver a bilingual UI (English + Hindi) for India-wide deployment
- Offer a patient self-service portal and public kiosk check-in

### Non-Goals (v1)
- Native mobile apps (iOS / Android)
- Integration with third-party HIS/LIS/PACS systems (API layer is a future phase)
- Billing to insurance payers directly (pre-auth workflow exists; EDI integration is future)
- Custom AI model training (all AI services use mock/LLM stubs swappable in production)

---

## 4. User Personas & Roles

The system recognises **24 discrete roles** grouped into six functional domains:

### Clinical (6 roles)
| Role | Key User | Primary Concern |
|---|---|---|
| `doctor` | Dr. Priya Menon, General Physician | AI pre-briefs, e-prescriptions, patient queue |
| `nurse` | Anjali Desai, Ward Nurse | Vitals monitoring, MAR, handover briefs |
| `pharmacy` | Ritu Sharma, Pharmacist | Prescription verification, dispensing, narcotics log |
| `lab` | Neha Gupta, Lab Technician | Sample tracking, anomaly detection, reflex tests |
| `radiology` | Dr. Sameer Khan, Radiologist | Scan scheduling, DICOM viewer, AI findings |
| `emergency` | Dr. Vikram Rathore, ER Physician | ESI triage, trauma tracking, sepsis alerts |

### Operations (4 roles)
| Role | Key User | Primary Concern |
|---|---|---|
| `reception` | Sunita Joshi | OPD queue management, patient registration, kiosk |
| `bed_manager` | Aditi Verma | Bed allocation, AI demand forecast, census |
| `discharge` | Meena Agarwal | 5-pillar clearance, discharge summary generation |
| `ot` | Dr. Anisha Sharma | OT scheduling, WHO safety checklist, surgical briefing |

### Finance (2 roles)
| Role | Key User | Primary Concern |
|---|---|---|
| `billing` | Suresh Nair | Invoices, packages, refunds, discounts, fraud detection |
| `insurance` | Karan Patel | Claims management, pre-authorisation, AI approval scoring |

### Management (4 roles)
| Role | Key User | Primary Concern |
|---|---|---|
| `admin` | Rajesh Kulkarni | Analytics, staff management, operations overview |
| `quality` | Dr. Lalitha Iyer | NABH compliance, incident management, audits |
| `housekeeping` | Ramesh Kumar | Ward cleanliness tasks, bed turnover |
| `inventory` | Vikram Singh | Asset management, stock levels, procurement |

### Support Services (7 roles)
| Role | Key User | Primary Concern |
|---|---|---|
| `blood_bank` | Dr. Pooja Srivastava | Blood inventory, cross-match, AI demand forecast |
| `cssd` | Shalini Mehta | Sterilization cycles, instrument tracking, OT priority queue |
| `dietary` | Nalini Bose | Diet plans, meal orders, AI nutritional recommendations |
| `bmw` | Ganesh Rao | Bio-medical waste categories, disposal logs, compliance |
| `mortuary` | Shyam Tiwari | Deceased records, MLC clearances, death certificates |
| `ambulance` | Deepak Pandey | Fleet management, dispatch, trip log |
| `audit_officer` | Preethi Krishnan | Audit trail, compliance reports, NABH preparedness |

### Patient (1 role)
| Role | Description |
|---|---|
| `patient` | Self-service portal: queue tracking, records, billing, appointments, follow-up |

---

## 5. Technical Architecture

### Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.4 (App Router) |
| UI Library | React 19.2 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4, Framer Motion 12 |
| State Management | Zustand 5 (28 domain stores) |
| Forms | React Hook Form 7 + Zod 4 |
| Charts | Recharts 3 |
| i18n | next-intl 4 (English + Hindi) |
| Icons | Lucide React |
| Notifications | Sonner |
| QR | qrcode.react |

### Application Structure
```
src/
├── app/              # Next.js App Router — 24 role portals, ~110 route segments
├── ai-services/      # 31 AI service modules (swappable LLM stubs)
├── rules-engine/     # Deterministic safety rules (7 engines)
├── store/            # Zustand stores (28 domain stores)
├── services/         # Cross-cutting services (notification dispatcher)
├── lib/              # Shared utilities
└── i18n/             # Routing & locale config
```

### AI Services Layer (31 Functions)
All functions return `Promise<AiEnvelope<T>>` — a typed wrapper with result and confidence score. Mock implementations are production-ready stubs; swap the function body to connect any LLM.

| Category | Functions |
|---|---|
| Clinical Decision | `suggestDiagnoses`, `suggestPrescription`, `generatePreBrief`, `retrieveProtocol` |
| Triage & Risk | `assessTriage`, `monitorSepsisMarkers`, `assessMortalityRisk`, `assessReadmissionRisk` |
| Lab & Radiology | `detectLabAnomalies`, `suggestReflexTests`, `generateRadiologyReport` |
| Drug Safety | `checkDrugInteractionsAi` |
| OT | `generateOTBriefing`, `verifyOTChecklist` |
| Discharge | `generateDischargeSummary` |
| Nursing | `generateHandoverBrief` |
| Billing & Insurance | `suggestBillingCodes`, `detectBillingAnomalies`, `draftPreAuth` |
| Operations | `forecastBedDemand`, `optimizeAppointmentSlots`, `nlpPatientSearch`, `generatePatientSummary` |
| Supply Chain | `predictPharmacySupply`, `forecastBloodDemand`, `prioritizeCSSDQueue` |
| Dietary | `suggestDietPlan` |

### Rules Engine (7 Deterministic Engines)
Hard-coded clinical safety rules that run synchronously — no AI dependency:

| Engine | Purpose |
|---|---|
| `triage-thresholds` | ESI 1–5 classification from vitals (HR, RR, BP, SpO2, temp, GCS) |
| `drug-interactions` | Contraindication checks across prescribed medications |
| `allergy-block` | Blocks prescriptions matching patient allergy profile |
| `dosage-bounds` | Validates dose is within safe therapeutic range |
| `critical-values` | Flags lab results crossing panic thresholds |
| `ot-gate` | Pre-surgical clearance checklist enforcement |
| `billing-math` | Invoice calculation, package bundling, discount validation |

---

## 6. Feature Specifications by Module

### 6.1 Authentication & Role Selection
- Role-picker landing page with 24 role cards organised in 6 tabbed groups
- Demo environment banner — any role accessible without credentials
- Animated left panel with live hospital metrics (queue, bed occupancy, discharges, AI accuracy)
- Trust badges: AI-Powered, DISHA Secure, Real-time, NABH Ready
- `useAuthStore` (Zustand) manages active role and current user across the session
- Public kiosk entry point at `/checkin` for patient self check-in (no login required)

### 6.2 Patient Check-In Kiosk (`/checkin`)
- QR-code-based patient identification
- `/checkin/intake` — structured intake form with vitals capture
- Designed for reception lobby deployment (touch-friendly)

### 6.3 Doctor Portal (`/doctor`)
**Dashboard** — AI pre-brief cards for each scheduled patient, real-time queue panel, alert inbox  
**Consultation** — SOAP note entry, AI-suggested diagnoses, e-prescription with drug interaction checking  
**Schedule** — appointment calendar with AI slot optimisation  
**Records** — full patient history with NLP search  
**Inbox** — referral messages, critical lab alerts, interdepartmental notes  
**Telemedicine** — video consultation interface  

Key AI: `generatePreBrief`, `suggestDiagnoses`, `suggestPrescription`, `checkDrugInteractionsAi`, `nlpPatientSearch`  
Key Rules: `drug-interactions`, `allergy-block`, `dosage-bounds`

### 6.4 Nurse Portal (`/nurse`)
**Dashboard** — ward census, pending vitals, medication alerts  
**Patients** — assigned patient list with colour-coded severity  
**Rounds** — structured nursing round documentation  
**Medication** — Medication Administration Record (MAR), real-time drug schedule  
**Tasks** — task queue with priority ordering  
**Handover** — AI-generated shift handover brief  

Key AI: `generateHandoverBrief`, `assessMortalityRisk`, `monitorSepsisMarkers`

### 6.5 Emergency (`/emergency`)
**Dashboard** — real-time ER census, ESI distribution chart, sepsis alert panel  
**Triage** — vitals entry → automated ESI 1–5 classification, triggering criteria displayed  

ESI Classification Logic:
- ESI 1 (Resuscitation): GCS < 9, SBP < 70, SpO2 < 85%
- ESI 2 (Emergent): RR > 30, HR > 130, SBP < 90, SpO2 < 92%
- ESI 3 (Urgent): Temp > 39°C, HR outside 50–100 range
- ESI 4–5: Vital signs within normal limits

Key AI: `assessTriage`, `monitorSepsisMarkers`, `assessMortalityRisk`  
Key Rules: `triage-thresholds`, `critical-values`

### 6.6 Pharmacy (`/pharmacy`)
**Dashboard** — pending prescriptions, dispensing queue, alerts  
**Dispense** — prescription verification with allergy and interaction checks, dispensing confirmation  
**Inventory** — drug stock levels, expiry tracking  
**Master** — drug master database management  
**Narcotics** — Schedule H/H1 controlled substance log  

Key AI: `checkDrugInteractionsAi`, `predictPharmacySupply`  
Key Rules: `allergy-block`, `dosage-bounds`, `drug-interactions`

### 6.7 Laboratory (`/lab`)
**Dashboard** — sample queue, turnaround time metrics, critical value panel  
**Samples** — sample receipt, processing status, result entry  
**Reflex Tests** — AI-suggested additional tests based on initial results  
**QC** — quality control log  

Key AI: `detectLabAnomalies`, `suggestReflexTests`  
Key Rules: `critical-values`

### 6.8 Radiology (`/radiology`)
**Dashboard** — scan queue, modality utilisation, AI findings summary  
**Scans** — scan scheduling, worklist management  
**Viewer** — DICOM viewer integration panel  
**Templates** — structured reporting templates  

Key AI: `generateRadiologyReport`

### 6.9 Admission / Bed Management (`/admission`)
**Dashboard** — real-time bed map, occupancy by ward/floor, admission queue  
**Beds** — individual bed status management (occupied / available / cleaning / blocked)  
**Forecast** — AI demand forecast for next 24–72 hours  

Key AI: `forecastBedDemand`  
Store: `useAdmissionStore`

### 6.10 Operation Theater (`/ot`)
**Dashboard** — daily OT schedule, theater utilisation, team status  
**Schedule** — surgical case booking, anesthesia assignment, team roster  
**Checklist** — WHO Surgical Safety Checklist (Sign-in / Time-out / Sign-out), AI-verified completion  

Key AI: `generateOTBriefing`, `verifyOTChecklist`  
Key Rules: `ot-gate`

### 6.11 Discharge (`/discharge`)
**Dashboard** — patients pending discharge, pillar clearance status  
**Summary** — AI-generated discharge summary with ICD coding  

5-Pillar Clearance Model:
1. Clinical clearance (treating physician)
2. Pharmacy clearance (medications dispensed)
3. Lab clearance (all results reviewed)
4. Billing clearance (final invoice settled)
5. Nursing clearance (patient education, follow-up plan)

Key AI: `generateDischargeSummary`, `assessReadmissionRisk`

### 6.12 Billing (`/billing`)
**Dashboard** — revenue metrics, outstanding dues, daily collections  
**Patient Billing** — itemised invoice, package application, partial payments  
**Discounts** — approval workflow for concessions  
**Packages** — pre-configured procedure bundles  
**Refunds** — refund request tracking  

Key AI: `suggestBillingCodes`, `detectBillingAnomalies`  
Key Rules: `billing-math`

### 6.13 Insurance / TPA (`/insurance`)
**Dashboard** — claim pipeline, approval rates, TPA-wise breakdown  
**Claims** — claim submission and status tracking  
**Pre-Auth** — AI-drafted pre-authorisation letter, approval probability scoring  
**Documents** — policy and supporting document management  

Key AI: `draftPreAuth`

### 6.14 Reception (`/reception`)
**Dashboard** — OPD queue, appointment load, daily patient count  
**Patients** — patient registration, demographic management  
**Queue** — live queue display with token management  

Key AI: `optimizeAppointmentSlots`, `nlpPatientSearch`

### 6.15 Admin (`/admin`)
**Dashboard** — hospital-wide KPI overview  
**Analytics** — revenue, occupancy, length-of-stay, department-wise trends (Recharts)  
**Patients** — master patient registry  
**Staffing** — headcount by department, shift coverage  
**Roster** — staff schedule calendar  
**Duty** — duty assignment management  
**Users** — user account management, role assignment  

### 6.16 Blood Bank (`/bloodbank`)
**Dashboard** — blood group inventory levels, expiry alerts, request queue  
**Inventory** — unit tracking by blood group and component  
**Donors** — donor registration and donation history  
**Requests** — blood requisition management, cross-match status  

Key AI: `forecastBloodDemand`

### 6.17 CSSD (`/cssd`)
**Dashboard** — sterilization cycle queue, OT priority requests  
**Cycles** — cycle log with autoclave parameters, pass/fail status  
**Instruments** — instrument inventory, traceability per cycle  

Key AI: `prioritizeCSSDQueue`

### 6.18 Dietary (`/dietary`)
**Dashboard** — meal order queue, diet compliance by ward  
**Plans** — AI-generated diet plans per patient diagnosis  
**Orders** — meal delivery scheduling  

Key AI: `suggestDietPlan`

### 6.19 Bio-Medical Waste (`/bmw`)
**Dashboard** — waste generation metrics by category  
**Log** — daily waste disposal entries by colour-coded category  
**Reports** — regulatory compliance reports per CPCB guidelines  

### 6.20 Mortuary (`/mortuary`)
**Dashboard** — current occupancy, pending clearances  
**Records** — deceased patient records, cause of death  
**Clearances** — MLC (Medico-Legal Case) clearance workflow, death certificate issuance  

### 6.21 Ambulance (`/ambulance`)
**Dashboard** — fleet status, active dispatches  
**Dispatch** — call intake, ambulance assignment, GPS tracking panel  
**Log** — trip history with timestamps and patient handover notes  

### 6.22 Audit & Compliance (`/audit`)
**Dashboard** — compliance score, open findings count  
**Log** — immutable audit event trail (actions timestamped per user and role)  
**Reports** — NABH-ready compliance reports  

Store: `useAuditStore`

### 6.23 Quality (`/quality`)
**Dashboard** — quality indicators, incident count  
**Incidents** — adverse event reporting, root-cause tracking, CAPA management  

### 6.24 Housekeeping (`/housekeeping`)
**Dashboard** — pending cleaning tasks by ward, bed-turnover queue  
Integrates with Admission for bed status update on task completion

### 6.25 Inventory (`/inventory`)
**Dashboard** — low-stock alerts, procurement status  
**Stock** — asset and consumable stock management

### 6.26 Patient Portal (`/patient`)
**Dashboard** — health summary, active medications, upcoming appointments  
**Queue** — live token position and estimated wait time  
**Waiting** — waiting room display mode  
**Records** — medical history, lab reports, discharge summaries  
**Appointments** — schedule and manage appointments  
**Billing** — invoice view, payment history  
**Follow-up** — post-discharge instructions, follow-up scheduling  

### 6.27 Discovery (`/discovery`)
Internal navigation hub for exploring all system modules

---

## 7. Cross-Cutting Requirements

### 7.1 Real-Time Notifications
`notification-dispatcher.ts` provides a centralised service for cross-department alerts:
- Critical lab value → nurse + treating doctor
- Sepsis alert → ER + ICU nurse
- OT pre-clearance failure → OT coordinator
- Discharge clearance bottleneck → billing + nurse

Store: `useNotificationStore`

### 7.2 Internationalisation
- English (`messages/en.json`) and Hindi (`messages/hi.json`) via `next-intl`
- Locale-aware routing via `src/i18n/routing.ts`
- Locale switching via server action `src/app/actions/locale.ts`

### 7.3 Security & Compliance
- **DISHA** (Digital Information Security in Healthcare Act) data handling
- **NABH** standard workflows: WHO checklist, incident reporting, quality indicators
- Role-based access enforced at the store layer (`useAuthStore` — role persists in Zustand)
- Audit trail: all significant actions written to `useAuditStore` with user ID, role, timestamp

### 7.4 Performance
- Next.js App Router with per-route streaming and server components where appropriate
- Client-side state via Zustand (no network round-trips for in-session data)
- Framer Motion animations use GPU-composited transforms only (no layout thrash)

### 7.5 Accessibility
- Keyboard navigation across role selector and portals
- Colour-coded severity indicators always paired with text labels (not colour-only)
- Mobile-responsive layouts (single-column on < lg, two-column on ≥ sm)

---

## 8. Data Models (Key Entities)

| Store | Key State Shape |
|---|---|
| `usePatientStore` | Patient demographics, MRN, allergies, active conditions |
| `useAdmissionStore` | Beds, admissions, ward census |
| `useOTStore` | OT cases, theater slots, team assignments |
| `useDischargeStore` | Discharge requests, pillar status, summaries |
| `useBillingStore` | Invoices, payments, packages, refund requests |
| `useInsuranceStore` | Claims, pre-auth requests, TPA list |
| `useLabStore` | Test orders, samples, results, critical flags |
| `useRadiologyStore` | Scan orders, modality queue, reports |
| `usePharmacyStore` | Prescriptions, dispense records, narcotics log |
| `useBloodBankStore` | Blood units, donor records, cross-match requests |
| `useEmergencyStore` | ER patients, triage records, trauma events |
| `useWardStore` | Ward beds, patient assignments |
| `useConsultationStore` | Consultation notes, referrals |
| `useHRStore` | Staff records, shifts, roster |
| `useInventoryStore` | Assets, consumables, purchase orders |
| `useCSSDStore` | Sterilization cycles, instrument traceability |
| `useDietaryStore` | Diet plans, meal orders |
| `useBMWStore` | Waste disposal entries |
| `useMortuaryStore` | Deceased records, MLC cases |
| `useAmbulanceStore` | Fleet, dispatch records, trip logs |
| `useHousekeepingStore` | Cleaning tasks, bed turnover queue |
| `useQualityStore` | Incidents, CAPA, quality indicators |
| `useAuditStore` | Immutable event log |
| `useNotificationStore` | Active alerts, notification queue |
| `useFeedbackStore` | Patient feedback, satisfaction scores |
| `useFollowupStore` | Post-discharge follow-up plans |
| `useDrugMasterStore` | Drug master database |
| `useAuthStore` | Current user, active role, session |

---

## 9. AI Integration Architecture

```
Clinical Event
      │
      ▼
Rules Engine (synchronous, deterministic)
  ├── BLOCK if hard constraint violated (allergy, dosage, OT gate)
  └── PASS → AI Service (async, probabilistic)
              ├── Returns: { result, confidence, reasoning }
              └── UI renders suggestion with confidence badge
                  └── Clinician accepts / modifies / overrides
                      └── Decision logged to Audit Store
```

All AI service functions follow the contract:
```typescript
type AiEnvelope<T> = {
  result: T
  confidence: number   // 0–1
  reasoning?: string
}
```

This design means AI is always advisory — the rules engine provides the hard safety net, AI provides probabilistic intelligence, and the clinician retains final authority.

---

## 10. Key User Flows

### OPD → IPD → OT → Discharge (Core Clinical Pathway)

```
Patient arrives at Reception
  → Token issued, joins OPD queue
  → Doctor receives AI pre-brief
  → Consultation → e-prescription with interaction check
  → Decision: Admit?
      Yes → Bed Manager allocates bed (AI forecast assists)
           → Nurse takes over ward care (MAR, vitals, rounds)
           → Labs / Radiology ordered → AI anomaly detection
           → OT scheduled → WHO checklist → AI surgical brief
           → Discharge initiated → 5-pillar clearance
           → AI discharge summary → Follow-up plan generated
           → Billing finalised → Insurance claim / TPA pre-auth
  → Patient Portal: tracks each stage in real time
```

### Emergency Pathway

```
Patient arrives at ER
  → Triage nurse enters vitals
  → Rules engine → ESI 1–5 (auto, < 2 seconds)
  → ESI 1–2: immediate physician alert + sepsis monitoring
  → Sepsis AI monitors every vitals update
  → Stabilised → transitions to IPD pathway above
```

---

## 11. Acceptance Criteria

### P0 — Must have at launch
- [ ] All 24 role portals accessible and navigable
- [ ] ESI triage classification running deterministically from vitals input
- [ ] Drug interaction and allergy checks block prescription submission
- [ ] AI pre-brief, diagnosis suggestion, and prescription generation return mock results with confidence score
- [ ] Discharge 5-pillar clearance enforces all pillars before final discharge
- [ ] WHO OT checklist completes all three phases (Sign-in / Time-out / Sign-out)
- [ ] Billing invoice calculates correctly per `billing-math` rules engine
- [ ] Audit trail writes on every significant action
- [ ] English and Hindi locale switching functional
- [ ] Patient kiosk check-in accessible without authentication

### P1 — Ship within first month
- [ ] Real-time sepsis alert fires when `monitorSepsisMarkers` threshold crossed
- [ ] Bed demand forecast chart displays AI prediction vs actual
- [ ] Blood bank demand forecast integrated with surgical scheduling
- [ ] Narcotics log entries require dual-pharmacist confirmation flow
- [ ] Notification dispatcher delivers cross-department critical alerts

### P2 — Roadmap
- [ ] Swap AI service stubs for real LLM endpoints (Claude / GPT-4o)
- [ ] DICOM viewer real integration (OHIF or similar)
- [ ] REST/GraphQL API layer for third-party HIS integration
- [ ] Native mobile app for nurses (React Native)
- [ ] SMS / WhatsApp patient queue notifications
- [ ] Biometric attendance integration for HR roster
- [ ] Insurance EDI claims submission (TPA direct integration)

---

## 12. Metrics & KPIs

| Metric | Target |
|---|---|
| Triage classification time | < 2 seconds from vitals submission |
| AI diagnosis suggestion latency | < 3 seconds (mock), < 5 seconds (live LLM) |
| Drug interaction check | < 500ms (synchronous rules engine) |
| Discharge clearance cycle time | 20% reduction vs manual process |
| Bed allocation time | 15% improvement with AI forecast |
| Billing error rate | < 0.5% with AI code suggestion + fraud detection |
| System uptime | 99.9% |
| NABH compliance score | ≥ 85% on self-assessment |

---

## 13. Dependencies & Risks

| Risk | Impact | Mitigation |
|---|---|---|
| AI stubs not replaced with real LLMs | Clinical support remains non-functional | Architecture is stub-swap ready; LLM integration is isolated per service file |
| Next.js 16 / React 19 breaking changes | Build failures, unexpected behaviour | AGENTS.md mandates reading `node_modules/next/dist/docs/` before coding |
| State lost on page refresh (Zustand in-memory) | User loses session data | Add Zustand `persist` middleware backed by sessionStorage for production |
| No real authentication | Security risk in production | Demo mode is explicit; add NextAuth / SSO before production deployment |
| DISHA compliance requires data residency | Legal risk | All data must remain on Indian infrastructure; document data flows |
| NABH audit may require additional documentation fields | Compliance gap | Quality module's incident and CAPA workflows provide foundation |

---

## 14. Release Plan

| Phase | Scope | Target |
|---|---|---|
| **Alpha** | All 24 portals functional with mock data and AI stubs | Complete (current state) |
| **Beta** | Real authentication, persistent database, LLM integration for top 10 AI services | Q3 2026 |
| **v1.0** | Full LLM integration, DICOM viewer, insurance EDI, NABH certification submission | Q4 2026 |
| **v1.5** | Mobile app for nurses, patient WhatsApp notifications, biometric HR integration | Q1 2027 |

---

## 15. Appendix — Module → Route Map

| Module | Routes |
|---|---|
| Login / Role Select | `/` |
| Patient Kiosk | `/checkin`, `/checkin/intake` |
| Doctor | `/doctor/dashboard`, `/doctor/consultation`, `/doctor/schedule`, `/doctor/records`, `/doctor/inbox`, `/doctor/telemedicine` |
| Nurse | `/nurse/dashboard`, `/nurse/patients`, `/nurse/rounds`, `/nurse/medication`, `/nurse/tasks`, `/nurse/handover` |
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
| Admin | `/admin/dashboard`, `/admin/analytics`, `/admin/patients`, `/admin/staffing`, `/admin/roster`, `/admin/duty`, `/admin/users` |
| Blood Bank | `/bloodbank/dashboard`, `/bloodbank/inventory`, `/bloodbank/donors`, `/bloodbank/requests` |
| CSSD | `/cssd/dashboard`, `/cssd/cycles`, `/cssd/instruments` |
| Dietary | `/dietary/dashboard`, `/dietary/plans`, `/dietary/orders` |
| BMW | `/bmw/dashboard`, `/bmw/log`, `/bmw/reports` |
| Mortuary | `/mortuary/dashboard`, `/mortuary/records`, `/mortuary/clearances` |
| Ambulance | `/ambulance/dashboard`, `/ambulance/dispatch`, `/ambulance/log` |
| Audit | `/audit/dashboard`, `/audit/log`, `/audit/reports` |
| Quality | `/quality/dashboard`, `/quality/incidents` |
| Housekeeping | `/housekeeping/dashboard` |
| Inventory | `/inventory/dashboard`, `/inventory/stock` |
| Patient Portal | `/patient/dashboard`, `/patient/queue`, `/patient/waiting`, `/patient/records`, `/patient/appointments`, `/patient/billing`, `/patient/followup` |
| Discovery | `/discovery` |
