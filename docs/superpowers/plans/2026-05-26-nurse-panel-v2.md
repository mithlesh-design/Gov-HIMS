# Nurse Panel v2 — "One ward, real workflows, AI everywhere"

> Execute inline, milestone-by-milestone, with typecheck + screenshot + console-sweep verification each. AI is functional (grounded engine, LLM-pluggable), not decorative.

**Core decision:** retire `useWardStore`'s separate roster; the nurse works the SAME patients as the doctor (`useInpatientStore`). Extend the shared `Inpatient` model with nurse fields (vitals history, IV lines, intake/output, nursing tasks, nursing notes, assignment). Every nurse action writes to the shared event log the doctor sees.

---

### M1 — Unify the ward on the shared record
- Extend `Inpatient` (`useInpatientStore`) with nurse-facing fields and actions; seed the existing inpatients (Kiran, Sunita Devi, Raju, Vikram, Mohan) with ward/nurse data. Migrate nurse Dashboard, My Patients, and Rounds to read `useInpatientStore`. Keep the dashboard's incoming-transfers / camera / discharge features. Retire `useWardStore`'s patient list (or re-point its consumers).
- **Accept:** the nurse ward shows the same patients as the doctor IPD; a nurse vitals update appears on the doctor's chart timeline.

### M2 — Comprehensive vitals + scoring
- New `VitalsRecord` type: HR, systolicBP/diastolicBP, RR, SpO₂, temp, pain (0–10), bloodGlucose, consciousness (AVPU + optional GCS), weight, height/BMI, o2Delivery, capillaryRefill, urineOutput, takenAt/by. Unified `vitals: VitalsRecord[]` timeline on `Inpatient` (rounds + nurse checks append). Comprehensive vitals form.
- **AI:** `news2`/`ipdInsights` use the full set; on save, anomaly flags + NEWS band shown.
- **Accept:** recording a full vitals set computes NEWS and flags abnormal values; the timeline + doctor chart reflect it.

### M3 — OPD vitals queue + reception→nurse alert
- When reception advances an OPD patient to `queueStatus: 'vitals'`, fire a `useNotificationStore` alert to `nurse`. Nurse "Vitals Requests" page lists those patients; recording vitals (M2 form) advances them to `consulting`.
- **AI:** triage flag on recorded vitals; queue auto-prioritised by acuity.
- **Accept:** reception "send for vitals" → nurse notification + queue entry → nurse records vitals → patient moves to the doctor's queue.

### M4 — Real MAR
- MAR built from `ip.meds` (active): scheduled dose slots by frequency; Due → Given/Missed/Held + PRN; administration logged as an `IpdEvent`; persisted.
- **AI:** 5-rights + allergy/interaction gate (`drugSafety`) at administration; missed-dose alerts.
- **Accept:** the MAR reflects the doctor's prescribed meds; marking a dose Given logs to the timeline and is blocked/warned on an allergy.

### M5 — Orders-to-action queue
- Doctor's new orders (med/test/IV/diet/referral/ICU) surface to the nurse as an action list; acknowledge/execute logs to the timeline.
- **AI:** prioritisation by urgency/acuity.
- **Accept:** a doctor order appears in the nurse's queue and clears on action with a timeline event.

### M6 — Nursing tasks + notes
- Persisted, patient-linked nursing tasks (care-plan + order-driven); nursing assessment/notes charting on the shared timeline.
- **AI:** auto-build the shift task list from orders + acuity; voice → structured nursing note.
- **Accept:** tasks persist and link to patients; a nursing note (typed or dictated→structured) appears on the timeline.

### M7 — Intake/Output + IV/infusion
- Fluid-balance chart (in/out + running balance); IV/infusion rate / volume remaining / resite-due.
- **AI:** fluid-balance trend + alerts (negative balance, infusion ending soon).
- **Accept:** I/O entries update the balance; an infusion nearing end raises an alert.

### M8 — Early-warning & escalation
- Nurse vitals → NEWS2 trend; rising/high auto-escalates to the doctor's inbox; explicit "Escalate to doctor" action.
- **AI:** deterioration prediction + auto-drafted SBAR sent over the messaging bus.
- **Accept:** a worsening vitals trend escalates to the doctor inbox with an AI-SBAR.

### M9 — Real handover + nurse patient detail
- SBAR handover from the actual assigned ward (editable, audited); click-through to a full nurse patient view (vitals trend, MAR, tasks, notes, I/O); per-nurse assignment; responsive pass.
- **AI:** end-of-shift handover auto-compiled from the shift's events.
- **Accept:** handover reflects the real ward; roster/dashboard cards open a patient detail view.
