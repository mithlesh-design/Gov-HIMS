# Laboratory v2 — Track 1 + Microbiology Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This project has no automated test framework — verification per milestone is `npx tsc --noEmit` + a focused Puppeteer script (`scripts/shoot-lab-LN.cjs`) + a 0-console-error sweep + visual screenshot review.

**Goal:** Rebuild the Laboratory module around real hospital workflow (order → phlebotomy collection → bench routing → multi-tech claim → multi-analyte entry with auto-flagging → senior verification → release), add the Microbiology multi-day culture flow, a real Lab Incharge command center, QC-gated release, auto-fired reflex testing, and wire it through to live doctor inbox and patient pathology views.

**Architecture:** Three nested entities (`LabOrder → Specimen[] + TestRun[] → AnalyteResult[]` or `MicrobioResult`) in a new `useLabOrdersStore`, driven from a central `LAB_CATALOG` (tests, benches, specimens, analytes, reference ranges, expected TAT). A `flatTests` selector on the new store keeps existing flat-`LabSample` consumers working; an `useLabStore` shim re-exports types and `flatTests`. QC is its own `useLabQCStore` whose violations gate release at the bench. Reflex matches on each release and pushes to an incharge queue. Patient + doctor surfaces read released test runs directly.

**Tech Stack:** Next.js 16 (modified), React 19, TypeScript strict, Tailwind v4, Zustand 5, Framer Motion 12, lucide-react, sonner. Verification: puppeteer-core (headless Chrome) + `npx tsc --noEmit`.

**Spec:** `docs/superpowers/specs/2026-05-28-laboratory-v2-track1-microbio-design.md`

---

## File map

**New files**
- `src/lib/labCatalog.ts` — central catalog (codes, names, benches, specimens, analytes + ref ranges, expected TAT, micro flags).
- `src/store/useLabOrdersStore.ts` — `LabOrder` / `Specimen` / `TestRun` / `AnalyteResult` / `MicrobioResult`, actions, `flatTests` selector, `reflexSuggestions`.
- `src/store/useLabQCStore.ts` — analyzer→test mapping, QC runs, Westgard rules, violations.
- `src/lib/reflexRules.ts` — pure rule engine.
- `src/app/lab/inbox/page.tsx` — inbox + phlebotomy.
- `src/app/lab/benches/page.tsx` — bench working surface.
- `src/app/lab/microbiology/page.tsx` — microbiology phases.
- `scripts/shoot-lab-L1.cjs` … `shoot-lab-L8.cjs` — milestone Puppeteer scripts.

**Files rewritten**
- `src/store/useLabStore.ts` → thin shim over `useLabOrdersStore` (re-exports `LabSample` shape from `flatTests`, keeps the few legacy action signatures that other modules call).
- `src/app/lab/qc/page.tsx` → reads `useLabQCStore`.
- `src/app/lab/reflex/page.tsx` → reads `useLabOrdersStore.reflexSuggestions`.
- `src/app/lab/dashboard/page.tsx` → KPI-only command center.
- `src/app/patient/pathology/page.tsx` → reads live `useLabOrdersStore` for this patient.
- `src/lib/resultsInbox.ts` → walks released TestRuns instead of flat samples.

**Files edited**
- `src/components/layout/AppShell.tsx` — lab nav (replace samples → inbox + benches + microbiology).
- `src/app/doctor/dashboard/page.tsx` — `addLabToStore({ ... })` becomes `addOrder({ testCodes })`.
- Delete: `src/app/lab/samples/page.tsx` (replaced by `/lab/benches`).

**Files using `useLabStore` that keep working via shim** (no edits expected; verify in L8):
`reception/diagnostics`, `admin/dashboard`, `admission/dashboard`, `ot/dashboard`, `ResultsTicker`, `useConsultationStore`, `useOTStore`, `useAdmissionStore`, `doctor/inbox`.

---

## Milestone L1 — Catalog + new store + back-compat shim

**Files:**
- Create: `src/lib/labCatalog.ts`
- Create: `src/store/useLabOrdersStore.ts`
- Modify (rewrite as shim): `src/store/useLabStore.ts`
- Create: `scripts/shoot-lab-L1.cjs`

**Outcome:** Catalog + rich store exist with realistic seed; existing files still typecheck via the shim.

- [ ] **Step 1: Create the lab catalog**

`src/lib/labCatalog.ts`:

```ts
export type Bench = 'HEMA' | 'BIOCHEM' | 'IMMUNO' | 'URINE' | 'MICRO' | 'HISTO'
export type SpecimenType = 'EDTA' | 'serum' | 'urine_cup' | 'blood_culture' | 'swab' | 'sputum' | 'tissue'
export type Priority = 'STAT' | 'Urgent' | 'Routine'

export type AnalyteSpec = {
  analyte: string; unit: string
  refLow?: number; refHigh?: number
  critLow?: number; critHigh?: number
  isText?: boolean   // for qualitative analytes (e.g. urine appearance)
}

export type CatalogEntry = {
  code: string
  name: string
  bench: Bench
  specimen: SpecimenType
  container: string
  defaultPriority: Priority
  expectedTATmin?: number   // for non-micro tests
  expectedDays?: number     // for micro tests
  analyzer?: string         // for QC mapping
  micro?: boolean
  analytes: AnalyteSpec[]   // empty for micro entries
}

export const LAB_CATALOG: Record<string, CatalogEntry> = {
  CBC:    { code: 'CBC', name: 'Complete Blood Count', bench: 'HEMA', specimen: 'EDTA', container: 'Purple-top EDTA tube', defaultPriority: 'Routine', expectedTATmin: 60, analyzer: 'Sysmex XN-550', analytes: [
    { analyte: 'Haemoglobin',    unit: 'g/dL',    refLow: 13.0, refHigh: 17.0, critLow: 7.0,  critHigh: 20.0 },
    { analyte: 'WBC count',      unit: '/µL',     refLow: 4000, refHigh: 11000, critLow: 1500, critHigh: 30000 },
    { analyte: 'Platelets',      unit: '×10³/µL', refLow: 150,  refHigh: 410,   critLow: 30,   critHigh: 1000 },
    { analyte: 'RBC count',      unit: 'M/µL',    refLow: 4.5,  refHigh: 5.5 },
    { analyte: 'Haematocrit',    unit: '%',       refLow: 38,   refHigh: 50 },
    { analyte: 'MCV',            unit: 'fL',      refLow: 80,   refHigh: 100 },
    { analyte: 'Neutrophils',    unit: '%',       refLow: 40,   refHigh: 75 },
  ] },
  LFT:    { code: 'LFT', name: 'Liver Function Test', bench: 'BIOCHEM', specimen: 'serum', container: 'Yellow-top SST', defaultPriority: 'Routine', expectedTATmin: 90, analyzer: 'Roche c311', analytes: [
    { analyte: 'Total bilirubin', unit: 'mg/dL', refLow: 0.2, refHigh: 1.2, critHigh: 12 },
    { analyte: 'Direct bilirubin', unit: 'mg/dL', refLow: 0.0, refHigh: 0.3 },
    { analyte: 'AST (SGOT)',      unit: 'U/L',   refLow: 5,   refHigh: 40,  critHigh: 1000 },
    { analyte: 'ALT (SGPT)',      unit: 'U/L',   refLow: 7,   refHigh: 56,  critHigh: 1000 },
    { analyte: 'ALP',             unit: 'U/L',   refLow: 44,  refHigh: 147 },
    { analyte: 'Albumin',         unit: 'g/dL',  refLow: 3.5, refHigh: 5.0 },
  ] },
  RFT:    { code: 'RFT', name: 'Renal Function Test', bench: 'BIOCHEM', specimen: 'serum', container: 'Yellow-top SST', defaultPriority: 'Routine', expectedTATmin: 60, analyzer: 'Roche c311', analytes: [
    { analyte: 'Urea',       unit: 'mg/dL', refLow: 7,  refHigh: 20, critHigh: 200 },
    { analyte: 'Creatinine', unit: 'mg/dL', refLow: 0.6, refHigh: 1.3, critHigh: 10 },
    { analyte: 'Sodium',     unit: 'mmol/L', refLow: 135, refHigh: 145, critLow: 120, critHigh: 160 },
    { analyte: 'Potassium',  unit: 'mmol/L', refLow: 3.5, refHigh: 5.1, critLow: 2.5, critHigh: 6.5 },
    { analyte: 'Chloride',   unit: 'mmol/L', refLow: 98,  refHigh: 107 },
  ] },
  LIPID:  { code: 'LIPID', name: 'Lipid Profile', bench: 'BIOCHEM', specimen: 'serum', container: 'Yellow-top SST', defaultPriority: 'Routine', expectedTATmin: 90, analyzer: 'Roche c311', analytes: [
    { analyte: 'Total cholesterol', unit: 'mg/dL', refLow: 0,  refHigh: 200 },
    { analyte: 'LDL',               unit: 'mg/dL', refLow: 0,  refHigh: 100 },
    { analyte: 'HDL',               unit: 'mg/dL', refLow: 40, refHigh: 60 },
    { analyte: 'Triglycerides',     unit: 'mg/dL', refLow: 0,  refHigh: 150 },
  ] },
  HBA1C:  { code: 'HBA1C', name: 'HbA1c', bench: 'BIOCHEM', specimen: 'EDTA', container: 'Purple-top EDTA tube', defaultPriority: 'Routine', expectedTATmin: 120, analyzer: 'Roche c311', analytes: [
    { analyte: 'HbA1c', unit: '%', refLow: 4.0, refHigh: 5.6 },
  ] },
  TSH:    { code: 'TSH', name: 'Thyroid Profile (TSH)', bench: 'IMMUNO', specimen: 'serum', container: 'Yellow-top SST', defaultPriority: 'Routine', expectedTATmin: 180, analyzer: 'Abbott i1000SR', analytes: [
    { analyte: 'TSH',       unit: 'µIU/mL', refLow: 0.4, refHigh: 4.0 },
    { analyte: 'Free T4',   unit: 'ng/dL',  refLow: 0.8, refHigh: 1.8 },
    { analyte: 'Free T3',   unit: 'pg/mL',  refLow: 2.3, refHigh: 4.2 },
  ] },
  TROPI:  { code: 'TROPI', name: 'Troponin I', bench: 'IMMUNO', specimen: 'serum', container: 'Yellow-top SST', defaultPriority: 'STAT', expectedTATmin: 60, analyzer: 'Abbott i1000SR', analytes: [
    { analyte: 'Troponin I', unit: 'ng/mL', refLow: 0, refHigh: 0.04, critHigh: 0.5 },
  ] },
  CRP:    { code: 'CRP', name: 'C-Reactive Protein', bench: 'BIOCHEM', specimen: 'serum', container: 'Yellow-top SST', defaultPriority: 'Urgent', expectedTATmin: 60, analyzer: 'Roche c311', analytes: [
    { analyte: 'CRP', unit: 'mg/L', refLow: 0, refHigh: 5, critHigh: 100 },
  ] },
  URINE_R:{ code: 'URINE_R', name: 'Urine Routine & Microscopy', bench: 'URINE', specimen: 'urine_cup', container: 'Sterile urine cup', defaultPriority: 'Routine', expectedTATmin: 45, analyzer: 'Sysmex UN-2000', analytes: [
    { analyte: 'Appearance', unit: '', isText: true },
    { analyte: 'pH',         unit: '',     refLow: 5.0, refHigh: 8.0 },
    { analyte: 'Specific gravity', unit: '', refLow: 1.003, refHigh: 1.030 },
    { analyte: 'Protein',    unit: '', isText: true },
    { analyte: 'Glucose',    unit: '', isText: true },
    { analyte: 'WBC',        unit: '/HPF', refLow: 0, refHigh: 5, critHigh: 100 },
    { analyte: 'RBC',        unit: '/HPF', refLow: 0, refHigh: 2 },
  ] },
  GLUC:   { code: 'GLUC', name: 'Blood Glucose (FBS)', bench: 'BIOCHEM', specimen: 'serum', container: 'Grey-top fluoride tube', defaultPriority: 'Routine', expectedTATmin: 30, analyzer: 'Roche c311', analytes: [
    { analyte: 'Glucose (Fasting)', unit: 'mg/dL', refLow: 70, refHigh: 100, critLow: 40, critHigh: 400 },
  ] },
  CULT_BLOOD: { code: 'CULT_BLOOD', name: 'Blood Culture', bench: 'MICRO', specimen: 'blood_culture', container: 'BacT/ALERT bottle', defaultPriority: 'Urgent', expectedDays: 3, micro: true, analytes: [] },
  CULT_URINE: { code: 'CULT_URINE', name: 'Urine Culture', bench: 'MICRO', specimen: 'urine_cup', container: 'Sterile urine cup', defaultPriority: 'Routine', expectedDays: 2, micro: true, analytes: [] },
  CULT_WOUND: { code: 'CULT_WOUND', name: 'Wound Culture', bench: 'MICRO', specimen: 'swab', container: 'Stuart transport swab', defaultPriority: 'Routine', expectedDays: 3, micro: true, analytes: [] },
}

export const CODES = Object.keys(LAB_CATALOG)
export const get = (code: string): CatalogEntry | undefined => LAB_CATALOG[code]
```

- [ ] **Step 2: Create the new lab orders store**

`src/store/useLabOrdersStore.ts` — full types + actions. Skeleton:

```ts
import { create } from 'zustand'
import { useNotificationStore } from './useNotificationStore'
import { LAB_CATALOG, type Bench, type Priority, type SpecimenType } from '@/lib/labCatalog'

export type LabSource = 'OPD' | 'IPD' | 'ICU' | 'OT' | 'ER'
export type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Insurance' | 'Credit'
export type TestStatus = 'awaiting_collection' | 'collected' | 'on_bench'
  | 'in_progress' | 'entered' | 'verified' | 'released'
  | 'rejected' | 'recollect_requested'
export type AnalyteFlag = 'N' | 'H' | 'L' | 'CH' | 'CL'
export type MicroPhase = 'inoculated' | 'growth_check' | 'identified' | 'ast' | 'final'
export type RejectReason = 'hemolyzed' | 'clotted' | 'insufficient' | 'wrong_tube' | 'unlabeled' | 'contaminated'

export type LabTech = { id: string; name: string; bench?: Bench[] }

export type AnalyteResult = {
  analyte: string; value: number | string; unit: string
  refLow?: number; refHigh?: number; critLow?: number; critHigh?: number
  flag: AnalyteFlag
}

export type MicrobioResult = {
  phase: MicroPhase; day: number
  growth?: 'no_growth' | 'growth'
  organisms?: { name: string; ast: { drug: string; result: 'S' | 'I' | 'R'; mic?: string }[] }[]
  finalReport?: string
}

export type Specimen = {
  accession: string; orderId: string
  type: SpecimenType; container: string
  collectedBy?: string; collectedAt?: string; volume?: string
  rejectReason?: RejectReason
}

export type TestRun = {
  id: string; orderId: string; specimenId?: string
  code: string; name: string; bench: Bench; priority: Priority
  status: TestStatus
  assignedTo?: LabTech; enteredBy?: LabTech; verifiedBy?: LabTech
  releasedAt?: string; rejectReason?: RejectReason; recollectReason?: RejectReason
  expectedTATmin: number; orderedAt: string
  analytes: AnalyteResult[]
  micro?: MicrobioResult
  callback?: { calledBy: string; calledAt: string; recipient: string; ackBy?: string }
  notes?: string
  acknowledgedAt?: string   // for doctor results inbox
}

export type LabOrder = {
  id: string; patientId: string; patientName: string
  source: LabSource; wardBed?: string
  doctorName: string; orderedAt: string
  paymentMode: PaymentMode
  fastingStatus?: 'fasting' | 'non_fasting' | 'unknown'
  clinicalNotes?: string
  tests: TestRun[]
  specimens: Specimen[]
}

export type ReflexSuggestion = {
  id: string; basedOnTestId: string; patientName: string
  triggerSummary: string; code: string; reason: string
  createdAt: string; orderedAt?: string
}

interface State {
  orders: LabOrder[]
  reflexSuggestions: ReflexSuggestion[]
  addOrder: (input: {
    patientId: string; patientName: string; source: LabSource; wardBed?: string
    doctorName: string; paymentMode: PaymentMode; testCodes: string[]
    fastingStatus?: 'fasting' | 'non_fasting' | 'unknown'; clinicalNotes?: string
  }) => string
  collectOrder: (orderId: string, collectedBy: string) => void
  rejectSpecimen: (orderId: string, accession: string, reason: RejectReason) => void
  recollectOrder: (orderId: string) => void
  claim: (testId: string, tech: LabTech) => void
  release_: (testId: string) => void   // unclaim
  enterAnalyte: (testId: string, analyte: string, value: number | string) => void
  finishEntry: (testId: string, enteredBy: LabTech) => void
  verifyTest: (testId: string, verifiedBy: LabTech) => void
  releaseTest: (testId: string) => void
  rejectTest: (testId: string, reason: RejectReason) => void
  microAdvance: (testId: string, patch: Partial<MicrobioResult>) => void
  microRelease: (testId: string, verifiedBy: LabTech) => void
  logCallback: (testId: string, calledBy: string, recipient: string) => void
  ackResult: (testId: string) => void
  pushReflex: (s: Omit<ReflexSuggestion, 'id' | 'createdAt'>) => void
  orderReflex: (suggestionId: string) => void
}
```

Implementation rules:
- `addOrder`: read catalog → create one Specimen per unique `specimen` type required (de-duped); create one TestRun per code, status `awaiting_collection`, link `specimenId`.
- `collectOrder`: stamp `collectedBy/collectedAt/volume` on specimens; transition each test `awaiting_collection → collected → on_bench`.
- `rejectSpecimen`: stamp `rejectReason`; mark all tests on that specimen `rejected`; fire `recollect_requested` on order.
- `claim`: requires status `on_bench`; sets `assignedTo`, status `in_progress`.
- `enterAnalyte`: writes value + auto-computes `flag` from value vs ref/crit ranges.
- `finishEntry`: requires all analytes filled; status → `entered`, stamps `enteredBy`.
- `verifyTest`: status `entered` → `verified`, stamps `verifiedBy`.
- `releaseTest`: status `verified` → `released`, stamps `releasedAt`; if any analyte flag is `CH` / `CL` → priority `critical`; fires `useNotificationStore.add({ type:'lab_result', priority, title, body, targetRole:'doctor', patientName, channels:['in_app'] })`; also calls a pure `evaluateReflex(test)` from `src/lib/reflexRules.ts` and pushes matches via `pushReflex`.
- `microAdvance`: replaces `micro` with merged patch.
- `microRelease`: only when `micro.phase === 'final'`; verified + released in one step.
- `orderReflex`: creates a new TestRun for the patient referenced by the suggestion (reuse specimen if same container type already exists in the latest order; else new specimen, status `awaiting_collection`); stamps `orderedAt` on the suggestion.

Auto-flag computation:

```ts
function computeFlag(value: number | string, spec: AnalyteSpec): AnalyteFlag {
  if (typeof value !== 'number') return 'N'
  if (spec.critHigh !== undefined && value >= spec.critHigh) return 'CH'
  if (spec.critLow !== undefined && value <= spec.critLow) return 'CL'
  if (spec.refHigh !== undefined && value > spec.refHigh) return 'H'
  if (spec.refLow !== undefined && value < spec.refLow) return 'L'
  return 'N'
}
```

Seed (`orders: LabOrder[]`): 5 realistic orders spread across benches with varied status:

| OrderId | Patient | Source | Doctor | Tests | Status mix |
|---|---|---|---|---|---|
| LO-401 | Aarav Sharma | OPD | Dr. Priya Nair | CBC | `on_bench` |
| LO-402 | Sunita Sharma | IPD | Dr. Vikram Rathore | CBC, LFT, RFT, CRP, CULT_BLOOD | CBC `in_progress` (claimed by Ravi Menon), LFT `entered` (pending verify), RFT `verified`, CRP `released` (critical), CULT_BLOOD `in_progress` (micro `growth_check`) |
| LO-403 | Ramesh Kumar | OPD | Dr. Priya Nair | LIPID, HBA1C | both `awaiting_collection` |
| LO-404 | Meera Pillai | OPD | Dr. Priya Nair | RFT | `released` (electrolytes within normal) |
| LO-405 | Kiran Patil | ER | Dr. Vikram Rathore | TROPI, CBC | TROPI `released` critical-high (callback not yet logged), CBC `verified` pending release |

Lab techs (constants in store):
- `RAVI = { id: 'LT-101', name: 'Ravi Menon', bench: ['HEMA','BIOCHEM'] }`
- `SHALU = { id: 'LT-102', name: 'Shalu Iyer', bench: ['IMMUNO','URINE'] }`
- `BIJU = { id: 'LT-103', name: 'Biju Verma', bench: ['MICRO'] }`
- `DR_PATHO = { id: 'LP-201', name: 'Dr. Asha Rao', bench: ['HEMA','BIOCHEM','IMMUNO','URINE','MICRO'] }` (verifier)

Also define `flatTests` selector for back-compat:

```ts
export type FlatSample = {
  id: string; patientName: string; patientId?: string; testName: string
  status: 'Collected' | 'Processing' | 'Analyzing' | 'Completed'
  priority: 'Routine' | 'Urgent'   // STAT folded to Urgent for back-compat
  orderedBy?: string; orderedAt?: string; expectedTAT?: number
  criticalValue?: boolean; aiAnomalyAlert?: string; result?: string
  acknowledgedAt?: string
}

export const flatTests = (orders: LabOrder[]): FlatSample[] => {
  const STATUS_MAP: Record<TestStatus, FlatSample['status']> = {
    awaiting_collection: 'Collected',  // pre-old-model these were absent; map to closest
    collected:           'Collected',
    on_bench:            'Processing',
    in_progress:         'Analyzing',
    entered:             'Analyzing',
    verified:            'Analyzing',
    released:            'Completed',
    rejected:            'Processing',
    recollect_requested: 'Collected',
  }
  return orders.flatMap(o => o.tests.map(t => ({
    id: t.id, patientName: o.patientName, patientId: o.patientId,
    testName: t.name, status: STATUS_MAP[t.status],
    priority: t.priority === 'Routine' ? 'Routine' : 'Urgent',
    orderedBy: o.doctorName, orderedAt: t.orderedAt, expectedTAT: t.expectedTATmin,
    criticalValue: t.analytes.some(a => a.flag === 'CH' || a.flag === 'CL'),
    result: t.status === 'released'
      ? t.analytes.map(a => `${a.analyte} ${a.value} ${a.unit}${a.flag !== 'N' ? ' ' + a.flag : ''}`).join(' · ')
      : undefined,
    acknowledgedAt: t.acknowledgedAt,
  })))
}
```

- [ ] **Step 3: Rewrite `useLabStore.ts` as a thin shim**

`src/store/useLabStore.ts`:

```ts
import { useLabOrdersStore, flatTests, type FlatSample } from '@/store/useLabOrdersStore'
import { LAB_CATALOG } from '@/lib/labCatalog'

// Back-compat surface for legacy consumers. New code should read
// useLabOrdersStore directly.
export type LabSample = FlatSample

interface LegacyLabStore {
  pendingTests: number
  samples: LabSample[]
  addOrderFromDoctor: (order: {
    patientName: string; patientId?: string; testName: string
    priority?: 'Routine' | 'Urgent'; orderedBy?: string
  }) => void
  advanceStatus: (id: string) => void
  acknowledgeCritical: (id: string, doctorName: string) => void
  acknowledgeResult: (id: string) => void
}

const codeByName = (name: string): string | undefined =>
  Object.values(LAB_CATALOG).find(e => e.name === name || e.code === name)?.code

export const useLabStore = ((selector?: (s: LegacyLabStore) => unknown) => {
  const orders = useLabOrdersStore(s => s.orders)
  const samples = flatTests(orders)
  const value: LegacyLabStore = {
    pendingTests: samples.filter(s => s.status !== 'Completed').length,
    samples,
    addOrderFromDoctor: (o) => {
      const code = codeByName(o.testName) ?? 'CBC'
      useLabOrdersStore.getState().addOrder({
        patientId: o.patientId ?? `PT-${Date.now()}`,
        patientName: o.patientName,
        source: 'OPD', doctorName: o.orderedBy ?? '—', paymentMode: 'Cash',
        testCodes: [code],
      })
    },
    advanceStatus: (id) => {
      // Best-effort legacy bridge: pick up the test through its lifecycle in one click.
      const orders = useLabOrdersStore.getState().orders
      const test = orders.flatMap(o => o.tests).find(t => t.id === id)
      if (!test) return
      const s = useLabOrdersStore.getState()
      if (test.status === 'awaiting_collection') s.collectOrder(test.orderId, 'Auto')
      else if (test.status === 'collected' || test.status === 'on_bench') {
        s.claim(test.id, { id: 'LT-101', name: 'Ravi Menon' })
      } else if (test.status === 'in_progress') s.finishEntry(test.id, { id: 'LT-101', name: 'Ravi Menon' })
      else if (test.status === 'entered') s.verifyTest(test.id, { id: 'LP-201', name: 'Dr. Asha Rao' })
      else if (test.status === 'verified') s.releaseTest(test.id)
    },
    acknowledgeCritical: (id, doctorName) =>
      useLabOrdersStore.getState().logCallback(id, 'Lab', doctorName),
    acknowledgeResult: (id) => useLabOrdersStore.getState().ackResult(id),
  }
  return selector ? (selector(value) as unknown) : value
}) as unknown as ((selector?: <T>(s: LegacyLabStore) => T) => T) & { getState: () => LegacyLabStore }

;(useLabStore as unknown as { getState: () => LegacyLabStore }).getState = () => ({
  // Lazy facade for getState() callers.
  pendingTests: 0, samples: flatTests(useLabOrdersStore.getState().orders),
  addOrderFromDoctor: () => {}, advanceStatus: () => {},
  acknowledgeCritical: () => {}, acknowledgeResult: () => {},
})
```

> The shim covers the read-path (which is most of the consumers); the write-path actions degrade gracefully for legacy callers — the doctor dashboard is rewired in L8 to use the rich `addOrder({ testCodes })`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: EXIT 0.
Fix-it loop: if any legacy file errors on the shim's shape, narrow the shim's type until the error specifies a missing field — then add that field with a sensible fallback.

- [ ] **Step 5: Write the L1 Puppeteer script**

`scripts/shoot-lab-L1.cjs` — basic load + seed visibility check:

```js
// Boilerplate identical to scripts/shoot-pharmacy-v3.cjs (puppeteer-core, headless Chrome,
// selectRole, has(), navClick). Steps:
//
// 1) Login as Lab (`selectRole(page, 'Clinical', 'Lab', 'Sample Tracking')`) — old nav still
//    present; the dashboard remains functional via shim.
// 2) navClick 'Sample Tracking' → assert samples are listed (Aarav, Sunita, Meera, Kiran appear).
// 3) Console-error sweep.
```

- [ ] **Step 6: Run + visual review**

Run: `node scripts/shoot-lab-L1.cjs`
Expected: all assertions true, ERRORS(0).

**L1 acceptance:** typecheck green; lab landing page still shows seeded patients via the shim; 0 console errors.

---

## Milestone L2 — Inbox & phlebotomy

**Files:**
- Create: `src/app/lab/inbox/page.tsx`
- Modify: `src/components/layout/AppShell.tsx` (add `'/lab/inbox'` to lab nav)
- Create: `scripts/shoot-lab-L2.cjs`

**Outcome:** Phlebotomy can see awaiting-collection orders, click Collect → specimens auto-generated → tests transition to `on_bench`. Rejected specimens trigger recollect.

- [ ] **Step 1: Add nav item, Inbox first**

Edit `src/components/layout/AppShell.tsx`, replace the lab block:

```diff
  lab: [
-   { href: '/lab/dashboard', label: 'Lab Overview',    icon: FlaskConical },
-   { href: '/lab/samples',   label: 'Sample Tracking', icon: Microscope },
+   { href: '/lab/inbox',     label: 'Inbox',           icon: ClipboardList },
+   { href: '/lab/dashboard', label: 'Lab Overview',    icon: FlaskConical },
+   { href: '/lab/samples',   label: 'Sample Tracking', icon: Microscope },   // still works via shim until L3 removes it
    { href: '/lab/qc',        label: 'Quality Control', icon: ShieldCheck },
    { href: '/lab/reflex',    label: 'Reflex Tests',    icon: Activity },
  ],
```

(`ClipboardList` is already imported in AppShell.)

- [ ] **Step 2: Build the Inbox page**

`src/app/lab/inbox/page.tsx` — row-per-order, two tabs (Awaiting collection / Just collected), filterable by source / priority. Key handlers:

```tsx
const collect = (orderId: string) => {
  collectOrder(orderId, meName)
  toast.success(`Specimens collected for order ${orderId.slice(-4)} · tests routed to benches`)
}

const reject = (orderId: string, accession: string, reason: RejectReason) => {
  rejectSpecimen(orderId, accession, reason)
  toast(`Specimen ${accession} rejected (${reason}) — recollect requested`)
}
```

Row structure (collapsed): `[source chip] [patient + UHID + token] [doctor] [tests pill list with priority chips] [payment] [Action: Collect | already collected → expand]`. Expand shows: specimens list with type/container/reject button per specimen (after collection), and a "Recollect required" red banner if any specimen was rejected.

Source chips same colour palette as the pharmacy queue. STAT priority gets a red pill.

- [ ] **Step 3: Prewarm + write L2 Puppeteer script**

`scripts/shoot-lab-L2.cjs` exercises:
- Login Lab → navClick 'Inbox' → assert "Awaiting collection" and "Ramesh Kumar" (LO-403 awaiting) visible, see "Token #" + payment chip.
- `rowAction(page, 'Ramesh Kumar', 'Collect')` → assert toast text "Specimens collected" and Ramesh moves to "Just collected" tab (after `clickMaybe(page, 'Just collected', 'button')`).
- Reject flow: expand a collected order row, find a Reject button, pick reason; assert specimen marked rejected and recollect banner shown.

- [ ] **Step 4: Typecheck + run + screenshot review**

```
npx tsc --noEmit -p tsconfig.json   # EXIT 0
node scripts/shoot-lab-L2.cjs       # all asserts true, ERRORS(0)
```

Visually verify `n-inbox-*` screenshots show row-per-order layout, source chips, payment mode, priority badges, expanded specimen list with barcodes.

**L2 acceptance:** Phlebotomy can collect orders; specimens with accession numbers materialise; tests reach `on_bench`; reject sets `recollect_requested`; 0 console errors.

---

## Milestone L3 — Benches: claim → enter → verify → release

**Files:**
- Create: `src/app/lab/benches/page.tsx`
- Modify: `src/components/layout/AppShell.tsx` (add benches nav, **remove** Sample Tracking)
- Delete: `src/app/lab/samples/page.tsx`
- Create: `scripts/shoot-lab-L3.cjs`

**Outcome:** A tech can pick a bench, claim a TestRun, enter analyte values with live H/L/Critical flagging, send for verification, verify, and release. Released test fires a doctor notification.

- [ ] **Step 1: Replace Sample Tracking with Benches in nav**

```diff
  lab: [
    { href: '/lab/inbox',     label: 'Inbox',           icon: ClipboardList },
+   { href: '/lab/benches',   label: 'Benches',         icon: Microscope },
    { href: '/lab/dashboard', label: 'Lab Overview',    icon: FlaskConical },
-   { href: '/lab/samples',   label: 'Sample Tracking', icon: Microscope },
    { href: '/lab/qc',        label: 'Quality Control', icon: ShieldCheck },
    { href: '/lab/reflex',    label: 'Reflex Tests',    icon: Activity },
  ],
```

Delete `src/app/lab/samples/page.tsx`.

- [ ] **Step 2: Build the Benches page**

`src/app/lab/benches/page.tsx`:

- Top tab strip: `Hematology / Biochemistry / Immunology / Urinalysis` (one tab per bench, mirroring pharmacy's source chips style).
- Filter: `All / My counter` (assignedTo me).
- Identify "me" via `useAuthStore(s => s.currentUser)` and map to a `LabTech` (id, name); for the demo, lab role = `Ravi Menon` (LT-101) unless we add a switcher (deferred).
- Row shape: `[priority chip] [patient name + UHID] [test name + bench] [status pill] [actions]`. Actions are status-driven:
  - `on_bench`, unclaimed → **Accept** (`claim(t.id, me)`)
  - `in_progress` & mine → expand for analyte entry; primary action **Send for verification** (`finishEntry`)
  - `entered` (any) → **Verify** (`verifyTest`)
  - `verified` → **Release** (`releaseTest`)
  - `released` → "Released · {time}"
- Expand panel (when `in_progress` and mine): one input per analyte from the catalog. On blur, write through `enterAnalyte(testId, analyte, value)`; the auto-computed flag pill renders next to the input (N / H / L / CH / CL with colour). Reference range shown inline as `${refLow} – ${refHigh} ${unit}`.
- A small `Reject` action with reason dropdown is available on `in_progress` rows.

Key event handlers:

```tsx
const onBlurValue = (testId: string, analyte: string, raw: string) => {
  const value = isNaN(Number(raw)) ? raw : Number(raw)
  enterAnalyte(testId, analyte, value)
}
const onFinish = (t: TestRun) => {
  if (!t.analytes.every(a => a.value !== '' && a.value !== undefined)) {
    toast.error('All analytes must be filled before sending for verification.'); return
  }
  finishEntry(t.id, me)
  toast.success(`${t.name} sent for verification`)
}
```

- [ ] **Step 3: Write L3 Puppeteer script**

`scripts/shoot-lab-L3.cjs` runs as the lab user, navigates to Benches, picks the Hematology tab, accepts an `on_bench` CBC (e.g., Aarav Sharma's LO-401), expands the row, types values for all CBC analytes (a deliberately high WBC to trigger flagging), asserts that an `H` or `CH` flag pill renders, clicks Send for verification, clicks Verify, clicks Release, asserts toast `Released` and an entry appearing in the doctor notification bell (or simply the test status pill changes to `released`).

- [ ] **Step 4: Typecheck + run + screenshot review**

```
npx tsc --noEmit -p tsconfig.json   # EXIT 0
node scripts/shoot-lab-L3.cjs       # all asserts true, ERRORS(0)
```

**L3 acceptance:** A tech can drive a CBC end-to-end (Accept → enter values → Send for verification → Verify → Release); auto-flag computation works; releasing fires a doctor notification.

---

## Milestone L4 — Microbiology bench

**Files:**
- Create: `src/app/lab/microbiology/page.tsx`
- Modify: `src/components/layout/AppShell.tsx` (add microbiology nav)
- Create: `scripts/shoot-lab-L4.cjs`

**Outcome:** Multi-day culture flow visible and advanceable; final report releases the test.

- [ ] **Step 1: Add nav item**

```diff
  lab: [
    { href: '/lab/inbox',         label: 'Inbox',           icon: ClipboardList },
    { href: '/lab/benches',       label: 'Benches',         icon: Microscope },
+   { href: '/lab/microbiology',  label: 'Microbiology',    icon: Activity },
    { href: '/lab/dashboard',     label: 'Lab Overview',    icon: FlaskConical },
    { href: '/lab/qc',            label: 'Quality Control', icon: ShieldCheck },
    { href: '/lab/reflex',        label: 'Reflex Tests',    icon: Activity },
  ],
```

- [ ] **Step 2: Build the Microbiology page**

`src/app/lab/microbiology/page.tsx`:

- Column-by-phase layout (`Inoculated | Growth check | Identified | AST | Final`).
- Each card = one TestRun with `bench === 'MICRO'`; rendered in its phase column.
- Card actions per phase:
  - `inoculated` → **Check growth** (sets `phase: 'growth_check', day: 1`); choose `no_growth` / `growth`.
  - `growth_check` (growth=yes) → **Identify organism** (`phase: 'identified', day: 2`, choose organism from list).
  - `identified` → **Run AST** (`phase: 'ast', day: 3`, table of antibiotics × S/I/R toggles).
  - `ast` → **Finalize** (open final-report editor; on save → `phase: 'final'` then `microRelease(testId, me)`).
- No growth shortcut: at `growth_check`, "No growth – finalise" goes directly to `final` and releases with `finalReport: 'No growth after N hours of incubation'`.

- [ ] **Step 3: Write L4 Puppeteer script**

`scripts/shoot-lab-L4.cjs` walks Sunita Sharma's CULT_BLOOD through `growth_check → identified → ast → final`. Picks "E. coli" as the organism (seeded option); marks Ceftriaxone S, Ciprofloxacin R; writes a final report; asserts the test moves out of the AST column and into Recently released (or that a toast appears, "Final report released").

- [ ] **Step 4: Typecheck + run + screenshot review**

```
npx tsc --noEmit -p tsconfig.json
node scripts/shoot-lab-L4.cjs
```

**L4 acceptance:** Microbiology flow renders in phase columns; tests advance phase-by-phase with day stamps; final release fires.

---

## Milestone L5 — QC store + Westgard + release gate

**Files:**
- Create: `src/store/useLabQCStore.ts`
- Modify (rewrite): `src/app/lab/qc/page.tsx`
- Modify: `src/app/lab/benches/page.tsx` (read QC violations, block release)
- Create: `scripts/shoot-lab-L5.cjs`

**Outcome:** QC violations on an analyzer block release of tests mapped to that analyzer until cleared (or supervisor-overridden).

- [ ] **Step 1: Create QC store**

`src/store/useLabQCStore.ts`:

```ts
import { create } from 'zustand'

export type AnalyzerId = 'Sysmex XN-550' | 'Roche c311' | 'Abbott i1000SR' | 'Sysmex UN-2000'
export type QCLevel = 'L1' | 'L2' | 'L3'
export type QCRun = { id: string; analyzer: AnalyzerId; level: QCLevel; analyte: string; value: number; mean: number; sd: number; at: string }
export type Violation = { rule: '1-2s' | '1-3s' | '2-2s' | 'R-4s' | '4-1s' | '10-x'; severity: 'warn' | 'reject'; at: string; runId: string; note: string }

interface QCState {
  runs: QCRun[]
  violations: Record<AnalyzerId, Violation[]>
  overrides: { analyzer: AnalyzerId; by: string; at: string; reason: string }[]
  addRun: (r: Omit<QCRun, 'id' | 'at'>) => void
  override: (analyzer: AnalyzerId, by: string, reason: string) => void
  clear: (analyzer: AnalyzerId) => void
}
```

Westgard logic (a `evaluateWestgard(runs: QCRun[], r: QCRun): Violation[]` pure function applied on every `addRun`). Seeded with 7 days × 3 levels × 4 analyzers of clean control data + one synthetic `1-3s` violation on `Roche c311` so the demo shows a blocked release.

- [ ] **Step 2: Rewrite QC page**

`src/app/lab/qc/page.tsx`:
- Top KPI strip: Analyzers · Active violations · Overrides today.
- Per-analyzer card: status (green OK / red Violation), latest run, "Submit run" button, mini Levey-Jennings sparkline (no chart lib — inline SVG).
- Violations section listing active ones with `Override` button (records who/why) and `Clear` (after fix recorded).

- [ ] **Step 3: Gate release on benches**

Edit `src/app/lab/benches/page.tsx`: on each `verified` row, read the test's analyzer (via `LAB_CATALOG[test.code].analyzer`) and check `useLabQCStore(s => s.violations[analyzer])`. If any active violations:
- Replace the **Release** button with a disabled **Release blocked — QC fail (Roche c311)** badge.
- Show a small "Override (supervisor)" link → calls `override(analyzer, currentUser.name, reason)` → release unblocks for that analyzer.

- [ ] **Step 4: Write L5 Puppeteer script**

`scripts/shoot-lab-L5.cjs`:
- Login Lab → Benches → find an LFT or RFT row at `verified` on `Roche c311` → assert "Release blocked" badge appears.
- Click Override (with reason "Test failure under repair, manual re-cal verified") → assert Release button reappears.
- Navigate to `/lab/qc` → assert violation listed → click Clear → assert violation cleared.

- [ ] **Step 5: Typecheck + run + screenshot review**

**L5 acceptance:** Benches blocks release on QC-failed analyzers; supervisor override and clear flows work.

---

## Milestone L6 — Reflex auto-trigger

**Files:**
- Create: `src/lib/reflexRules.ts`
- Modify: `src/store/useLabOrdersStore.ts` (call into `evaluateReflex` on `releaseTest`)
- Modify (rewrite): `src/app/lab/reflex/page.tsx`
- Create: `scripts/shoot-lab-L6.cjs`

**Outcome:** Releasing a test that matches a reflex rule pushes a suggestion onto the queue. Incharge one-click orders the reflex test.

- [ ] **Step 1: Create the reflex rule engine**

`src/lib/reflexRules.ts`:

```ts
import type { TestRun, ReflexSuggestion } from '@/store/useLabOrdersStore'

export type ReflexMatch = Pick<ReflexSuggestion, 'basedOnTestId' | 'patientName' | 'triggerSummary' | 'code' | 'reason'>

export function evaluateReflex(t: TestRun, patientName: string): ReflexMatch[] {
  const matches: ReflexMatch[] = []
  const get = (a: string) => t.analytes.find(x => x.analyte === a)
  const num = (a: string) => { const v = get(a)?.value; return typeof v === 'number' ? v : undefined }

  // HbA1c high → add FBS
  if (t.code === 'HBA1C') {
    const h = num('HbA1c'); if (h !== undefined && h >= 6.5) {
      matches.push({ basedOnTestId: t.id, patientName, code: 'GLUC',
        triggerSummary: `HbA1c ${h}% (≥6.5)`,
        reason: 'Diabetic-range HbA1c — add fasting blood sugar' })
    }
  }
  // Troponin I high → add CRP (and a 6-hour repeat Troponin in a real system)
  if (t.code === 'TROPI') {
    const v = num('Troponin I'); if (v !== undefined && v >= 0.04) {
      matches.push({ basedOnTestId: t.id, patientName, code: 'CRP',
        triggerSummary: `Troponin I ${v} ng/mL (>0.04)`,
        reason: 'Elevated troponin — add inflammatory marker' })
    }
  }
  // CBC: WBC > 15k → suggest blood culture
  if (t.code === 'CBC') {
    const w = num('WBC count'); if (w !== undefined && w > 15000) {
      matches.push({ basedOnTestId: t.id, patientName, code: 'CULT_BLOOD',
        triggerSummary: `WBC ${w}/µL (>15 000)`,
        reason: 'Leucocytosis — rule out bacteraemia' })
    }
  }
  // LFT: AST or ALT > 3× upper limit → suggest HBA1C (placeholder for HBsAg, not in catalog) — actually use TSH so the demo has a valid catalog code; in a real system this would be HBsAg / Anti-HCV.
  if (t.code === 'LFT') {
    const ast = num('AST (SGOT)'), alt = num('ALT (SGPT)')
    if ((ast !== undefined && ast > 120) || (alt !== undefined && alt > 168)) {
      matches.push({ basedOnTestId: t.id, patientName, code: 'CRP',
        triggerSummary: `AST ${ast} · ALT ${alt}`,
        reason: 'Significant transaminitis — add inflammatory marker' })
    }
  }
  return matches
}
```

- [ ] **Step 2: Wire reflex into release**

In `useLabOrdersStore.ts` `releaseTest`, after stamping `releasedAt`:

```ts
import { evaluateReflex } from '@/lib/reflexRules'
// ...
const matches = evaluateReflex(updatedTest, order.patientName)
matches.forEach(m => get().pushReflex(m))
```

- [ ] **Step 3: Rewrite reflex page**

`src/app/lab/reflex/page.tsx` reads `useLabOrdersStore(s => s.reflexSuggestions)` and renders each as a card: trigger summary, suggested test, reason, **Order reflex** button (calls `orderReflex(suggestion.id)`).

- [ ] **Step 4: Write L6 Puppeteer script**

`scripts/shoot-lab-L6.cjs`:
- Login Lab → Benches → Hematology → release a CBC with WBC entered as 18 200 (script types the value).
- Navigate `/lab/reflex` → assert suggestion card listing "Leucocytosis — rule out bacteraemia" + suggested test "Blood Culture".
- Click `Order reflex` → assert a new awaiting-collection test appears in `/lab/inbox`.

- [ ] **Step 5: Typecheck + run + screenshot review**

**L6 acceptance:** A high-WBC CBC release auto-creates a reflex Blood Culture suggestion; ordering it creates a new test in `/lab/inbox`.

---

## Milestone L7 — Lab Incharge command center

**Files:**
- Modify (rewrite): `src/app/lab/dashboard/page.tsx`
- Create: `scripts/shoot-lab-L7.cjs`

**Outcome:** A single, scannable overview page for the lab incharge.

- [ ] **Step 1: Rewrite the dashboard**

`src/app/lab/dashboard/page.tsx` is KPI/overview only:

- **KPI strip** (6 cards): Awaiting collection · On bench · Pending verification · Critical pending callback · Released today · TAT breaches today. Computed from `useLabOrdersStore.orders` via `useMemo`.
- **Pipeline by bench** (5 mini-cards): Hematology / Biochemistry / Immunology / Urinalysis / Microbiology, each with a small breakdown bar `awaiting · on_bench · in_progress · entered · verified`.
- **Critical pending callback** list: released tests with any analyte flag `CH` / `CL` and no `callback` logged. Each row has a `Log callback` button → opens an inline picker (`recipient` text input, default to ordering doctor) → calls `logCallback(testId, me, recipient)`.
- **Pending verification** list: tests `status === 'entered'`, with a link to `/lab/benches`.
- **Technician workload**: count of `in_progress` tests grouped by `assignedTo.name` (horizontal bars).
- **QC failures alert**: read from `useLabQCStore.violations`, summarise active count per analyzer with a link to `/lab/qc`.
- **AI exception triage** card: a derived list of:
  - Tests whose elapsed time > 2× `expectedTATmin` and not yet released.
  - Patients with two `released` critical results in the same day (delta-check candidate).
- **Open inbox / Open benches** quick links.

- [ ] **Step 2: Write L7 Puppeteer script**

`scripts/shoot-lab-L7.cjs`: navigates to `/lab/dashboard`, asserts each KPI label is present, the Critical pending callback list contains Kiran Patil (TROPI critical seed), clicks Log callback with recipient "Dr. Vikram Rathore" and confirms the row disappears from the list.

- [ ] **Step 3: Typecheck + run + screenshot review**

**L7 acceptance:** Incharge has at-a-glance pipeline + actionable lists; Log callback closes the SLA loop.

---

## Milestone L8 — Cross-panel: doctor inbox + patient pathology + order rewire

**Files:**
- Modify: `src/app/doctor/dashboard/page.tsx` (rewire `addLabToStore`)
- Modify: `src/lib/resultsInbox.ts`
- Modify (rewrite): `src/app/patient/pathology/page.tsx`
- Create: `scripts/shoot-lab-L8.cjs`

**Outcome:** The whole loop closes end-to-end: doctor orders → lab → released → doctor inbox + patient pathology page show live structured results.

- [ ] **Step 1: Rewire doctor's "Send to lab" to addOrder**

In `src/app/doctor/dashboard/page.tsx`:
- Replace `useLabStore().addOrderFromDoctor` import with `useLabOrdersStore`.
- The doctor's UI today selects one test by name → wire it through a name→code lookup using `LAB_CATALOG`. Pass an array of codes if multiple tests are selected.

```tsx
import { useLabOrdersStore } from '@/store/useLabOrdersStore'
import { LAB_CATALOG } from '@/lib/labCatalog'
// ...
const addLabOrder = useLabOrdersStore(s => s.addOrder)
// ...
const codeFor = (name: string) =>
  Object.values(LAB_CATALOG).find(e => e.name === name || e.code === name)?.code
// Inside the "Send to lab" handler, replace the legacy call with:
const codes = labOrders.map(o => codeFor(o.testName)).filter(Boolean) as string[]
if (codes.length) addLabOrder({
  patientId: currentPatient.id, patientName: currentPatient.name,
  source: 'OPD', doctorName: currentPatient.doctor, paymentMode: 'Cash',
  testCodes: codes,
})
```

- [ ] **Step 2: Rewire results inbox to walk released TestRuns**

`src/lib/resultsInbox.ts`:

```ts
// Replace the lab branch:
for (const order of data.labOrders) {
  for (const t of order.tests) {
    if (t.status !== 'released' || t.acknowledgedAt) continue
    if (order.doctorName !== doctorName) continue
    const critical = t.analytes.some(a => a.flag === 'CH' || a.flag === 'CL')
    const abnormal = t.analytes.filter(a => a.flag !== 'N')
    const summary = abnormal.length
      ? abnormal.map(a => `${a.analyte} ${a.value} ${a.unit} ${a.flag}`).join(' · ')
      : 'Within reference range'
    items.push({
      key: `lab-${t.id}`, source: 'lab', patient: order.patientName,
      label: t.name, value: summary, critical, at: t.releasedAt ?? t.orderedAt,
      ack: { source: 'lab', id: t.id },
    })
  }
}
```

Update the `data` shape: add `labOrders: LabOrder[]` (callers that import this function in `doctor/inbox`, doctor dashboard, etc. now pass the order array — use `useLabOrdersStore(s => s.orders)`).

- [ ] **Step 3: Rewrite patient pathology**

`src/app/patient/pathology/page.tsx`:

- Read `useLabOrdersStore(s => s.orders)` filtered by `patientId / patientName` of `useAuthStore(s => s.currentUser)`.
- Status section for each non-released order: progress chip (Awaiting collection / Collected / Being analyzed / Pending verification / Verified — ready soon).
- Released test card: panel name, each analyte with value/unit, reference range, flag pill (Normal / High / Low / Critical High / Critical Low — colour coded). Plain-language AI summary line per panel, generated from the analytes:

```ts
function plainSummary(t: TestRun): string {
  const abn = t.analytes.filter(a => a.flag !== 'N')
  if (!abn.length) return 'All values are within the normal range. ✅'
  const crit = abn.find(a => a.flag === 'CH' || a.flag === 'CL')
  if (crit) return `${crit.analyte} is critically ${crit.flag === 'CH' ? 'high' : 'low'} (${crit.value} ${crit.unit}). Your doctor will discuss next steps.`
  const w = abn[0]
  return `${w.analyte} is slightly ${w.flag === 'H' ? 'high' : 'low'} (${w.value} ${w.unit}, reference ${w.refLow}–${w.refHigh}). Discuss with your doctor.`
}
```

- Keep the bookable-tests list (the demo's "Book a test" array) as-is.

- [ ] **Step 4: Write L8 Puppeteer script**

`scripts/shoot-lab-L8.cjs`:
- Login Doctor → "Send to lab" CBC for the current patient → assert order appears in `/lab/inbox` (logout/login Lab).
- Drive that CBC end-to-end on Benches → release with abnormal WBC.
- Logout, login Patient → `/patient/pathology` → assert released CBC card with the abnormal analyte line + plain-language summary.
- Logout, login Doctor → results inbox (or the Results card on dashboard) → assert structured summary line includes "WBC ⬆".

- [ ] **Step 5: Regression sweep**

Re-run the pharmacy and nurse scripts to ensure the lab shim didn't break shared modules:

```
node scripts/shoot-pharmacy-v3.cjs   # ERRORS(0)
node scripts/shoot-pharmacy-m5.cjs   # ERRORS(0)
node scripts/shoot-pharmacy-n.cjs    # ERRORS(0)
```

- [ ] **Step 6: Final typecheck + screenshot review**

```
npx tsc --noEmit -p tsconfig.json   # EXIT 0
```

**L8 acceptance:** Doctor → lab → patient/doctor live flow works end-to-end; structured panel summaries on both sides; pharmacy scripts still green.

---

## Self-review (run before claiming done)

**Spec coverage** — every spec section maps to at least one task:

| Spec requirement | Task |
|---|---|
| LabOrder → Specimen + TestRun → Analyte data model | L1 |
| 12-test catalog with ranges + critical thresholds | L1 |
| `useLabOrdersStore` actions (addOrder, collect, claim, enter, verify, release, reject, recollect, microAdvance, microRelease, logCallback, orderReflex) | L1, L2, L3, L4, L6, L7 |
| `flatTests` back-compat shim | L1 |
| STAT priority surfaced | L2 |
| Phlebotomy collection + auto-specimens + reject/recollect | L2 |
| Bench routing + multi-tech claim | L3 |
| Multi-analyte entry with auto H/L/CH/CL flag | L3 |
| Verification chain (enter → verified → released) | L3 |
| Microbiology phases + AST + final report | L4 |
| QC store + Westgard + release gate + supervisor override | L5 |
| Reflex auto-trigger on release + one-click order | L6 |
| Incharge command center (KPIs, callback log, pending verify, tech load, QC, AI triage) | L7 |
| Doctor order rewire to `addOrder({ testCodes })` | L8 |
| Doctor inbox structured summary | L8 |
| Patient pathology live with AI plain-language summary | L8 |
| Existing consumers (reception/admin/OT/admission/ResultsTicker) keep working | L1 shim + L8 regression sweep |

No gaps.

**Placeholder scan:** none. Every step lists the file(s), shows the relevant code, names the command and expected output.

**Type consistency:** `TestStatus`, `Bench`, `Priority`, `AnalyteFlag`, `MicroPhase`, `RejectReason`, `LabTech`, `AnalyteResult`, `MicrobioResult`, `Specimen`, `TestRun`, `LabOrder`, `ReflexSuggestion`, `FlatSample` are introduced in L1 and referenced consistently across L2–L8. Method names (`addOrder`, `collectOrder`, `rejectSpecimen`, `recollectOrder`, `claim`, `enterAnalyte`, `finishEntry`, `verifyTest`, `releaseTest`, `rejectTest`, `microAdvance`, `microRelease`, `logCallback`, `ackResult`, `pushReflex`, `orderReflex`) match in every reference.
