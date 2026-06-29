# Doctor Panel v2 — Phase 0 + 1 (M1–M5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the leftover doctor-area chatbot, make doctor state durable + fix the hydration warning, then rebuild IPD on a unified event-log backbone with a single-row table, an actions menu, a quick-peek drawer, and a comprehensive full-page chart.

**Architecture:** A single append-only `events: IpdEvent[]` log on each `Inpatient` becomes the source of truth for history; every store action writes to it via a `logEvent` helper. The doctor reads the raw log (full-page chart Timeline); the patient portal (later phase) reads the curated `patientText`. UI moves from cards to a dense table + kebab actions + quick-peek drawer, with a dedicated full-page chart route for the deep dive.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript (strict), Zustand 5 (+ `persist` middleware), Tailwind v4, Framer Motion 12, lucide-react, sonner. Verification: `npx tsc --noEmit` + Puppeteer (puppeteer-core, headless Chrome) screenshots + console-error sweep.

---

## Verification model (this repo has no unit tests and is not a git repo)

- **There is no Jest/Vitest suite.** The established per-task gate is **typecheck**; the per-milestone gate adds a **Puppeteer screenshot** of the real page(s) + a **console-error sweep** (target 0 errors). This replaces the TDD test/commit steps from the generic skill.
- **Not a git repo** → there are no `git commit` steps. The per-milestone verification gate is the checkpoint.
- **Dev server** is assumed running at `http://localhost:3000` (`npm run dev`). Screenshot scripts live in `scripts/` and write PNGs to `C:\Users\Dell\AppData\Local\Temp\hms-shots`. Chrome path: `C:\Program Files\Google\Chrome\Application\chrome.exe`.
- **Typecheck command (used everywhere below):** `npx tsc --noEmit -p tsconfig.json` — expected output: *nothing* (clean exit).

---

## File Structure (M1–M5)

| File | Status | Responsibility |
|---|---|---|
| `src/app/doctor/layout.tsx` | Modify | Drop the `CopilotLayout` (chatbot FAB) wrapper |
| `src/store/useInpatientStore.ts` | Modify | Event log, med/test lifecycle, new actions, persistence |
| `src/store/useMessagingStore.ts` | Modify | Add `persist` |
| `src/store/useDoctorStatsStore.ts` | Modify | Add `persist` |
| `src/store/useNotificationStore.ts` | Modify | Add `persist` |
| `src/components/layout/AppShell.tsx` | Modify (M2) | Hydration-safe client-only rendering if implicated |
| `src/lib/ipdFormat.ts` | Create | Shared IPD formatting/labels + event-icon map (DRY for table/drawer/chart) |
| `src/components/doctor/ipd/InpatientRow.tsx` | Create | One table row + AI-flag chip |
| `src/components/doctor/ipd/ActionsMenu.tsx` | Create | The ⋮ kebab menu of inpatient actions |
| `src/components/doctor/ipd/ipdModals.tsx` | Create | Add/Stop-med, Order-test, Refer, ICU, OT, Diet modals |
| `src/components/doctor/ipd/QuickPeekDrawer.tsx` | Create | Row-click quick-peek drawer |
| `src/app/doctor/ipd/page.tsx` | Modify | Card grid → table; mount drawer + modals; keep rounds-due strip |
| `src/app/doctor/ipd/[id]/page.tsx` | Create | Full-page comprehensive chart (tabs) |
| `src/components/doctor/ipd/chart/*` | Create | Tab panels for the full-page chart |
| `scripts/shoot-m*.cjs` | Create | Per-milestone screenshot scripts |

---

## Milestone M1 — Remove the bottom-right chatbot

### Task 1.1: Unmount CopilotLayout in the doctor area

**Files:**
- Modify: `src/app/doctor/layout.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { RoleGuard } from "@/components/layout/RoleGuard"

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRole="doctor">
      {children}
    </RoleGuard>
  )
}
```

Rationale: `CopilotLayout` (verified) only renders `{children}` + the `<CopilotPane>` floating FAB; it does **not** render the AppShell, so dropping it removes only the chatbot bubble. The component files stay in place (other roles may still import them).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean (no output). If it flags an unused import elsewhere, none is expected here since we removed the `CopilotLayout` import.

- [ ] **Step 3: Milestone verification — screenshot + console sweep**

Create `scripts/shoot-m1.cjs` (puppeteer-core, headless Chrome at the path above): goto `/`, click the `Doctor` button, wait for the shell, screenshot `m1-dashboard.png`, then goto `/doctor/ipd` and screenshot `m1-ipd.png`. Collect `console`/`pageerror` events.
Run: `node scripts/shoot-m1.cjs`
Expected: **no floating bubble in the bottom-right** on either page; `ERRORS(0)`. (The dashboard online-consult LIVE video widget only appears during an online consult, so it must not be visible here.)

---

## Milestone M2 — Persistence + hydration fix

### Task 2.1: Persist the inpatient store

**Files:**
- Modify: `src/store/useInpatientStore.ts`

- [ ] **Step 1: Import persist and wrap the store**

At the top, change the import:

```ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
```

Wrap the existing store definition (the `create<InpatientState>((set) => ({ ... }))`) with `persist`:

```ts
export const useInpatientStore = create<InpatientState>()(
  persist(
    (set) => ({
      inpatients: seed(),
      // ...all existing actions unchanged...
    }),
    {
      name: 'kailash-ipd',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // seed() runs for first-ever load; persisted state rehydrates over it afterwards.
    },
  ),
)
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean.

### Task 2.2: Persist messaging, stats, and notification stores

**Files:**
- Modify: `src/store/useMessagingStore.ts`
- Modify: `src/store/useDoctorStatsStore.ts`
- Modify: `src/store/useNotificationStore.ts`

- [ ] **Step 1: Apply the same persist wrapper to each**

For each store, add the import `import { persist, createJSONStorage } from 'zustand/middleware'` and wrap the `create<State>()(...)` body with `persist(..., { name, version: 1, storage: createJSONStorage(() => localStorage) })` using names:
- `useMessagingStore` → `name: 'kailash-messaging'`
- `useDoctorStatsStore` → `name: 'kailash-doctor-stats'`
- `useNotificationStore` → `name: 'kailash-notifications'`

Note the `create<X>()(...)` curried form (the extra `()`), required by zustand+TS when using middleware.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean.

### Task 2.3: Diagnose and fix the app-wide hydration mismatch

**Files:**
- Inspect: `src/components/layout/AppShell.tsx`, `src/app/layout.tsx`, any provider/locale component
- Modify: whichever renders a client-only value during SSR

- [ ] **Step 1: Locate non-deterministic render values**

Run these searches and read each hit's render path (not effects):
- `Grep` `new Date\(\)|Date\.now\(\)|Math\.random\(\)|toLocaleString|toLocaleTimeString` in `src/components/layout/` and `src/app/layout.tsx`
- `Grep` `localStorage|window\.` for values read during render (not inside `useEffect`)
Expected: identify the attribute/text that differs server vs client (most likely a timestamp or a `localStorage`/locale-derived value rendered inline).

- [ ] **Step 2: Apply the mounted-guard fix to the offending render**

For the implicated component, gate the client-only output:

```tsx
const [mounted, setMounted] = useState(false)
useEffect(() => { setMounted(true) }, [])
// render the dynamic value only after mount; render a stable placeholder on the server pass
{mounted ? <DynamicValue/> : <StablePlaceholder/>}
```

If the culprit is a persisted store value read during the first render, gate that render branch behind `mounted` the same way (server renders the seed/empty state, client fills in after hydration).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean.

- [ ] **Step 4: Milestone verification — persistence + zero hydration warnings**

Reuse/extend `scripts/sweep-doctor.cjs` (it hard-loads every `/doctor/*` route and prints console errors). Run: `node scripts/sweep-doctor.cjs`
Expected: **`ERRORS(0)`** with **no "A tree hydrated but some attributes…" warning** on any page.
Manual persistence check (scripted): in a puppeteer run, record a round on an IPD patient, hard-reload, confirm the round persisted (the recorded note still shows). Screenshot `m2-persist.png`.

---

## Milestone M3 — IPD event-log backbone

This is the spine. All later IPD work depends on it.

### Task 3.1: Extend the data model

**Files:**
- Modify: `src/store/useInpatientStore.ts`

- [ ] **Step 1: Add the event type and extend MedOrder/TestOrder**

Add near the other type exports:

```ts
export type IpdEventType =
  | 'admission' | 'round' | 'condition_change' | 'note'
  | 'med_start' | 'med_stop' | 'med_change'
  | 'test_order' | 'test_result' | 'diet_change'
  | 'referral' | 'icu_transfer' | 'ot_booking'
  | 'surgery_status' | 'discharge_step' | 'discharged'

export type IpdEvent = {
  id: string
  at: string
  type: IpdEventType
  actor: string
  title: string
  detail?: string
  patientText?: string
  severity?: 'info' | 'success' | 'warning' | 'critical'
  meta?: Record<string, unknown>
}

export type Referral = { id: string; specialty: string; toDoctor?: string; reason: string; urgent: boolean; at: string; status: 'sent' | 'accepted' }
export type IcuTransfer = { id: string; reason: string; urgency: 'Routine' | 'Urgent' | 'Emergency'; at: string; status: 'requested' | 'bed_assigned' | 'transferred' }
export type OtBooking = { id: string; procedure: string; surgeon: string; ot: string; scheduledAt: string; status: 'requested' | 'confirmed' }
```

Change `MedOrder` and `TestOrder`:

```ts
export type MedOrder = {
  name: string; dose: string; freq: string; route: string
  status: 'active' | 'stopped'
  startedAt: string
  stoppedAt?: string
  stopReason?: string
}

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
```

Extend the `Inpatient` type with:

```ts
  events: IpdEvent[]
  referrals?: Referral[]
  icuTransfer?: IcuTransfer
  otBooking?: OtBooking
  codeStatus?: string
  allergies?: string[]
  comorbidities?: string[]
```

- [ ] **Step 2: Typecheck (expected to FAIL — surfaces every place that must change)**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: errors where `meds`/`tests` are constructed in `seed()` (missing `status`/`startedAt`/`id`/`orderedAt`) and where `Inpatient` literals lack `events`. This list is the to-do for Step 3.

### Task 3.2: Update the seed data to the new shapes + seed events

**Files:**
- Modify: `src/store/useInpatientStore.ts`

- [ ] **Step 1: Add an event-seed helper and update `seed()`**

Add helpers near `seedRounds`:

```ts
const ev = (type: IpdEventType, at: string, actor: string, title: string, opts: Partial<IpdEvent> = {}): IpdEvent =>
  ({ id: uid('e'), at, type, actor, title, ...opts })

function seedEvents(doctor: string, admittedAt: string, diagnosis: string, lastRoundNote: string): IpdEvent[] {
  return [
    ev('admission', admittedAt, 'Reception', `Admitted — ${diagnosis}`, { severity: 'info', patientText: 'You were admitted to the ward.' }),
    ev('round', hrsAgo(3), doctor, 'Doctor round', { detail: lastRoundNote, severity: 'info', patientText: 'Your doctor reviewed you and updated your care plan.' }),
  ]
}
```

In each seeded inpatient object: give every med `status: 'active', startedAt: ip.admittedAt` (use the same `hrsAgo(...)` value already used for `admittedAt`); give every test an `id: uid('t')` and `orderedAt: hrsAgo(8)`; add `events: seedEvents(DOC, <admittedAt>, <diagnosis>, <the round note>)`, and add `allergies`/`comorbidities` where natural (e.g., Kiran: `comorbidities: ['Type 2 Diabetes','Hypertension']`).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean once all seed literals match the new shapes.

### Task 3.3: Add `logEvent` and wire it into existing actions

**Files:**
- Modify: `src/store/useInpatientStore.ts`

- [ ] **Step 1: Add a `logEvent` action to the interface and implementation**

Interface addition:

```ts
  logEvent: (patientId: string, e: Omit<IpdEvent, 'id' | 'at'> & { at?: string }) => void
```

Implementation (uses the existing `patch` helper):

```ts
  logEvent: (id, e) => set(s => patch(s, id, ip => ({
    ...ip,
    events: [...ip.events, { id: uid('e'), at: e.at ?? new Date().toISOString(), ...e }],
  }))),
```

- [ ] **Step 2: Append events inside existing actions**

In each existing action's `set` updater, after computing the new inpatient, also push an event (do it in the same `patch` so it's atomic). Concretely:
- `recordRound`: push `ev('round', now, ip.admittingDoctor, 'Doctor round completed', { detail: data.note, severity: 'info', patientText: 'Your doctor completed a round and you are being monitored.' })`.
- `setCondition`: push `ev('condition_change', now, ip.admittingDoctor, \`Condition set to ${condition}\`, { severity: condition === 'Critical' ? 'critical' : 'info' })`.
- `addProgressNote`: push `ev('note', now, ip.admittingDoctor, 'Progress note', { detail: text })`.
- `requestSurgery`/`signConsent`/`scheduleSurgery`/`advanceSurgery`: push `ev('surgery_status', now, actor, \`Surgery: ${status}\`, { patientText: 'There is an update about your procedure.' })`.
- `initiateDischarge`/`clearPillar`/`setDischargeSummary`: push `ev('discharge_step', ...)`; `completeDischarge`: push `ev('discharged', now, ..., 'Discharged', { severity: 'success', patientText: 'You have been discharged. Take-home instructions are in your summary.' })`.
- `addMed`: push `ev('med_start', now, ..., \`Started ${med.name} ${med.dose}\`, { patientText: \`A new medicine (${med.name}) was started.\` })`.

(Concrete `ev(...)` calls shown above; mirror the pattern in each updater.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean.

### Task 3.4: Add the new clinical actions

**Files:**
- Modify: `src/store/useInpatientStore.ts`
- Reference: `src/store/useNotificationStore.ts` (for routed alerts)

- [ ] **Step 1: Add to the interface**

```ts
  discontinueMed: (patientId: string, medName: string, reason: string) => void
  changeMed: (patientId: string, medName: string, patch: Partial<Pick<MedOrder, 'dose' | 'freq' | 'route'>>) => void
  addTest: (patientId: string, t: { name: string; priority?: 'Routine' | 'Urgent' }) => void
  setTestResult: (patientId: string, testId: string, r: { result: string; critical?: boolean }) => void
  acknowledgeTest: (patientId: string, testId: string) => void
  setDiet: (patientId: string, diet: string) => void
  referInpatient: (patientId: string, r: { specialty: string; toDoctor?: string; reason: string; urgent: boolean }) => void
  requestIcuTransfer: (patientId: string, t: { reason: string; urgency: 'Routine' | 'Urgent' | 'Emergency' }) => void
  bookOT: (patientId: string, o: { procedure: string; surgeon: string; ot: string; scheduledAt: string }) => void
```

- [ ] **Step 2: Implement them (append events; route where stated)**

```ts
  discontinueMed: (id, name, reason) => set(s => patch(s, id, ip => ({
    ...ip,
    meds: ip.meds.map(m => m.name === name ? { ...m, status: 'stopped', stoppedAt: new Date().toISOString(), stopReason: reason } : m),
    events: [...ip.events, { id: uid('e'), at: new Date().toISOString(), type: 'med_stop', actor: ip.admittingDoctor, title: `Stopped ${name}`, detail: reason, patientText: `A medicine (${name}) was stopped.` }],
  }))),

  changeMed: (id, name, p) => set(s => patch(s, id, ip => ({
    ...ip,
    meds: ip.meds.map(m => m.name === name ? { ...m, ...p } : m),
    events: [...ip.events, { id: uid('e'), at: new Date().toISOString(), type: 'med_change', actor: ip.admittingDoctor, title: `Changed ${name}`, detail: Object.entries(p).map(([k, v]) => `${k}: ${v}`).join(', '), patientText: `Your ${name} dose was adjusted.` }],
  }))),

  addTest: (id, t) => set(s => patch(s, id, ip => ({
    ...ip,
    tests: [...ip.tests, { id: uid('t'), name: t.name, status: 'Ordered', priority: t.priority ?? 'Routine', orderedAt: new Date().toISOString() }],
    events: [...ip.events, { id: uid('e'), at: new Date().toISOString(), type: 'test_order', actor: ip.admittingDoctor, title: `Ordered ${t.name}`, patientText: `A test (${t.name}) was ordered.` }],
  }))),

  setTestResult: (id, testId, r) => set(s => patch(s, id, ip => ({
    ...ip,
    tests: ip.tests.map(t => t.id === testId ? { ...t, status: 'Ready', result: r.result, resultAt: new Date().toISOString(), critical: r.critical } : t),
    events: [...ip.events, { id: uid('e'), at: new Date().toISOString(), type: 'test_result', actor: 'Laboratory', title: `Result: ${ip.tests.find(t => t.id === testId)?.name ?? 'test'}`, detail: r.result, severity: r.critical ? 'critical' : 'success' }],
  }))),

  acknowledgeTest: (id, testId) => set(s => patch(s, id, ip => ({
    ...ip,
    tests: ip.tests.map(t => t.id === testId ? { ...t, status: 'Acknowledged', acknowledgedAt: new Date().toISOString() } : t),
  }))),

  setDiet: (id, diet) => set(s => patch(s, id, ip => ({
    ...ip, diet,
    events: [...ip.events, { id: uid('e'), at: new Date().toISOString(), type: 'diet_change', actor: ip.admittingDoctor, title: `Diet: ${diet}`, patientText: `Your diet was updated to: ${diet}.` }],
  }))),

  referInpatient: (id, r) => set(s => patch(s, id, ip => ({
    ...ip,
    referrals: [...(ip.referrals ?? []), { id: uid('ref'), at: new Date().toISOString(), status: 'sent', ...r }],
    events: [...ip.events, { id: uid('e'), at: new Date().toISOString(), type: 'referral', actor: ip.admittingDoctor, title: `Referred to ${r.specialty}${r.toDoctor ? ` (${r.toDoctor})` : ''}`, detail: r.reason, severity: r.urgent ? 'warning' : 'info', patientText: `You were referred to a ${r.specialty} specialist.` }],
  }))),

  requestIcuTransfer: (id, t) => set(s => patch(s, id, ip => ({
    ...ip,
    icuTransfer: { id: uid('icu'), at: new Date().toISOString(), status: 'requested', ...t },
    events: [...ip.events, { id: uid('e'), at: new Date().toISOString(), type: 'icu_transfer', actor: ip.admittingDoctor, title: 'ICU transfer requested', detail: t.reason, severity: 'warning', patientText: 'Your care team requested a move to intensive care for closer monitoring.' }],
  }))),

  bookOT: (id, o) => set(s => patch(s, id, ip => ({
    ...ip,
    otBooking: { id: uid('ot'), status: 'requested', ...o },
    stage: 'pre_op',
    events: [...ip.events, { id: uid('e'), at: new Date().toISOString(), type: 'ot_booking', actor: ip.admittingDoctor, title: `OT booked — ${o.procedure}`, detail: `${o.surgeon} · ${o.ot}`, patientText: 'Your procedure has been scheduled.' }],
  }))),
```

- [ ] **Step 3: Route ICU/OT/referral to the notification bus**

In the IPD page handlers that call these (added in M4), also call `useNotificationStore.getState().add({ ... })` targeting the relevant role (e.g., `bed_manager` for ICU, `ot` for OT, `doctor` for referral). Keep the store action pure; do the routing in the UI handler so stores stay decoupled. (Concrete `add(...)` calls are written in Task 4.4.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean.

### Task 3.5: Create the shared IPD format/label module

**Files:**
- Create: `src/lib/ipdFormat.ts`

- [ ] **Step 1: Write the module (DRY labels reused by table/drawer/chart)**

```ts
import type { IpdEventType, Condition, IpdStage } from '@/store/useInpatientStore'

export const CONDITION_TINT: Record<Condition, string> = {
  Critical: 'bg-red-100 text-red-700', Serious: 'bg-orange-100 text-orange-700',
  Stable: 'bg-sky-100 text-sky-700', Improving: 'bg-emerald-100 text-emerald-700',
  'Discharge-ready': 'bg-green-100 text-green-700',
}

export const STAGE_LABEL: Record<IpdStage, string> = {
  admitted: 'Admitted', under_treatment: 'Under treatment', pre_op: 'Pre-op',
  in_surgery: 'In surgery', post_op: 'Post-op', recovering: 'Recovering',
  discharge_initiated: 'Discharge in progress', discharged: 'Discharged',
}

export const EVENT_META: Record<IpdEventType, { label: string; color: string }> = {
  admission: { label: 'Admission', color: 'text-slate-500' },
  round: { label: 'Round', color: 'text-blue-600' },
  condition_change: { label: 'Condition', color: 'text-orange-600' },
  note: { label: 'Note', color: 'text-slate-600' },
  med_start: { label: 'Med started', color: 'text-teal-600' },
  med_stop: { label: 'Med stopped', color: 'text-rose-600' },
  med_change: { label: 'Med changed', color: 'text-amber-600' },
  test_order: { label: 'Test ordered', color: 'text-violet-600' },
  test_result: { label: 'Result', color: 'text-indigo-600' },
  diet_change: { label: 'Diet', color: 'text-lime-600' },
  referral: { label: 'Referral', color: 'text-cyan-600' },
  icu_transfer: { label: 'ICU transfer', color: 'text-red-600' },
  ot_booking: { label: 'OT booking', color: 'text-fuchsia-600' },
  surgery_status: { label: 'Surgery', color: 'text-fuchsia-700' },
  discharge_step: { label: 'Discharge', color: 'text-green-600' },
  discharged: { label: 'Discharged', color: 'text-green-700' },
}

export const fmtTime = (iso?: string) => iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
```

- [ ] **Step 2: Typecheck + milestone verification**

Run: `npx tsc --noEmit -p tsconfig.json` → clean.
Then a scripted check (`scripts/shoot-m3.cjs`): no UI yet for new actions, so verify via a tiny puppeteer eval that the store has the new actions — `await page.evaluate(() => Object.keys(window))` is unreliable; instead defer the visual gate to M4 (which renders the backbone). For M3, the gate is **typecheck clean + the existing IPD page still renders** (run `node scripts/sweep-doctor.cjs`, expect `ERRORS(0)` and `/doctor/ipd · OK`). Note: the existing card UI reads `ip.meds`/`ip.tests`; confirm it still renders after the shape change (it reads fields that still exist).

---

## Milestone M4 — IPD single-row table + actions menu + quick-peek drawer

### Task 4.1: Build the modals module

**Files:**
- Create: `src/components/doctor/ipd/ipdModals.tsx`

- [ ] **Step 1: Write the modals (Add med, Stop med, Order test, Refer, ICU, OT, Diet)**

A single client module exporting a `<IpdActionModal>` controlled by a discriminated `kind` prop, rendering the right form and calling the matching store action on submit. Concrete skeleton:

```tsx
"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { X } from "lucide-react"
import { useInpatientStore, type Inpatient } from "@/store/useInpatientStore"
import { useNotificationStore } from "@/store/useNotificationStore"
import { toast } from "sonner"

export type IpdModalKind =
  | 'add_med' | 'stop_med' | 'order_test' | 'refer' | 'icu' | 'ot' | 'diet' | null

export function IpdActionModal({ kind, patient, onClose }: { kind: IpdModalKind; patient: Inpatient; onClose: () => void }) {
  const store = useInpatientStore()
  const notify = useNotificationStore(s => s.add)
  if (!kind) return null
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" role="dialog" aria-modal="true">
        <Header title={TITLES[kind]} onClose={onClose} />
        {kind === 'add_med' && <AddMedForm patient={patient} store={store} onClose={onClose} />}
        {kind === 'stop_med' && <StopMedForm patient={patient} store={store} onClose={onClose} />}
        {kind === 'order_test' && <OrderTestForm patient={patient} store={store} onClose={onClose} />}
        {kind === 'refer' && <ReferForm patient={patient} store={store} notify={notify} onClose={onClose} />}
        {kind === 'icu' && <IcuForm patient={patient} store={store} notify={notify} onClose={onClose} />}
        {kind === 'ot' && <OtForm patient={patient} store={store} notify={notify} onClose={onClose} />}
        {kind === 'diet' && <DietForm patient={patient} store={store} onClose={onClose} />}
      </motion.div>
    </motion.div>
  )
}
```

Implement each sub-form with controlled inputs and the matching submit (full code for each form, e.g. `ReferForm` calls `store.referInpatient(patient.patientId, {...})` then `notify({ type:'referral', priority: urgent?'high':'medium', title:`Referral to ${specialty}`, body: reason, channels:['in_app'], targetRole:'doctor' })`, `toast.success`, `onClose`). `TITLES` maps each kind to a heading. (Each form is ~15 lines of standard controlled-input JSX following the compose-modal pattern in `src/app/doctor/inbox/page.tsx`.)

- [ ] **Step 2: Typecheck** → `npx tsc --noEmit -p tsconfig.json` → clean.

### Task 4.2: Build the ActionsMenu (kebab)

**Files:**
- Create: `src/components/doctor/ipd/ActionsMenu.tsx`

- [ ] **Step 1: Write the menu**

A kebab button that opens a popover of actions and calls back with an action id; the page maps ids to either opening a modal (`IpdModalKind`), opening the RoundModal, navigating to the chart, or running an existing flow (discharge).

```tsx
"use client"
import { useState, useRef, useEffect } from "react"
import { MoreVertical, Stethoscope, FileText, Pill, Ban, FlaskConical, GitBranch, Activity, Scissors, Utensils, LogOut } from "lucide-react"

export type IpdAction =
  | 'round' | 'chart' | 'add_med' | 'stop_med' | 'order_test' | 'refer' | 'icu' | 'ot' | 'diet' | 'discharge'

const ITEMS: { id: IpdAction; label: string; icon: React.ElementType }[] = [
  { id: 'round', label: 'Start round', icon: Stethoscope },
  { id: 'chart', label: 'Open full chart', icon: FileText },
  { id: 'add_med', label: 'Add medication', icon: Pill },
  { id: 'stop_med', label: 'Stop medication', icon: Ban },
  { id: 'order_test', label: 'Order test', icon: FlaskConical },
  { id: 'refer', label: 'Refer to specialist', icon: GitBranch },
  { id: 'icu', label: 'Shift to ICU', icon: Activity },
  { id: 'ot', label: 'Book OT / Plan surgery', icon: Scissors },
  { id: 'diet', label: 'Change diet', icon: Utensils },
  { id: 'discharge', label: 'Initiate discharge', icon: LogOut },
]

export function ActionsMenu({ onAction }: { onAction: (a: IpdAction) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button aria-label="Actions" onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-slate-100"><MoreVertical className="h-4.5 w-4.5 text-slate-500" /></button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-52 rounded-xl bg-white shadow-xl border border-slate-100 py-1.5">
          {ITEMS.map(it => (
            <button key={it.id} onClick={() => { setOpen(false); onAction(it.id) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50">
              <it.icon className="h-4 w-4 text-slate-400" /> {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck** → clean.

### Task 4.3: Build the InpatientRow + QuickPeekDrawer

**Files:**
- Create: `src/components/doctor/ipd/InpatientRow.tsx`
- Create: `src/components/doctor/ipd/QuickPeekDrawer.tsx`

- [ ] **Step 1: InpatientRow**

A `<tr>` showing avatar+name+id+admitted-since, Bed/Ward, condition badge (`CONDITION_TINT`), `STAGE_LABEL`, next-round countdown/⚠DUE (reuse `nextRound`/`isRoundDue` from the store), an AI-flag chip (placeholder text `'—'` until M8 wires `ipdInsights`), and the `<ActionsMenu>` in the last cell. Row `onClick` (excluding the menu cell) opens the quick-peek drawer.

- [ ] **Step 2: QuickPeekDrawer**

A right drawer (reuse the drawer pattern from `src/app/doctor/records/page.tsx`) showing vitals (last round), condition, last round note, an AI insight placeholder, quick action buttons (Start round / Add med), and a primary `Open full chart →` `Link` to `/doctor/ipd/[patientId]`.

- [ ] **Step 3: Typecheck** → clean.

### Task 4.4: Rewrite the IPD page to use the table + wire actions

**Files:**
- Modify: `src/app/doctor/ipd/page.tsx`

- [ ] **Step 1: Replace the card grid with a table; keep the rounds-due strip and RoundModal**

Read the current file first. Keep `RoundModal`, `SurgeryPanel`, `DischargePanel` definitions (they move to the full-page chart in M5; for M4 keep them importable). Replace the `grid lg:grid-cols-2` cards block with a `<table>` whose `<tbody>` maps `activeInpatients` to `<InpatientRow>`. Add page state: `const [drawerId, setDrawerId] = useState<string|null>(null)`, `const [modal, setModal] = useState<{ kind: IpdModalKind; id: string } | null>(null)`, plus the existing `roundFor`.

- [ ] **Step 2: Map row actions to handlers**

```tsx
const router = useRouter()
const notify = useNotificationStore(s => s.add)
const onAction = (id: string, a: IpdAction) => {
  if (a === 'round') return setRoundFor(id)
  if (a === 'chart') return router.push(`/doctor/ipd/${id}`)
  if (a === 'discharge') return // open existing discharge flow / navigate to chart Discharge tab
  if (a === 'add_med' || a === 'stop_med' || a === 'order_test' || a === 'refer' || a === 'icu' || a === 'ot' || a === 'diet')
    return setModal({ kind: a, id })
}
```

Mount `<IpdActionModal kind={modal?.kind ?? null} patient={byId(modal?.id)} onClose={() => setModal(null)} />` and `<QuickPeekDrawer ... />` at the bottom of the page. Routing notifications for refer/icu/ot are issued inside the modal forms (Task 4.1).

- [ ] **Step 3: Typecheck** → `npx tsc --noEmit -p tsconfig.json` → clean.

- [ ] **Step 4: Milestone verification — screenshot + console sweep**

Create `scripts/shoot-m4.cjs`: login Doctor → `/doctor/ipd`; screenshot the table `m4-table.png`; open a row's ⋮ menu, screenshot `m4-menu.png`; click "Add medication", fill + submit, screenshot `m4-addmed.png`; click a row to open the quick-peek drawer, screenshot `m4-drawer.png`. Collect console errors.
Run: `node scripts/shoot-m4.cjs`
Expected: dense one-row-per-patient table; kebab menu lists all actions; adding a med succeeds (toast) and the med appears; drawer opens with "Open full chart →"; `ERRORS(0)`.

---

## Milestone M5 — Full-page comprehensive chart `/doctor/ipd/[id]`

### Task 5.1: Scaffold the route + summary rail + tab shell

**Files:**
- Create: `src/app/doctor/ipd/[id]/page.tsx`

- [ ] **Step 1: Write the page shell**

```tsx
"use client"
import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useInpatientStore } from "@/store/useInpatientStore"
import { CONDITION_TINT, STAGE_LABEL } from "@/lib/ipdFormat"
import { OverviewTab, TimelineTab, RoundsTab, MedsTab, OrdersTab, ProcedureTab, ReferralsTab, DischargeTab } from "@/components/doctor/ipd/chart"

const TABS = ['Overview','Timeline','Rounds','Medications','Orders & Results','Procedure','Referrals','Discharge'] as const

export default function InpatientChart() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const ip = useInpatientStore(s => s.inpatients.find(p => p.patientId === id))
  const [tab, setTab] = useState<typeof TABS[number]>('Overview')
  if (!ip) return <div className="p-8 text-slate-500">Patient not found. <button onClick={() => router.push('/doctor/ipd')} className="text-blue-600 font-semibold">Back to IPD</button></div>
  return (
    <div className="flex gap-4 h-full min-h-0">
      <aside className="w-72 flex-shrink-0 rounded-2xl bg-white shadow-sm p-5 overflow-y-auto"> {/* summary rail: demographics, allergies, comorbidities, codeStatus, admission, condition + NEWS2 placeholder */} </aside>
      <section className="flex-1 min-w-0 flex flex-col rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
          <button onClick={() => router.push('/doctor/ipd')} aria-label="Back" className="p-1.5 rounded-lg hover:bg-slate-100"><ArrowLeft className="h-4 w-4" /></button>
          {TABS.map(t => <button key={t} onClick={() => setTab(t)} className={t === tab ? 'px-3 py-1.5 rounded-lg text-[13px] font-bold bg-blue-50 text-blue-700' : 'px-3 py-1.5 rounded-lg text-[13px] font-semibold text-slate-500'}>{t}</button>)}
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'Overview' && <OverviewTab ip={ip} />}
          {tab === 'Timeline' && <TimelineTab ip={ip} />}
          {tab === 'Rounds' && <RoundsTab ip={ip} />}
          {tab === 'Medications' && <MedsTab ip={ip} />}
          {tab === 'Orders & Results' && <OrdersTab ip={ip} />}
          {tab === 'Procedure' && <ProcedureTab ip={ip} />}
          {tab === 'Referrals' && <ReferralsTab ip={ip} />}
          {tab === 'Discharge' && <DischargeTab ip={ip} />}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck** (will FAIL until Task 5.2 creates the tab module) → expected error: cannot find `@/components/doctor/ipd/chart`.

### Task 5.2: Build the tab panels

**Files:**
- Create: `src/components/doctor/ipd/chart/index.tsx` (re-exports)
- Create: `src/components/doctor/ipd/chart/OverviewTab.tsx`, `TimelineTab.tsx`, `RoundsTab.tsx`, `MedsTab.tsx`, `OrdersTab.tsx`, `ProcedureTab.tsx`, `ReferralsTab.tsx`, `DischargeTab.tsx`

- [ ] **Step 1: Write each panel against the store**

- **TimelineTab:** map `ip.events` (newest-first) to a vertical timeline using `EVENT_META`/`fmtTime`, with a type filter (`useState` of selected types).
- **MedsTab:** two sections — Active (`status==='active'`) with a Stop button (opens stop reason → `discontinueMed`), and Discontinued (greyed, with `stopReason`/`stoppedAt`). An Add button (→ `addMed`).
- **OrdersTab:** list `ip.tests` with status; Ready results show the value + Acknowledge button (`acknowledgeTest`); an Order test button (`addTest`).
- **RoundsTab:** completed rounds history (reuse existing rendering) + Start round button.
- **ProcedureTab:** relocate the existing `SurgeryPanel` logic + OT booking (`bookOT`).
- **ReferralsTab:** list `ip.referrals` + ICU transfer status; buttons to refer / request ICU.
- **DischargeTab:** relocate the existing `DischargePanel`.
- **OverviewTab:** condition + vitals-of-last-round + active problems (comorbidities) + an AI-insight placeholder card (filled in M8).
- `index.tsx` re-exports all eight.

- [ ] **Step 2: Typecheck** → `npx tsc --noEmit -p tsconfig.json` → clean.

- [ ] **Step 3: Milestone verification — screenshot + console sweep + deep-link**

Create `scripts/shoot-m5.cjs`: login Doctor → `/doctor/ipd` → open a row ⋮ → "Open full chart" (or click row → drawer → "Open full chart"); screenshot `m5-overview.png`; click Timeline `m5-timeline.png`; Medications, stop a med, `m5-meds.png`; Orders & Results `m5-orders.png`. Then **hard-navigate** directly to `http://localhost:3000/doctor/ipd/PT-20394` (deep-link) and screenshot `m5-deeplink.png`. Collect console errors.
Run: `node scripts/shoot-m5.cjs`
Expected: full-page chart with working tabs; stopping a med moves it to Discontinued and adds a timeline event; deep-link renders (with persistence from M2 it survives the hard load); `ERRORS(0)`.

---

## Self-Review (against the spec)

**Spec coverage (M1–M5 portion):**
- M1 chatbot removal → Task 1.1 ✓
- M2 persistence (inpatient/messaging/stats/notification) → 2.1, 2.2 ✓; hydration fix → 2.3 ✓
- M3 event log + med/test lifecycle + new actions + logEvent + seeded events → 3.1–3.5 ✓
- M4 table + kebab + modals + quick-peek drawer + wiring → 4.1–4.4 ✓
- M5 full-page route + summary rail + 8 tabs → 5.1–5.2 ✓
- Routing (decide→route→track) for refer/ICU/OT → notification `add` in 4.1/3.4-step3 ✓
- M6–M18 → **out of scope for this plan** (separate plans per the spec; design doc remains the master).

**Placeholder scan:** The only intentional "placeholder" UI is the AI-insight/AI-flag chip text, explicitly deferred to M8 and called out — not a plan gap. No "TBD/handle edge cases/write tests for the above".

**Type consistency:** `IpdEvent`, `MedOrder.status`, `TestOrder.id/status`, and action names (`discontinueMed`, `changeMed`, `addTest`, `setTestResult`, `acknowledgeTest`, `setDiet`, `referInpatient`, `requestIcuTransfer`, `bookOT`, `logEvent`) are defined in M3 and used identically in M4/M5. `IpdAction` (UI) vs `IpdModalKind` are distinct on purpose (menu has `round`/`chart`/`discharge` that aren't modals). `ipdFormat.ts` exports (`CONDITION_TINT`, `STAGE_LABEL`, `EVENT_META`, `fmtTime`) match their M4/M5 imports.

**Note on the generic skill's TDD/commit steps:** intentionally replaced with this repo's real verification (typecheck + Puppeteer + console sweep) and no-git checkpointing, per the established project pattern.
