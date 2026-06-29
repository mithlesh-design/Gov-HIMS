"""Generate 10_Competitive_Innovation_v1_5.docx — M4-W5 closure update.

v1.4 closed W4 (compliance pillar — S9/S10). v1.5 records what shipped
in M4-Wave-5 (S11 AI Health Summary, S12 Family-Track v2, S13 Proactive
Patient Nudges — the PATIENT SUPER-APP trio) and freezes the remaining
1 card (S14 Care-Team Presence) as Open for Wave 6."""
from pathlib import Path
from _helpers import *


SHIPPED_W5 = [
    ("S11", "AI Health Summary on Patient Portal Home",
        "src/components/patient/dashboard/AiHealthSummaryCard.tsx mounted "
        "at the top of src/app/patient/dashboard/page.tsx. Composes a "
        "plain-language summary from usePatientProfileStore (chronic "
        "conditions, daily meds, allergies) plus the last 24h of the "
        "audit trail scoped to the patient (Rx / lab / radiology orders). "
        "Three variants — Try another wording cycles. 87% confidence "
        "chip. 3-tile mini-strip (conditions / daily meds / allergies). "
        "HITL footer: Hide / regenerate / Looks right. Audit emits "
        "under resource='patient_health_summary'."),
    ("S12", "Family-Track v2 (mock WhatsApp invite)",
        "src/components/patient/dashboard/FamilyInviteCard.tsx mounted "
        "next to the existing FamilyTrackingCard on the right rail of "
        "the patient dashboard. Patient enters name + 10-digit phone + "
        "relation → preview the canned WhatsApp message → Send. "
        "Simulated delivery progression (sent → delivered → accepted) "
        "with 1.1s and 3.4s timers. Recipients list with masked phone, "
        "status chip, time-ago, and revoke. State persisted under "
        "kailash.patient.familyInvites; audit under resource="
        "'family_invite'."),
    ("S13", "Proactive Patient Nudges feed",
        "src/lib/patientNudges.ts engine + src/components/patient/"
        "dashboard/ProactiveNudgesFeed.tsx mounted in the main column. "
        "Eight nudge types: result-ready, unpaid-orders, pre-auth, "
        "follow-up-due (5-10 days post discharge), refill, HbA1c (when "
        "chronic conditions include diabetes), BP-log (when hypertension), "
        "family-consent, stage-aware 'your turn'. Priority-sorted; capped "
        "at 5 visible. Dismissals persisted (kailash.patient.nudgeDismiss). "
        "Audit under resource='patient_nudge'."),
]

OPEN = [
    ("S14", "Care-Team Presence + Live Handover",              "Wave 6"),
]

CARRIED = [
    ("S1",  "Transparent Drug-Safety Reasoning Panel"),
    ("S2",  "NEWS2 / qSOFA / Sepsis Ambient Watcher"),
    ("S3",  "Closed-Loop Critical-Value Banner + Ack Gate"),
    ("S15", "Doctor Day-in-Review"),
    ("S4",  "Hospital-Wide AI Copilot"),
    ("S5",  "Voice Scribe Everywhere"),
    ("S6",  "Mock OCR Intake"),
    ("S7",  "Predictive Operations Cockpit"),
    ("S8",  "Revenue-Cycle Growth Cockpit"),
    ("S9",  "NABH Evidence Live Cockpit"),
    ("S10", "DPDP / DISHA Self-Audit Panel"),
]


def build(out: Path) -> None:
    doc = new_doc()
    cover(doc, "10 - Competitive Innovation",
          "Competitive Innovation — Wave 5 Closure (v1.5)",
          "S11 / S12 / S13 shipped — Patient Super-App live")
    toc(doc)

    h1(doc, "1. Why v1.5 exists")
    p(doc, "v1.0 proposed a 15-card slate. v1.1/1.2/1.3/1.4 closed "
           "Waves 1-4 (clinical safety, operating speed, growth, "
           "compliance). v1.5 closes Wave 5 (S11 AI Health Summary, "
           "S12 Family-Track v2 mock WhatsApp invite, S13 Proactive "
           "Patient Nudges — the PATIENT SUPER-APP trio) and freezes "
           "the remaining card (S14) as Open for Wave 6.")

    h1(doc, "2. Wave-5 Shipped")
    callout(doc, "Patient pillar — three additive surfaces on the patient portal home",
            "Each card mounts on the patient dashboard alongside the "
            "existing AI Companion / Live Journey / Health Trends / "
            "Doctor's Orders / Family Tracking sections. Regression "
            "54/54 remains green.",
            kind="ok")
    table(doc, ["ID", "Title", "What landed"],
          [[s[0], s[1], s[2]] for s in SHIPPED_W5],
          col_widths_cm=[1.2, 5.0, 10.5])

    h1(doc, "3. New Engine")
    bullet(doc, "**src/lib/patientNudges.ts** — buildPatientNudges(ctx) returns a priority-sorted PatientNudge[] envelope { id, kind, title, body, cta, href, tone, priority }. Eight nudge generators triggered by patient profile (chronic conditions), recent audit (orders / results / pre-auth / discharge), pending orders (payment), live stage. Phase-2 swaps for a real recommender model.")

    h1(doc, "4. Where Each Card Mounts")
    table(doc, ["Card", "Mount point", "Patient touch"],
          [
              ["S11 - AI Health Summary",   "src/app/patient/dashboard/page.tsx (very top, above AiCompanionBar)",
                "Kiran opens the portal and sees 'Kiran, here's a quick look at where you stand today. You're managing Type 2 Diabetes and Hypertension. Daily plan: Metformin 500mg, Amlodipine 5mg. Watch out for Penicillin, Sulfa…'"],
              ["S12 - Family Invite",        "src/app/patient/dashboard/page.tsx (right rail, below FamilyTrackingCard)",
                "Kiran enters his wife's name + phone, previews the canned WhatsApp message, and taps Send. Mock delivery progresses to 'accepted' in ~3.4s and the recipient appears in the invited list."],
              ["S13 - Proactive Nudges",     "src/app/patient/dashboard/page.tsx (main column, between LiveJourneyCard and HealthTrendsCard)",
                "Five nudges appear: 5 orders waiting on payment (warn), vitals-desk live cue, Metformin refill running low, HbA1c quarterly check due, log home BP this week."],
          ],
          col_widths_cm=[3.5, 7.0, 6.5])

    h1(doc, "5. What's Still Open (Wave 6)")
    table(doc, ["ID", "Title", "Wave"],
          [[r[0], r[1], r[2]] for r in OPEN],
          col_widths_cm=[1.5, 9.5, 4.0])

    h1(doc, "6. Verification")
    bullet(doc, "tsc --noEmit: 0 errors")
    bullet(doc, "next build: Compiled successfully in 3.1 min")
    bullet(doc, "regression-suite.cjs at M4-W5: 54 / 54 green, 0 console errors")
    bullet(doc, "Screenshots: docs/specs/screens/M4-W5/ — patient dashboard full + 3 close-ups (S11 / S12 / S13).")

    h1(doc, "7. Waves 1-4 — Carried Forward")
    p(doc, "All prior surfaces remain live and untouched.")
    table(doc, ["ID", "Title"],
          [[s[0], s[1]] for s in CARRIED],
          col_widths_cm=[1.5, 13.0])

    h1(doc, "A. Version History")
    table(doc, ["Version", "Date", "Author", "Notes"],
          [
              ["v1.0", "01 Jun 2026", AUTHOR, "Slate proposal — 15 cards."],
              ["v1.1", "02 Jun 2026", AUTHOR, "M4-W1 closure — S1/S2/S3/S15."],
              ["v1.2", "02 Jun 2026", AUTHOR, "M4-W2 closure — S4/S5/S6."],
              ["v1.3", "02 Jun 2026", AUTHOR, "M4-W3 closure — S7/S8 (GROWTH)."],
              ["v1.4", "02 Jun 2026", AUTHOR, "M4-W4 closure — S9/S10 (COMPLIANCE)."],
              ["v1.5", DOC_DATE,      AUTHOR, "M4-W5 closure — S11/S12/S13 (PATIENT)."],
          ],
          col_widths_cm=[2.0, 3.0, 4.5, 7.5])

    save(doc, out)


if __name__ == "__main__":
    build(Path(__file__).parent / "10_Competitive_Innovation_v1_5.docx")
