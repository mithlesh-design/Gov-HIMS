"""Generate 04_UIUX_Blueprint_v1.0.docx — design system + interaction rules."""
from pathlib import Path
from _helpers import *


def build(out: Path) -> None:
    doc = new_doc()
    cover(doc, "04 — UI/UX", "UI / UX Design Blueprint",
          "Unified design system, layout patterns, tokens, accessibility")
    toc(doc)

    h1(doc, "1. Design Principles")
    bullet(doc, "Calm by default. Clinical surfaces never shout. Colour is a signal, not decoration.")
    bullet(doc, "Single primary action per surface. Secondary actions live one click deeper.")
    bullet(doc, "Information density follows decision density — clinicians need more on screen than receptionists.")
    bullet(doc, "Every AI suggestion arrives as a HITL card: data + reasoning + confidence + accept / reject / modify.")
    bullet(doc, "Every state-changing action surfaces a confirmation toast and writes an audit trail entry.")
    bullet(doc, "Designed for phones — 390 px width is a first-class breakpoint, not an afterthought.")

    h1(doc, "2. Layout Patterns")
    h2(doc, "2.1 AppShell")
    p(doc, "The single, role-aware shell that wraps every staff page. Lives at "
           "src/components/layout/AppShell.tsx (~640 LOC). Contains the top bar, role pivot, "
           "header search, notification bell, locale toggle, logout, and the role-specific "
           "sidebar.")
    code_block(doc,
"""┌────────────────────────────────────────────────────────────────────────┐
│  ⛬ Umang HIMS     [search ▌]              🔔  EN  ⏏  Dr. Aarti  ⌄    │  ← top bar
├──────────────┬─────────────────────────────────────────────────────────┤
│              │                                                         │
│  Sidebar     │   Page header (title + breadcrumbs + primary CTA)        │
│              │                                                         │
│  · Section A │   ┌─────────────────────────────────────────────────┐   │
│  · Section B │   │ KPI strip (4–6 cards, equal width)               │   │
│  · Section C │   └─────────────────────────────────────────────────┘   │
│              │   ┌─────────────────────────────────────────────────┐   │
│  Settings    │   │ Primary work surface (table / chart / form)      │   │
│              │   └─────────────────────────────────────────────────┘   │
│              │   Drawer slides in from right for detail               │
└──────────────┴─────────────────────────────────────────────────────────┘""",
        label="AppShell anatomy")

    h2(doc, "2.2 Recurring patterns")
    table(doc, ["Pattern", "When to use", "Components"],
          [
              ["KPI strip",         "Top of dashboard surfaces, 4–6 metrics", "Card + Number + delta chip"],
              ["Single-row table",  "Queues and lists (OPD, IPD, lab, pharmacy queue)", "TableRow + hover summary"],
              ["Right-side drawer", "Patient detail, staff profile, audit detail", "Drawer + tabs + actions"],
              ["Full-page chart",   "Comprehensive IPD chart", "Tabs + sections + signed-off banners"],
              ["Wizard",            "Onboarding, admission, discharge clearance", "Stepper + per-step validation"],
              ["Bottom-action bar", "Mobile primary action while scrolling", "Sticky bar with one CTA"],
              ["HITL card",         "Every AI suggestion", "Suggestion + reasoning + confidence + 3 actions"],
              ["Coverage gauge",    "Department staffing at-a-glance", "Donut + threshold chip"],
              ["Audit chip",        "Module surface in audit views", "Module pill + count"],
              ["Banner",            "Critical clinical alert (NEWS2, allergy, expired licence)", "Banner + dismiss only if action taken"],
          ],
          col_widths_cm=[4.5, 7.0, 5.5])

    page_break(doc)

    h1(doc, "3. Component Inventory")
    p(doc, "73 components total. Grouped by role + shared ui / layout / features.")
    table(doc, ["Group", "Component examples"],
          [
              ["ui/",        "Button, IconButton, Badge, Chip, Card, Table, Dialog, Sheet, Drawer, Tabs, Tooltip, Toast (sonner), DataPill, KPIStat, Empty, Skeleton, LocaleToggle, Avatar, Spinner, Calendar"],
              ["layout/",    "AppShell, Sidebar (role-aware), TopBar, RoleGuard, HeaderSearch, NotificationBell, Breadcrumb"],
              ["features/",  "AuditChip, CoverageGauge, NewsBadge, ShiftBadge, NABHEvidenceCard"],
              ["clinical/",  "OnShiftTeam, PatientSummaryHover, VitalsCapture, NEWS2Chip, AllergyBanner, RxLine, MARGrid"],
              ["doctor/",    "OPDRow, IPDRow, OnlineRow, ChartTabs, ActivityGraph, AIPreBriefCard, CopilotPanel"],
              ["nurse/",     "RoundCard, HandoverCard, EscalationBanner, MARRow"],
              ["pharmacy/",  "QueueRow, DispenseCard, SubstitutionDialog, NarcoticSignout"],
              ["reception/", "QueueRow, WalkInForm, TokenChip"],
              ["intake/",    "PatientIntakeWizard"],
              ["messaging/", "ThreadList, MessageComposer"],
              ["admin/",     "StaffProfileDrawer, ShiftTemplateModal, RosterGrid, CoverageGauge, MoUExpiryRow, DisputeRow, P&LCard, ComplianceScoreCard, StatutoryCalendarRow"],
              ["patient/",   "VisitCard, ResultCard, FeedbackForm, FamilyTrackCard"],
              ["Top-level",  "ClientOnly, PatientProfileSummary, ResultsTicker, StoreHydrator"],
          ],
          col_widths_cm=[3.0, 14.0])

    page_break(doc)

    h1(doc, "4. Design Tokens")
    h2(doc, "4.1 Colour")
    table(doc, ["Token", "Use", "Hex"],
          [
              ["brand.primary",     "Headings, primary actions, links", "#0F4C81"],
              ["brand.accent",      "Highlights, focus rings",          "#298AC8"],
              ["text.ink",          "Body text",                          "#1A1F2C"],
              ["text.muted",        "Captions, helper text",              "#5F6B7A"],
              ["surface.canvas",    "Page background",                    "#F7F9FC"],
              ["surface.card",      "Card background",                    "#FFFFFF"],
              ["state.success",     "Bills cleared, vitals normal",        "#1F7A3F"],
              ["state.warn",        "Late MAR, MoU expiring",              "#B86E00"],
              ["state.danger",      "Critical NEWS2, audit fail",          "#B02A37"],
              ["state.info",        "Tips, AI suggestion accent",          "#0E7C9B"],
              ["divider",            "1 px subtle line",                    "#E5E9F2"],
          ],
          col_widths_cm=[4.0, 8.0, 5.0])
    p(doc, "Tokens map to Tailwind v4 CSS variables. Components never hard-code hex values.")

    h2(doc, "4.2 Typography")
    table(doc, ["Role", "Size", "Weight", "Line height"],
          [
              ["Display",   "30 / 36 px",  "700", "1.1"],
              ["H1",         "22 / 26 px",  "700", "1.2"],
              ["H2",         "18 / 22 px",  "600", "1.25"],
              ["H3",         "15 / 18 px",  "600", "1.3"],
              ["Body",       "14 / 15 px",  "400", "1.5"],
              ["Caption",    "12 / 13 px",  "400", "1.4"],
              ["Numeric",    "tabular-nums on KPIs and bills",   "—", "—"],
          ],
          col_widths_cm=[3.0, 4.5, 3.0, 6.5])

    h2(doc, "4.3 Spacing & radius")
    bullet(doc, "Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 px. Cards use 16 px padding.")
    bullet(doc, "Radius: 4 (chips), 8 (buttons / inputs), 12 (cards), 16 (drawers).")
    bullet(doc, "Shadows: subtle (cards), elevated (drawers / dialogs). Never decorative.")

    h2(doc, "4.4 Iconography")
    bullet(doc, "lucide-react. Stroke width 1.5. 16 / 20 / 24 px sizes only.")
    bullet(doc, "Icons always accompany a label except in well-known iconic places (close, search, bell).")

    page_break(doc)

    h1(doc, "5. Interaction & State Rules")
    h2(doc, "5.1 Click / tap")
    bullet(doc, "Feedback < 200 ms (NFR-02). Long actions render an inline progress + disabled CTA.")
    bullet(doc, "Destructive actions require confirmation. Confirmation copy names the object.")
    bullet(doc, "Buttons never carry an icon-only label for first-time-user surfaces.")

    h2(doc, "5.2 Forms")
    bullet(doc, "Inline validation on blur. Errors live below the field, in state.danger.")
    bullet(doc, "Submit button disabled until the form is valid AND not currently submitting.")
    bullet(doc, "Successful save dismisses the form; outstanding save errors stay visible.")
    bullet(doc, "Server errors translate to plain language; technical detail goes to console only.")

    h2(doc, "5.3 Lists & tables")
    bullet(doc, "Empty state on every list. Copy explains why and offers an action.")
    bullet(doc, "Loading state is a skeleton, not a spinner — preserves layout.")
    bullet(doc, "Sort handles only on columns that actually re-rank usefully.")
    bullet(doc, "Filter chips are removable; an All-clear link sits beside the filter strip.")

    h2(doc, "5.4 Drawers & dialogs")
    bullet(doc, "Drawers from the right; dialogs centred. Both close on Escape and outside-click.")
    bullet(doc, "Dialog primary CTA is highlighted; the destructive variant is red.")
    bullet(doc, "Long forms in drawers; binary choices in dialogs.")

    h2(doc, "5.5 AI HITL card")
    code_block(doc,
"""┌─────────────────────────────────────────────────────────────┐
│ ✨ AI Suggestion · Pre-brief                          82 %    │
│                                                              │
│ This patient (PT-20394, M/58, NSTEMI / post-PCI) presented   │
│ today with chest discomfort and SpO₂ 94 %. Recommend …       │
│                                                              │
│ ▾ Why this suggestion?                                       │
│   Based on prior PCI on 2026-03-04, current dyspnoea …       │
│                                                              │
│ [Accept]   [Modify]   [Reject]                               │
└─────────────────────────────────────────────────────────────┘""",
        label="HITL card anatomy")
    bullet(doc, "Always shows confidence as a discrete chip.")
    bullet(doc, "Reasoning collapses by default; expand on demand.")
    bullet(doc, "Modify opens an inline editor; reject prompts for a reason (one tap).")

    page_break(doc)

    h1(doc, "6. Responsiveness")
    table(doc, ["Breakpoint", "Width", "Behaviour"],
          [
              ["Phone",       "390 px",   "Sidebar collapses to bottom tab bar; tables stack to cards; drawers full-screen"],
              ["Tablet",      "820 px",   "Sidebar pinned narrow; tables single-row; drawers half-screen"],
              ["Laptop",      "1280 px",  "Full sidebar; tables single-row with hover summary; right drawer"],
              ["Desktop",     "1500 px+", "Full sidebar; multi-column drawers; KPI strip up to 6 columns"],
          ],
          col_widths_cm=[3.0, 3.0, 11.0])
    bullet(doc, "Doctor and Nurse phone modes are mandated to be operable one-handed.")
    bullet(doc, "Tables collapse into RowCards with the same fields stacked.")

    h1(doc, "7. Accessibility")
    bullet(doc, "Targets WCAG 2.1 AA across staff portals; AAA contrast for clinical surfaces.")
    bullet(doc, "All interactive controls reachable by keyboard; focus ring visible.")
    bullet(doc, "Form labels associated by htmlFor and tested in CI.")
    bullet(doc, "Live regions announce: NEWS2 escalation, MAR-late, AI suggestion arrival.")
    bullet(doc, "Colour is never the only carrier of meaning — every state badge has a glyph.")
    bullet(doc, "Voice scribe respects browser permissions; refused gracefully degrades to typing.")

    h1(doc, "8. i18n")
    bullet(doc, "English + Hindi at launch via next-intl. 131 keys in each locale today.")
    bullet(doc, "Strings live in messages/<locale>.json; never hard-code user-visible text.")
    bullet(doc, "Numerics & dates use locale formatters; clinical units stay in metric.")
    bullet(doc, "Locale toggle is hot — no full page reload required (see src/components/ui/LocaleToggle.tsx).")

    h1(doc, "9. Patterns to Avoid")
    bullet(doc, "Icon-only buttons in primary actions (except universal close / search / bell).")
    bullet(doc, "Modal stacking deeper than two — replace with a wizard.")
    bullet(doc, "Auto-dismiss toasts for errors — errors stay until acknowledged.")
    bullet(doc, "Real-time animations on clinical lists — they distract from triage.")
    bullet(doc, "Hard role-checks in the UI — always go through canDo(role, action).")

    h1(doc, "10. Asset Library")
    bullet(doc, "Figma frames live in the design library (linked from team wiki).")
    bullet(doc, "Storybook for shared components is target for v1.0 (GAP-040).")
    bullet(doc, "Production-grade icon list mirrors lucide-react; custom illustrations go through review.")

    h1(doc, "A. Version History")
    table(doc, ["Version", "Date", "Author", "Notes"],
          [["v1.0", DOC_DATE, AUTHOR, "Initial issue grounded in current components and patterns"]],
          col_widths_cm=[2.0, 3.0, 4.5, 7.5])

    save(doc, out)


if __name__ == "__main__":
    build(Path(__file__).parent / "04_UIUX_Blueprint_v1.0.docx")
