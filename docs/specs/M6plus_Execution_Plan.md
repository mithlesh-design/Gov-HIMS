# M6+ Execution Plan · closing the 263-gap inventory

> Milestone-based roadmap to close [M5c_Gap_Inventory.md](M5c_Gap_Inventory.md). Picks up after `checkpoint/M5b-final`. Stays inside Phase-1 scope (mock-API boundary preserved).

**Source list:** [M5c_Gap_Inventory.md](M5c_Gap_Inventory.md) — 263 gaps across 24 roles + 9 cross-cutting areas.

**Ordering principle:** Foundation first (notifications), then biggest visible wins (4 🔴 dead surfaces), then domains in impact order.

**Non-negotiables every milestone must hold:**
1. Regression suite stays **54/54 · 0 console errors**
2. Flow walker stays **16/16 PASS · 0 console errors**
3. Hero-journey walker re-runs cleanly (re-screenshot at milestone close)
4. Each milestone closes with a `checkpoint/M{N}-<scope>` tag + a Markdown closure note appended to [CHECKPOINTS.md](CHECKPOINTS.md)
5. STOP gate at each milestone close — user reviews before next starts

---

## Milestone summary

| ID | Title | Closes gaps | Effort | Pillar |
|---|---|---|---|---|
| **M6** | Notification & Handoff Backbone | 50 (all "no notification emitted" + AppShell bell + dispatcher) | 3–4 days | foundation |
| **M7** | Dead-Surface Activation (4 🔴 roles) | 17 (inventory + cssd + bmw + ambulance) | 5–6 days | KareXpert-gap closer |
| **M8** | Patient Super-app Completion | 35 (patient 27 + kiosk 5 + family-track 4) | 4–5 days | patient-facing |
| **M9** | Clinical Polish (5 🟡 clinical roles) | 51 (nurse + emergency + radiology + lab + pharmacy + doctor) | 6–8 days | clinical safety |
| **M10** | Operations & Finance Polish | 35 (reception + admission + discharge + ot + billing + insurance) | 5–6 days | workflow throughput |
| **M11** | Admin Completion + Cockpit Actuators | 32 (admin 25 + quality 7) | 6–8 days | governance |
| **M12** | Setup · Settings · Audit · I18n | 43 (cross-cutting + housekeeping/blood_bank/dietary/mortuary/audit_officer) | 4–5 days | tail polish |

**Total: 263 gaps · ~33–42 working days · 7 milestones**

Each milestone is independently shippable. Run **strictly in order** (M6 first — it unblocks every other milestone's notification work).

---

## M6 — Notification & Handoff Backbone (foundation)

**Why first:** 50 of the 263 gaps are "X mutates but Y isn't notified." Building the notification primitive once and wiring the 10 consolidated cross-role breaks lets every later milestone reuse it.

### Scope
Closes:
- All 7 `NotificationStore + dispatcher` gaps (M5c §Cross-cutting)
- All 10 cross-role notification breaks (M5c §Cross-role notification gaps)
- AppShell bell click (gap §AppShell #1)
- Specific role-level "no notification emitted" gaps:
  - admission #1, #2 (bed-assign, mark-arrived → nurse + doctor)
  - discharge #1, #2, #5 (pillar toggle, exit clearance → housekeeping, blocker resolve)
  - pharmacy #2 (mark-ready → ward)
  - reception #7 (ambulance dispatch → fleet)
  - ot #1 (schedule → anaesthetist)
  - doctor #6, #7 (discharge initiate, ER admission escalate)
  - nurse #6 (rounds complete → doctor)

### Build
1. **Audit notifyAndAudit helper** — new `src/lib/notifyAndAudit.ts` wrapping `useNotificationStore.add` + `useAuditStore.log` in a single typed call. Pattern: `notifyAndAudit({ to: 'nurse', from: 'admission', subject, body, audit: { action, resource, resourceId, detail } })`
2. **Notification panel** — new `src/components/layout/NotificationPanel.tsx` (drawer style), opened by clicking the bell in AppShell. Filters by activeRole. Mark-read / archive / open-source.
3. **Audit the 10 cross-role breaks** — drop `notifyAndAudit` calls at each break site listed in M5c.
4. **Audit the per-role notification gaps** — touch the specific files listed above.

### Files to touch (read first, then edit)
- New: `src/lib/notifyAndAudit.ts`, `src/components/layout/NotificationPanel.tsx`
- Edit: `src/components/layout/AppShell.tsx` (bell onClick → panel)
- Edit (12 files): all listed under "role-level notification emit" gaps above

### Verification gate
- Regression 54/54
- Flow walker 16/16 · 0 errors
- **New assertion:** add to `scripts/regression-suite.cjs`: "Bell shows count > 0 after a seeded state-change" + "Notification panel opens when bell clicked"
- Smoke test: walk admission → bed assigned → confirm notification arrives in nurse's panel

### Deliverable
- `checkpoint/M6-notification-backbone`
- CHECKPOINTS.md row + section

---

## M7 — Dead-Surface Activation (the 4 🔴 roles)

**Why second:** Headline KareXpert-gap closer. After M7, inventory + cssd + bmw + ambulance go from looking-real-but-dead to actually operable. Biggest visible-credibility delta per token spent.

### Scope
Closes all 17 gaps in:
- **inventory** (4 gaps): reorder flow, receive delivery, repair scheduling, dashboard CRUD
- **cssd** (4 gaps): cycle start/fail/retry, instrument lifecycle (sterilized/quarantine), maintenance scheduling
- **bmw** (3 gaps): log create, mark-disposed, non-compliant reason, cert upload
- **ambulance** (4 gaps): dispatch with map, driver notification, return-from-trip, fuel log
- **mortuary** (3 gaps): mark-cleared/release, print cert, MLC police routing

(Mortuary is bundled here — it's the 5th read-heavy support role; small enough to fit)

### Build
1. **inventory** — `useInventoryStore.createRequisition / receiveDelivery / scheduleRepair` mutations (if missing) + form wiring in `src/app/inventory/stock/page.tsx` + new `src/app/inventory/dashboard/page.tsx`
2. **cssd** — `useCSSDStore.startCycle / markPassed / markFailed / scheduleMaintenance` + form wiring in `src/app/cssd/cycles/page.tsx` + `src/app/cssd/instruments/page.tsx`
3. **bmw** — `useBMWStore.createLog / markDisposed / flagNonCompliant + attachCertificate` + form in `src/app/bmw/log/page.tsx`
4. **ambulance** — `useAmbulanceStore.dispatch / assignDriver / completeTrip / logFuel` + map placeholder (Leaflet or static SVG) + form in `src/app/ambulance/dispatch/page.tsx`
5. **mortuary** — `useMortuaryStore.markCleared / releaseBody / generateCertificate` + form in `src/app/mortuary/records/page.tsx`
6. Each mutation uses M6's `notifyAndAudit` so downstream roles are notified.

### Verification gate
- Regression 54/54 · 0 errors
- Flow walker 16/16 · 0 errors
- Hero-journey re-shoot — confirm new mutation paths render at each beat

### Deliverable
- `checkpoint/M7-dead-surfaces-live`

---

## M8 — Patient Super-app Completion

**Why now:** Patient portal is the second-most-visible KareXpert-gap closer (after M7). Closes the "portal is a brochure" criticism by wiring real CTAs.

### Scope
Closes 35 gaps:
- All 27 patient page gaps (M5c §patient)
- All 5 kiosk gaps (M5c §checkin)
- All 4 family-track gaps (M5c §family-track)

### Build
1. **Mock payment confirmation flow** — `src/lib/mockPayment.ts` (returns a confirmation envelope; simulates UPI/card success after 800 ms). Wire into patient/orders, patient/billing, patient/medications. Audited.
2. **Cross-role write-through** — patient appointment book → reception queue write; patient reschedule → doctor calendar write; patient reorder → pharmacy queue write. Audited.
3. **Profile edit mode** — `src/app/patient/profile/page.tsx` — toggle to edit mode; persist back to usePatientProfileStore.
4. **File uploads on patient side** — insurance doc, profile docs. New `src/components/patient/FileUploadCard.tsx` (mock: stores file metadata + base64 thumbnail in store).
5. **Teleconsult stub video** — `src/app/patient/teleconsult/page.tsx` — replace toast with a self-contained webcam stub (`navigator.mediaDevices.getUserMedia` with graceful fallback to a static frame) for the demo.
6. **Kiosk → reception notification** — wire kiosk completion via M6's `notifyAndAudit`.
7. **Family-track refresh** — subscribe to `usePatientLiveStore` so condition / location / wait-time updates flow through. Nurse-side approval queue for camera requests.
8. **Patient settings + notification prefs page** — new `src/app/patient/settings/page.tsx`.
9. **Profile read-only fix** — link gap §patient #25 + §settings #1.

### Verification gate
- Regression 54/54 · 0 errors
- Flow walker 16/16 · 0 errors
- Hero-journey close-up of patient dashboard (Kiran) showing pay-flow + reorder + reschedule actually mutating

### Deliverable
- `checkpoint/M8-patient-superapp-complete`

---

## M9 — Clinical Polish (5 clinical roles + doctor)

**Why now:** With notifications + patient portal solid, fill the clinical-side gaps. This is where safety + NABH compliance live.

### Scope
Closes 51 gaps:
- nurse (13)
- emergency (7)
- radiology (10)
- lab (8)
- pharmacy (9)
- doctor (11) — minus the ones already covered by M6 notification work, so ~7 new

### Build (per role, in priority order)
1. **emergency** (safety-critical): NEWS2 auto-alert on save; vital range validation (HR 30–200, SpO2 70–100, etc.); patient dedup check; ChiefComplaint + SOAP capture; order entry from ER (lab + Rx + imaging).
2. **nurse** (NABH-critical): wound care notes, fall-risk assessment, pressure-ulcer prevention, care-plan ownership module (new components under `src/components/nurse/`). MAR-held requires reason field. Rounds-complete notify (already in M6 — verify).
3. **radiology**: PACS image upload + viewer wire-up (use object URLs for the demo); BI-RADS / LI-RADS structured-finding pickers in the report templates; prior-comparison sidebar in the viewer.
4. **lab**: TAT-breach auto-escalate (use M6's notifyAndAudit); reject-specimen auto-creates recollect order; callback-recipient bound to staff directory.
5. **pharmacy**: substitution audit captures reason + approver; out-of-stock alt relay (notify doctor + patient).
6. **doctor**: complete the consultation workspace (`src/app/doctor/consultation/page.tsx` currently redirects — build a real surface); discharge-route notify (already M6 — verify); settings persist; transfer-request actual mutation.

### Verification gate
- Regression 54/54 · 0 errors
- Flow walker 16/16 · 0 errors + add walker steps for new ER SOAP + nurse wound-care surfaces
- Add 5 new regression assertions covering safety-critical paths (NEWS2 alert, MAR-held reason required, etc.)

### Deliverable
- `checkpoint/M9-clinical-polish`

---

## M10 — Operations & Finance Polish

**Why now:** With clinical safety done, throughput + revenue. These were 🟡 PARTIAL in the capability audit.

### Scope
Closes 35 gaps:
- reception (7), admission (5), discharge (6), ot (5), billing (7), insurance (5)

### Build
1. **reception**: real print/download (PDF gen via `react-to-print` or `pdfmake`); on-shift / availability validation in walk-in form; ambulance-dispatch notification (M6 path).
2. **admission**: bed-assign / mark-arrived notification (M6 path — verify); bed master + capacity config (new `src/app/admission/setup/page.tsx`); primary-nurse select-to-assign.
3. **discharge**: pillar-toggle notification (M6 path — verify); exit-clearance → housekeeping (M6 path — verify); replace hardcoded AI_SUMMARY_TEMPLATE with a deterministic-but-personalised generator (uses M0 audit + IPD events as source); discharge-summary edit form.
4. **ot**: room-availability + surgeon-conflict check; pre-op-requirement submit; checklist sign-off workflow (surgeon + anaesthetist + nurse); PDF OT list.
5. **billing**: "Apply to Bill" + "+ New Package" handlers; package master setup screen (`src/app/billing/setup/page.tsx`); rate-card editor; refund-reject patient notification (M6 path).
6. **insurance**: pre-auth submit-to-TPA flow (mock TPA response); claim file/init form (`src/app/insurance/claims/new/page.tsx`); document upload + linking; AI-card-verify replaced with deterministic validator that respects policy + period.

### Verification gate
- Regression 54/54 · 0 errors
- Flow walker 16/16 · 0 errors
- Hero-journey re-shoot: confirm Anil's bill freezes → notification fires; pre-auth submit → status renders

### Deliverable
- `checkpoint/M10-ops-finance-polish`

---

## M11 — Admin Completion + Cockpit Actuators

**Why now:** Admin is the largest single-role gap bucket (25 gaps) and the W3 cockpits' "Action" buttons currently only audit-log without mutating — making them decorative.

### Scope
Closes 32 gaps:
- admin (25)
- quality (7)

### Build
1. **AddStaffWizard** persist login ID + send invite (mock email envelope via notification store).
2. **Payroll**: individual PDF payslip; lock-period notification to Finance + HR; deduction rate moved to config (new admin/setup screen).
3. **Vendors**: real payment-gateway envelope (mock NEFT response); invoice PDF download.
4. **Roster**: bulk template UI; swap-request approval flow.
5. **Missing admin pages**: `/admin/on-call` (rotation editor + escalation path); `/admin/hours` (manual OT entry + approval gate before payroll lock); `/admin/coverage` (request-additional-staff CTA).
6. **Compliance**: NABH document upload flow (links into M11 attach-evidence); DPDP self-audit "Submit attestation" wiring.
7. **Statutory**: filing workflow (draft → submitted → filed) with deadline tracker.
8. **Credentials**: "Renew credential" button + auto-expiry notification (M6 path).
9. **Disputes**: Resolve form submit wiring.
10. **W3 cockpit actuators** — each cockpit Action button now:
    - PredictiveOps S7: actually open the staffing or OR-reservation drawer with prefilled action
    - RCM S8: actually navigate to billing/insurance queue filtered to the finding
    - NABH S9: actually navigate to remediation desk (already does — verify)
    - DPDP S10: actually open a remediation drawer
11. **Quality**: incident escalation on Critical severity; CAPA template on resolve; quality dashboard surface (open / critical / trend tiles + linked-doc upload).

### Verification gate
- Regression 54/54 · 0 errors
- Flow walker 16/16 · 0 errors
- New assertion: W3 cockpit Action button results in observable state change (not just audit)

### Deliverable
- `checkpoint/M11-admin-cockpits-actuated`

---

## M12 — Setup · Settings · Audit · I18n (tail)

**Why last:** Pure polish — system-wide concerns and remaining support-services gaps. Closes the file cleanly.

### Scope
Closes 43 gaps:
- housekeeping (5), blood_bank (5), cssd (already in M7), dietary (3), bmw (already in M7), mortuary (already in M7), audit_officer (4)
- Setup / Settings (4)
- I18n (4)
- Upload + download (4)
- WhatsApp outbound (3) — visible polish, even if backend stays mock
- Messaging / chat (5)
- Audit coverage (5)
- CommandPalette (3)

### Build
1. **housekeeping**: assignment notification (M6 path — verify); photo upload on Mark-Done; SLA timer + reassign on no-start; bulk pending-for-next-shift.
2. **blood_bank**: Add-Unit modal; Reserve / Cross-match transitions; Expire / Discard action; donor registration form; dashboard low-stock alerts.
3. **dietary**: edit / approve plan; mark-delivered action; flag-allergy-conflict resolve flow.
4. **audit_officer**: PDF export; full-entry JSON download; reports surface (NABH compliance + monthly summary); retention metric tiles.
5. **Setup centralization** — new `src/app/admin/setup/page.tsx` aggregating: bed master, package master, rate card, payer master, on-call rotation, NABH/DPDP rules, audit retention policy, notification channel testing.
6. **Patient + per-role settings** — new `src/app/<role>/settings/page.tsx` with locale persistence, notification prefs (channel toggles), reminder timing, theme.
7. **Upload + download infra** — new `src/lib/fileIO.ts` providing `uploadFile(file, meta) → { id, url }` (mock URL via object URL) + `downloadAs(filename, blob)`. All "Download" / "Share" / "Upload" buttons across the codebase rewired to use these helpers. PDF generation via `pdfmake` for receipts / summaries / payslips.
8. **WhatsApp polish** — `useWhatsAppStore.addMessage` writes to a real outbound queue table + UI shows "Sent (mock)" status; escalate-to-human pages a mock supervisor.
9. **Messaging persistence** — group chats; receive() simulated via store subscription so cross-role visibility works end-to-end.
10. **Audit coverage gaps** — patient actions audit-logged; consent toggles audit-logged; audit retention metadata on every row.
11. **I18n completion** — extract all hardcoded strings into `src/i18n/messages/en.json` + `hi.json`. Add `i18next-scanner` script `scripts/i18n-scan.cjs` that fails CI on hardcoded UI strings.
12. **CommandPalette polish** — intents pre-fill patient + test type; patient nav opens record in context; staff directory available to all clinical roles.

### Verification gate
- Regression 54/54 · 0 errors
- Flow walker 16/16 · 0 errors
- New: `scripts/i18n-scan.cjs` passes (0 hardcoded strings outside whitelist)
- Final hero-journey re-shoot: 10/10 beats clean

### Deliverable
- `checkpoint/M12-tail-complete` (final)
- Final consolidated doc 10 v3.0 reflecting all changes
- M0-M12 final summary in CHECKPOINTS.md

---

## Working pattern (every milestone)

```
1. Read the milestone scope from this doc
2. Read the specific gap entries from M5c_Gap_Inventory.md
3. TodoWrite — one todo per scope item
4. For each scope item:
   - Open the file
   - Make the smallest change that closes the gap
   - tsc --noEmit → must be 0 errors
5. Run regression-suite.cjs → must be 54/54 · 0 errors
6. Run flow-walker.cjs → must be 16/16 · 0 errors
7. Update CHECKPOINTS.md row + section
8. Commit + tag checkpoint/M{N}-<scope>
9. Push
10. STOP — wait for user "go" before next milestone
```

## Cadence
- Solo / linear: ~7 weeks calendar time
- With 2 engineers in parallel after M6: ~4 weeks (M6 first as foundation, then M7/M8 parallel, then M9/M10 parallel, then M11/M12 parallel)
- One milestone per sprint is realistic for ship-quality

## Risk register
- **R1** — Notification panel UI might trigger SSR mismatches like CriticalValueBanner did. **Mitigation:** Apply the M5b mount-gated pattern from day 1.
- **R2** — Adding mutation paths could break a currently-passing regression assertion. **Mitigation:** Re-run regression after EACH file, not at milestone end.
- **R3** — Real PDF / real video / real file-upload deps could bloat the bundle. **Mitigation:** Lazy-load (`dynamic(() => import())`) all of pdfmake / mediaDevices / image-processing libraries.
- **R4** — Scope creep mid-milestone. **Mitigation:** This doc IS the contract. Any extra ask = next milestone, not this one.

## Out of scope (explicitly)
- Real backend (mock-API stays)
- Real LLM swap (engine envelopes stay; bodies stay deterministic)
- Real WhatsApp / SMS / payment / OCR / PACS / DICOM viewer
- Real auth (sticky-demo role-picker stays)
- Multi-tenant
- Mobile native apps

These all live in Phase 2 — see [Phase 2 swap points in v2.0](10_Competitive_Innovation_v2_0.docx).
