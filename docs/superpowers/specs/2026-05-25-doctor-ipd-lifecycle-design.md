# Doctor Panel v2 + IPD Inpatient Lifecycle — Design

**Date:** 2026-05-25
**Context:** AI-first HMS (Umang HIMS). Builds on the existing doctor portal. Goal: a complete inpatient (IPD) journey handled in BOTH the doctor and patient portals, plus targeted upgrades (AI copilot, records table, messaging inbox, activity date range).

## Principles
- **Doctor ↔ patient mirroring:** every doctor action (round note, order, surgery step, discharge) writes to a shared store and is reflected in the patient's IPD view. One source of truth.
- **AI-first:** AI round summaries, acuity-based round cadence, discharge-summary drafting, and a clinical copilot.
- **Reuse existing stores:** `useWardStore` (inpatient vitals/rounds/meds/IV), `useAdmissionStore` (beds/admissions), `usePatientStore`, `useDoctorStatsStore`, `useConsultationStore`. Add new stores only where needed.

## Locked decisions
1. **AI Assistant = Copilot** — grounded answers about any patient/records + drafts (round note, Rx, discharge summary) the doctor reviews/inserts; persistent saved threads (Zustand + localStorage).
2. **Rounds = AI cadence by acuity** — Critical ~4×/day, Serious ~3×, Stable ~2×; auto-scheduled; "rounds due" reminders; doctor records each round; next auto-scheduled.
3. **Surgery/OT = doctor-side track** — request → consent → scheduled → in-OT → post-op, mirrored to patient; full OT-role portal integration deferred.

## Data model — Inpatient journey (new `useInpatientStore`)
```
type IpdStage = 'admitted' | 'under_treatment' | 'pre_op' | 'in_surgery' | 'post_op' | 'recovering' | 'discharge_initiated' | 'discharged'
type Condition = 'Critical' | 'Serious' | 'Stable' | 'Improving' | 'Discharge-ready'

type Round = { id; at; doctor; vitalsReviewed; note; plan; orders?: string[]; done: boolean }   // scheduled + completed
type Surgery = { procedure; surgeon; ot; scheduledAt; status: 'requested'|'consent_pending'|'scheduled'|'in_ot'|'recovery'|'done'; consentSigned; preOpChecklist; postOpNote }
type DischargePillar = { key: 'clinical'|'nursing'|'pharmacy'|'billing'|'insurance'; cleared: boolean }

type Inpatient = {
  patientId; name; age; gender; bed; ward; admittingDoctor; diagnosis; admittedAt; expectedDischarge;
  stage: IpdStage; condition: Condition; acuity → roundIntervalHrs;
  rounds: Round[]; orders: { meds; tests; procedures; diet }; surgery?: Surgery;
  progressNotes: { at; doctor; text; condition }[]; discharge?: { pillars: DischargePillar[]; summary; followUpDate; meds; redFlags };
}
```
Seed 3–4 inpatients across stages (post-op recovering, awaiting surgery, stable under treatment, discharge-ready). Live actions mutate this store; the patient IPD page reads it.

## Feature specs

### A. AI Assistant (copilot) — `/doctor/ai-assistant`
- New `useAssistantStore` (threads persisted to localStorage): `threads: {id,title,messages[],updatedAt}[]`, `activeThreadId`, newThread/select/append/rename/delete.
- Layout: threads sidebar (history) | active chat | patient-context chip + quick prompts.
- Engine: records-grounded answers (patient lookup, cohort queries, schedule/activity, beds) + **draft mode** ("draft a round note for X", "draft discharge summary") returning editable text with an **Insert** affordance.
- Clinical disclaimer on every answer.

### B. Doctor menu regroup + IPD page + rounds
- Grouped nav (sections): **Clinical** (Consultations/OPD, Online Consultation, IPD / Inpatients, Emergencies) · **Patients** (Patient Records, AI Assistant) · **Workspace** (My Schedule, Inbox) · **Insights** (My Activity, Bed Availability, Disease Registries).
- **IPD / Inpatients** page: admitted patients (cards/rows) with condition badge, bed/ward, next round due, "Start round" + "Open chart". A **Rounds-due** strip at top.
- Round recording modal: vitals review, progress note, plan, quick orders → marks round done, schedules next by acuity, writes to inpatient store + patient view, records stat.

### C. Patient Records → table
- One row/patient: ID · name · age/sex · **type tag (Online/In-person)** · status · triage · last visit · action. Tabs **All / In-person / Online**. **Doctor-scoped** (`p.doctor === currentUser.name`). Row click → existing history drawer.

### D. Inbox → messaging — new `useMessagingStore`
- Threads between staff; compose to a role or named person (staff directory across roles). Reply, unread counts. Tabs: **Messages** (conversations) + **Alerts** (clinical notifications as today).

### E. My Activity → date range
- Add from–to date pickers beside period presets; `totalsForRange(doctorId, fromISO, toISO)` in `useDoctorStatsStore`.

### F. IPD lifecycle — doctor + patient (the core)
Stages and dual-portal handling:
- **Admitted** → patient sees ward/bed/care-team/est-stay.
- **Rounds** (auto cadence) → patient sees AI-summarised round timeline + next round time.
- **Orders** → patient sees MAR (meds schedule), tests+results, diet.
- **Surgery** → doctor request→consent→schedule→post-op; patient consent + live status.
- **Recovery** → progress notes + condition; patient sees progress/vitals trend + AI reassurance.
- **Discharge** → 5-pillar clearance + summary + follow-up; patient sees clearance tracker, summary, take-home meds, follow-up booking, red flags (ties into existing `/patient/followup`).
- Enhance patient `/patient/ipd` to mirror all stages.

## Milestones
- **M1** Menu regroup + IPD page + rounds engine (`useInpatientStore`, seed, record round, AI cadence).
- **M2** Patient IPD mirror: rounds timeline (AI summary), orders/MAR, recovery progress.
- **M3** Surgery/OT track (doctor request→consent→schedule→post-op; patient consent+status).
- **M4** Discharge flow both sides (5-pillar clearance + summary + follow-up).
- **M5** AI Assistant copilot (persistent threads + draft actions).
- **M6** Inbox messaging (`useMessagingStore`, compose-to-anyone, threads + Alerts tab).
- **M7** Records table + Online/Offline tabs (doctor-scoped) + My Activity date range.

Each milestone: typecheck clean + screenshot-verified + console-error sweep.

## Out of scope (for now)
- Deep OT-role portal integration (surgery is doctor-side track here).
- Real STT dictation; real video (WebRTC) — simulated.
