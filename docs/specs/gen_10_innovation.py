"""Generate 10_Competitive_Innovation_v1_0.docx (M4a — propose only).

KareXpert teardown + prioritised slate of NEW Phase-1 UI-buildable
functionalities that leapfrog. Built items are PROPOSED, not committed —
the brief mandates a STOP before any build, awaiting sponsor approvals.

Every slate card maps to:
  - What it does (1-2 lines)
  - Why it beats KareXpert
  - Pillar(s) advanced (PRESERVE / INTUITIVE / GROWTH / AI-CENTRIC)
  - Effort (S/M/L/XL)
  - 03 App-Flow touchpoints
  - Deferred-backend deps (everything mocked for demo)
"""
from pathlib import Path
from _helpers import *


# ─── Innovation slate cards ────────────────────────────────────────────
# Each entry: (id, title, theme, elevator, what_it_does, why_beats_karexpert,
#              pillars, effort, flows_touched, backend_deps_mocked)
SLATE = [
    # ── A. CLINICAL SAFETY (AI) ────────────────────────────────────────
    ("S1", "Transparent Drug-Safety Reasoning Panel",  "Clinical safety",
     "Every Rx submit shows the four-check matrix with WHY each check fired or cleared, plus an inline 'ask AI for an alternative' card.",
     "Today drug-safety is a binary green/red. v2 surfaces a reasoning panel: allergy-class match, interaction severity, dose-range, narcotic schedule — each with the source rule and a confidence chip. If blocked, an HITL card proposes 2-3 non-conflicting regimens (accept / modify / reject).",
     "KareXpert ships a drug-master with allergy alerts; the reasoning + alternative-suggesting workflow does not exist. The block → suggest → adopt loop converts safety from a friction event to a guided decision.",
     "AI-CENTRIC · INTUITIVE · PRESERVE",
     "S",
     "03 §4.2 Doctor OPD consult; §5.3 Pharmacy",
     "Mock: deterministic engine (drugSafety.ts) + AI envelope returning 3 canned alternatives. Phase-2: real LLM via gateway."),

    ("S2", "NEWS2 / qSOFA / Sepsis Ambient Watcher",  "Clinical safety",
     "Passive AI monitor on every IPD vital capture; auto-banner on NEWS2≥5 / qSOFA≥2 / SIRS criteria, with WHY-now reasoning chip.",
     "Nurse captures vitals → engine recomputes scores → if threshold crossed, banner fires on the patient row + a doctor push notification. Reasoning chip says e.g. 'NEWS2=5: RR 22 (2pts) + SpO2 92 (2pts) + Temp 38.4 (1pt)'. One-click acknowledge or escalate.",
     "KareXpert displays vitals; it does not run continuous early-warning logic at the UI layer. The transparent breakdown earns clinician trust faster than a black-box alarm.",
     "AI-CENTRIC · INTUITIVE",
     "M",
     "03 §5.1 Nurse rounds; §4.3 Doctor IPD",
     "Engine fully implemented in src/lib/earlyWarning.ts. Sepsis path uses canned probability for demo. Phase-2: real-time vitals stream + ML model."),

    ("S3", "Closed-Loop Critical-Value Handling",  "Clinical safety",
     "Lab releases a critical value → simultaneous nurse pager + doctor banner + a 2-minute acknowledgement gate before next clinical action.",
     "The lab release pipeline already emits lab_critical_callback. v2 wires the consumer side: a top-of-shell banner that blocks new orders until acknowledged, with an audit trail of the read-receipt. Both the nurse and the ordering doctor must ack.",
     "KareXpert flags critical results in a list. The acknowledgement gate + blocking workflow on the doctor's surface is unique and aligns with NABH COP-13 expectations.",
     "AI-CENTRIC · INTUITIVE · GROWTH",
     "M",
     "03 §10 Lab; §4 Doctor",
     "Mock: notification + banner trigger already in place; gate logic is UI-only state. Phase-2: real notification service."),

    # ── B. AI COPILOT / VOICE / INTAKE ────────────────────────────────
    ("S4", "Hospital-Wide AI Copilot (palette+ evolution)",  "AI copilot",
     "Cmd/Ctrl+K palette gains natural-language intent: 'schedule MRI for Anil Tuesday 10am', 'show all denial-risk claims', 'draft pre-auth for Kiran', 'discharge Anil'.",
     "The M2 palette already does keyword-matched intents. v2 layers an LLM-style parser (mocked) that maps free-text to typed actions: schedule, order, draft, navigate, summarise. Confirmation card preview before any mutation.",
     "KareXpert has search; it does not have command-driven operation. Intent navigation collapses 4-6 clicks of nested menus into one keystroke.",
     "AI-CENTRIC · INTUITIVE · GROWTH",
     "M",
     "Cross-cuts every flow in 03",
     "Mock: regex+keyword intent map (already started). Phase-2: real LLM with the same envelope."),

    ("S5", "Voice Scribe Everywhere",  "AI copilot",
     "Every clinical note surface (OPD note, IPD progress, MAR note, nurse round, OT debrief) gains a microphone icon → real-time transcript → AI-structured into SOAP / structured fields.",
     "Voice intake module already exists for OPD; v2 normalises it as a global pattern. Mic captures speech, AI envelope returns structured note; HITL accept/modify/reject.",
     "KareXpert mobile app supports voice notes, but unstructured. Auto-SOAP structuring + HITL is the differentiator.",
     "AI-CENTRIC · INTUITIVE",
     "M",
     "03 §4 Doctor; §5 Nurse; §11 OT",
     "Mock: Web Speech API + deterministic mapping for demo. Phase-2: vendor STT + LLM."),

    ("S6", "Mock OCR Intake (Aadhaar / Insurance card / Lab paper)",  "AI copilot",
     "Camera or file-drop on the reception walk-in form → simulated 800 ms 'scanning…' → form auto-fills name / DOB / payer / lab values.",
     "Mocks the OCR pipeline visually with a confidence chip per field; the user can edit any extracted field. Cuts walk-in time from ~60 s to ~15 s in the demo.",
     "KareXpert has paper-form intake; OCR-assisted intake is a clear leap. Even in mock form it visibly changes the on-floor speed story.",
     "AI-CENTRIC · INTUITIVE · GROWTH",
     "S",
     "03 §7 Reception walk-in",
     "Mock only: a button + canned 800 ms timer + prefilled fields. Phase-2: real OCR vendor."),

    # ── C. PREDICTIVE OPS COCKPITS (Growth) ────────────────────────────
    ("S7", "Predictive Operations Cockpit (COO landing)",  "Predictive ops",
     "One screen the COO opens at 08:00: 24h bed-demand forecast, LOS predictor, discharge-readiness scorer, OT-utilisation gauge, ER-surge watch — all with reasoning chips.",
     "Today's COO dashboard shows 'now' KPIs. v2 adds five mock-modelled predictors as widgets on the same page. Each tile expands into a drill-down with the AI's reasoning + recommended action ('shift 3 elective OTs to Friday', 'discharge 4 likely-stable patients before 12:00').",
     "KareXpert COO dashboard is descriptive. Predictive + prescriptive is the leap. Even with mocked numbers, the WIDGET TYPE is what wins demos.",
     "AI-CENTRIC · GROWTH · INTUITIVE",
     "L",
     "03 §16 Admin / COO",
     "Mock: each widget is a small deterministic function with canned scenarios. Phase-2: real forecasts."),

    ("S8", "Revenue-Cycle Growth Cockpit",  "Predictive ops",
     "New /admin/growth surface: throughput, capture %, denial reduction trend, patient acquisition funnel, retention cohort. Each widget carries mock instrumentation (event hooks) so the demo shows event-driven dashboards, not static tiles.",
     "Numbers the COO actually cares about: revenue per bed/day, denial-risk-reduced ₹, average days-to-pay, patient-NPS-driven referral lift. Each widget has a 'what to do next' action button.",
     "KareXpert has finance reports. A growth cockpit with prescriptive action buttons (file pre-auth queue, recall patients due) is the leap.",
     "GROWTH · AI-CENTRIC",
     "L",
     "03 §16 Admin / COO; §14 Billing; §15 Insurance",
     "Mock: numbers from the seeded bills + a fake event log. Phase-2: real ETL."),

    ("S9", "NABH Evidence Live Cockpit",  "Compliance autopilot",
     "Per-chapter NABH readiness gauges with drill-down to the live audit events that satisfy each evidence type. One click exports a chapter-scoped evidence pack (PDF + CSV).",
     "The audit table already tags every event with a NABH chapter. v2 builds the cockpit on top: 9 chapter cards, each with readiness % + missing-evidence list + export button. The auditor's day starts here.",
     "KareXpert has 'NABH compliance' marketing modules; live evidence streaming with drill-back to the actual emitting action is unique.",
     "GROWTH · INTUITIVE",
     "M",
     "03 §17 Audit Officer",
     "Mock: built on the existing audit table. Phase-2: real Merkle attestations + signed exports."),

    ("S10", "DPDP / DISHA Self-Audit Panel",  "Compliance autopilot",
     "Privacy KPI dashboard for the DPO: record-access volume by role, consent gaps, breach attestations within 72h, RTBF queue, audit gaps.",
     "All the DPDP-required telemetry already lands in the audit table (disha_record_accessed, consent_captured, rtbf_requested). v2 surfaces it as a cockpit with month-over-month deltas and ageing alerts.",
     "KareXpert does not publicly claim DPDP coverage. Even visualisation of audit events is differentiating in 2026 India.",
     "GROWTH · AI-CENTRIC (anomaly detection)",
     "M",
     "03 §16.5 DISHA / DPDP; §17 Audit",
     "Mock: charts over the existing audit table. Phase-2: real signed evidence chain."),

    # ── D. PATIENT SUPER-APP PARITY+ ──────────────────────────────────
    ("S11", "AI Health Summary on Patient Portal Home",  "Patient super-app",
     "Plain-language summary on portal home: 'You're 1 day post-appendectomy. Pain trending down. Next: follow-up in 7 days. Reply STOP to opt out of nudges.'",
     "On patient sign-in, an AI envelope produces a 3-line summary tied to the visit / IPD state. Reasoning chip reveals data sources (vital trend, last note, discharge instructions). Read-aloud button.",
     "KareXpert patient app shows raw lab values and bills. Plain-language summarisation in patient's own language is the leap (EN + HI).",
     "AI-CENTRIC · INTUITIVE · GROWTH",
     "M",
     "03 §19 Patient portal home",
     "Mock: deterministic templating from current state. Phase-2: real LLM call per patient session."),

    ("S12", "Family-Track v2 (mock WhatsApp invite)",  "Patient super-app",
     "Patient taps 'invite family' → mock WhatsApp deep-link → family-member sees read-only timeline + 'estimated time to discharge' predictor.",
     "Family-track already exists. v2 adds the consented WhatsApp invite flow + the ETA-to-discharge widget computed from MAR completion + pillar status + LOS predictor.",
     "KareXpert has family-share; WhatsApp deep-link + AI ETA is the leap.",
     "GROWTH · INTUITIVE",
     "S",
     "03 §19.7 Family-track",
     "Mock: a 'Send WhatsApp invite' button that opens wa.me/<phone>?text=... Phase-2: WhatsApp Business API."),

    ("S13", "Proactive Patient Nudges",  "Patient super-app",
     "Time-of-day nudges on the patient portal: 'Time for your 10am Cipro', 'Lab result released — Dr Vikram's note attached', 'Pre-discharge checklist available'.",
     "A small scheduler reads MAR + order release events + discharge state and emits nudge cards into a NotificationStore.add(target=patient). Cards rendered on portal home + push to PWA.",
     "KareXpert push notifications exist; behavioural nudges driven by MAR / labs / discharge state are not. Increases adherence and reduces calls to the ward.",
     "GROWTH · INTUITIVE · AI-CENTRIC",
     "S",
     "03 §19, §21 Notifications",
     "Mock: a cron-like tick fires nudges; no real push service. Phase-2: PWA push + WhatsApp."),

    # ── E. CARE-TEAM PRESENCE / REAL-TIME ─────────────────────────────
    ("S14", "Care-Team Presence + Live Handover",  "Real-time presence",
     "Sidebar in IPD/ER showing the patient's team (doctor + nurse + consultants), who's online (mocked green dot), with a 'push handover to <next-shift nurse>' button that requires a read-receipt.",
     "Pulls team from the assignment (admittingDoctor + ward nurse + on-call). Presence is a mock socket state. Handover composes a structured SBAR brief and waits for read receipt before clearing the outgoing shift.",
     "KareXpert handover is a free-text field. Read-receipt + structured SBAR + presence is the leap.",
     "INTUITIVE · AI-CENTRIC",
     "M",
     "03 §5.3 Handover; §4.3 Doctor IPD",
     "Mock: presence is a setInterval; SBAR template is static. Phase-2: WebSocket presence + real handover queue."),

    # ── F. ANCILLARY / WOW MOMENTS ────────────────────────────────────
    ("S15", "Doctor Activity 'Why' (explainable Day-in-Review)",  "AI copilot",
     "End-of-day card for each doctor: 'You consulted 27, prescribed 31, rejected 4 AI suggestions, accepted 22. Median consult time: 11 min. NEWS2 escalations responded to: 100%. Suggested next focus: 3 unresolved follow-ups.'",
     "A small Day-in-Review tile on /doctor/activity (already exists as a chart). v2 adds an AI-narrated summary with reasoning + suggested follow-up actions. HITL-style: dismiss / add to tomorrow.",
     "KareXpert has activity logs. Narrated summarisation + recommended next steps is unique.",
     "AI-CENTRIC · GROWTH · INTUITIVE",
     "S",
     "03 §4 Doctor activity",
     "Mock: deterministic template over stats. Phase-2: LLM via gateway."),
]


# ─── KareXpert teardown ────────────────────────────────────────────────
KAREXPERT_AREAS = [
    ("Module breadth",
     "Comprehensive: OPD, IPD, Pharmacy, Lab, Radiology, OT, Insurance/TPA, Billing, NABH evidence, ABDM/ABHA, mobile app.",
     "Parity. Umang already covers every area for the demo, persistent in-browser.",
     "n/a"),
    ("UI polish",
     "Mature SaaS look-and-feel with consistent components across modules.",
     "Behind in M0. Closing fast with M2's compact design system + command palette. Visible difference: KareXpert lists; Umang lists + Cmd-K intent navigation.",
     "S2.3 (palette evolution); compaction waves"),
    ("Mobile patient app",
     "Native iOS + Android with vitals, lab results, bills, appointments.",
     "Parity via responsive PWA. Differentiator opportunity: AI health summary + nudges + family-track v2.",
     "S11, S12, S13"),
    ("AI claims",
     "Marketed; depth limited. Mostly heuristic alerts on pharmacy + analytics.",
     "Leap area. Transparent reasoning chips on every AI surface; HITL envelope is universal; AI copilot via palette.",
     "S1, S2, S3, S4, S7, S11, S15"),
    ("Clinical safety",
     "Drug allergy alerts + critical-value flags as list items.",
     "Leap area. Transparent reasoning + blocking acknowledgement + suggest-alternative loop.",
     "S1, S2, S3"),
    ("Operating speed",
     "Standard form-based workflows; ~60 s walk-in registration.",
     "Leap area. Cmd-K intent nav + voice scribe + OCR intake collapses 60 s → ~15 s.",
     "S4, S5, S6"),
    ("Predictive analytics",
     "Descriptive dashboards; few predictive widgets.",
     "Leap area. Predictive ops cockpit + revenue-cycle growth cockpit as new COO surfaces.",
     "S7, S8"),
    ("Compliance",
     "NABH compliance modules; DPDP coverage limited.",
     "Leap area. Live NABH evidence cockpit + DPDP self-audit panel.",
     "S9, S10"),
    ("Care-team presence",
     "Standard messaging + handover form.",
     "Leap area. Presence + structured SBAR + read-receipts.",
     "S14"),
    ("Multi-branch / multi-tenant",
     "Strong; supports chains via a tenant model.",
     "Mock-API has tenant_id ready; UI deferred to v2 (GAP-031). NOT in Phase-1 scope.",
     "Phase 2"),
    ("Real backend / vendors",
     "Production-grade DB, auth, integrations (lab analysers, payment, WhatsApp).",
     "Deliberately mocked in Phase 1. Phase-2 mapping in 06 §3 (Sprints 2 / 8 / 9 / 10).",
     "Phase 2"),
]


# ─── Recommended waves ────────────────────────────────────────────────
RECOMMENDED_WAVES = [
    ("Wave 1 - Demo-defining clinical wow", "Best ROI on demo-day visibility. Touch the three highest-impact clinical surfaces.",
     "S1, S2, S3, S15"),
    ("Wave 2 - Operating speed", "Show the speed-up story. Palette + voice + OCR move the on-floor time meaningfully.",
     "S4, S5, S6"),
    ("Wave 3 - Predictive cockpits", "Differentiate on COO surfaces. Heaviest in effort; demo-defining for hospital-owner audience.",
     "S7, S8"),
    ("Wave 4 - Compliance autopilot", "Anchor on regulatory readiness. Reuses the existing audit fabric.",
     "S9, S10"),
    ("Wave 5 - Patient super-app", "Drive retention narrative. Builds on the existing patient portal.",
     "S11, S12, S13"),
    ("Wave 6 - Real-time presence", "Polish + on-floor coordination story.",
     "S14"),
]


def pillars_chip(p: str) -> str:
    return p.replace("AI-CENTRIC", "AI").replace("INTUITIVE", "INT").replace("GROWTH", "GR").replace("PRESERVE", "PR")


def build(out: Path) -> None:
    doc = new_doc()
    cover(doc, "10 - Competitive Innovation", "Competitive Innovation Slate (M4a)",
          "KareXpert teardown + prioritised slate of NEW Phase-1 UI leaps")
    toc(doc)

    h1(doc, "1. Purpose")
    p(doc,
      "Per the M4 brief, this document is PROPOSE-ONLY. It captures a "
      "KareXpert-vs-Umang teardown, then a prioritised slate of NEW "
      "Phase-1 UI-buildable functionalities that leapfrog. After review "
      "we expect a subset to be approved; the build phase (M4b) only "
      "starts on the items the sponsor signs off.")
    callout(doc, "Scope",
            "Every slate item is BUILDABLE INSIDE PHASE 1 — mock-API + "
            "browser-persisted state, no new real backend. Real-backend "
            "dependencies are listed per item and explicitly deferred to "
            "Phase 2. Everything is additive on top of the M0 preservation "
            "contract — no existing feature is removed.", kind="note")

    # ── 2. KareXpert teardown ──────────────────────────────────────────
    h1(doc, "2. KareXpert Teardown")
    p(doc,
      "KareXpert is a leading India HMS vendor with mature module breadth, "
      "polished SaaS UI, native mobile app, and reasonable NABH coverage. "
      "It is weaker on AI depth, clinical-safety automation, compliance "
      "evidence flow, and operating speed. The table below maps where "
      "Umang is already at parity vs. where the slate leaps.")
    table(doc, ["Area", "KareXpert today", "Umang position", "Slate items"],
          [list(r) for r in KAREXPERT_AREAS],
          col_widths_cm=[3.0, 4.5, 4.5, 3.0])

    h1(doc, "3. Where Umang Already Leads (post-M0/M1/M2/M3)")
    bullet(doc, "**Audit fabric** — every mutation lands a typed event; the trail is queryable, filterable, and exportable. NABH chapter mapping is automatic.")
    bullet(doc, "**Mock-API boundary** — typed, async, zod-validated. Phase-2 swap is transport-only.")
    bullet(doc, "**Cmd/Ctrl+K command palette** — universal search + intent navigation. No equivalent in KareXpert.")
    bullet(doc, "**Compact design system** — denser worklists, one primary action per surface, unified tokens.")
    bullet(doc, "**Hero patient journey** — Anil Kumar Verma walkable end-to-end across every relevant role with the 5 exception triggers armed.")
    bullet(doc, "**Refund 2-step gate, drug-safety envelope, OT WHO checklist, narcotic two-sig** — clinical & financial controls already in place.")

    page_break(doc)

    # ── 4. Innovation slate cards ──────────────────────────────────────
    h1(doc, "4. Innovation Slate")
    p(doc, "Each card below is a discrete UI deliverable. Cards are "
           "independently approvable — pick any subset.")
    table(doc, ["ID", "Title", "Theme", "Pillars", "Effort", "Backend dep (mocked)"],
          [[s[0], s[1], s[2], pillars_chip(s[6]), s[7], "Mock only" if "Mock" in s[9][:5] else "Mocked + Phase-2"] for s in SLATE],
          col_widths_cm=[1.0, 5.0, 2.5, 2.5, 1.5, 3.5])

    for s in SLATE:
        h2(doc, f"{s[0]} - {s[1]}")
        kv(doc, "Theme", s[2])
        kv(doc, "Elevator", s[3])
        kv(doc, "What it does", s[4])
        kv(doc, "Why it beats KareXpert", s[5])
        kv(doc, "Pillars advanced", s[6])
        kv(doc, "Effort", s[7])
        kv(doc, "03 App-Flow touchpoints", s[8])
        kv(doc, "Backend (mocked / deferred)", s[9])

    page_break(doc)

    # ── 5. Recommended waves ──────────────────────────────────────────
    h1(doc, "5. Recommended Waves")
    p(doc, "If everything in §4 is approved, the recommended build order "
           "below clusters items into demo-coherent bundles. Each wave is "
           "an additive checkpoint (per the M4 brief). Each wave's exit "
           "gate is: regression-suite 54/54 green, 04 / 11 updated, "
           "before/after screenshots captured.")
    table(doc, ["Wave", "Rationale", "Slate items"],
          [list(r) for r in RECOMMENDED_WAVES],
          col_widths_cm=[5.0, 8.0, 4.0])

    h1(doc, "6. Risk + Honesty")
    bullet(doc, "Everything mock-grade for the demo. Real LLM, real DB, real auth, real integrations remain Phase 2 (mapped in 06 §3).")
    bullet(doc, "Effort estimates assume single-session builds with the existing primitives (CompactHeader / CompactKPI / HitlReviewCard / Dialog / palette).")
    bullet(doc, "Each new mutation must emit to the audit table to honour the M0 contract.")
    bullet(doc, "Each new surface must keep the regression suite at 54/54 — the M0 preservation contract gates the next checkpoint.")
    bullet(doc, "Slate items that overlap (e.g. S2 reuses earlyWarning.ts) are flagged in the per-card backend row.")

    h1(doc, "7. What I'm Asking the Sponsor to Decide")
    bullet(doc, "Which slate IDs to build (any subset of S1-S15).")
    bullet(doc, "Whether to follow the recommended wave order in §5 or re-order.")
    bullet(doc, "Whether any new wow item should be added beyond the seed directions in the M4 brief.")

    h1(doc, "A. Version History")
    table(doc, ["Version", "Date", "Author", "Notes"],
          [["v1.0", DOC_DATE, AUTHOR, "M4a teardown + slate proposal."]],
          col_widths_cm=[2.0, 3.0, 4.5, 7.5])

    save(doc, out)


if __name__ == "__main__":
    build(Path(__file__).parent / "10_Competitive_Innovation_v1_0.docx")
