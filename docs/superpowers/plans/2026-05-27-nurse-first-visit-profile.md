# Nurse First-Visit Profile Completion

> Execute inline, milestone-by-milestone, with typecheck + Puppeteer screenshot + console-sweep (target 0) after each. AI is functional (grounded, LLM-pluggable).

**Decisions (approved):** trigger on the FIRST vitals encounter in **both OPD & ward**; **multistep wizard**; **fully required** before the patient advances to the doctor; **comprehensive** profile.

**Core idea:** onboarding stays minimal. The first time a patient has vitals taken (OPD reception→nurse queue, or ward admission), the nurse gets a 6-step wizard that completes a full clinical profile and ends with the comprehensive M2 vitals. Later vitals use the quick M2 form. The profile flows to the doctor's consult and the patient portal.

---

### M1 — Profile model + store + lib
- `src/store/usePatientProfileStore.ts` (persisted, skipHydration + StoreHydrator): `profiles: Record<patientId, PatientProfile>`; `getProfile`, `saveProfile(id, p, by)` (stamps `completedAt`/`completedBy`), `isComplete(id)`. Seed Kiran (PT-20394) complete; leave OPD queue patients incomplete.
- `PatientProfile`: identity/contact (address, city, pincode, ABHA, language, marital, occupation), emergency contact (name/relation/phone), clinical (bloodGroup, allergies[], chronicConditions[], currentMedications[], pastSurgeries[], familyHistory[]), lifestyle/measurements (smoking, alcohol, pregnancy, heightCm, weightKg), insurance (payerType, insurer, policyNo), consents, meta.
- `src/lib/patientProfile.ts`: `emptyProfile`, `missingMandatory(profile, vitalsDraft, noKnownAllergies)` (blood group, address, emergency name+phone, allergies-or-none, core vitals), `bmiBand`, `allergyMedConflicts` (reuses `drugSafety.checkRx`), `riskSnapshot(profile, vitalsDraft, meta)`, `completeness`.
- **Accept:** store persists a profile by id; `isComplete` reflects it; seeded Kiran is complete.

### M2 — Shared VitalsFields + FirstVisitWizard
- Extract `src/components/nurse/VitalsFields.tsx` (presentational grouped inputs) + `VitalsAiPanel` (NEWS + anomalies) from `VitalsForm`; refactor `VitalsForm` to use them (no behaviour change).
- `src/components/nurse/FirstVisitWizard.tsx`: 6 steps (Identity & contact, Emergency contact, Clinical history, Lifestyle & measurements, Vitals, Review), progress bar, Back/Next, AI woven in (allergy↔med cross-check on step 3, BMI band on step 4, risk snapshot + completeness on step 6). Finish gated on `missingMandatory` empty.
- **Accept:** wizard renders all steps; AI flags an allergy/med conflict; BMI band computes; finish disabled until mandatory complete.

### M3 — Trigger + gating
- OPD vitals queue (`/nurse/vitals-requests`) and ward dashboard (`/nurse/dashboard`): on Record/Update Vitals, `isComplete(id)` ? quick `VitalsForm` : `FirstVisitWizard`.
- On wizard finish — OPD: `saveProfile` + `recordOpdVitals` (advance to consulting); Ward: `saveProfile` + `recordVitals` + sync clinical to the inpatient.
- **Accept:** an incomplete patient opens the wizard; completing it advances them (OPD→consulting) and a second vitals opens the quick form.

### M4 — Cross-portal
- Doctor OPD consult surfaces the profile (allergies/conditions/blood group/emergency contact). Ward: profile allergies/conditions sync into `Inpatient.allergies/comorbidities` (already rendered on the doctor chart).
- Patient portal `/patient/profile`: replace hardcoded card with the real profile for the logged-in patient.
- **Accept:** the doctor sees the nurse-completed profile; the patient portal shows real data (Kiran).
