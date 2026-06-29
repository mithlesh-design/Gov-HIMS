# Pharmacy v3 — Unified Tagged Queue (Design)

> Supersedes the Pharmacy v2 "closed-loop" design. Rebuilds the pharmacist
> workflow around a single, source-tagged, row-based queue with a claim model
> and full collected-record audit. Goal: **simple to manage, very fast.**

**Date:** 2026-05-27
**Module:** Pharmacy (role `pharmacy`, demo user PH-301 Ritu Sharma)

---

## Why v2 was wrong

User review of v2 flagged: no quantity edit, card layout (wanted rows), no
collected record-keeping, a confusing "Dispense & Verify" page, a separate
"Discharge Meds" page, no multi-pharmacist claim model, no out-of-stock flow,
and a human-edited Drug Master. v3 fixes all of these.

## Core model: one queue, every order is a tagged row

There is **one** working surface — **Prescription Queue** — separate from a
slim stats **Dashboard**. Every medicine order for any patient lands as **one
row**, stamped with its source:

`OPD` · `IPD` · `OT` · `ICU` · `Home Rx` · `Discharge`

The Queue page has two tabs:

- **Queue** — active orders (incoming + being dispensed)
- **Collected** — completed history (the audit ledger)

A `All / My counter` filter turns the global queue into each pharmacist's
personal worklist.

Every row (both tabs) shows: **patient · token/UHID · source tag · doctor ·
dept · medicines · payment mode · bill · status**. Collected rows additionally
show **dispensed by · collected by · collected at**.

### Status flow (3 clicks max)

`queued (unclaimed)` → **Accept** → `preparing (my counter)` → **Mark ready**
(notifies patient/ward) → **Mark collected** (record collector) → `collected`.

## Two clearly separate data sources

- **Drug Master** = the *catalog* (name, strength, schedule, price band).
  AI-generated, **read-only, zero human input**. The dictionary doctors
  prescribe from.
- **Pharmacy Inventory** = *physical stock on hand*, managed within Pharmacy
  (qty, reorder, restock, **Purchase Orders inbox**). Dispensing decrements it.

Doctor prescribes from Drug Master → order hits the Queue → pharmacist checks
it against Inventory → in stock = dispense (decrement); not in stock =
out-of-stock flow.

## Quantity editing (restored)

Expand a row → each medicine line has a `[−] qty [+]` stepper; the bill
recomputes live. Reducing below the prescribed amount asks for a one-tap reason
(out of stock / partial / patient declined). Original-vs-adjusted is preserved
in `quantityModifications` (existing audit).

## Multi-pharmacist claim model

Rows start **Unclaimed** in the global queue. **Accept** assigns the row to the
acting pharmacist (`assignedTo`) and moves it to `preparing`; the `My counter`
filter is that person's worklist. **Mark collected** records `dispensedBy =
assignedTo`. This distributes workload and prevents double-dispensing. Demo
seeds some rows already claimed by another pharmacist (Anil Kumar, PH-302).

## Out-of-stock flow (visible on three panels)

Each medicine line carries `inStock` (checked against inventory) and `supply`
(`pharmacy | advised_outside | order_raised`). When a prescribed drug is not in
inventory:

- **Pharmacy** — red "not in stock" flag on the row; two actions:
  **Order from Inventory Manager** (raises a Purchase Order, sets
  `supply = order_raised`) or **Mark advised-outside** (`supply =
  advised_outside`).
- **Doctor** — a "Pharmacy stock alerts" card lists their patients' out-of-stock
  meds; an **Advise patient to buy outside** button sets `supply =
  advised_outside`.
- **Patient** (`/patient/pharmacy`) — read-only badge per med: "not stocked —
  advised to purchase outside" / "being procured".

Purchase Orders land in the Inventory page's **Purchase Orders** inbox; marking
one **received** restocks that drug.

## Discharge integration preserved

Discharge TTO meds are just `Discharge`-tagged rows. Collecting one still calls
`useDischargeStore.setClearance(patientId, 'pharmacy', 'cleared')`, keeping the
discharge-pillar loop intact. The standalone Discharge Meds page is removed.

## AI Drug Master

`/pharmacy/master` becomes a **read-only AI-curated catalog**: drug, class,
schedule, typical dosing, interactions, price band. Header banner: "Maintained
automatically by AI — no manual entry." A simulated "Re-sync with AI" button
(toast only). No add/edit/delete UI.

---

## Data model changes

### `usePharmacyStore.ts`

```ts
export type RxSource = 'OPD' | 'IPD' | 'OT' | 'ICU' | 'Home Rx' | 'Discharge'
export type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Insurance' | 'Credit'
export type MedSupply = 'pharmacy' | 'advised_outside' | 'order_raised'
export type Pharmacist = { id: string; name: string }

// PharmacyMedicine gains: inStock?: boolean; supply?: MedSupply
// PharmacyPrescription gains:
//   source: RxSource; paymentMode: PaymentMode
//   assignedTo?: Pharmacist; dispensedBy?: Pharmacist
//   collectedBy?: string; collectedAt?: string
```

Actions: `claim(rxId, pharmacist)`, `release(rxId)`,
`markCollected(rxId, collectedBy)` (now records collector + dispensedBy + ts),
`setMedicineSupply(rxId, medName, supply)`. Keep `addPrescription`,
`updateStatus` (notify on ready), `adjustQuantity`, `approveSupervisorOverride`.
Reseed with source/paymentMode, claimed-by-others rows, an out-of-stock med, and
a couple of collected rows with full audit.

### `usePharmacyInventoryStore.ts`

```ts
export type PurchaseOrder = {
  id: string; drug: string; qty: number; forPatient?: string
  raisedBy: string; status: 'pending' | 'ordered' | 'received'; raisedAt: string
}
```

Actions: `raisePurchaseOrder(po)`, `setPOStatus(id, status)` (on `received` →
restock the matching item). `inStockByName(name)` helper for availability checks.

## Pages

- **Create** `src/app/pharmacy/queue/page.tsx` — the unified row-based queue.
- **Rewrite** `src/app/pharmacy/master/page.tsx` — AI read-only catalog.
- **Rewrite** `src/app/pharmacy/dashboard/page.tsx` — KPI stats only (unclaimed,
  my counter, ready, out-of-stock, collected today) + small live preview → Queue.
- **Edit** `src/app/pharmacy/inventory/page.tsx` — add Purchase Orders inbox.
- **Edit** `src/app/patient/pharmacy/page.tsx` — per-med availability badges.
- **Edit** doctor dashboard — "Pharmacy stock alerts" card + advise-outside.
- **Delete** `src/app/pharmacy/dispense/page.tsx` and
  `src/app/pharmacy/discharge-meds/page.tsx`.
- **Edit** `src/components/layout/AppShell.tsx` — PHARMACY_SECTIONS: Overview
  (Dashboard), Prescription Queue, Inventory, Drug Master, Narcotics Log,
  Messaging. Remove Dispense & Verify + Discharge Meds.

## Milestones (verify after each: typecheck + Puppeteer + 0 console errors)

- **M1 — Store + seed.** Extend pharmacy store types/actions + reseed; add
  PurchaseOrders + helpers to inventory store. Typecheck only.
- **M2 — Unified Queue page.** Rows, Queue/Collected tabs, All/My filter, source
  chips, payment mode, bill, claim→ready→collected, qty steppers, AI safety
  badge, out-of-stock actions, Discharge clearance hook. Nav rewire; delete the
  two old pages.
- **M3 — Inventory Purchase Orders inbox.** Out-of-stock orders appear; mark
  ordered/received → restock.
- **M4 — AI Drug Master.** Read-only AI catalog, no human input.
- **M5 — Cross-panel out-of-stock + Dashboard.** Patient badges, doctor stock
  alerts + advise-outside, KPI dashboard refresh.

## Testing

Puppeteer (puppeteer-core, headless Chrome) per existing
`scripts/shoot-pharmacy.cjs` pattern, extended to: accept a row, edit a qty,
mark ready→collected (collector recorded), see it in Collected tab; out-of-stock
order → appears in Inventory PO inbox; patient sees availability badge; doctor
sees stock alert. Target 0 console errors. SPA navigation only (no `page.goto`
after login) since the pharmacy store is in-memory.
