# M5b — Tail Cleanup + Doc Consolidation Plan

> Two parallel tracks following M5. Both ship into `checkpoint/M5b-final`.

**Status at M5:**
- Regression suite: 54 / 54 ✅
- Flow-walker: **12 PASS / 4 PARTIAL / 0 FAIL** ← Track A targets the 4 PARTIAL
- Console errors: **7** ← all SSR hydration mismatches; Track A targets 0
- Doc 10: **six closure files** (v1.0–v1.6) ← Track B consolidates into one v2.0

---

## TRACK A — Clean the tail (~30–45 min)

### A1. Triage console errors (10 min)
**Goal:** Identify which W1–W6 components produce SSR hydration mismatches.

**Steps:**
- [ ] Add a Puppeteer hook to `scripts/flow-walker.cjs` that captures the **component stack** from the hydration error, not just the message. Errors include the stack — currently truncated when stored.
- [ ] Re-run `node scripts/flow-walker.cjs` once with that change → `docs/specs/flow-completeness.json` now contains a per-error component name.
- [ ] Most likely sources (memory anchor — saved as `[[ssr-hydration-and-store-persistence]]`):
  - `DaySummaryCard` — uses `new Date().toLocaleDateString` directly in JSX
  - `AiHealthSummaryCard` — uses `entries.filter` on audit timestamps unwrapped
  - `EarlyWarningBanner` — derives banner from latest vital (timestamp-sorted)
  - `CriticalValueBanner` — has a 2-min countdown via `Date.now()` in render
  - `ProactiveNudgesFeed` — reads from LS via `useEffect` but `buildPatientNudges` may compute date in initial render
  - `FamilyInviteCard` — `tinyAgo()` runs on first render
  - `CareTeamPresenceCard` — `buildCareTeamPresence` uses wall-clock during render

### A2. Wrap each offender (15–20 min)
**Pattern:** For each component flagged in A1, apply ONE of three fixes:

1. **Move time-derived state into `useEffect`** with `useState(initial)` — safest for cards.
2. **Wrap in `<ClientOnly>`** — for whole-card components whose top-level identity is time-derived (existing component at `src/components/ClientOnly.tsx`).
3. **Add `suppressHydrationWarning`** on the specific element if the mismatch is a deliberate "now"-relative label (`{tinyAgo(iso)}`), with a comment citing why.

**Files most likely to touch (confirm via A1):**
- [ ] `src/components/doctor/DaySummaryCard.tsx` — already SSR-fragile (locale date in header)
- [ ] `src/components/patient/dashboard/AiHealthSummaryCard.tsx` — `useMemo` reads `entries` with `new Date(e.timestamp).getTime() >= since`
- [ ] `src/components/clinical/EarlyWarningBanner.tsx` — sort-by-timestamp in render
- [ ] `src/components/clinical/CriticalValueBanner.tsx` — countdown chip
- [ ] `src/components/patient/dashboard/ProactiveNudgesFeed.tsx` — `buildPatientNudges` ctx includes `now`
- [ ] `src/components/patient/dashboard/FamilyInviteCard.tsx` — `tinyAgo` in `invites.map`
- [ ] `src/components/clinical/CareTeamPresenceCard.tsx` — presence pill (status dot depends on now)

Skip touching unrelated W2-W4 admin surfaces unless A1 names them.

### A3. Re-baseline + 0-errors gate (5 min)
**Steps:**
- [ ] `node scripts/regression-suite.cjs` → must still print `54/54 passed`
- [ ] `node scripts/flow-walker.cjs` → target `Console errors: 0`. If 1–2 remain, decide: fix or document as `// expected SSR mismatch — countdown chip` with `suppressHydrationWarning`.
- [ ] If hydration churn changed any baseline screenshot meaningfully, leave the new ones (they ARE the new baseline).

### A4. The 4 PARTIAL flows (10 min)
**Discovery (from `docs/specs/flow-completeness.json`):**
```
F1-ER         step "ER triage queue" — anil=false (not present on triage queue)
F6-Pharmacy   step "..." — anil=false
F7-Reception  step "..." — anil=false
F8-BedManager step "..." — anil=false
```
Per the M3 v1.0 report: these are "**defensible filter behaviours** — Anil correctly absent from default views" (he's already past these stages). They're not bugs; they're a walker-expectation mismatch.

**Decision options** (pick one before executing):
- [ ] **Option A — Update the walker** (recommended): Mark these specific steps with `expectsAnil: false` so they verify *absence* instead of *presence*. Net result: **16 / 16 PASS**.
- [ ] **Option B — Change view filters**: Show Anil in those default views (changes UX; not advised — would actually be a regression).
- [ ] **Option C — Leave as PARTIAL** with a note in the runbook explaining they're expected. Status stays 12/4/0.

If A is picked: edit `scripts/flow-walker.cjs` step definitions for F1-ER / F6-Pharmacy / F7-Reception / F8-BedManager → re-run → confirm `16 PASS / 0 PARTIAL / 0 FAIL`.

### A5. Track A close
- [ ] Commit: `fix(M5b-A): zero console errors + 16/16 flow walker pass`
- [ ] Tag: `checkpoint/M5b-A-tail-clean` (only if both gates green — else commit progress only)

---

## TRACK B — Consolidate doc 10 v1.0–v1.6 into v2.0 (~20 min)

### B1. Audit existing per-wave docs (5 min)
**Files in `docs/specs/`:**
- `10_Competitive_Innovation_v1_0.docx` — slate proposal (15 cards, before any shipped)
- `10_Competitive_Innovation_v1_1.docx` — W1 closure (S1/S2/S3/S15)
- `10_Competitive_Innovation_v1_2.docx` — W2 closure (S4/S5/S6)
- `10_Competitive_Innovation_v1_3.docx` — W3 closure (S7/S8 GROWTH)
- `10_Competitive_Innovation_v1_4.docx` — W4 closure (S9/S10 COMPLIANCE)
- `10_Competitive_Innovation_v1_5.docx` — W5 closure (S11/S12/S13 PATIENT)
- `10_Competitive_Innovation_v1_6.docx` — W6 closure + final (S14, slate 15/15)

**Generators:** `gen_10_innovation_v1_0.py` … `gen_10_innovation_v1_6.py`.

### B2. Author `gen_10_consolidated_v2_0.py` (10 min)
**Single-doc structure:**
1. **Cover** — Competitive Innovation v2.0 · Slate 15/15 SHIPPED
2. **TOC**
3. **§1 Executive summary** (one page) — what the slate is, how it shipped (6 waves), what's still ahead
4. **§2 The four pillars** — PRESERVE · INTUITIVE · GROWTH · AI-CENTRIC, with the cards mapped to each
5. **§3 Card catalog** — one section per card S1…S15, each with:
   - what it does
   - where it mounts (file path + UI surface)
   - reasoning engine (file path)
   - audit resource(s) it writes
   - screenshot reference (the M4-W*/M5/ shots)
6. **§4 Cross-cutting primitives** — ReasoningChip · aiCopilot · voiceScribe · predictiveOps · revenueGrowth · dpdpAudit · patientNudges · careTeamPresence
7. **§5 Audit-resource registry** — all 13 typed HITL resources in a single table
8. **§6 Verification** — final regression/flow/hero-journey numbers + restore commands
9. **§7 What's next** — Phase 2 swap-points (mock-API → real backend) without prescribing the design
10. **Appendix A: version history** — all 7 prior versions in one table

**Implementation notes:**
- Reuse `_helpers.py` (cover/toc/h1/p/bullet/table/save)
- Pull SHIPPED rows verbatim from each per-wave generator's `SHIPPED_W*` arrays (import them as modules; don't retype)
- Pull DOC_DATE / AUTHOR from `_helpers`
- Save to `docs/specs/10_Competitive_Innovation_v2_0.docx`

### B3. Reconcile references (3 min)
- [ ] `docs/specs/M5_Demo_Runbook.md` — change "10_Competitive_Innovation_v1_6.docx" reference (single occurrence in "Reference" section) → `10_Competitive_Innovation_v2_0.docx`
- [ ] `docs/specs/CHECKPOINTS.md` — keep the per-wave version references intact (they're history), but add a note next to M5 row: "Doc 10 consolidated at v2.0 — see [10_Competitive_Innovation_v2_0.docx](10_Competitive_Innovation_v2_0.docx)."
- [ ] **Do not delete v1.0–v1.6** — keep as historical artifacts (matches how M0/M1/M2 baseline reports stayed in-repo).

### B4. Track B close
- [ ] Commit: `docs(M5b-B): consolidate 10 v1.0-v1.6 into single v2.0`
- [ ] Tag: `checkpoint/M5b-B-doc-consolidated` (only after A's tag if both ran)

---

## Combined finish (if both tracks ran)

- [ ] Add `M5b` row + section to `CHECKPOINTS.md`
- [ ] One unified tag: `checkpoint/M5b-final` covering both A + B
- [ ] Push main + tag

### Verification matrix (target end-state)

| Suite | Pre-M5b | Target |
|---|---|---|
| `regression-suite.cjs` | 54/54 · 0 errors | 54/54 · 0 errors |
| `flow-walker.cjs` PASS count | 12 / 16 | **16 / 16** |
| `flow-walker.cjs` console errors | 7 | **0** |
| Doc 10 file count | 7 files | 7 historical + 1 consolidated v2.0 |
| Runbook references | points to v1.6 | points to v2.0 |

---

## Risks & guardrails

- **Risk:** Hydration fixes might inadvertently change behaviour (e.g. nudge-card initial state). **Mitigation:** Run regression-suite after each component fix, not just at the end.
- **Risk:** Walker expectation changes (Option A in A4) could mask a real future regression. **Mitigation:** Each `expectsAnil: false` step must have a one-line comment citing why Anil is correctly absent (e.g. "patient already escalated past ER triage").
- **Risk:** Doc consolidation creates conflicting versions. **Mitigation:** v2.0 is additive — v1.0–v1.6 stay in repo as the historical trail; v2.0 is the canonical reference going forward.
