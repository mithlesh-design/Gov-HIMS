"""Generate 10_Competitive_Innovation_v2_0.docx — single consolidated doc.

v2.0 subsumes v1.0–v1.6 into one top-to-bottom readable artifact for the
live demo. v1.0–v1.6 stay in the repo as historical trail; v2.0 becomes
the canonical reference (runbook + checkpoints point here)."""
from pathlib import Path
from _helpers import *


# ── The full slate, one row per card, in canonical (shipped) order ──────────
CARDS = [
    # (id,   title,                                       wave, pillar,           mount,                                                                                            engine,                                              audit_resource(s))
    ("S1",  "Transparent Drug-Safety Reasoning Panel",    "W1", "Clinical safety", "src/app/doctor/dashboard/page.tsx",                                                              "src/lib/drugSafety.ts (checkRx)",                  "hitl_accept / hitl_reject on the prescribe path"),
    ("S2",  "NEWS2 / qSOFA / Sepsis Ambient Watcher",     "W1", "Clinical safety", "src/app/doctor/ipd/page.tsx (per-inpatient banner)",                                            "src/lib/vitals.ts (news2FromRecord)",              "early_warning"),
    ("S3",  "Closed-Loop Critical-Value Banner + Ack",    "W1", "Clinical safety", "src/components/layout/AppShell.tsx (global for doctor + nurse)",                                  "audit-trail subscription (lab_critical_callback)", "critical_value_callback (sign + ack)"),
    ("S15", "Doctor Day-in-Review (explainable)",          "W1", "Clinical safety", "src/app/doctor/analytics/page.tsx",                                                              "useDoctorStatsStore.totalsFor + audit entries",     "patient_health_summary (doctor-side)"),
    ("S4",  "Hospital-Wide AI Copilot",                   "W2", "Operating speed", "src/components/layout/CommandPalette.tsx (every role, Cmd/Ctrl+K)",                              "src/lib/aiCopilot.ts (parseIntent)",                "ai_copilot_intent"),
    ("S5",  "Voice Scribe Everywhere",                     "W2", "Operating speed", "doctor/ipd (Quick-note) + nurse/rounds (AI-SOAP companion)",                                    "src/lib/voiceScribe.ts (Web Speech + toSOAP)",     "voice_scribe"),
    ("S6",  "Mock OCR Intake",                             "W2", "Operating speed", "src/app/reception/opd/page.tsx (walk-in modal)",                                                  "deterministic 800 ms canned scan",                  "ocr_intake (modify + accept + reject)"),
    ("S7",  "Predictive Operations Cockpit",               "W3", "GROWTH",          "src/app/admin/operations/page.tsx",                                                              "src/lib/predictiveOps.ts (4 forecasters)",          "ops_prediction"),
    ("S8",  "Revenue-Cycle Growth Cockpit",                "W3", "GROWTH",          "src/app/admin/finance/page.tsx",                                                                 "src/lib/revenueGrowth.ts (4 lever-finders)",        "rcm_growth"),
    ("S9",  "NABH Evidence Live Cockpit",                  "W4", "Compliance",      "src/app/admin/compliance/page.tsx",                                                              "src/lib/nabhEvidence.ts (buildNabhEvidence)",       "nabh_evidence"),
    ("S10", "DPDP / DISHA Self-Audit Panel",               "W4", "Compliance",      "src/app/admin/disha/page.tsx",                                                                    "src/lib/dpdpAudit.ts (scoreAllDimensions)",         "dpdp_audit"),
    ("S11", "AI Health Summary (Patient Portal)",          "W5", "Patient super-app", "src/app/patient/dashboard/page.tsx (top of page)",                                              "PatientProfile + last-24h audit composer",          "patient_health_summary"),
    ("S12", "Family-Track v2 (mock WhatsApp invite)",      "W5", "Patient super-app", "src/app/patient/dashboard/page.tsx (right rail)",                                                "mock WhatsApp delivery progression",                "family_invite"),
    ("S13", "Proactive Patient Nudges",                     "W5", "Patient super-app", "src/app/patient/dashboard/page.tsx (main column)",                                              "src/lib/patientNudges.ts (8 generators)",          "patient_nudge"),
    ("S14", "Care-Team Presence + Live Handover",          "W6", "Care-team",       "/doctor/ipd + /nurse/dashboard",                                                                  "src/lib/careTeamPresence.ts + useShiftStore",      "live_handover (sign + receive)"),
]

PRIMITIVES = [
    ("ReasoningChip",                    "src/components/clinical/ReasoningChip.tsx",       "Shared explainability primitive (compact pill / expanded card)"),
    ("aiCopilot",                        "src/lib/aiCopilot.ts",                             "NL → typed-intent parser (envelope stable across LLM swap)"),
    ("voiceScribe",                      "src/lib/voiceScribe.ts",                            "Web Speech + per-surface fallback + toSOAP"),
    ("predictiveOps",                    "src/lib/predictiveOps.ts",                          "Four deterministic forecasters over live stores"),
    ("revenueGrowth",                    "src/lib/revenueGrowth.ts",                          "Four lever-finders with ₹-impact estimates"),
    ("dpdpAudit",                        "src/lib/dpdpAudit.ts",                              "Five-principle self-scoring engine with DPDP/DISHA section anchors"),
    ("patientNudges",                    "src/lib/patientNudges.ts",                          "Eight nudge generators with priority sort"),
    ("careTeamPresence",                 "src/lib/careTeamPresence.ts",                      "Pure presence composer (HR + shifts + duty + wall-clock)"),
]

AUDIT_RESOURCES = [
    ("early_warning",            "S2",     "NEWS2 escalation / acknowledge"),
    ("critical_value_callback",  "S3",     "Closed-loop ack (doctor + nurse)"),
    ("ai_copilot_intent",        "S4",     "NL-intent accept / reject"),
    ("voice_scribe",             "S5",     "AI-SOAP accept / reject"),
    ("ocr_intake",               "S6",     "Scan modify + apply + discard"),
    ("ops_prediction",           "S7",     "Per-forecaster action / dismiss"),
    ("rcm_growth",               "S8",     "Per-lever action / dismiss"),
    ("nabh_evidence",            "S9",     "Per-chapter Open-desk / dismiss"),
    ("dpdp_audit",               "S10",    "Per-principle action / dismiss"),
    ("patient_health_summary",   "S11/S15","Accept / regenerate / hide narration"),
    ("family_invite",            "S12",    "Invite send / accepted / revoke"),
    ("patient_nudge",            "S13",    "Per-nudge act / dismiss"),
    ("live_handover",            "S14",    "Sign + Receive (two-sided)"),
]

VERSION_HISTORY = [
    ("v1.0", "01 Jun 2026", "Slate proposal — 15 cards."),
    ("v1.1", "02 Jun 2026", "M4-W1 closure — S1/S2/S3/S15."),
    ("v1.2", "02 Jun 2026", "M4-W2 closure — S4/S5/S6."),
    ("v1.3", "02 Jun 2026", "M4-W3 closure — S7/S8 (GROWTH)."),
    ("v1.4", "02 Jun 2026", "M4-W4 closure — S9/S10 (COMPLIANCE)."),
    ("v1.5", "02 Jun 2026", "M4-W5 closure — S11/S12/S13 (PATIENT)."),
    ("v1.6", "02 Jun 2026", "M4-W6 FINAL closure — S14. Slate 15/15."),
    ("v2.0", DOC_DATE,      "Consolidated: subsumes v1.0–v1.6 into one canonical doc."),
]


def build(out: Path) -> None:
    doc = new_doc()
    cover(doc, "10 - Competitive Innovation",
          "Competitive Innovation — Consolidated (v2.0)",
          "Slate 15 / 15 shipped · single-doc reference")
    toc(doc)

    # ── §1. Executive summary ────────────────────────────────────────────────
    h1(doc, "1. Executive summary")
    p(doc, "Phase-1 of Umang HIMS shipped a 15-card innovation slate across "
           "six waves (M4-W1 through M4-W6), closed by an end-to-end demo-"
           "readiness sweep (M5). Every card is HITL — accept, reject, or "
           "modify — and every decision lands in an audit trail under a "
           "typed resource. The slate covers four pillars: clinical safety "
           "wow, operating speed, growth, and compliance, plus a patient "
           "super-app layer and a two-sided care-team handover.")
    callout(doc, "Slate state at v2.0",
            "15 / 15 cards SHIPPED. Regression 54 / 54 green; flow-walker "
            "16 PASS / 0 PARTIAL / 0 FAIL; 0 console errors. 13 typed HITL "
            "audit resources live across the slate.",
            kind="ok")

    # ── §2. The four pillars ─────────────────────────────────────────────────
    h1(doc, "2. The four pillars")
    bullet(doc, "**0. PRESERVE** — every Phase-1 surface that worked before the overhaul still works after every wave. Verified by the 54-assertion regression suite at every checkpoint.")
    bullet(doc, "**1. INTUITIVE** — compact tokens, global Cmd/Ctrl+K palette (S4), single primary action per AI card.")
    bullet(doc, "**2. GROWTH-FOCUSED** — S7 ops cockpit + S8 RCM cockpit + S9 NABH-evidence-as-product give leadership the levers (throughput, utilisation, denial reduction, charge capture).")
    bullet(doc, "**3. AI-CENTRIC** — every card carries reasoning + confidence + HITL accept/reject. The audit trail is the product.")

    # ── §3. Card catalog ─────────────────────────────────────────────────────
    h1(doc, "3. Card catalog — 15 cards")
    table(doc, ["ID", "Title", "Wave", "Pillar"],
          [[c[0], c[1], c[2], c[3]] for c in CARDS],
          col_widths_cm=[1.2, 7.5, 1.5, 4.5])

    h2(doc, "3.1 Mount points")
    table(doc, ["ID", "Mount point", "Engine"],
          [[c[0], c[4], c[5]] for c in CARDS],
          col_widths_cm=[1.2, 8.0, 6.5])

    # ── §4. Cross-cutting primitives ─────────────────────────────────────────
    h1(doc, "4. Cross-cutting primitives & engines")
    p(doc, "Each engine returns a stable envelope so Phase-2 can swap the "
           "internals for real models without touching the UI:")
    table(doc, ["Module", "Path", "Role"],
          [[r[0], r[1], r[2]] for r in PRIMITIVES],
          col_widths_cm=[3.5, 6.0, 6.5])

    # ── §5. Audit resource registry ──────────────────────────────────────────
    h1(doc, "5. Audit-resource registry")
    p(doc, "Thirteen typed HITL audit resources let leadership see exactly "
           "which AI suggestion was accepted, rejected, or modified, by whom, "
           "and when. Each entry below corresponds to a `useAuditStore.log()` "
           "call site in the slate:")
    table(doc, ["Resource code", "Card", "What it records"],
          [[r[0], r[1], r[2]] for r in AUDIT_RESOURCES],
          col_widths_cm=[4.5, 2.0, 9.5])

    # ── §6. Verification ─────────────────────────────────────────────────────
    h1(doc, "6. Verification")
    bullet(doc, "**tsc --noEmit**: 0 errors")
    bullet(doc, "**next build**: Compiled successfully")
    bullet(doc, "**regression-suite.cjs**: 54 / 54 passed, 0 failed, 0 console errors")
    bullet(doc, "**flow-walker.cjs**: 16 PASS / 0 PARTIAL / 0 FAIL, 0 console errors (M5b state)")
    bullet(doc, "**hero-journey-walker.cjs**: 10 / 10 beats captured (M5)")
    p(doc, "")
    bullet(doc, "Demo runbook: docs/specs/M5_Demo_Runbook.md")
    bullet(doc, "Checkpoint registry: docs/specs/CHECKPOINTS.md")
    bullet(doc, "Hero-journey JSON: docs/specs/screens/M5/hero-journey.json")

    h2(doc, "6.1 Restore commands")
    bullet(doc, "`git checkout checkpoint/M5b-final` — latest, slate 15/15 + tail clean")
    bullet(doc, "`git checkout checkpoint/M5-demo-ready` — slate 15/15, demo-ready snapshot")
    bullet(doc, "`git checkout checkpoint/M4-wave-N` — any individual wave (1..6)")
    bullet(doc, "`git checkout checkpoint/M0-baseline` — original Phase-1 baseline before any wave")

    # ── §7. Phase-2 swap points ──────────────────────────────────────────────
    h1(doc, "7. Phase-2 swap points")
    p(doc, "Every engine in §4 has a stable envelope. Phase-2 replaces the "
           "internals; the UI doesn't change. Concrete swap targets:")
    bullet(doc, "**aiCopilot.parseIntent** → real LLM call returning the same { action, object, patient, time, destination, confidence, reasoning, raw } envelope.")
    bullet(doc, "**voiceScribe.startDictation + toSOAP** → vendor STT (Deepgram / AssemblyAI) + LLM structuring.")
    bullet(doc, "**predictiveOps.predict\\* functions** → trained models on real ED / OR / ICU / staffing telemetry; same OpsPrediction shape.")
    bullet(doc, "**revenueGrowth.find\\* functions** → ML denial-risk scorer + real claim-aging pipeline; same GrowthFinding shape.")
    bullet(doc, "**dpdpAudit.score\\* functions** → DPO platform / compliance vendor; same DpdpDimension shape.")
    bullet(doc, "**OCR mock** in OcrIntakeCard → real OCR vendor (Tesseract / Veryfi / Google Document AI); same OcrFields envelope.")
    bullet(doc, "**Mock-API at src/lib/api/** (18 typed modules) → real REST gateway per 02_TRD §5; envelope schemas already match.")

    # ── Appendix A ───────────────────────────────────────────────────────────
    h1(doc, "Appendix A. Version history")
    table(doc, ["Version", "Date", "Notes"],
          [[r[0], r[1], r[2]] for r in VERSION_HISTORY],
          col_widths_cm=[2.0, 3.0, 11.0])

    save(doc, out)


if __name__ == "__main__":
    build(Path(__file__).parent / "10_Competitive_Innovation_v2_0.docx")
