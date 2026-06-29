# Doctor Panel v3 — Phase 5 (M1–M8) Plan

> Execute inline, milestone-by-milestone, with typecheck + screenshot/console verification each (no unit tests / not a git repo). Turns captured/simulated seams into connected/enforced behavior.

**Decisions:** real-LLM stays a ready-to-plug seam (deferred); messaging = bridge reception onto the existing bus (not a full multi-portal rebuild).

---

### M1 — Printable documents + e-signature
- **Create** `src/lib/printDoc.ts`: pure `buildDocHtml(doc)` → standalone HTML string (hospital header, patient block, body, e-signature footer, print CSS) + `openPrint(doc)` (opens a window, writes, prints). No dependencies.
- **Wire** a "Print / Export" action on: OPD prescription panel ([dashboard/page.tsx](../../src/app/doctor/dashboard/page.tsx)), IPD discharge ([panels.tsx DischargePanel](../../src/components/doctor/ipd/panels.tsx)), and copilot draft cards ([ai-assistant/page.tsx](../../src/app/doctor/ai-assistant/page.tsx)). Signature pulled from `useDoctorProfileStore`.
- **Accept:** print action generates a complete document (verified by intercepting `window.open` and asserting content + signature).

### M2 — Settings made real
- Consultation **fee** (`useDoctorProfileStore`) recorded on completed visits + shown at the OPD billing handoff; **hours** shown on My Schedule; **"On leave"** shows a banner on doctor surfaces and guards "Start consultation"/online start with a confirm.
- Polish: stats seed date-drift fix (re-anchor or partialize); `/doctor/settings` breadcrumb label.
- **Accept:** toggling On-leave shows the banner + guards consult start; fee appears on a completed consult; hours show on schedule.

### M3 — Live results engine
- **Create** a ticking simulation (`src/lib/useResultsTicker.ts` or a store interval) that advances lab/radiology orders Ordered→In progress→Ready over time and (for the logged-in doctor's orders) fires results + critical alerts into the inbox; existing sign-off clears them.
- **Accept:** with the doctor idle on Inbox→Results, a new result appears within the demo window without a reload.

### M4 — Reception on the bus
- Bridge reception messaging onto the shared `useMessagingStore`: add a Staff Messages surface to reception (or point its existing "Team inbox" at the bus) so doctor↔reception flows through `StaffMessages` with `meId` = reception's id.
- **Accept:** a doctor→reception message appears in the reception portal (mirrors the doctor↔nurse proof).

### M5 — NEWS2 completion + trend
- Capture **respiratory rate** + **consciousness (AVPU)** in the round modal; extend `Vitals`/round; store a NEWS history; `news2` uses the full parameter set; chart Overview shows a **NEWS sparkline**; "rising NEWS" alert.
- **Accept:** recording rounds with worsening RR raises the NEWS band and the trend line moves.

### M6 — Expanded medication safety
- Broaden `drugSafety.ts`: more interaction pairs, more allergy classes, **renal-dose** flags (meds contraindicated/adjust in CKD from comorbidities), **duplicate-therapy** (same class twice). Surface in Rx panel + copilot gate.
- **Accept:** prescribing a renal-risk drug for a CKD patient, or two same-class drugs, raises the right warning.

### M7 — Registries on real values
- Seed latest **HbA1c/BP** values onto patients (results/visits); registry charts bucket by real values; recall cohorts derive from genuinely overdue follow-ups (visit dates).
- **Accept:** registry band counts trace to per-patient values; cohort "overdue" counts trace to visit recency.

### M8 — Phone-grade responsive
- Collapsible sidebar **drawer** on small screens (AppShell); single-column dashboard on phones; final IPD/records sweep.
- **Accept:** at 390px width the sidebar is a drawer and the dashboard is single-column without overflow.
