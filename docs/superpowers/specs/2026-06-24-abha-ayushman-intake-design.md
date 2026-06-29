# ABHA + Ayushman Card Integration — Design Spec

**Date:** 2026-06-24
**Scope:** Mock-first integration of ABHA (digital health ID) and Ayushman Card (AB-PMJAY govt scheme) at the patient intake/check-in payment step, propagating downstream to admission, pre-auth, billing, and discharge.

---

## Context

The patient self-check-in flow (`/checkin` → `/checkin/intake`) ends at a `PaymentStep` where the patient chooses how to pay for their consultation. Currently, the step supports **Self-pay** and **Cashless (private insurance)**. This spec adds a third path: **Govt Scheme (ABHA / Ayushman Card)**, which makes the consultation cashless under AB-PMJAY or a state scheme (CMHIS-UP).

Entry point: `src/components/intake/ConsultSteps.tsx` → `PaymentStep`

---

## 1. Data Model

### `src/lib/intake/data.ts`

Extend `Payer` union:
```ts
export type Payer = '' | 'self' | 'cashless' | 'govtScheme'
```

Add four fields to `IntakeForm`:
```ts
abhaId: string              // "14-XXXX-XXXX-XXXX"
ayushmanCardNo: string      // Family ID / Beneficiary ID e.g. "UP-2024-XXXXXXXX"
govtSchemeVerified: boolean
schemeName: string          // "AB-PMJAY" | "CMHIS-UP" — populated by mock verify
```

Initialise all four to `''` / `false` / `''` in `initialForm()`.

Extend `canContinue` for `'payment'`:
```ts
case 'payment':
  if (form.payer === 'govtScheme') return form.govtSchemeVerified
  if (form.payer === 'cashless')   return form.insuranceVerified
  return form.payer === 'self' && !!form.payMethod
```

### `src/store/usePatientProfileStore.ts`

`abhaId?: string` already exists on the patient type — no change needed. Intake `handleSubmit` will populate it when `payer === 'govtScheme'`.

### Downstream stores

| Store | Change |
|---|---|
| `usePatientStore` | Set `insurer: form.schemeName` when govt scheme |
| `useBillingStore` | `payerType` stored as `'Cashless (AB-PMJAY)'` |
| `useAdmissionStore` | No type change — badge derived from `payerType` string |
| `useDischargeStore` | No change — ABHA/pre-auth ref shown conditionally in UI |

---

## 2. Mock Eligibility Service

**New file:** `src/lib/intake/abha-mock.ts`

```ts
export interface AbhaEligibilityResult {
  eligible: boolean
  schemeName: 'AB-PMJAY' | 'CMHIS-UP' | ''
  coverage: string          // e.g. "Covered up to ₹5,00,000/year"
  preAuthRef: string        // e.g. "PMJAY-PRE-8472910"
}

export async function checkAbhaEligibility(
  abhaId: string,
  ayushmanCardNo: string
): Promise<AbhaEligibilityResult>
```

Mock logic: 1200ms delay, returns eligible for any input where both fields pass minimum length. Returns `schemeName: 'CMHIS-UP'` if `ayushmanCardNo` starts with `UP-`, otherwise `'AB-PMJAY'`. Returns not-eligible for any ABHA ID starting with `00-`.

---

## 3. UI — PaymentStep Changes

File: `src/components/intake/ConsultSteps.tsx`

### Payer tile grid

Add a third tile:
```
[ Self-pay ]   [ Cashless (Insurance) ]   [ Govt Scheme ]
```
`govtScheme` tile uses `ShieldCheck` icon (same as cashless) in green tint when selected.

### Govt Scheme panel (expands when `form.payer === 'govtScheme'`)

1. **ABHA ID field**
   - Placeholder: `14-XXXX-XXXX-XXXX`
   - Auto-formats: inserts `-` at char positions 2 and 6 as user types
   - Tooltip icon with text: "14-digit Ayushman Bharat Health Account number from your ABHA card or DigiLocker"
   - On change: reset `govtSchemeVerified: false`

2. **Ayushman Card / Family ID field**
   - Placeholder: `Family ID / Beneficiary ID`
   - On change: reset `govtSchemeVerified: false`

3. **Verify button**
   - Enabled when `abhaId.length >= 8 && ayushmanCardNo.length >= 6`
   - Loading state: "Checking with NHA…"
   - Calls `checkAbhaEligibility(form.abhaId, form.ayushmanCardNo)`

4. **Verified state** (green card)
   - Shows scheme name, coverage string
   - Fee display in top card changes to `Cashless · {schemeName}`

5. **Not eligible state** (red card)
   - Message: "Beneficiary not found — check your card number"
   - Two inline actions: "Try Aadhaar-linked search" (shows Aadhaar field, mock-verifies same way) and "Pay myself instead" (resets `payer: 'self'`)

---

## 4. IntakeFlow Submit — `src/components/intake/IntakeFlow.tsx`

In `handleSubmit`, when `form.payer === 'govtScheme'`:

```ts
addPatient({
  ...existingFields,
  insurer: form.schemeName,              // "AB-PMJAY" or "CMHIS-UP"
})
// Persist ABHA ID to profile store (uses existing saveProfile action)
usePatientProfileStore.getState().saveProfile(
  newId,
  { ...emptyProfile(), abhaId: form.abhaId, payerType: 'Govt scheme' },
  form.name
)
```

Notification to reception includes scheme name: `"Govt scheme: ${form.schemeName} · ABHA verified"`.

---

## 5. Downstream UI Changes

### Admission dashboard (`src/app/admission/dashboard/`)

Where payer type is rendered (line ~273), add conditional badge:
```tsx
{req.payerType?.includes('AB-PMJAY') || req.insurer?.includes('PMJAY') && (
  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
    Ayushman
  </span>
)}
```

### Insurance pre-auth (`src/app/insurance/preauth/`)

Add a second section below the existing private insurance list:

**"Govt Scheme Pre-Auth (Ayushman)"** — lists pending admissions where `insurer` includes `PMJAY`. Each card shows ABHA ID, scheme name, pre-auth ref. Submit button generates `PMJAY-PRE-XXXXXXX` reference (mock). Reuses existing `HitlReviewCard` pattern.

### Billing patient page (`src/app/billing/patient/[id]/`)

No structural change. `payerType: 'Cashless (AB-PMJAY)'` is already handled by the finance page's payer grouping fallback.

### Discharge dashboard (`src/app/discharge/`)

In the patient detail section, conditionally show two extra fields when `payerType` includes `AB-PMJAY`:
- ABHA ID (from patient profile)
- Pre-auth ref (from admission record)

---

## 6. New Files

| File | Purpose |
|---|---|
| `src/lib/intake/abha-mock.ts` | Mock eligibility check function |

## 7. Modified Files

| File | Change |
|---|---|
| `src/lib/intake/data.ts` | Add `govtScheme` payer type + 4 new form fields |
| `src/components/intake/ConsultSteps.tsx` | Add govt scheme tile + ABHA/Ayushman panel in `PaymentStep` |
| `src/components/intake/IntakeFlow.tsx` | Propagate scheme fields on submit |
| `src/app/admission/dashboard/page.tsx` | Ayushman badge on payer display |
| `src/app/insurance/preauth/page.tsx` | Ayushman pre-auth section |
| `src/app/discharge/dashboard/page.tsx` | ABHA ID + pre-auth ref in summary |

---

## Out of Scope

- Real ABDM / NHA API calls (mock-first; real API wired when sandbox credentials available)
- ABHA number creation / registration (patient must already have ABHA)
- Claim settlement tracking beyond pre-auth reference display
- State-level scheme variations beyond AB-PMJAY and CMHIS-UP
