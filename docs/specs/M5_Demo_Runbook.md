# Umang HIMS — M5 Demo Runbook

> The live-demo cheat sheet for showing the 15-card innovation slate end-to-end. Each row is one camera-ready beat: where to be, what to click, what to say.

**Last verified:** 2026-06-02 — regression 54/54 green, flow-walker 12 PASS / 4 PARTIAL / 0 FAIL, hero-journey 10/10 captured.

---

## Pre-flight

| Step | Command |
|---|---|
| Clean local seed (presenter's machine) | Open DevTools → Application → Local Storage → "Clear all" on `localhost:3000` |
| Start dev server | `npm run dev` (or `npm run start` if you've `npm run build`) |
| Verify bootstrap | URL bar = `localhost:3000`, wait for the role picker tiles to animate in |
| Re-verify nothing regressed today | `node scripts/regression-suite.cjs` — must end with `54/54 passed, 0 failed, 0 console errors` |

If running over screen-share: set viewport to **1500×1100** to match the captured screenshots in [docs/specs/screens/M5/](screens/M5/).

---

## Hero patients

| ID | Name | Role | Story |
|---|---|---|---|
| **PT-44012** | Anil Kumar Verma · M/38 | Walk-in → OPD → IPD | Penicillin allergy + NSTEMI pattern → appendectomy. Drives W1 / W2 / W4 / W6 narratives. |
| **PT-20394** | Kiran Patil · M/55 | Patient portal (logged in) | NSTEMI / post-PCI; Type 2 Diabetes + Hypertension. Drives W5 patient super-app. |

---

## The 10-beat live demo

> Each beat is ~60 seconds. Total runtime ≈ 10 min for the full slate; 5 min if you cut to the four marked **★**.

### Beat 1 — Predictive Operations Cockpit · S7 ★
- **Role:** Admin → Management tab → Admin tile
- **Path:** `/admin/operations`
- **Show:** 4 forecasters at the top — ED arrivals next 4h, OR utilisation, ICU pressure, Staffing gap
- **Say:** *"This isn't a dashboard of yesterday's numbers — it's a forecast over the next 24 hours. Every card carries reasoning, confidence, and a single primary action that's audit-logged when the ops manager acts on it."*
- **Screenshot:** [M5-01-S7-ops-cockpit.png](screens/M5/M5-01-S7-ops-cockpit.png)

### Beat 2 — Revenue-Cycle Growth Cockpit · S8 ★
- **Path:** `/admin/finance`
- **Show:** 4 growth-lever cards above the P&L KPIs — denial-risk exposure (₹), days-in-AR, charge-capture gaps, payer-mix concentration
- **Say:** *"Same envelope, financial dimension. Each finding has a ₹-impact number the CFO can sum into a quarterly target."*
- **Screenshot:** [M5-02-S8-rcm-growth.png](screens/M5/M5-02-S8-rcm-growth.png)

### Beat 3 — NABH Evidence Live Cockpit · S9
- **Path:** `/admin/compliance`
- **Show:** 9 NABH chapters with live evidence counts; sparse chapters show AI-suggested next-action and an Open-desk button that routes you straight to the remediation surface
- **Say:** *"NABH inspection used to mean three weeks of binder prep. This is the binder, live."*
- **Screenshot:** [M5-03-S9-nabh-evidence.png](screens/M5/M5-03-S9-nabh-evidence.png)

### Beat 4 — DPDP / DISHA Self-Audit · S10
- **Path:** `/admin/disha`
- **Show:** 5-principle scorecard with overall score badge; driver bullets cite DPDP §§ 8(6), 11 and DISHA § 28(2)
- **Say:** *"The DPO's own scorecard, anchored in the actual law sections."*
- **Screenshot:** [M5-04-S10-dpdp-selfaudit.png](screens/M5/M5-04-S10-dpdp-selfaudit.png)

### Beat 5 — Drug-Safety Reasoning · S1 ★
- **Role:** Doctor (Clinical tab → Doctor tile)
- **Path:** `/doctor/dashboard` — pick Anil from the queue
- **Show:** Augmentin → Penicillin allergy block, with Cipro+Metro alternates and 4-check matrix
- **Say:** *"This isn't a yes/no alert. It's the reasoning, plus a safe substitute the doctor can accept in one click."*
- **Screenshot:** [M5-05-S1-drug-safety.png](screens/M5/M5-05-S1-drug-safety.png)

### Beat 6 — IPD: Presence + NEWS2 + Voice + Critical-value · S14 + S2 + S5 + S3 ★
- **Path:** `/doctor/ipd`
- **Show four things in one frame:**
  1. **S14** Care-Team Presence card at the top with the incoming-handover panel
  2. **S2** NEWS2 amber banner per inpatient breaching threshold
  3. **S5** Voice scribe Quick-note toolbar
  4. **S3** Critical-value banner (red, top) — Anil's Troponin-I = 2.1 ng/mL needs ack
- **Say:** *"Four AI-assisted surfaces stacked on one page. Each is independent — turn any one off and the others keep working."*
- **Screenshot:** [M5-06-S14-S2-presence-ews.png](screens/M5/M5-06-S14-S2-presence-ews.png)

### Beat 7 — Doctor Day-in-Review · S15
- **Path:** `/doctor/analytics`
- **Show:** Plain-language end-of-day narration + AI accept-rate + suggested next-focus list
- **Say:** *"End of shift, no manual chart-counting. The AI tells the doctor what happened and what to action tomorrow."*
- **Screenshot:** [M5-07-S15-day-in-review.png](screens/M5/M5-07-S15-day-in-review.png)

### Beat 8 — Patient Portal: Summary + Family + Nudges · S11 + S12 + S13 ★
- **Role:** Patient (Patient tab → Patient Portal tile) — logged in as Kiran
- **Path:** `/patient/dashboard`
- **Show three cards together:**
  1. **S11** AI Health Summary at top: *"Kiran, here's a quick look... You're managing Type 2 Diabetes and Hypertension..."*
  2. **S12** Family-Track invite (right rail) — type a phone, watch the mock WhatsApp delivery progress
  3. **S13** Proactive Nudges — 5 priority-sorted, including refill warnings + HbA1c-due
- **Say:** *"Patient portal isn't a brochure anymore — it's an active assistant."*
- **Screenshot:** [M5-08-S11-S12-S13-patient-portal.png](screens/M5/M5-08-S11-S12-S13-patient-portal.png)

### Beat 9 — Care-Team Presence on Nurse Dashboard · S14 (sequel)
- **Role:** Nurse
- **Path:** `/nurse/dashboard`
- **Show:** Same Care-Team Presence card with an Incoming-handover panel. One-tap *Receive handover* — both sign and receive are audit-logged.
- **Say:** *"Two-sided handover, traced end-to-end. Sign by the outgoing nurse, receive by the incoming one, both audited."*
- **Screenshot:** [M5-09-S14-nurse-presence.png](screens/M5/M5-09-S14-nurse-presence.png)

### Beat 10 — OCR Intake on Reception · S6 + S4
- **Role:** Reception
- **Path:** `/reception/opd` — click *Register Walk-in*
- **Show:** OCR card at the top of the modal → Demo scan → 6 fields appear with per-field confidence chips → Apply to form
- **Bonus:** Hit ⌘K / Ctrl+K → type *"schedule MRI for Anil Tuesday 10am"* → Copilot preview card appears with 95% confidence reasoning
- **Say:** *"Front-desk goes from a 60-second walk-in to a 15-second scan. And the command palette parses what you said into structured action — same envelope your future LLM will use."*
- **Screenshot:** [M5-10-S6-ocr-intake.png](screens/M5/M5-10-S6-ocr-intake.png)

---

## Talk-track close

*"Every card you saw fires HITL — accept, reject, or modify — and every decision lands in the audit trail under a typed resource. That trail is what makes the NABH cockpit (Beat 3) and the DPDP scorecard (Beat 4) light up live. Phase 1 was 18 mock-API modules over a browser-persisted store. Phase 2 swaps the engines for real models; the envelopes don't change."*

---

## Recovery & rollback

| If… | Do… |
|---|---|
| A card looks wrong or stale | DevTools → Local Storage → Clear → reload `/` |
| A surface 404s | Confirm the W-checkpoint shipped: `git tag -l 'checkpoint/M4-*'` |
| You need a clean baseline mid-demo | `git checkout checkpoint/M4-wave-6` (detached) — every wave is restorable |
| Demo machine has no mic for S5 | Voice Scribe falls back to a deterministic per-surface transcript — works headless |

---

## Reference

- **Slate state:** 15 / 15 SHIPPED — [10_Competitive_Innovation_v2_0.docx](10_Competitive_Innovation_v2_0.docx) (canonical consolidated; v1.0–v1.6 historical)
- **Checkpoint registry:** [CHECKPOINTS.md](CHECKPOINTS.md)
- **Regression suite:** `node scripts/regression-suite.cjs`
- **Flow walker:** `node scripts/flow-walker.cjs`
- **Hero-journey walker:** `node scripts/hero-journey-walker.cjs` (re-takes all 10 beats)
- **Hero-journey JSON:** [docs/specs/screens/M5/hero-journey.json](screens/M5/hero-journey.json)
