# Pharmacy v2 — Full closed-loop

> Execute inline, milestone-by-milestone, with typecheck + Puppeteer + console-sweep (target 0). Reuse existing patterns (notifications, messaging bus, drugSafety gate, discharge pillars).

**Decisions (approved):** full closed-loop wiring · sectioned menu (Fulfilment / Stock & Compliance / Utilities) + Discharge Meds (TTO) + Messaging.

**Core shift:** Dispense becomes the real work surface fed by the live `usePharmacyStore`; "ready/collected/dispensed" events flow OUTWARD to the patient bell, the ward/MAR, and the discharge desk — closing the loop like orders/escalation/handoffs.

---

### M1 — Sectioned menu + Messaging
- `PHARMACY_SECTIONS` in AppShell (Fulfilment: Prescription Queue, Dispense & Verify, Discharge Meds; Stock & Compliance: Inventory, Drug Master, Narcotics Log; Utilities: Messaging). Wire `navByRole.pharmacy` + `sectionsByRole.pharmacy`.
- `/pharmacy/messages` reusing the shared messaging bus (pharmacist PH-301).

### M2 — Dispense wired + close the loop
- `/pharmacy/dispense` reads `usePharmacyStore` (OPD + IPD), real allergy/interaction gate (`drugSafety`/drug master), qty-adjust + supervisor override (existing actions), `updateStatus → 'ready'` fires `medicines_ready` notification (patient + ward for IPD), `markCollected`.
- Store: add a `dispense(id, by)` helper if needed for the ready→notify side-effect.

### M3 — Patient pharmacy page = real
- `/patient/pharmacy` reads `usePharmacyStore` for the logged-in patient: live Rx status (queued→preparing→ready→collected), ready alert, bill from `UNIT_PRICES`. Replace hardcoded `MEDS`.

### M4 — Discharge TTO → pharmacy → clears pharmacy pillar
- Routing: discharge summary's TTO meds → `addPrescription` (flagged discharge/TTO). `/pharmacy/discharge-meds` lists them; dispensing sets the discharge `pharmacy` clearance pillar (`useDischargeStore.setClearance`).

### M5 — Inventory + Narcotics real stores
- `usePharmacyInventoryStore` (stock, reorder, `decrement` on dispense) backing `/pharmacy/inventory`. `useNarcoticsStore` (log; `logDispense` appends a dual-sign entry) backing `/pharmacy/narcotics`. Dispense decrements stock + auto-logs Schedule H/X.
