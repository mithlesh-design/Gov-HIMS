"""Generate 10_Competitive_Innovation_v1_1.docx — M4-W1 closure update.

v1.0 was a propose-only slate. v1.1 records what shipped in Wave 1
(S1, S2, S3, S15) and leaves the remaining 11 cards Open for the next
waves. Additive doc — v1.0 stays as the historical proposal."""
from pathlib import Path
from _helpers import *


SHIPPED = [
    ("S1",  "Transparent Drug-Safety Reasoning Panel",
        "src/components/clinical/DrugSafetyReasoningCard.tsx mounted in src/app/doctor/dashboard/page.tsx above the existing one-line warnings (additive). Renders the 4-check matrix (allergy / interaction / dose / narcotic) with per-check reasoning chips, plus an HITL 'AI-suggested alternatives' card driven by a deterministic alternates table (Augmentin → Cipro+Metro for penicillin, Amoxicillin → Azithro / Doxy, etc.). 'Use' button on each alternative emits a toast for the demo; substitute wiring is in the consumer hook."),
    ("S2",  "NEWS2 / qSOFA / Sepsis Ambient Watcher",
        "src/components/clinical/EarlyWarningBanner.tsx renders one banner per inpatient whose most-recent NEWS2 ≥ 5. Mounted at the top of src/app/doctor/ipd/page.tsx. Uses the existing src/lib/vitals.ts engine — no new scoring logic. Banner shows transparent reasoning (drivers from the scorer), an Escalate button (audit-logged) and an Acknowledge button (silences for the session)."),
    ("S3",  "Closed-Loop Critical-Value Banner + Ack Gate",
        "src/components/clinical/CriticalValueBanner.tsx subscribes to the persisted audit table for lab_critical_callback events. Mounted in AppShell.tsx so it renders globally for doctor + nurse roles. Each unacknowledged critical-value renders a top banner with a 2-minute soft-blocker countdown chip, audit timestamp, and per-role Acknowledge button. Ack writes to localStorage so it persists across F5; opening the audit trail is one click."),
    ("S15", "Doctor Day-in-Review (explainable narration)",
        "src/components/doctor/DaySummaryCard.tsx mounted at the top of src/app/doctor/analytics/page.tsx. Deterministic narration over useDoctorStatsStore.totalsFor + today's audit events. Shows: consults today, Rx signed, AI accept-rate (if any HITL audits exist), NEWS2 escalations responded to. Suggests 'next focus' items based on the data. HITL dismiss / 'Add to tomorrow'."),
]

# What's NOT in W1 (carried into next waves)
OPEN = [
    ("S4",  "Hospital-Wide AI Copilot (palette+ evolution)",  "Wave 2"),
    ("S5",  "Voice Scribe Everywhere",                          "Wave 2"),
    ("S6",  "Mock OCR Intake",                                  "Wave 2"),
    ("S7",  "Predictive Operations Cockpit",                   "Wave 3"),
    ("S8",  "Revenue-Cycle Growth Cockpit",                    "Wave 3"),
    ("S9",  "NABH Evidence Live Cockpit",                      "Wave 4"),
    ("S10", "DPDP / DISHA Self-Audit Panel",                   "Wave 4"),
    ("S11", "AI Health Summary on Patient Portal Home",       "Wave 5"),
    ("S12", "Family-Track v2 (mock WhatsApp invite)",          "Wave 5"),
    ("S13", "Proactive Patient Nudges",                         "Wave 5"),
    ("S14", "Care-Team Presence + Live Handover",              "Wave 6"),
]


def build(out: Path) -> None:
    doc = new_doc()
    cover(doc, "10 - Competitive Innovation",
          "Competitive Innovation — Wave 1 Closure (v1.1)",
          "S1, S2, S3, S15 shipped — clinical-safety wow layer live")
    toc(doc)

    h1(doc, "1. Why v1.1 exists")
    p(doc, "v1.0 proposed a 15-card slate (S1–S15) covering every pillar. "
           "v1.1 records what shipped in M4-Wave-1 (the 'demo-defining "
           "clinical wow' bundle) and freezes the remaining 11 cards as "
           "Open for subsequent waves. v1.0 stays as the historical "
           "proposal — read it for full per-card detail.")

    h1(doc, "2. Wave-1 Shipped")
    callout(doc, "All four cards shipped",
            "Each card is additive to the M0 contract. Regression 54/54 "
            "remains green; no existing feature was modified or removed.",
            kind="ok")
    table(doc, ["ID", "Title", "What landed"],
          [[s[0], s[1], s[2]] for s in SHIPPED],
          col_widths_cm=[1.2, 5.0, 10.5])

    h1(doc, "3. Cross-Cutting Primitives (foundation for future waves)")
    bullet(doc, "**src/components/clinical/ReasoningChip.tsx** — explainability primitive (compact + expanded modes, 5 tones). Used by S1, S2, S15.")
    bullet(doc, "**src/components/clinical/DrugSafetyReasoningCard.tsx** — 4-check matrix + HITL alternates card.")
    bullet(doc, "**src/components/clinical/EarlyWarningBanner.tsx** — NEWS2 banner with escalate / acknowledge.")
    bullet(doc, "**src/components/clinical/CriticalValueBanner.tsx** — closed-loop ack banner; reads the persisted audit table.")
    bullet(doc, "**src/components/doctor/DaySummaryCard.tsx** — Day-in-Review narration with HITL dismiss.")

    h1(doc, "4. Where Each Card Mounts")
    table(doc, ["Card", "Mount point", "Hero-journey touch"],
          [
              ["S1 - Drug-safety reasoning",   "src/app/doctor/dashboard/page.tsx (above the existing rxWarnings strip in the OPD consult Rx panel)",
                "Anil's Augmentin-vs-Penicillin trigger renders the danger card + Cipro/Metro alternates."],
              ["S2 - NEWS2 banner",              "src/app/doctor/ipd/page.tsx (top of the inpatient list)",
                "Anil's seeded NEWS2 = 5 vital fires the amber banner with transparent drivers."],
              ["S3 - Critical-value banner",     "src/components/layout/AppShell.tsx (visible only on doctor + nurse surfaces)",
                "When an Anil-related lab_critical_callback fires, the global banner appears across every page."],
              ["S15 - Day-in-Review",            "src/app/doctor/analytics/page.tsx (above the chart)",
                "Narrates the day's consults / Rx / AI accept-rate / escalations from the seeded audit trail."],
          ],
          col_widths_cm=[3.5, 7.0, 6.5])

    h1(doc, "5. What's Still Open (Waves 2-6)")
    p(doc, "Per the recommended sequence in v1.0 §5:")
    table(doc, ["ID", "Title", "Wave"],
          [[r[0], r[1], r[2]] for r in OPEN],
          col_widths_cm=[1.5, 9.5, 4.0])

    h1(doc, "6. Verification")
    bullet(doc, "tsc --noEmit: 0 errors")
    bullet(doc, "next build: ✓ Compiled successfully")
    bullet(doc, "regression-suite.cjs at M4-W1: 54 / 54 green, 0 console errors")
    bullet(doc, "Screenshots: docs/specs/screens/M4-W1/")

    h1(doc, "A. Version History")
    table(doc, ["Version", "Date", "Author", "Notes"],
          [
              ["v1.0", "01 Jun 2026", AUTHOR, "Slate proposal — 15 cards."],
              ["v1.1", DOC_DATE,    AUTHOR, "M4-W1 closure — S1/S2/S3/S15 shipped."],
          ],
          col_widths_cm=[2.0, 3.0, 4.5, 7.5])

    save(doc, out)


if __name__ == "__main__":
    build(Path(__file__).parent / "10_Competitive_Innovation_v1_1.docx")
