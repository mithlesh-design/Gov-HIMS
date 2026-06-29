"""Generate 10_Competitive_Innovation_v1_6.docx — M4-W6 FINAL closure.

The 15-card slate from v1.0 is now closed. v1.5 closed W5 (S11/S12/S13
patient super-app). v1.6 records the final card (S14 Care-Team Presence
+ Live Handover) and marks the slate 15/15 SHIPPED."""
from pathlib import Path
from _helpers import *


SHIPPED_W6 = [
    ("S14", "Care-Team Presence + Live Handover",
        "src/lib/careTeamPresence.ts engine — pure function over "
        "useHRStore.staff + shifts + duty + current time → CareTeamMember"
        "[] with PresenceStatus (on_shift / handover_pending / on_call / "
        "off). Three shift windows mapped to wall-clock; handover_pending "
        "fires within 45 min of shift end. "
        "src/components/clinical/CareTeamPresenceCard.tsx renders a "
        "pill-style presence strip (status dot + initials + role), "
        "in-card SBAR compose with AI-generated skeleton (Situation / "
        "Background / Assessment / Recommendation), and an Incoming "
        "panel where the next shift one-taps 'Receive handover' (audited "
        "two-sided HITL). Mounted on src/app/doctor/ipd/page.tsx (above "
        "the Quick-note toolbar) and src/app/nurse/dashboard/page.tsx "
        "(below the ShiftBanner). Backed by the existing useShiftStore."
        "signHandover / receiveHandover API. Audit writes under "
        "resource='live_handover' for both sign and receive."),
]

ALL_SHIPPED = [
    ("S1",  "Transparent Drug-Safety Reasoning Panel",         "W1"),
    ("S2",  "NEWS2 / qSOFA / Sepsis Ambient Watcher",          "W1"),
    ("S3",  "Closed-Loop Critical-Value Banner + Ack Gate",    "W1"),
    ("S15", "Doctor Day-in-Review",                              "W1"),
    ("S4",  "Hospital-Wide AI Copilot (palette+ evolution)",   "W2"),
    ("S5",  "Voice Scribe Everywhere",                          "W2"),
    ("S6",  "Mock OCR Intake",                                  "W2"),
    ("S7",  "Predictive Operations Cockpit",                    "W3"),
    ("S8",  "Revenue-Cycle Growth Cockpit",                     "W3"),
    ("S9",  "NABH Evidence Live Cockpit",                       "W4"),
    ("S10", "DPDP / DISHA Self-Audit Panel",                    "W4"),
    ("S11", "AI Health Summary on Patient Portal Home",         "W5"),
    ("S12", "Family-Track v2 (mock WhatsApp invite)",           "W5"),
    ("S13", "Proactive Patient Nudges",                          "W5"),
    ("S14", "Care-Team Presence + Live Handover",               "W6"),
]


def build(out: Path) -> None:
    doc = new_doc()
    cover(doc, "10 - Competitive Innovation",
          "Competitive Innovation — Wave 6 FINAL Closure (v1.6)",
          "All 15 cards shipped — slate complete")
    toc(doc)

    h1(doc, "1. Why v1.6 exists — the final card")
    p(doc, "v1.0 proposed a 15-card slate. Six waves closed the slate "
           "(W1 clinical safety, W2 operating speed, W3 growth, W4 "
           "compliance, W5 patient super-app, W6 care-team presence). "
           "v1.6 records S14 — the final card — and ratifies the slate "
           "as 15/15 SHIPPED.")

    h1(doc, "2. Wave-6 Shipped")
    callout(doc, "Final card — Care-Team Presence + Live Handover",
            "Two-sided HITL handover: outgoing nurse drafts SBAR with AI "
            "skeleton + signs; incoming nurse one-taps Receive. Audit "
            "captures both sides. Mounted on Doctor IPD and Nurse "
            "Dashboard. Regression 54/54 remains green.",
            kind="ok")
    table(doc, ["ID", "Title", "What landed"],
          [[s[0], s[1], s[2]] for s in SHIPPED_W6],
          col_widths_cm=[1.2, 5.0, 10.5])

    h1(doc, "3. Slate — 15/15 SHIPPED")
    callout(doc, "Innovation Slate Complete",
            "All 15 cards from the v1.0 proposal are now live across the "
            "Phase-1 build. Regression 54/54 green at every wave; zero "
            "console errors; every accept/reject/modify is audit-logged.",
            kind="ok")
    table(doc, ["ID", "Title", "Wave"],
          [[s[0], s[1], s[2]] for s in ALL_SHIPPED],
          col_widths_cm=[1.2, 11.0, 1.5])

    h1(doc, "4. New HITL resources added across the slate")
    p(doc, "Each wave introduced typed audit resources so leadership can "
           "trace exactly which AI suggestion was accepted / rejected:")
    bullet(doc, "W1 — `early_warning`, `critical_value_callback` (closed-loop ack)")
    bullet(doc, "W2 — `ai_copilot_intent`, `voice_scribe`, `ocr_intake`")
    bullet(doc, "W3 — `ops_prediction`, `rcm_growth`")
    bullet(doc, "W4 — `nabh_evidence`, `dpdp_audit`")
    bullet(doc, "W5 — `patient_health_summary`, `family_invite`, `patient_nudge`")
    bullet(doc, "W6 — `live_handover` (two-sided: sign + receive)")

    h1(doc, "5. Cross-cutting primitives & engines (foundation for future work)")
    bullet(doc, "**src/components/clinical/ReasoningChip.tsx** — shared explainability primitive (compact pill / expanded card)")
    bullet(doc, "**src/lib/aiCopilot.ts** — NL → typed-intent parser (envelope shape stable for LLM swap)")
    bullet(doc, "**src/lib/voiceScribe.ts** — Web Speech + fallback transcripts + toSOAP")
    bullet(doc, "**src/lib/predictiveOps.ts** — four deterministic forecasters over live stores")
    bullet(doc, "**src/lib/revenueGrowth.ts** — four lever-finders with ₹-impact estimates")
    bullet(doc, "**src/lib/dpdpAudit.ts** — five-dimension self-scoring engine with DPDP/DISHA section anchors")
    bullet(doc, "**src/lib/patientNudges.ts** — eight nudge generators with priority sort")
    bullet(doc, "**src/lib/careTeamPresence.ts** — pure presence composer (HR + shifts + duty + time)")

    h1(doc, "6. Verification")
    bullet(doc, "tsc --noEmit: 0 errors")
    bullet(doc, "next build: Compiled successfully in 18.3 s")
    bullet(doc, "regression-suite.cjs at M4-W6: 54 / 54 green, 0 console errors")
    bullet(doc, "Screenshots: docs/specs/screens/M4-W6/ — Doctor IPD presence, SBAR compose, Nurse Dashboard presence.")

    h1(doc, "7. What's next — M5")
    p(doc, "M5 is the demo-readiness sweep: re-walk all 16 flows from M3, "
           "verify every W1-W6 surface fires its narrative in the hero "
           "Anil + Kiran journey, reconcile docs 07 / 08 / 09 / 10, ship "
           "the runbook for the live demo. Tag: checkpoint/M5-demo-ready.")

    h1(doc, "A. Version History")
    table(doc, ["Version", "Date", "Author", "Notes"],
          [
              ["v1.0", "01 Jun 2026", AUTHOR, "Slate proposal — 15 cards."],
              ["v1.1", "02 Jun 2026", AUTHOR, "M4-W1 closure — S1/S2/S3/S15."],
              ["v1.2", "02 Jun 2026", AUTHOR, "M4-W2 closure — S4/S5/S6."],
              ["v1.3", "02 Jun 2026", AUTHOR, "M4-W3 closure — S7/S8 (GROWTH)."],
              ["v1.4", "02 Jun 2026", AUTHOR, "M4-W4 closure — S9/S10 (COMPLIANCE)."],
              ["v1.5", "02 Jun 2026", AUTHOR, "M4-W5 closure — S11/S12/S13 (PATIENT)."],
              ["v1.6", DOC_DATE,      AUTHOR, "M4-W6 FINAL closure — S14 (PRESENCE). Slate 15/15."],
          ],
          col_widths_cm=[2.0, 3.0, 4.5, 7.5])

    save(doc, out)


if __name__ == "__main__":
    build(Path(__file__).parent / "10_Competitive_Innovation_v1_6.docx")
