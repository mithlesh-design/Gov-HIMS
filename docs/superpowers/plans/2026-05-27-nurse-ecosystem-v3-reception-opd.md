# Nurse Ecosystem v3 + Reception OPD v2

> Execute inline, milestone-by-milestone, with typecheck + Puppeteer + console-sweep (target 0) after each. AI functional & grounded.

**Decisions (approved):** assigned ward + switcher · per-doctor OPDs grouped by department · two-sided audited handover. Seed Anjali Desai on Morning/Cardiac Care with a pending incoming handover. Order-done → requesting doctor's bell + chart event (no full inbox msg).

---

### Phase 1 — Nurse shift & ward ecosystem
- **M1 Shift & ward assignment** — `useShiftStore` (current nurse, assignments, activeWard + switcher, persisted handover log). Dashboard shift banner (shift · ward · window · responsibilities) + ward switcher. Rename "My Patients" → "My Ward" (ward-scoped, shows assignment). `useWard()` filters by activeWard.
- **M2 Ward-scoping** — MAR, Fluid Balance, Doctor Orders filter to the active ward ("All wards" option preserved).
- **M3 Two-sided handover** — Rework `/nurse/handover`: outgoing **signs** ward SBAR → handover log; incoming **receives/acknowledges**. Both stamped (name+time). Start-of-shift receive + end-of-shift give.

### Phase 2 — Nurse workflow fixes
- **M4 Doctor Orders clarity + notify** — show action + "Ordered by Dr. X"; "Mark done" notifies the requesting doctor (bell) + chart event.
- **M5 Nurse discharge handoff** — nursing-clearance checklist → sets `nursing` pillar in `useDischargeStore` + routes patient to the discharge desk (initDischarge if needed). Audited.
- **M6 Nurse AI Assistant** — mirror doctor's (`runCopilot` + assistant store), ward-scoped, nursing quick-prompts. New nav item.

### Phase 3 — Reception
- **M7 Multi-OPD** — doctors-with-rooms model; OPD display board grouped by department → doctor/room with now-serving token + waiting count; walk-in assigns a specific doctor (department-filtered).
- **M8 Reception → Emergency** — "Send to Emergency": acuity map (Critical→Red/High→Yellow/else Green) → `addToTriage` + remove from OPD + notify ER.
