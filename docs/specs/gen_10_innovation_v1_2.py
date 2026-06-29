"""Generate 10_Competitive_Innovation_v1_2.docx — M4-W2 closure update.

v1.1 recorded W1 (S1/S2/S3/S15 — clinical-safety wow). v1.2 records what
shipped in M4-Wave-2 (S4 hospital-wide AI copilot, S5 voice scribe
everywhere, S6 mock OCR intake) and freezes the remaining 8 cards as
Open for subsequent waves. v1.0 / v1.1 stay as the historical proposals."""
from pathlib import Path
from _helpers import *


SHIPPED_W1 = [
    ("S1",  "Transparent Drug-Safety Reasoning Panel"),
    ("S2",  "NEWS2 / qSOFA / Sepsis Ambient Watcher"),
    ("S3",  "Closed-Loop Critical-Value Banner + Ack Gate"),
    ("S15", "Doctor Day-in-Review (explainable narration)"),
]

SHIPPED_W2 = [
    ("S4",  "Hospital-Wide AI Copilot (palette+ evolution)",
        "src/lib/aiCopilot.ts adds a mock NL → typed-intent parser used by "
        "src/components/layout/CommandPalette.tsx. The user types natural "
        "language like 'schedule MRI for Anil Tuesday 10am' or 'show denial-"
        "risk claims' — the palette runs parseIntent() and renders a "
        "src/components/clinical/CopilotPreviewCard.tsx confirmation card "
        "above the result list: action chip + object chip + patient chip + "
        "time chip, full reasoning bullets, confidence percentage, explicit "
        "Reject / Run buttons. Every accept and reject writes a hitl_accept "
        "/ hitl_reject audit entry under resource='ai_copilot_intent'. "
        "Mock now; Phase-2 swaps parseIntent for an LLM call returning the "
        "same envelope."),
    ("S5",  "Voice Scribe Everywhere",
        "src/components/clinical/VoiceScribeButton.tsx — reusable mic button "
        "that drops onto any clinical-note surface. Uses the existing "
        "src/lib/voiceScribe.ts (Web Speech API + toSOAP). When the API is "
        "unsupported (Firefox / Safari / headless), a deterministic per-"
        "surface fallback transcript keeps the demo flowing. Captures speech "
        "→ raw transcript → AI-structured SOAP (S/O/A/P with diagnosis and "
        "vitals context) → HITL accept / reject. Mounted on doctor IPD as "
        "an explicit Quick-note toolbar and on nurse rounds as a compact "
        "AI-SOAP companion alongside the existing voice-note button. Audit "
        "writes a hitl_accept under resource='voice_scribe' with the "
        "surface + patient handle."),
    ("S6",  "Mock OCR Intake",
        "src/components/reception/OcrIntakeCard.tsx mounted at the top of "
        "the Register-Walk-in modal in src/app/reception/opd/page.tsx. Three "
        "doc-type chips (Aadhaar / Insurance card / Lab paper); Demo-scan "
        "or Upload fires an 800 ms canned timer then renders an OCR-draft "
        "card with per-field confidence chips (94% / 92% / 88% …). Apply-to-"
        "form pushes the extracted fields into the existing walk-in form "
        "(name / phone / age / gender for Aadhaar, payer / policy / expiry "
        "for insurance, test name / value / reference for lab paper). Every "
        "field stays editable; the form is the source of truth. Audit "
        "writes hitl_modify on scan and hitl_accept on apply."),
]

OPEN = [
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
          "Competitive Innovation — Wave 2 Closure (v1.2)",
          "S4, S5, S6 shipped — operating-speed layer live")
    toc(doc)

    h1(doc, "1. Why v1.2 exists")
    p(doc, "v1.0 proposed a 15-card slate. v1.1 closed Wave 1 (clinical-"
           "safety wow — S1, S2, S3, S15). v1.2 closes Wave 2 (operating-"
           "speed wow — S4 hospital-wide AI copilot, S5 voice scribe "
           "everywhere, S6 mock OCR intake) and freezes the remaining 8 "
           "cards as Open for Waves 3-6.")

    h1(doc, "2. Wave-2 Shipped")
    callout(doc, "Three cards shipped",
            "Each card is additive to the M0 contract. Regression 54/54 "
            "remains green; no existing feature was modified or removed. "
            "Two new shared primitives — aiCopilot intent parser and "
            "VoiceScribeButton — are now available for any future surface.",
            kind="ok")
    table(doc, ["ID", "Title", "What landed"],
          [[s[0], s[1], s[2]] for s in SHIPPED_W2],
          col_widths_cm=[1.2, 5.0, 10.5])

    h1(doc, "3. New Cross-Cutting Primitives")
    bullet(doc, "**src/lib/aiCopilot.ts** — parseIntent(text, ctx) returns a typed envelope { action, object?, patient?, time?, destination?, confidence, reasoning, raw }. Action verbs (schedule / order / draft / discharge / show / find / summarise), domain objects (imaging / lab / medication / appointment / preauth / claim / discharge_summary), patient fuzzy-matched against Patient + Inpatient registries, and a destination route picker. Phase-2 keeps the same envelope shape.")
    bullet(doc, "**src/components/clinical/CopilotPreviewCard.tsx** — confirmation card used by the Command Palette. Renders the parsed intent as chips, lists the reasoning bullets, shows the chosen destination, and emits hitl_accept / hitl_reject audit on each path.")
    bullet(doc, "**src/components/clinical/VoiceScribeButton.tsx** — reusable mic + AI-SOAP component. Six surface types: opd_note / ipd_progress / mar_note / nurse_round / ot_debrief / discharge_summary. Each has a deterministic fallback transcript so the demo flows without microphone permission.")
    bullet(doc, "**src/components/reception/OcrIntakeCard.tsx** — three-doc-type mock OCR card (Aadhaar / Insurance / Lab paper). 800 ms canned scan, per-field confidence chips, editable apply.")

    h1(doc, "4. Where Each Card Mounts")
    table(doc, ["Card", "Mount point", "Hero-journey touch"],
          [
              ["S4 - AI Copilot",       "src/components/layout/CommandPalette.tsx — when the user types ≥3 words containing an action verb, the CopilotPreviewCard renders above the standard result list",
                "Try 'schedule MRI for Anil Tuesday 10am' — parser resolves Anil → PT-44012, picks the radiology inbox as destination, 95% confidence."],
              ["S5 - Voice Scribe",      "src/app/doctor/ipd/page.tsx (Quick-note toolbar at top) + src/app/nurse/rounds/page.tsx (compact companion next to existing voice button)",
                "Doctor records an IPD progress note via mic → AI structures to SOAP using Anil's diagnosis and current vitals as context → accept writes the chart entry."],
              ["S6 - OCR Intake",        "src/app/reception/opd/page.tsx — inside the Register-Walk-in modal, above the Full Name field",
                "Reception clerk taps Aadhaar → Demo scan → 800 ms later Anil's name, DOB, age, gender, masked Aadhaar appear with per-field confidence chips → Apply to form."],
          ],
          col_widths_cm=[3.5, 7.0, 6.5])

    h1(doc, "5. What's Still Open (Waves 3-6)")
    p(doc, "Waves 1 and 2 are now closed. The remaining eight cards are queued for the next phases:")
    table(doc, ["ID", "Title", "Wave"],
          [[r[0], r[1], r[2]] for r in OPEN],
          col_widths_cm=[1.5, 9.5, 4.0])

    h1(doc, "6. Verification")
    bullet(doc, "tsc --noEmit: 0 errors")
    bullet(doc, "next build: Compiled successfully in 78s")
    bullet(doc, "regression-suite.cjs at M4-W2: 54 / 54 green, 0 console errors")
    bullet(doc, "Screenshots: docs/specs/screens/M4-W2/ — three W2 close-ups (S4 copilot preview, S5 voice scribe panel, S6 OCR draft).")

    h1(doc, "7. Wave 1 — Carried Forward (still shipping)")
    p(doc, "All Wave-1 surfaces remain live and untouched. Listed here for traceability.")
    table(doc, ["ID", "Title"],
          [[s[0], s[1]] for s in SHIPPED_W1],
          col_widths_cm=[1.5, 13.0])

    h1(doc, "A. Version History")
    table(doc, ["Version", "Date", "Author", "Notes"],
          [
              ["v1.0", "01 Jun 2026", AUTHOR, "Slate proposal — 15 cards."],
              ["v1.1", "02 Jun 2026", AUTHOR, "M4-W1 closure — S1/S2/S3/S15 shipped."],
              ["v1.2", DOC_DATE,     AUTHOR, "M4-W2 closure — S4/S5/S6 shipped."],
          ],
          col_widths_cm=[2.0, 3.0, 4.5, 7.5])

    save(doc, out)


if __name__ == "__main__":
    build(Path(__file__).parent / "10_Competitive_Innovation_v1_2.docx")
