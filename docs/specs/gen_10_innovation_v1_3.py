"""Generate 10_Competitive_Innovation_v1_3.docx — M4-W3 closure update.

v1.2 closed W2 (operating-speed wow — S4 / S5 / S6). v1.3 records what
shipped in M4-Wave-3 (S7 Predictive Operations Cockpit, S8 Revenue-Cycle
Growth Cockpit — the GROWTH pillar) and freezes the remaining 6 cards
as Open for Waves 4-6."""
from pathlib import Path
from _helpers import *


SHIPPED_W3 = [
    ("S7",  "Predictive Operations Cockpit",
        "src/lib/predictiveOps.ts engine: four deterministic forecasters "
        "over live store state — predictEdArrivals (rate-over-4h × time-"
        "of-day weight), predictOrUtilisation (scheduled + in-progress vs "
        "capacity), predictIcuPressure (current ICU + projected step-ups), "
        "predictStaffingGap (active vs demand). src/components/admin/"
        "PredictiveOpsCockpit.tsx renders the 4-card grid with reasoning "
        "drivers + recommended action + HITL accept/dismiss. Mounted at "
        "the top of src/app/admin/operations/page.tsx. Audit writes "
        "hitl_accept / hitl_reject under resource='ops_prediction' with "
        "the prediction id (ed_arrivals_4h / or_utilisation_24h / "
        "icu_pressure / staffing_gap) so leadership can see which "
        "predictions were actioned."),
    ("S8",  "Revenue-Cycle Growth Cockpit",
        "src/lib/revenueGrowth.ts engine: four lever-finders over live "
        "claims + bills — findDenialRiskClaims (claims with AI denial-"
        "risk ≥ 50), findDaysInAr (avg age + claims over 30 days), "
        "findChargeCaptureGaps (IPD bills under ₹25k flagged as likely "
        "under-charged), findPayerMixConcentration (% claim value in >"
        "₹1L claims). src/components/admin/RevenueCycleGrowthCockpit.tsx "
        "renders the 4-card grid with ₹-impact estimate per finding + a "
        "total-opportunity badge in the header. Mounted at the top of "
        "src/app/admin/finance/page.tsx (above the P&L KPI strip). Audit "
        "writes under resource='rcm_growth'."),
]

OPEN = [
    ("S9",  "NABH Evidence Live Cockpit",                      "Wave 4"),
    ("S10", "DPDP / DISHA Self-Audit Panel",                   "Wave 4"),
    ("S11", "AI Health Summary on Patient Portal Home",       "Wave 5"),
    ("S12", "Family-Track v2 (mock WhatsApp invite)",          "Wave 5"),
    ("S13", "Proactive Patient Nudges",                         "Wave 5"),
    ("S14", "Care-Team Presence + Live Handover",              "Wave 6"),
]

CARRIED_W1_W2 = [
    ("S1",  "Transparent Drug-Safety Reasoning Panel"),
    ("S2",  "NEWS2 / qSOFA / Sepsis Ambient Watcher"),
    ("S3",  "Closed-Loop Critical-Value Banner + Ack Gate"),
    ("S15", "Doctor Day-in-Review (explainable narration)"),
    ("S4",  "Hospital-Wide AI Copilot (palette+ evolution)"),
    ("S5",  "Voice Scribe Everywhere"),
    ("S6",  "Mock OCR Intake"),
]


def build(out: Path) -> None:
    doc = new_doc()
    cover(doc, "10 - Competitive Innovation",
          "Competitive Innovation — Wave 3 Closure (v1.3)",
          "S7, S8 shipped — Growth pillar live")
    toc(doc)

    h1(doc, "1. Why v1.3 exists")
    p(doc, "v1.0 proposed a 15-card slate. v1.1 closed Wave 1 (clinical-"
           "safety wow — S1/S2/S3/S15). v1.2 closed Wave 2 (operating-"
           "speed wow — S4/S5/S6). v1.3 closes Wave 3 (the GROWTH pillar "
           "— S7 Predictive Operations Cockpit, S8 Revenue-Cycle Growth "
           "Cockpit) and freezes the remaining 6 cards as Open for "
           "Waves 4-6.")

    h1(doc, "2. Wave-3 Shipped")
    callout(doc, "Growth pillar — operational + financial AI cockpits",
            "Each cockpit is a 4-card grid with reasoning + ₹-impact + "
            "recommended action + HITL accept/dismiss. Reads existing "
            "stores live; no schema changes. Regression 54/54 remains "
            "green.",
            kind="ok")
    table(doc, ["ID", "Title", "What landed"],
          [[s[0], s[1], s[2]] for s in SHIPPED_W3],
          col_widths_cm=[1.2, 5.0, 10.5])

    h1(doc, "3. New Engines (foundation for future predictive surfaces)")
    bullet(doc, "**src/lib/predictiveOps.ts** — four pure forecasters: predictEdArrivals(patients), predictOrUtilisation(otProcedures, rooms), predictIcuPressure(inpatients, capacity), predictStaffingGap(active, demand). Each returns the OpsPrediction envelope { id, title, headline, metric, windowLabel, tone, confidence, drivers[], recommendation }. Phase-2 swaps each function for an ML model; the envelope shape stays.")
    bullet(doc, "**src/lib/revenueGrowth.ts** — four lever-finders: findDenialRiskClaims, findDaysInAr, findChargeCaptureGaps, findPayerMixConcentration. Each returns the GrowthFinding envelope { id, title, headline, metric, impactInr, tone, confidence, drivers[], recommendation }. ₹-impact is a real number the leadership can sum.")
    bullet(doc, "**Cockpit components** — PredictiveOpsCockpit + RevenueCycleGrowthCockpit share the same card pattern, tone palette (ok / warn / danger), and HITL footer. Future waves can drop more lever-finders into the same shell.")

    h1(doc, "4. Where Each Card Mounts")
    table(doc, ["Card", "Mount point", "Hero-journey touch"],
          [
              ["S7 - Predictive Ops",  "src/app/admin/operations/page.tsx (top of page, above the notification channel config)",
                "Ops manager opens the page and sees 13 ED arrivals expected next 4h (warn), 5% OR utilisation (idle capacity), 1/12 ICU beds (healthy), and 3 staffing roles short for the evening shift (warn). Each card has a single primary action."],
              ["S8 - RCM Growth",       "src/app/admin/finance/page.tsx (above the Top-line KPI strip)",
                "Finance lead opens Hospital P&L and sees ₹94.7k at risk from 1 denial-flagged claim, 3 days avg AR, no charge-capture leakage today, and 68% high-value-claim concentration. A total-opportunity badge sits in the header."],
          ],
          col_widths_cm=[3.5, 7.0, 6.5])

    h1(doc, "5. What's Still Open (Waves 4-6)")
    p(doc, "Waves 1, 2 and 3 are now closed. The remaining six cards are queued for the next phases:")
    table(doc, ["ID", "Title", "Wave"],
          [[r[0], r[1], r[2]] for r in OPEN],
          col_widths_cm=[1.5, 9.5, 4.0])

    h1(doc, "6. Verification")
    bullet(doc, "tsc --noEmit: 0 errors")
    bullet(doc, "next build: ✓ Compiled successfully in 119s")
    bullet(doc, "regression-suite.cjs at M4-W3: 54 / 54 green, 0 console errors")
    bullet(doc, "Screenshots: docs/specs/screens/M4-W3/ — S7 predictive-ops + S8 RCM-growth.")

    h1(doc, "7. Waves 1-2 — Carried Forward (still shipping)")
    p(doc, "All Wave-1 and Wave-2 surfaces remain live and untouched.")
    table(doc, ["ID", "Title"],
          [[s[0], s[1]] for s in CARRIED_W1_W2],
          col_widths_cm=[1.5, 13.0])

    h1(doc, "A. Version History")
    table(doc, ["Version", "Date", "Author", "Notes"],
          [
              ["v1.0", "01 Jun 2026", AUTHOR, "Slate proposal — 15 cards."],
              ["v1.1", "02 Jun 2026", AUTHOR, "M4-W1 closure — S1/S2/S3/S15 shipped."],
              ["v1.2", "02 Jun 2026", AUTHOR, "M4-W2 closure — S4/S5/S6 shipped."],
              ["v1.3", DOC_DATE,      AUTHOR, "M4-W3 closure — S7/S8 shipped (GROWTH pillar)."],
          ],
          col_widths_cm=[2.0, 3.0, 4.5, 7.5])

    save(doc, out)


if __name__ == "__main__":
    build(Path(__file__).parent / "10_Competitive_Innovation_v1_3.docx")
