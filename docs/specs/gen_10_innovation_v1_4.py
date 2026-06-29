"""Generate 10_Competitive_Innovation_v1_4.docx — M4-W4 closure update.

v1.3 closed W3 (GROWTH pillar — S7/S8). v1.4 records what shipped in
M4-Wave-4 (S9 NABH Evidence Live Cockpit, S10 DPDP / DISHA Self-Audit
Panel — the COMPLIANCE AUTOPILOT pair) and freezes the remaining 4
cards as Open for Waves 5-6."""
from pathlib import Path
from _helpers import *


SHIPPED_W4 = [
    ("S9",  "NABH Evidence Live Cockpit",
        "src/components/admin/NabhEvidenceLiveCockpit.tsx renders one "
        "card per NABH chapter (AAC / COP / MOM / HIC / PRE / IMS / CQI / "
        "ROM / HRM) over the existing buildNabhEvidence engine. Each "
        "card shows chapter blurb, event count, freshest evidence row "
        "with relative timestamp, AI-suggested next-action (when count < "
        "5), and an Open-desk HITL button that routes to the closest "
        "remediation surface (admission desk / IPD / pharmacy / BMW / "
        "insurance / quality / OT / roster). Mounted at the top of "
        "src/app/admin/compliance/page.tsx (above the 6-stream KPI strip). "
        "Audit writes under resource='nabh_evidence' with the chapter "
        "code so leadership can see which chapters were actioned."),
    ("S10", "DPDP / DISHA Self-Audit Panel",
        "src/lib/dpdpAudit.ts scoring engine — five DPDP/DISHA principles: "
        "scoreConsentRate, scoreRtbfSla (30-day SLA per DISHA §28(2)), "
        "scoreExportAudit (purpose+requester per DPDP §11), "
        "scoreBreachResponse (72-hour gate per DPDP §8(6)), "
        "scoreRbacDiscipline (rapid cross-role same-record access "
        "detector). src/components/admin/DpdpSelfAuditPanel.tsx renders "
        "five score cards with drivers + recommendation + HITL action. "
        "Mounted at the top of src/app/admin/disha/page.tsx (above the "
        "5-KPI strip). Audit writes under resource='dpdp_audit'."),
]

OPEN = [
    ("S11", "AI Health Summary on Patient Portal Home",       "Wave 5"),
    ("S12", "Family-Track v2 (mock WhatsApp invite)",          "Wave 5"),
    ("S13", "Proactive Patient Nudges",                         "Wave 5"),
    ("S14", "Care-Team Presence + Live Handover",              "Wave 6"),
]

CARRIED = [
    ("S1",  "Transparent Drug-Safety Reasoning Panel"),
    ("S2",  "NEWS2 / qSOFA / Sepsis Ambient Watcher"),
    ("S3",  "Closed-Loop Critical-Value Banner + Ack Gate"),
    ("S15", "Doctor Day-in-Review (explainable narration)"),
    ("S4",  "Hospital-Wide AI Copilot (palette+ evolution)"),
    ("S5",  "Voice Scribe Everywhere"),
    ("S6",  "Mock OCR Intake"),
    ("S7",  "Predictive Operations Cockpit"),
    ("S8",  "Revenue-Cycle Growth Cockpit"),
]


def build(out: Path) -> None:
    doc = new_doc()
    cover(doc, "10 - Competitive Innovation",
          "Competitive Innovation — Wave 4 Closure (v1.4)",
          "S9, S10 shipped — Compliance Autopilot live")
    toc(doc)

    h1(doc, "1. Why v1.4 exists")
    p(doc, "v1.0 proposed a 15-card slate. v1.1 closed W1 (S1/S2/S3/S15). "
           "v1.2 closed W2 (S4/S5/S6). v1.3 closed W3 (S7/S8 — GROWTH). "
           "v1.4 closes W4 (S9 NABH Evidence Live Cockpit, S10 DPDP/"
           "DISHA Self-Audit Panel — the COMPLIANCE AUTOPILOT pair) and "
           "freezes the remaining 4 cards as Open for Waves 5-6.")

    h1(doc, "2. Wave-4 Shipped")
    callout(doc, "Compliance pillar — NABH + DPDP/DISHA live cockpits",
            "Each card carries evidence + reasoning + a single primary "
            "action and HITL accept/dismiss. Reads existing stores; no "
            "schema changes. Regression 54/54 remains green.",
            kind="ok")
    table(doc, ["ID", "Title", "What landed"],
          [[s[0], s[1], s[2]] for s in SHIPPED_W4],
          col_widths_cm=[1.2, 5.0, 10.5])

    h1(doc, "3. New Engine & Cockpits")
    bullet(doc, "**src/lib/dpdpAudit.ts** — pure scoring engine. scoreConsentRate / scoreRtbfSla / scoreExportAudit / scoreBreachResponse / scoreRbacDiscipline each return a DpdpDimension envelope { id, title, score 0-100, tone, metric, drivers[], recommendation }. overallDpdpScore averages the five. Phase-2 swaps heuristics for a real DPO pipeline; envelope stays.")
    bullet(doc, "**src/components/admin/NabhEvidenceLiveCockpit.tsx** — per-chapter evidence card grid (3-col responsive) with AI suggested next-action when evidence is sparse. Reuses the same tone palette as the W3 cockpits.")
    bullet(doc, "**src/components/admin/DpdpSelfAuditPanel.tsx** — five-dimension scorecard with overall-score badge in the header. Each card has explicit DPDP / DISHA section references in the driver bullets so the auditor sees the legal anchor.")

    h1(doc, "4. Where Each Card Mounts")
    table(doc, ["Card", "Mount point", "Reading"],
          [
              ["S9 - NABH Evidence",   "src/app/admin/compliance/page.tsx (top of page, above the 6-stream KPI strip)",
                "Compliance officer opens Compliance Command Centre and sees 2/9 chapters above the 5-event threshold, the freshest evidence per chapter with a relative timestamp (e.g. '14m ago'), and AI-suggested next-actions for the 7 sparse chapters. Each chapter has an Open-desk button that routes to the right remediation surface."],
              ["S10 - DPDP Self-Audit", "src/app/admin/disha/page.tsx (top of page, above the 5-KPI strip)",
                "DPO opens DISHA / DPDP Compliance and sees an 80/100 overall self-audit score, broken down into Consent capture rate, RTBF turnaround (30-day SLA), Data-export audit coverage (purpose+requester gate), Breach response (72-hour gate), and Role-based access discipline (rapid cross-role detector)."],
          ],
          col_widths_cm=[3.5, 7.0, 6.5])

    h1(doc, "5. What's Still Open (Waves 5-6)")
    p(doc, "Four cards remain — patient super-app (W5) and care-team presence (W6):")
    table(doc, ["ID", "Title", "Wave"],
          [[r[0], r[1], r[2]] for r in OPEN],
          col_widths_cm=[1.5, 9.5, 4.0])

    h1(doc, "6. Verification")
    bullet(doc, "tsc --noEmit: 0 errors")
    bullet(doc, "next build: Compiled successfully in 2.3 min")
    bullet(doc, "regression-suite.cjs at M4-W4: 54 / 54 green, 0 console errors")
    bullet(doc, "Screenshots: docs/specs/screens/M4-W4/ — S9 NABH 9-chapter grid + S10 DPDP 5-dimension scorecard.")

    h1(doc, "7. Waves 1-3 — Carried Forward")
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
              ["v1.4", DOC_DATE,      AUTHOR, "M4-W4 closure — S9/S10 (COMPLIANCE)."],
          ],
          col_widths_cm=[2.0, 3.0, 4.5, 7.5])

    save(doc, out)


if __name__ == "__main__":
    build(Path(__file__).parent / "10_Competitive_Innovation_v1_4.docx")
