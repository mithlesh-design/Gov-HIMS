# Laboratory v2 — Track 1 + Microbiology (Design)

> Redesigns the Laboratory module around real hospital workflow (Ordered →
> Awaiting collection → Collected → On bench → In progress → Entered →
> Verified → Released), introduces multi-analyte panels with reference ranges
> and auto H/L/Critical flags, a verification chain, multi-technician claim,
> QC-gated release, auto-fired reflex testing, the microbiology multi-day
> culture flow, and a real Lab Incharge command center. Cross-wires the
> doctor inbox and patient pathology page to live data.

**Date:** 2026-05-28
**Module:** Laboratory (role `lab`)
**Scope:** Track 1 (workflow + incharge + multi-analyte panels + verification
+ QC gate + reflex auto-trigger + patient/doctor live results) + Microbiology
**Deferred to future tracks:** Histopathology / Cytology · Send-out tests to
reference labs · Lab billing integration

---

## Why v1 was wrong

User review: the lab is "not aligned according to hospital needs and patients
flows." Concrete gaps surfaced during exploration:

1. **Phlebotomy step is missing.** Doctor orders → sample lands as
   `Collected` immediately. No specimen IDs, no container types, no
   collected-by/at, no reject/recollect.
2. **No bench routing** (Hematology / Biochemistry / Microbiology / Urinalysis /
   Immunology). Everything is in one undifferentiated queue.
3. **No multi-technician claim.** Workload distribution invisible.
4. **No multi-analyte panels.** A CBC is one `result` string; no reference
   ranges, no auto H/L/Critical flags — `criticalValue` is a manual boolean.
5. **No verification chain.** Status `advance()` auto-fills "within normal
   limits". Real labs need *tech enters → senior verifies → released*.
6. **No reject / recollect flow** (hemolyzed, clotted, insufficient).
7. **STAT priority missing** (store has only Routine | Urgent).
8. **Critical-value callback SLA loop is half-built** — no who-called-whom-when
   audit, no breach timer.
9. **QC is decorative**: a hardcoded array of 4 entries, not linked to
   anything; failed QC should block release on that analyzer.
10. **Reflex is a one-shot demo** — should auto-fire on result rules.
11. **Microbiology has unique multi-day flow** (Inoculated → Growth check →
    ID → AST → Final) and isn't represented at all.
12. **Lab incharge has no command center** — no pipeline-by-bench, no TAT
    vs SLA, no pending verification, no critical pending callback, no QC
    failures, no technician load, no AI exception triage.
13. **Patient `/patient/pathology` is hardcoded mock data** — doesn't read
    the lab store at all.

---

## Core model: orders → specimens → test runs → analytes

Three nested entities replace the flat `LabSample`:

```
LabOrder              ← the doctor's request
  ├─ Specimen[]       ← physical tubes/containers from phlebotomy
  └─ TestRun[]        ← one per ordered test/panel; own lifecycle
        └─ AnalyteResult[]   for plain tests (e.g. CBC analytes)
        └─ MicrobioResult?   for microbiology tests (multi-day phases)
```

A typical OPD visit: 1 LabOrder ("CBC + LFT + Urine + Blood culture") →
4 specimens (EDTA, serum, urine cup, blood culture bottle) → 4 TestRuns
routed to 3 benches (Hematology, Biochemistry, Urinalysis, Microbiology),
each with its own lifecycle.

### Types

```ts
type LabSource = 'OPD' | 'IPD' | 'ICU' | 'OT' | 'ER'
type Priority = 'STAT' | 'Urgent' | 'Routine'
type Bench = 'HEMA' | 'BIOCHEM' | 'IMMUNO' | 'URINE' | 'MICRO' | 'HISTO'
type SpecimenType = 'EDTA' | 'serum' | 'urine_cup' | 'blood_culture'
                  | 'swab' | 'sputum' | 'tissue'
type TestStatus = 'awaiting_collection' | 'collected' | 'on_bench'
                | 'in_progress' | 'entered' | 'verified' | 'released'
                | 'rejected' | 'recollect_requested'
type AnalyteFlag = 'N' | 'H' | 'L' | 'CH' | 'CL'   // Critical High / Low
type MicroPhase = 'inoculated' | 'growth_check' | 'identified' | 'ast' | 'final'
type RejectReason = 'hemolyzed' | 'clotted' | 'insufficient' | 'wrong_tube'
                  | 'unlabeled' | 'contaminated'

interface LabTech { id: string; name: string; bench?: Bench[] }

interface AnalyteResult {
  analyte: string; value: number | string; unit: string
  refLow?: number; refHigh?: number
  critLow?: number; critHigh?: number
  flag: AnalyteFlag        // auto-computed at entry
}

interface MicrobioResult {
  phase: MicroPhase
  day: number
  growth?: 'no_growth' | 'growth'
  organisms?: { name: string; ast: { drug: string; result: 'S' | 'I' | 'R'; mic?: string }[] }[]
  finalReport?: string
}

interface Specimen {
  accession: string        // barcode (e.g. ACC-2026-005321)
  orderId: string
  type: SpecimenType
  container: string        // human label ("Purple-top EDTA tube")
  collectedBy?: string
  collectedAt?: string
  volume?: string
  rejectReason?: RejectReason
}

interface TestRun {
  id: string
  orderId: string
  specimenId?: string
  code: string             // 'CBC', 'LFT', 'TROPI', 'CULT_BLOOD' ...
  name: string
  bench: Bench
  priority: Priority
  status: TestStatus
  assignedTo?: LabTech
  enteredBy?: LabTech
  verifiedBy?: LabTech
  releasedAt?: string
  rejectReason?: RejectReason
  recollectReason?: RejectReason
  expectedTATmin: number
  orderedAt: string
  analytes: AnalyteResult[]    // plain tests fill these at entry
  micro?: MicrobioResult       // micro tests use phases instead
  callback?: {                 // critical-value callback SLA loop
    calledBy: string; calledAt: string; recipient: string; ackBy?: string
  }
  notes?: string
}

interface LabOrder {
  id: string
  patientId: string
  patientName: string
  source: LabSource
  wardBed?: string
  doctorName: string
  orderedAt: string
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Insurance' | 'Credit'
  fastingStatus?: 'fasting' | 'non_fasting' | 'unknown'
  clinicalNotes?: string
  tests: TestRun[]
  specimens: Specimen[]
}
```

### Lifecycle

```
ordered → awaiting_collection → collected → on_bench → in_progress
                                              ↓             ↓
                                          rejected      entered → verified → released
                                              ↓
                                       recollect_requested → awaiting_collection
```

Microbiology TestRuns stay `in_progress` while `micro.phase` advances
`inoculated → growth_check → identified → ast → final`. Transition to
`final` triggers `verified → released`.

### Catalog drives everything

`LAB_CATALOG` (in `src/lib/labCatalog.ts`) keyed by code. Each entry:

```ts
{ code: 'CBC', name: 'Complete Blood Count', bench: 'HEMA',
  specimen: 'EDTA', container: 'Purple-top EDTA tube',
  defaultPriority: 'Routine', expectedTATmin: 60,
  analytes: [
    { analyte: 'Haemoglobin', unit: 'g/dL', refLow: 13.0, refHigh: 17.0,
      critLow: 7.0, critHigh: 20.0 },
    { analyte: 'WBC count', unit: '/µL', refLow: 4000, refHigh: 11000,
      critLow: 1500, critHigh: 30000 },
    { analyte: 'Platelets', unit: '×10³/µL', refLow: 150, refHigh: 410,
      critLow: 30, critHigh: 1000 },
    // …
  ] }
```

Microbio catalog entries declare `micro: true` and `expectedDays: 3` instead
of `expectedTATmin`. Reference ranges become null on micro entries.

Catalog drives: ordering UI, specimen routing/dedup at collection, result
entry form layout, auto-flag computation, TAT clocks, reflex matching.

---

## Pages & nav

Replace today's 4-page lab nav with a 6-page set, grouped:

```
Fulfilment
  /lab/inbox          Inbox & phlebotomy (awaiting collection / just collected)
  /lab/benches        Benches (Hema / Biochem / Immuno / Urine) – the working surface
  /lab/microbiology   Microbiology multi-day culture / ID / AST
Quality & insight
  /lab/qc             Quality Control (functional store, Westgard, release gate)
  /lab/reflex         Reflex Tests (auto-triggered suggestion queue)
Command center
  /lab/dashboard      Lab Overview (Incharge KPIs + AI exception triage)
```

### `/lab/inbox` — Inbox & phlebotomy
Tabs: **Awaiting collection** | **Just collected** (filterable by source / priority).
Row-per-order with patient, source, doctor, ordered tests, payment, priority.
Primary action **Collect** → opens collection panel: confirms specimens
auto-derived from test codes (de-duped per container type), prints barcodes
(simulated), records collectedBy/at; tests transition to `collected` →
`on_bench`. Per-specimen **Reject** with reason → fires recollect request.

### `/lab/benches` — Bench working surface
Bench tab strip + `All / My counter` filter (like pharmacy). Each row = one
TestRun. Status pills: on_bench / in_progress / entered / verified.
**Claim** → assignedTo me, status `in_progress`. Expand row reveals
analyte-input form (one input per catalog analyte, ref range shown inline,
flag pill computes on blur). **Send for verification** → status `entered`;
verifier filter shows pending-verification list. **Verify → Release** fires
result to doctor inbox + patient. Reject from bench also possible (e.g.
sample noted bad after on-bench prep).

### `/lab/microbiology` — Microbiology specialty
Phase columns: *Inoculated → Growth check → Identified → AST → Final*.
Cards advance phase-by-phase with day stamps. Organism + AST table editor.
Final report textarea; on Final, TestRun goes verified → released.

### `/lab/qc` — Quality Control
`useLabQCStore` per analyzer (Sysmex XN-550, Roche c311, Abbott i1000SR,
SYSMEX UN-2000). Submitted control runs plotted (Levey-Jennings); Westgard
rules (1-2s warning; 1-3s, 2-2s, R-4s, 4-1s, 10-x violations) evaluated.
Active **violation on analyzer X blocks release** on TestRuns mapped to
analyzer X until violation is resolved or overridden by supervisor (logged).

### `/lab/reflex` — Reflex suggestion queue
Real rule engine fires on each `released` TestRun (e.g. HbA1c ≥ 6.5%
suggests FBS/PPBS; Troponin I high suggests CK-MB & repeat at 6h; WBC > 15k
with Temp > 38 suggests blood + urine culture; LFT abnormal suggests HBsAg /
Anti-HCV; potassium critical-high suggests repeat + ECG). Suggestions land
here. **Order reflex** one-click creates the TestRun (reusing existing
specimen if compatible, else creates `awaiting_collection`).

### `/lab/dashboard` — Lab Incharge command center
KPI strip: Awaiting collection · On bench · Pending verification · Critical
pending callback · Released today · TAT breaches today. Pipeline-by-bench
mini-cards (count per status). **Critical pending callback** list with
**Log callback** action — records who-called-whom-when, closes SLA. Pending
verification list (links to bench). Technician workload bars. QC failures
alert. AI exception triage: samples > 2× expected TAT, suspected delta-check
failures, repeat criticals on same patient.

---

## Cross-panel integration

### Doctor → Lab (order in)
Doctor's "Send to lab" → `useLabOrdersStore.addOrder({ patientId,
patientName, doctorName, source, paymentMode, testCodes: ['CBC','LFT', …]
})`. Store reads catalog to:
- Create one LabOrder.
- Auto-generate Specimens per unique container type required by those codes
  (CBC+ESR share an EDTA tube; LFT+RFT+Lipid share serum).
- Spawn one TestRun per code, routed to its bench, status
  `awaiting_collection`.

### Lab → Doctor inbox (results out)
`src/lib/resultsInbox.ts` walks `useLabOrdersStore.orders[].tests[]` for
`status === 'released'` test runs ordered by this doctor and not yet
acknowledged. Result item carries structured summary (panel name + list of
abnormal/critical analytes) rather than today's plain string — so the
doctor sees "CBC — WBC 18 200 ⬆ critical · Plt 95 ⬇" not "within normal
limits". Notification on release; critical → high priority + appears on
**Critical pending callback** until the lab logs callback.

### Lab → Patient pathology (results out)
`/patient/pathology` stops using hardcoded `CBC` / `TESTS` arrays. Reads
patient's `useLabOrdersStore` orders. Shows live test status ("Sample
collected · expected by 4 pm"); on release, plain-language panel card per
test with each analyte's value / range / flag and an AI summary ("Your
white-cell count is slightly high — likely an infection; your doctor will
discuss"). Bookable-tests list untouched.

### Back-compat shim
Many existing files read `useLabStore` for counts/display
(`reception/diagnostics`, `admin/dashboard`, `admission/dashboard`,
`ot/dashboard`, `ResultsTicker`, `useConsultationStore`, `useOTStore`,
`useAdmissionStore`). The new store exposes a derived `flatTests` selector
that maps test runs to the old `LabSample` shape (`{ id, patientName,
testName, status, priority, orderedBy, criticalValue, result }`). The old
`useLabStore` export is replaced by a thin compatibility shim re-exporting
`flatTests` so consumers keep working without edits. Surfaces I'm
redesigning (doctor inbox, patient pathology, results inbox) get fully
migrated to the rich model.

### Notifications & cross-store calls
- Release → `useNotificationStore.add` targetRole `doctor` (ordering
  doctor) and `patient` (released).
- Reflex match on release → `useLabOrdersStore.reflexSuggestions[]` (read
  by `/lab/reflex` and surfaced in `/lab/dashboard` AI triage).
- QC violation on analyzer → `useLabQCStore.violations`, read by Benches
  page to gate release.

---

## Milestones

Eight milestones, each ends with **typecheck + Puppeteer + 0 console errors**:

- **L1 — Catalog + new store + back-compat shim.** `LAB_CATALOG` with ~12
  tests (CBC, LFT, RFT, Lipid, HbA1c, TSH, Troponin I, CRP, Urine R,
  Glucose, Blood culture, Urine culture, Wound culture). `useLabOrdersStore`
  with all actions (addOrder, claim, collect, advance, enterAnalyte,
  finishEntry, verify, release, reject, recollect, microAdvance,
  logCallback). `flatTests` selector. `useLabStore` becomes shim. Seed
  realistic orders across all benches.
- **L2 — Inbox & phlebotomy.** `/lab/inbox` page with Awaiting collection /
  Just collected tabs, row-per-order, Collect → specimens auto-generated,
  Reject/Recollect.
- **L3 — Benches: claim → enter → verify → release.** `/lab/benches`
  page; replace `/lab/samples`. Bench tab strip, claim model, expand-row
  analyte entry, live flag computation, send-for-verification, verify,
  release.
- **L4 — Microbiology bench.** `/lab/microbiology` page; phase advance;
  organism + AST editor; final report → release.
- **L5 — QC store + Westgard + release gate.** `useLabQCStore`, Westgard
  rule evaluation, `/lab/qc` rewired. Benches page blocks release on
  violation-locked analyzers.
- **L6 — Reflex auto-trigger.** Rule engine on release;
  `useLabOrdersStore.reflexSuggestions`; `/lab/reflex` queue;
  one-click reflex order.
- **L7 — Lab Incharge command center.** `/lab/dashboard` rewritten:
  KPI strip, pipeline-by-bench, critical-pending callback with Log
  callback, pending verification, technician load, QC failures, AI
  exception triage.
- **L8 — Cross-panel: doctor inbox + patient pathology + order rewire.**
  Doctor `addOrder({ testCodes })`; `resultsInbox.ts` updated; patient
  pathology reads live with AI summary; verify reception/admin/OT
  counters still work via shim.

---

## Testing

Per-milestone Puppeteer script (`scripts/shoot-lab-LN.cjs`) drives the
new flow and screenshots; console-error sweep targeting zero. Final
regression re-runs `shoot-pharmacy-*.cjs` to ensure shim doesn't break
existing consumers. SPA navigation only after login (in-memory store
resets on `page.goto`).
