"""Generate 00_INDEX_v1.0.docx — Master index."""
from pathlib import Path
from _helpers import *


def build(out: Path) -> None:
    doc = new_doc()
    cover(doc, "00 — Master Index", "Spec Suite Master Index",
          "How to read the Umang HIMS specification set")
    toc(doc)

    h1(doc, "1. Purpose")
    p(doc,
      "This index is the single entry point to the Umang HIMS specification suite. "
      "It catalogues the eight v1.0 documents, explains how they relate to each other, "
      "and recommends a reading order tailored to each stakeholder role.")
    p(doc,
      "Every document is grounded in the actual source code at "
      "src/ as of 2026-06-01. Where information is absent from the code base or only partially "
      "implemented, the corresponding fact is captured as a numbered gap in 07 — Gap Analysis, "
      "not invented.")

    h1(doc, "2. Document Inventory")
    table(doc,
          ["#", "Document", "Primary audience", "Page count (approx.)"],
          [
              ["00", "Master Index (this document)", "All",                                "3"],
              ["01", "Business Requirements Document (BRD)",         "Sponsors, PM, QA, Compliance",  "18"],
              ["02", "Technical Requirements Document (TRD)",        "Engineering, Architecture, DevOps", "16"],
              ["03", "Application Flow Document",                    "PM, UX, QA, Training",          "22"],
              ["04", "UI/UX Design Blueprint",                       "Design, Frontend",              "12"],
              ["05", "Backend Schema",                               "Backend, Data, DevOps",          "14"],
              ["06", "Implementation Plan",                          "Eng leadership, PMO",            "14"],
              ["07", "Gap Analysis",                                 "Eng leadership, Risk, QA",       "18"],
          ],
          col_widths_cm=[1.0, 7.0, 6.5, 2.5])

    h1(doc, "3. How the Documents Relate")
    p(doc,
      "The suite is layered, not linear. Each layer answers a different question, "
      "and every layer downstream of the BRD traces back to it.")
    mermaid(doc, "Document dependency map", """
flowchart LR
    BRD[01 BRD<br/>What & Why] --> TRD[02 TRD<br/>Architecture]
    BRD --> AppFlow[03 App Flow<br/>How users use it]
    TRD --> Schema[05 Backend Schema<br/>Data model]
    TRD --> UIUX[04 UI/UX Blueprint<br/>Design system]
    AppFlow --> UIUX
    BRD --> Gaps[07 Gap Analysis]
    TRD --> Gaps
    AppFlow --> Gaps
    Schema --> Gaps
    UIUX --> Gaps
    Gaps --> Plan[06 Implementation Plan]
""")

    h1(doc, "4. Reading Paths by Role")
    table(doc,
          ["Stakeholder", "Read in this order"],
          [
              ["Sponsor / Executive",     "00 → §3 of 01 → §2 of 07 (top critical gaps) → §1 of 06"],
              ["Product Manager",         "01 → 03 → 07 → 06"],
              ["Solution Architect",      "00 → 02 → 05 → 03 → 07"],
              ["Backend Engineer",        "02 → 05 → 07 (Backend gaps) → 06"],
              ["Frontend Engineer",       "03 → 04 → 02 (state mgmt section) → 07 (UX gaps)"],
              ["UX/UI Designer",          "03 → 04 → 07 (UX gaps)"],
              ["QA / Test Lead",          "01 → 03 → 07 → 06 (acceptance criteria)"],
              ["Compliance / Audit",      "01 (§Glossary, NABH/DPDP/DISHA) → 07 (Compliance gaps)"],
              ["DevOps / SRE",            "02 (§Env & Deployment) → 05 → 07 (Infra gaps)"],
          ],
          col_widths_cm=[5.5, 11.5])

    h1(doc, "5. Versioning & Change Control")
    bullet(doc, "All documents share the suite version (v1.0). Each is independently revisable but the suite is re-cut when at least three documents change.")
    bullet(doc, "Version history is maintained in §A of each document. Changes that alter requirements (BRD), data model (Schema), or architecture (TRD) trigger a Gap Analysis review.")
    bullet(doc, "Gap IDs (GAP-001 … GAP-NNN) are immutable once issued. Closed gaps remain in the register with a 'Closed' status.")

    h1(doc, "6. Conventions Used Throughout")
    bullet(doc, "File paths refer to the repository root unless otherwise stated. Example: src/store/useAuditStore.ts.")
    bullet(doc, "Requirement IDs follow the pattern FR-NNN (functional), NFR-NNN (non-functional), TR-NNN (technical), GAP-NNN (gap).")
    bullet(doc, "Severity scale: Critical / High / Medium / Low. Definitions live in 07 — Gap Analysis §1.")
    bullet(doc, "Mermaid diagrams are embedded as source. Paste into any Mermaid renderer (e.g. mermaid.live) for visual output.")
    bullet(doc, "All financial amounts are illustrative and use INR (₹) unless prefixed.")

    h1(doc, "7. Source-of-Truth Hierarchy")
    p(doc,
      "When two documents disagree, resolve in this order:")
    numbered(doc, "01 BRD — business intent (what the business has agreed to deliver)")
    numbered(doc, "02 TRD — architectural intent (how the system is built)")
    numbered(doc, "Source code under src/ — actual state")
    numbered(doc, "03 App Flow / 04 UI-UX / 05 Schema — derived views")
    numbered(doc, "07 Gap Analysis — registered deltas between intent and reality")

    h1(doc, "8. Open Questions for Sponsor Sign-Off")
    p(doc, "Six business decisions must be confirmed before the Implementation Plan is locked. "
           "Each is restated in detail inside the cited document; this is a checklist for the sponsor's review session.")
    table(doc,
          ["#", "Decision", "Cited in"],
          [
              ["Q1", "Is single-tenant single-branch deployment acceptable for v1, or must multi-branch ship in v1?", "01 §5.3, 07 GAP-031"],
              ["Q2", "Which real LLM vendor (Anthropic / OpenAI / on-prem) is approved for AI services?",            "02 §6, 07 GAP-014"],
              ["Q3", "Is the authentication method confirmed — OIDC / SAML / username-password / Aadhaar OTP?",     "01 §4.4, 07 GAP-001"],
              ["Q4", "Confirm payments scope — cash + UPI only, or include cards + insurance auto-settle?",         "01 §6.5, 07 GAP-023"],
              ["Q5", "Pharmacy stock — does v1 manage real warehouse stock, or only consumption tagging?",          "01 §6.6, 07 GAP-027"],
              ["Q6", "WhatsApp / SMS / Email channels — which are in scope for go-live notifications?",             "02 §7, 07 GAP-018"],
          ],
          col_widths_cm=[1.0, 11.0, 5.0])

    h1(doc, "9. Glossary Quick-Card")
    table(doc,
          ["Term", "Meaning"],
          [
              ["NABH",   "National Accreditation Board for Hospitals & Healthcare Providers (India)"],
              ["DPDP",   "Digital Personal Data Protection Act, 2023 (India)"],
              ["DISHA",  "Digital Information Security in Healthcare Act (proposed)"],
              ["BMW",    "Bio-Medical Waste Management (CPCB rules)"],
              ["CPCB",   "Central Pollution Control Board"],
              ["RBAC",   "Role-Based Access Control"],
              ["HITL",   "Human-in-the-Loop (every AI suggestion is reviewable)"],
              ["RBAC matrix", "src/lib/permissions.ts — 51 actions × 24 roles"],
              ["MAR",    "Medication Administration Record (nursing)"],
              ["NEWS2",  "National Early Warning Score 2 (clinical deterioration)"],
              ["ESI",    "Emergency Severity Index (triage scale 1–5)"],
              ["RTBF",   "Right To Be Forgotten (DPDP section 13)"],
              ["MLC",    "Medico-Legal Case"],
              ["CAPA",   "Corrective And Preventive Action"],
              ["MoU",    "Memorandum of Understanding (vendor / hospital empanelment)"],
          ],
          col_widths_cm=[3.5, 13.5])

    h1(doc, "A. Version History")
    table(doc,
          ["Version", "Date", "Author", "Notes"],
          [["v1.0", DOC_DATE, AUTHOR, "Initial issue covering all 8 documents."]],
          col_widths_cm=[2.0, 3.0, 4.5, 7.5])

    save(doc, out)


if __name__ == "__main__":
    build(Path(__file__).parent / "00_INDEX_v1.0.docx")
