# Doctor Panel v2 — Comprehensive Upgrade Design

**Date:** 2026-05-25
**Status:** Approved (design) — pending spec review → implementation plan
**Scope:** Doctor portal IPD overhaul, close-the-clinical-loop, genuine clinical AI, and platform-correctness fixes. 18 milestones across 4 phases.

---

## 1. Goals

Make the doctor panel behave like a real, AI-first hospital system:

1. **IPD is comprehensive** — the doctor can run the full inpatient stay (rounds, med changes, tests, referrals, ICU/OT/surgery, discharge) from a dense one-row list and a full-page chart, and every action becomes durable history for both the doctor and the patient.
2. **The clinical loop closes** — finishing a consult creates a visit record; ordered tests return results to the doctor for sign-off.
3. **AI is genuinely clinical** — deterioration early-warning, executing copilot actions, prescribe-time safety, and voice scribe — not decoration.
4. **The platform is correct** — state persists, messaging actually crosses portals, header/bell are wired, doctors have a profile, and the hydration warning is gone.

## 2. Locked decisions

- **ICU/OT/Surgery depth:** *Decide → route → track.* The doctor triggers the clinical decision; it creates a routed request (bed transfer / OT booking / referral) and tracks status on the timeline. Full ICU/OT charting stays in the nurse/OT role portals.
- **Chart UI:** *Keep both.* Row click → quick-peek drawer; "Open full chart" → full-page route.
- **Patient IPD view:** *Curated, plain-language.* Patient sees humanized milestones, not raw clinical notes.
- **Copilot LLM (M9):** *Pluggable interface.* Drafts execute against the stores now via a grounded rule-engine; a real model is wired behind the same interface when an endpoint/key is provided.

## 3. Architectural backbone — the unified IPD event log

The single most important change. Today inpatient history is scattered across `rounds`, `progressNotes`, `surgery`, `discharge`. We introduce one append-only log on the `Inpatient` type that **every** action writes to.

```ts
// src/store/useInpatientStore.ts
export type IpdEventType =
  | 'admission' | 'round' | 'condition_change' | 'note'
  | 'med_start' | 'med_stop' | 'med_change'
  | 'test_order' | 'test_result' | 'diet_change'
  | 'referral' | 'icu_transfer' | 'ot_booking'
  | 'surgery_status' | 'discharge_step' | 'discharged'

export type IpdEvent = {
  id: string
  at: string                 // ISO timestamp
  type: IpdEventType
  actor: string              // 'Dr. Priya Nair' | 'System' | role
  title: string              // doctor-facing label, e.g. "Started Aspirin 75mg"
  detail?: string            // doctor-facing detail
  patientText?: string       // curated plain-language line for the patient portal
  severity?: 'info' | 'success' | 'warning' | 'critical'
  meta?: Record<string, unknown>
}
```

- `Inpatient` gains `events: IpdEvent[]` (newest-last).
- A private `logEvent(patientId, event)` helper appends to `events`. **Every** store action calls it.
- Doctor full-page chart Timeline tab renders `events` (filterable by type).
- Patient portal renders only events that carry `patientText` (or a humanizer maps type→text), giving the curated view without leaking raw notes.
- Seeded inpatients get back-dated `events` so timelines are populated on first load.

This is the source of truth for "everything happening becomes history for both views."

## 4. Data-model changes

```ts
// MedOrder gains lifecycle (meds are discontinued, never deleted)
export type MedOrder = {
  name: string; dose: string; freq: string; route: string
  status: 'active' | 'stopped'
  startedAt: string
  stoppedAt?: string
  stopReason?: string
}

// TestOrder gains result capture + ordering metadata
export type TestOrder = {
  id: string
  name: string
  status: 'Ordered' | 'In progress' | 'Ready' | 'Acknowledged'
  priority?: 'Routine' | 'Urgent'
  orderedAt: string
  result?: string
  resultAt?: string
  critical?: boolean
  acknowledgedAt?: string
}

// New inpatient sub-records
export type Referral = { id: string; specialty: string; toDoctor?: string; reason: string; urgent: boolean; at: string; status: 'sent' | 'accepted' }
export type IcuTransfer = { id: string; reason: string; urgency: 'Routine' | 'Urgent' | 'Emergency'; at: string; status: 'requested' | 'bed_assigned' | 'transferred' }
export type OtBooking = { id: string; procedure: string; surgeon: string; ot: string; scheduledAt: string; status: 'requested' | 'confirmed' }
```

`Inpatient` adds: `events`, `referrals?: Referral[]`, `icuTransfer?: IcuTransfer`, `otBooking?: OtBooking`, `codeStatus?: string`, `allergies?: string[]`, `comorbidities?: string[]`.

## 5. Cross-cutting engines

- **`src/lib/earlyWarning.ts`** — `news2(vitals)` returns `{ score, band: 'low'|'medium'|'high', drivers: string[] }` using the standard NEWS2 thresholds (RR, SpO₂, temp, systolic BP, pulse, consciousness; we map available vitals and degrade gracefully when a parameter is missing). `ipdInsights(inpatient)` composes NEWS2 + round-due + pending-results + condition trend into `{ risk, actions: string[], medSafety: string[], patientReassurance: string }`.
- **`src/lib/drugSafety.ts`** — curated interaction matrix + allergy matcher. `checkRx(meds, patientHistory, allergies)` → `{ interactions: {pair, severity, note}[], allergyHits: string[] }`.
- **`src/lib/copilotTools.ts`** — tool registry the copilot can call: `filePrescription`, `orderLab`, `writeDischarge`, `routeReferral`, `saveRoundNote`. Each maps a draft to a real store mutation and returns a confirmation. `respond()` in `doctorCopilot.ts` is refactored to return optional `tool` invocations the UI can execute on confirm.
- **`src/lib/copilotLLM.ts`** — a thin `generate(prompt, context)` interface. Default implementation = current grounded rule-engine. If `process.env.NEXT_PUBLIC_LLM_ENDPOINT` (or a configured key) is present, it calls the model; otherwise falls back. Keeps M9 pluggable.

## 6. Verification (every milestone)

1. `npx tsc --noEmit -p tsconfig.json` clean.
2. Puppeteer screenshot of the real page(s) for the milestone (per the "verify visually" rule).
3. Console-error sweep → 0 errors on the touched flows.

---

## 7. Milestones

### Phase 0 — Foundations & quick fixes

#### M1 — Remove bottom-right chatbot
- **Change:** [src/app/doctor/layout.tsx](../../src/app/doctor/layout.tsx) — stop wrapping children in `<CopilotLayout>` (the `CopilotPane` FAB). Leave the component files in place (unmounted) to avoid collateral changes.
- **Accept:** No floating bottom-right bubble on any `/doctor/*` page. The online-consult LIVE video widget (dashboard) is unaffected.

#### M2 — Persistence + hydration pass
- **Change:** Add zustand `persist` (named, `version`, `migrate` no-op, `skipHydration`-safe mounted-guard pattern) to `useInpatientStore`, `useMessagingStore`, `useDoctorStatsStore`, `useNotificationStore`. Keep seeds as the initial state; persisted state rehydrates over them.
- **Hydration fix:** Root-cause the app-wide mismatch (likely a client-only value rendered during SSR). Audit `AppShell` and any `Date`/random/`localStorage` read in render; gate client-only output behind a `mounted` flag or move to `useEffect`. Target: sweep shows 0 hydration warnings on hard load.
- **Accept:** IPD rounds, messages, stats survive a hard refresh; hydration warning gone from the doctor sweep.

### Phase 1 — IPD comprehensive upgrade

#### M3 — IPD data backbone
- **Change:** [src/store/useInpatientStore.ts](../../src/store/useInpatientStore.ts) — add `IpdEvent`/`events`, extend `MedOrder`/`TestOrder`, add sub-records (§4). Add `logEvent` and wire it into **all** existing actions. New actions: `discontinueMed(id, medName, reason)`, `changeMed(id, medName, patch)`, `addTest(id, {name, priority})`, `setTestResult(id, testId, {result, critical})`, `acknowledgeTest(id, testId)`, `setDiet(id, diet)`, `referInpatient(id, {specialty, toDoctor, reason, urgent})`, `requestIcuTransfer(id, {reason, urgency})`, `bookOT(id, {procedure, surgeon, ot, scheduledAt})`. Routing: referral/ICU/OT also emit a `useNotificationStore` entry to the target role + advance status.
- **Accept:** Each new action mutates state and appends a correctly-typed event with `patientText`; seeded inpatients show a populated timeline.

#### M4 — IPD single-row table + actions menu + quick-peek drawer
- **Change:** [src/app/doctor/ipd/page.tsx](../../src/app/doctor/ipd/page.tsx) — replace card grid with a dense table: Patient (avatar/name/id/admitted-since) · Bed/Ward · Condition · Stage · Next round (countdown/⚠DUE) · AI-flag chip · ⋮ Actions. Kebab menu: Start round · Open chart · Add/Stop med · Order test · Refer · Shift to ICU · Book OT/Plan surgery · Change diet · Initiate discharge — each opens the relevant modal or routes. Row click → refactored quick-peek drawer (vitals, last round, AI insight, quick actions, "Open full chart →").
- **Accept:** All actions reachable from the row; rounds-due strip retained; drawer links to full chart.

#### M5 — Full-page chart `/doctor/ipd/[id]`
- **New route:** `src/app/doctor/ipd/[id]/page.tsx`. Left rail: demographics, allergies, comorbidities, code status, admission info, live condition + NEWS2. Main: AI Insight panel on top, then tabs — **Overview** (insight, vitals trend sparkline, active problems) · **Timeline** (filterable event log) · **Rounds** · **Medications** (active + discontinued; add/stop/change) · **Orders & Results** · **Procedure/Surgery** (+ OT booking) · **Referrals & Transfers** · **Discharge**. Reuses existing SurgeryPanel/DischargePanel logic, relocated.
- **Accept:** Every tab reads/writes the store; every write appends an event; deep-link works on hard load.

### Phase 2 — Close the clinical loop

#### M6 — Visit-on-completion
- **Change:** [src/store/usePatientStore.ts](../../src/store/usePatientStore.ts) — add `addVisit(visit)`. [src/app/doctor/dashboard/page.tsx](../../src/app/doctor/dashboard/page.tsx) `completeConsult` — build a `Visit` from the consultation (diagnosis, notes, prescriptions, lab/rad orders) and `addVisit`; generate a patient-facing summary string. IPD `completeDischarge` likewise appends a discharge visit.
- **Accept:** After completing a consult, the patient's "Past visits" (records drawer + dashboard history) shows the new visit immediately.

#### M7 — Results inbox
- **Change:** Lab/Radiology stores emit results back (simulate progression Ordered→In progress→Ready with a `result`); a "Results to review" surface for the doctor (new tab in Inbox + a dashboard badge). One-tap **Acknowledge/Sign-off** marks the order `Acknowledged` and logs it (IPD: via `acknowledgeTest`). Critical results raise a `useNotificationStore` critical alert automatically.
- **Accept:** Ordering a test eventually yields a result in the doctor's review queue; sign-off clears it; a critical value escalates to an alert.

### Phase 3 — Genuine clinical AI

#### M8 — Early-warning engine
- **Change:** `src/lib/earlyWarning.ts` (§5). Surface `ipdInsights` on the IPD row chip, drawer, and full-page top; push overdue-round / high-NEWS2 patients into the inbox as alerts. Patient portal shows the reassuring version.
- **Accept:** A patient with deranged vitals shows an elevated NEWS2 band + concrete suggested actions; an overdue/critical case appears in the inbox.

#### M9 — Tool-calling copilot
- **Change:** `src/lib/copilotTools.ts` + `src/lib/copilotLLM.ts` (§5); refactor [src/lib/doctorCopilot.ts](../../src/lib/doctorCopilot.ts) so draft replies carry an executable `tool`. [src/app/doctor/ai-assistant/page.tsx](../../src/app/doctor/ai-assistant/page.tsx) — draft cards gain a primary action that runs the tool (e.g., "File prescription" → pharmacy store) with a confirm step + toast.
- **Accept:** "Draft & file a prescription for X" produces a draft and, on confirm, actually creates the pharmacy order (and lab/discharge/referral equivalents). LLM interface in place with grounded fallback.

#### M10 — Prescribe-time safety
- **Change:** `src/lib/drugSafety.ts` (§5). Wire `checkRx` into the dashboard Rx panel and the copilot's prescription tool: show interaction/allergy warnings before sending; block-or-confirm on a major interaction/allergy match.
- **Accept:** Prescribing two interacting drugs, or a drug the patient is allergic to, raises a clear warning at order time.

#### M11 — Ambient voice scribe
- **Change:** [src/app/doctor/dashboard/page.tsx](../../src/app/doctor/dashboard/page.tsx) Dictate button → Web Speech API (`SpeechRecognition`) live transcription into the notes field; a "Structure note" action turns the transcript into a SOAP-shaped note. Graceful fallback (button disabled with tooltip) where the API is unsupported.
- **Accept:** In a supporting browser, speaking fills the notes; structuring produces S/O/A/P sections. No crash where unsupported.

### Phase 4 — Mirror, UX & platform correctness

#### M12 — Patient portal curated IPD timeline
- **Change:** [src/app/patient/ipd/page.tsx](../../src/app/patient/ipd/page.tsx) — render the curated timeline from `events[].patientText`, alongside the existing journey tracker; enhance the "How you're doing" AI summary from the new events.
- **Accept:** Doctor actions (round, med change, procedure, discharge) appear as friendly milestones in the patient portal.

#### M13 — Online Consultation one-row table
- **Change:** [src/app/doctor/online/page.tsx](../../src/app/doctor/online/page.tsx) — convert cards to a dense table: Patient (avatar/name/age/sex) · Reason · Slot · Wait · history chips · vitals snapshot · AI brief chip · triage · Start-consultation action.
- **Accept:** One row per online patient with the richer columns; Start still launches the workspace + video widget.

#### M14 — My Activity performance graph
- **Change:** [src/store/useDoctorStatsStore.ts](../../src/store/useDoctorStatsStore.ts) — add `seriesFor(doctorId, period|range)` returning per-day points. [src/app/doctor/analytics/page.tsx](../../src/app/doctor/analytics/page.tsx) — add a Recharts trend (OPD vs Online area/line + tests/Rx) above/below the tiles, respecting the period + custom range.
- **Accept:** Graph renders for each period and the custom range; matches the tile totals.

#### M15 — Shared messaging bus
- **Change:** Unify doctor + reception (+ other roles) onto one messaging store so a message addressed to a role/person surfaces in that portal's inbox (replace canned auto-replies with real cross-portal delivery). Migrate [src/store/useMessagingStore.ts](../../src/store/useMessagingStore.ts) to keyed-by-participant threads; reception messaging reads the same store.
- **Accept:** A message sent from the doctor to "Nurse" appears in the nurse portal inbox (and vice-versa) within the SPA session.

#### M16 — Header search + notification bell wired
- **Change:** [src/components/layout/AppShell.tsx](../../src/components/layout/AppShell.tsx) — global search navigates to a matching patient record/chart; the bell dropdown lists real `useNotificationStore` items for the active role with unread state + click-through.
- **Accept:** Typing a patient name + enter jumps to them; the bell shows live alerts and navigates.

#### M17 — Doctor profile & settings
- **New route:** `src/app/doctor/settings/page.tsx` (route `/doctor/settings`) — availability, leave, consultation hours, fees, e-signature. AppShell Settings icon routes here for doctors. A new `useDoctorProfileStore` (persisted) holds the fields.
- **Accept:** Doctor can view/edit profile fields; settings persist (M2); e-signature is usable on documents (referrals/discharge where shown).

#### M18 — Registries from real data + responsive pass
- **Change:** [src/app/doctor/registries/page.tsx](../../src/app/doctor/registries/page.tsx) — derive cohort charts (HbA1c/BP control) from actual patient/visit data instead of hard-coded arrays. Responsive audit of the dashboard + IPD for tablet/phone (ward-round use): stack panels, collapsible sidebars.
- **Accept:** Registry numbers trace to underlying records; dashboard + IPD are usable at tablet width.

---

## 8. Out of scope (explicit)

- Full ICU charting (ventilator/infusion/hourly obs) and a full OT scheduling module — those belong to the nurse/OT role portals; the doctor panel only decides/routes/tracks.
- A production model backend/billing for the LLM — interface is pluggable; wiring a specific provider is a follow-up once an endpoint/key exists.
- Native mobile apps — responsive web only (M18).

## 9. Dependencies & ordering notes

- M3 is the foundation for M4, M5, M8, M12.
- M6/M7 (loop) are independent of the IPD UI and could be pulled earlier if priorities shift.
- M9 depends on the copilot existing (done) and benefits from M10's safety checks being available to gate the prescription tool.
- M2's persistence underpins M17 (settings) and makes M6/M7/M15 demos survive refresh.
