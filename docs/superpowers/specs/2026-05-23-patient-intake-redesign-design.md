# Patient Intake Redesign — Design Spec

**Date:** 2026-05-23
**Status:** Approved (design) — pending implementation plan
**Scope:** Front-end UI only (no backend / persistence / auth changes)
**Surface:** `/checkin/intake` (public kiosk, no login)
**Related (parked):** Landing-page overhaul — *Refined Clinical* direction + search-first role finder (separate spec, later)

---

## 1. Goal

Replace today's dense 3-step intake form (Step 1 alone stacks ~8 inputs + 3 input-method tabs) with a **calm, one-entry-at-a-time guided journey** that is overwhelmingly **tap-to-select**, kiosk-friendly, and accessible. The patient should be able to complete a typical visit by tapping chips and a single "Continue" button, typing only what genuinely can't be suggested.

## 2. Design principles

1. **One focused entry per screen.** Each screen asks a single thing with a big primary action.
2. **Tap, don't type.** Every screen presents tappable suggestions. The only intrinsically-typed fields are **name, mobile, age** (and even those are pre-filled if the user picks Aadhaar-scan or Voice).
3. **"Other" escape hatch.** Every suggestion screen includes an **Other** chip; tapping it reveals a text box so the user can type something not listed.
4. **Multi-select where natural.** Symptoms, departments, and "what brings you in" allow multiple selections.
5. **Derive, don't dump.** The department screen shows a **short list derived from the chosen symptoms**, not the full 8-item list (full list still reachable via *Other*).
6. **Kiosk + accessible by default.** Large hit targets (≥44px), visible focus, keyboard navigable, screen-reader step announcements, reduced-motion aware.
7. **Nothing lost.** All current capabilities are preserved — just sequenced.

## 3. In scope / out of scope

**In scope**
- Full rewrite of the `/checkin/intake` experience into a data-driven, multi-screen flow.
- Reusable kiosk step components (will seed the broader design system later).
- Selection-first inputs, "Other → type", multi-select, symptom-derived department suggestions.
- Per-step validation, empty/guard states, accessibility, responsiveness.
- Minor, additive type extension to `usePatientStore` (front-end only).

**Out of scope**
- Backend, database, real auth, persistence (data stays in-memory; refresh resets — unchanged from today).
- The other 23 role portals and the landing page (parked).
- A full design-token system (this work *seeds* shared components; tokenization is a later foundation task).
- Real Aadhaar OCR / real speech backend (the existing simulated scan + browser `SpeechRecognition` + mock `extractIntakeFromVoice` are kept as-is).

## 4. The journey (screen by screen)

Conditional screens appear only when relevant. "Continue" is gated by each step's validation. A thin top progress bar shows **"Step X of N"** where N is the count of *visible* steps given the current branch (Welcome and Success excluded).

| # | Phase | Screen | Input type | Multi? | Other? | Required | Notes / validation |
|---|---|---|---|---|---|---|---|
| 1 | Start | **Welcome** | intro + Start button | — | — | — | No data; sets calm tone |
| 2 | Start | **How would you like to enter details?** | single-choice cards: Type · Scan Aadhaar · Speak | no | — | yes | Branches the next sub-step. Voice hidden if `SpeechRecognition` unsupported |
| 2a | Start | *Aadhaar scan* (if method = Aadhaar) | simulated camera scan | — | — | — | Pre-fills name/age/gender (existing mock), then continues to ③ for confirmation |
| 2b | Start | *Voice capture* (if method = Speak) | mic → `extractIntakeFromVoice` | — | — | — | EN/हिं + large-text toggle; pre-fills name/age/gender/symptoms/department, then continues |
| 3 | Identity | **Your full name?** | text | no | — | yes | Non-empty. Pre-filled from scan/voice |
| 4 | Identity | **Your mobile number?** | tel (numeric) | no | — | yes | Exactly 10 digits. **Live duplicate check** → non-blocking banner ("Possible match: …" + "Continue as new") |
| 5 | Identity | **Your age?** | number (numeric pad) | no | — | yes | 1–120 |
| 6 | Identity | **Gender?** | single-choice segmented | no | — | yes | Male / Female / Other |
| 7 | Visit | **What brings you in?** | **multi-choice** chips | **yes** | **yes** | yes (≥1) | New OPD · Follow-up · Emergency · Admission · Cashless · Walk-in · + Other |
| 8 | Visit | **Insurance details** *(conditional)* | card no. (text) + insurer (choice + Other/search) | — | yes | optional | Shown only when visit-types include **Cashless** |
| 9 | Clinical | **Select your symptoms** | **multi-choice** chips | **yes** | **yes** | yes (≥1) | Drives triage badge + department suggestions. *Other* → typed symptom appended |
| 10 | Clinical | **Department** | **multi-choice**, source = `suggestDepartments(symptoms)` | **yes** | **yes** | yes (≥1) | Short derived list. *+ Other dept* → searchable full list / type |
| 11 | Clinical | **Bringing old reports?** *(optional)* | toggle (Yes/Skip) | — | — | no | Skippable |
| 12 | Consent | **Share live status with family?** *(conditional/optional)* | toggle → family phone (tel) | — | — | no | DISHA note; phone field only when toggled on |
| 13 | Confirm | **Review & confirm** | summary; each row taps back to edit | — | — | — | Triage badge, insurance/family summary. CTA "Confirm Check-In" |
| 14 | Done | **Success** | token + wait + family QR | — | — | — | Token #, est. wait, priority, family-tracking QR (if consent+phone), CTAs |

## 5. Symptom → department suggestion map

`suggestDepartments(symptoms: string[]): string[]` unions the mapped departments for all selected symptoms, de-duplicates, preserves a sensible priority order, and **defaults to `['General Medicine']`** when nothing maps.

| Symptom(s) | Suggested department |
|---|---|
| Chest Pain · Shortness of Breath | Cardiology |
| Headache · Dizziness | Neurology |
| Abdominal Pain · Nausea/Vomiting | Gastroenterology |
| Back Pain · Joint Pain | Orthopedics |
| Vision Issues | Ophthalmology |
| Hearing Issues · Difficulty Swallowing | ENT |
| Skin Rash | Dermatology |
| Fever · Cough · Fatigue | General Medicine |
| (anything unmapped / "Other") | General Medicine (default) |

The suggested set is shown as multi-select chips; **+ Other dept** opens the full 8-department list (searchable) and a free-text option.

## 6. Data model (flow state)

```ts
interface IntakeForm {
  method: 'type' | 'aadhaar' | 'voice'
  name: string
  phone: string
  age: string
  gender: 'Male' | 'Female' | 'Other'
  visitTypes: string[]          // multi-select; may include a typed "Other" value
  insuranceCardNo?: string
  insurer?: string
  symptoms: string[]            // multi-select; typed "Other" symptoms appended as plain strings
  departments: string[]         // multi-select; derived suggestions + typed/other
  hasReports: boolean
  dishaConsent: boolean
  familyPhone?: string
}
```

Transient per-screen state (e.g. the "Other" text input before it's committed into the array, voice transcript, scan animation state) lives inside the relevant step component, not the shared form.

## 7. Store mapping (on Confirm)

`usePatientStore.addPatient(...)` is called as today, mapping multi-select fields to the existing single-value contract for backward compatibility with downstream pages (reception queue, doctor consult, patient dashboard):

- `department` = `departments[0] ?? 'General Medicine'` (**primary**, keeps the existing `Patient.department: string` contract intact)
- `symptoms` = full `symptoms[]` (already an array; includes any typed "Other" values)
- `triageLevel` = `triageScore(symptoms).level`
- `estimatedWait` = unchanged formula (`(waiting+vitals count + 1) * 4`)
- Family QR: if `dishaConsent && familyPhone` → `generateFamilyToken(...)` (unchanged)

**Additive, front-end-only type extension** to `Patient` (so multi-select data isn't lost):

```ts
// usePatientStore.ts — all optional, non-breaking
departments?: string[]
visitTypes?: string[]
insurer?: string
```

## 8. Architecture

Replace today's monolithic ~1,050-line `page.tsx` with a small **data-driven flow** so the journey is configuration, not hard-coded markup.

```
src/
├── app/checkin/intake/page.tsx        # thin: renders <IntakeFlow/>
├── lib/intake/
│   ├── steps.ts                       # ordered step descriptors (id, phase, type, multi, required, showWhen, otherEnabled)
│   ├── departments.ts                 # SYMPTOM_DEPARTMENT_MAP + suggestDepartments()
│   ├── triage.ts                      # triageScore() (moved out of the page)
│   └── options.ts                     # VISIT_TYPES, SYMPTOMS, DEPARTMENTS, INSURERS
└── components/intake/
    ├── IntakeFlow.tsx                 # controller: form state (useReducer) + step index + back-stack + visible-step computation + validation + jump-to-edit
    ├── IntakeShell.tsx                # kiosk layout: logo, progress bar + "X of N", Back, scroll area, big footer CTA
    └── steps/
        ├── ChoiceStep.tsx             # single OR multi chips, optional "Other → text"
        ├── TextStep.tsx               # name (and generic text)
        ├── PhoneStep.tsx              # tel + live duplicate detection banner
        ├── NumberStep.tsx             # age
        ├── MethodStep.tsx             # Type/Scan/Speak chooser
        ├── AadhaarScanStep.tsx        # simulated scan + auto-fill
        ├── VoiceStep.tsx              # mic + extractIntakeFromVoice
        ├── InsuranceStep.tsx          # card no. + insurer (choice/Other)
        ├── ReviewStep.tsx             # summary + edit-jump
        └── SuccessStep.tsx            # token + QR + CTAs
```

**Controller responsibilities (`IntakeFlow`):**
- Hold `IntakeForm` (via `useReducer`) and `currentStepId`.
- Compute the **visible step list** by filtering `steps` through each step's `showWhen(form)` predicate (handles conditional Insurance/Family branches and the method sub-steps).
- `next()` / `back()` operate over the *visible* list; a **back-stack** records the path so back-navigation respects skipped steps.
- `goToStep(id)` powers Review-screen "edit" jumps (returns to Review after).
- Expose `canContinue` from the active step's validator to gate the footer CTA.

**`ChoiceStep` (the workhorse):** props `{ options, multi, value, onChange, otherEnabled, otherValue, onOtherChange }`. Renders chips as toggle buttons (`aria-pressed`); in multi mode keeps an array; the **Other** chip toggles a revealed text input whose value is committed into the selection on continue. Reused by visit-type, symptoms, department, insurer, gender (single mode).

## 9. Error handling & edge cases

- **Per-step gating:** required text non-empty; phone exactly 10 digits; age 1–120; multi-select ≥1; "Other" selected but empty text → block continue with inline message.
- **Duplicate phone match:** non-blocking amber banner with patient summary + explicit "Continue as new patient" (mirrors today's behavior, surfaced on the phone step).
- **Voice unsupported:** the Voice method option is hidden (as today); if a recognition error fires, fall back to idle with a retry.
- **Back navigation** correctly skips conditional steps that aren't applicable to the chosen branch.
- **Aadhaar/voice pre-fill** lands the user on the normal typed steps with values populated for confirmation (no silent submission).
- **Refresh** resets the flow (in-memory state) — unchanged from today; explicitly noted, not "fixed" (persistence is out of scope).

## 10. Accessibility & responsiveness

- Move focus to the step heading on each transition; announce step changes via an `aria-live="polite"` region ("Step 4 of 11 — Your age").
- Chips are real `<button>`s with `aria-pressed`; selection groups use `role="group"` + `aria-label`.
- ≥44px touch targets, visible focus rings, full keyboard operation, honor `prefers-reduced-motion` (reuse `useReducedMotion`).
- Retain the optional **large-text** ("elderly") mode as a flow-level toggle, not just on the voice screen.
- Layout: centered phone frame (`max-w-[420px]`) on desktop/kiosk, full-bleed on mobile (keep today's iOS-style shell aesthetics).

## 11. Verification

The repo currently has **no test runner**. Verification is a manual kiosk walkthrough of these scenarios (run the dev server, drive `/checkin/intake`):

1. **Simple OPD** — Type → name/phone/age/gender → New OPD → 1 symptom → suggested dept → skip reports → no family → confirm → token shown.
2. **Cashless** — visit-types include Cashless → Insurance step appears → card + insurer captured → review shows insurance.
3. **Critical triage** — pick "Chest Pain" → triage badge = Critical → department suggests Cardiology.
4. **Other everywhere** — tap *Other* on symptoms and department → text box appears → typed values flow into review + store.
5. **Multi-select** — pick 2 visit-types, 3 symptoms, 2 departments → all persist to review and `addPatient`.
6. **Aadhaar path** and **Voice path** — pre-fill works, lands on confirmable typed steps.
7. **Duplicate match** — entering an existing phone shows the banner; "Continue as new" proceeds.
8. **Family QR** — consent + phone → success screen renders a scannable family-tracking QR.
9. **Back/edit** — Review "edit" jumps to the right step and returns; back-stack skips inapplicable conditional steps.
10. **A11y/responsive** — keyboard-only completion; reduced-motion; mobile + kiosk widths.

*Optional (flag for the plan):* add Vitest + React Testing Library for the pure logic (`suggestDepartments`, `triageScore`, visible-step computation) and a couple of `ChoiceStep` interaction tests — only if the user wants a test harness introduced.

## 12. Open considerations (non-blocking)

- `visitTypes` multi-select can legitimately mix "nature" (Follow-up) and "payment mode" (Cashless); that's intended per request. If it later feels odd, payment mode could split into its own step.
- The broader overhaul still wants design tokens; the components built here should use a small, local color/space set that can be promoted to tokens during the foundation phase.
