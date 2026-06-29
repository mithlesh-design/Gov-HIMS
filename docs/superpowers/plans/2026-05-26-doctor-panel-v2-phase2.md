# Doctor Panel v2 — Phase 2 (M6 + M7) Implementation Plan

> Execute inline with typecheck + screenshot + console-sweep verification per milestone (no unit tests / not a git repo — same model as Phase 0+1).

**Goal:** Close the clinical loop — finishing a consult/discharge creates durable visit history (M6), and ordered lab/radiology/IPD results flow back to the doctor for one-tap sign-off with critical-value escalation (M7).

**Spec:** docs/superpowers/specs/2026-05-25-doctor-panel-v2-design.md (§7 M6–M7).

---

## M6 — Visit-on-completion

**Files:** `src/store/usePatientStore.ts` (add `addVisit`), `src/app/doctor/dashboard/page.tsx` (`completeConsult`), `src/components/doctor/ipd/panels.tsx` (`DischargePanel` complete).

- Add `addVisit: (v: Omit<Visit,'id'>) => void` to `usePatientStore` (prepend with generated id).
- In `completeConsult`: before `resetConsultation()`, build a `Visit` from `currentPatient`, `diagnosis`, `notes`, and `prescriptions` (map medicine/dosage/duration), dated today, doctor = currentPatient.doctor; `addVisit(...)`. Works for both OPD and online consults.
- In `DischargePanel`'s "Complete discharge": after `completeDischarge`, `addVisit` a discharge-type visit (diagnosis = ip.diagnosis, notes = discharge summary, prescriptions = TTO meds) so the inpatient stay shows in the patient's history.
- **Accept:** Completing a consult for a patient with no prior visits makes a visit appear immediately in Patient Records → that patient's "Past visits" (and the dashboard history "View detailed history").

## M7 — Results inbox

**Files:** `src/store/useLabStore.ts`, `src/store/useRadiologyStore.ts` (add sign-off + seed ready results for Dr. Priya Nair), `src/lib/resultsInbox.ts` (new, collector), `src/app/doctor/inbox/page.tsx` (Results tab).

- **Lab store:** add `acknowledgedAt?: string` to `LabSample`; add `acknowledgeResult: (id) => void`. Seed 2 `Completed` samples ordered by `Dr. Priya Nair` with `result` text — one `criticalValue: true` (e.g. Potassium 6.8). Keep existing critical-notification behaviour.
- **Radiology store:** add `reviewedAt?: string` to `RadiologyScan`; add `acknowledgeScan: (id) => void`. Add 1–2 scans ordered by `Dr. Priya Nair` in `Reported`/`Ready for Review` with `aiFinding` as the read.
- **IPD tests:** seed `result` text on the one already-`Ready` test (Kiran ECG) so it carries a value; `acknowledgeTest` already exists.
- **`src/lib/resultsInbox.ts`:** `collectResults(doctorName, { labSamples, radScans, inpatients }) => ResultItem[]` where `ResultItem = { key, source: 'lab'|'radiology'|'ipd', patient, label, value, critical, at, onAck info }`. Include: lab `status==='Completed' && orderedBy===doctorName && !acknowledgedAt`; radiology `(status==='Reported'||'Ready for Review') && orderedBy===doctorName && !reviewedAt`; ipd tests `status==='Ready'` for inpatients with `admittingDoctor===doctorName`.
- **Inbox Results tab:** third tab "Results" with unread count = collectResults length. Each result is a card (red-tinted if critical) with source chip, patient, value, time, and an "Acknowledge / sign-off" button that calls the matching store action (lab `acknowledgeResult`, radiology `acknowledgeScan`, ipd `acknowledgeTest`). Wrap the list in `ClientOnly` (it renders times).
- **Accept:** Doctor sees a "Results" queue with lab + radiology + IPD results (incl. a critical one); signing off removes the item; the critical value also appears as an Alert.
