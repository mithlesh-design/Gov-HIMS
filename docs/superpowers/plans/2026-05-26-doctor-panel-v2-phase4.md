# Doctor Panel v2 — Phase 4 (M12–M18) Implementation Plan

> Execute inline, milestone-by-milestone, with typecheck + screenshot + console-sweep verification each (no unit tests / not a git repo).

**Goal:** Mirror the IPD work to the patient portal, finish the remaining UX asks, and tighten platform correctness.

**Spec:** docs/superpowers/specs/2026-05-25-doctor-panel-v2-design.md (§7 M12–M18).

- **M12 — Patient curated IPD timeline.** `src/app/patient/ipd/page.tsx`: add a "Your care timeline" section rendered from `events[].patientText` (newest first, friendly), plus the early-warning reassurance line from `ipdInsights(...).patientReassurance`. Read-only; no clinical jargon.
- **M13 — Online Consultation one-row table.** `src/app/doctor/online/page.tsx`: cards → dense table (Patient · age/sex · reason · slot · wait · history chips · vitals snapshot · **AI brief chip** · triage · Start). AI brief from a short `deriveBrief`-style line.
- **M14 — My Activity performance graph.** `useDoctorStatsStore`: add `seriesFor(doctorId, period|range)` → per-day points. `src/app/doctor/analytics/page.tsx`: Recharts area/line trend (OPD vs Online) + tests/Rx, respecting period + custom range. Wrap in ClientOnly if it renders date-derived labels.
- **M15 — Shared messaging bus.** Refactor `useMessagingStore` to participant-based threads (`fromId`/`toId`, `currentUserId`-aware `mine`), so messages are a genuine bus rather than doctor-only. Keep the doctor inbox working; make the doctor reachable as a contact. Demonstrate doctor→reception by reading the same store where a counterpart inbox exists. (Scope: don't build every role's inbox UI; the bus + doctor inbox + one counterpart is the deliverable.)
- **M16 — Header search + bell wired.** `src/components/layout/AppShell.tsx`: global search navigates to a matching patient (records/chart); the bell dropdown lists real `useNotificationStore` items for the active role with unread + click-through.
- **M17 — Doctor profile & settings.** New `src/app/doctor/settings/page.tsx` (route `/doctor/settings`) + persisted `useDoctorProfileStore` (availability, leave, hours, fees, e-signature). AppShell Settings icon → here for doctors.
- **M18 — Registries from data + responsive pass.** `src/app/doctor/registries/page.tsx`: derive cohort numbers from actual patient/visit data. Responsive audit of dashboard + IPD for tablet/phone.
