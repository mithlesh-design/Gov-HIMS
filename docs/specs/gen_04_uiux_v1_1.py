"""Generate 04_UI_UX_Design_Blueprint_v1_1.docx — M2 compaction update.

Documents the new compact design system, command palette, INTUITIVE pillar
guidelines, and before/after expectations. Supersedes v1.0 in operational
terms (v1.0 stays as the historical baseline)."""
from pathlib import Path
from _helpers import *


def build(out: Path) -> None:
    doc = new_doc()
    cover(doc, "04 - UI/UX", "UI/UX Design Blueprint v1.1 (M2)",
          "Compact design system, command palette, INTUITIVE pillar")
    toc(doc)

    h1(doc, "1. Why v1.1 exists")
    p(doc,
      "v1.0 documented the Phase-1 design system as it shipped. M2 (Compact, "
      "Elevate & Make Intuitive) layers a denser, more uniform vocabulary on "
      "top of v1.0 WITHOUT removing any of the existing surfaces or "
      "components — compaction reorganises and reveals, it never deletes a "
      "feature. v1.1 documents the new tokens, primitives, and rules.")
    callout(doc, "Preservation",
            "Every existing primitive in v1.0 still works. The new "
            "CompactHeader, CompactKPI, KbdHint, and CommandPalette sit "
            "alongside <PageHeader>, <KPIStat>, etc. — pages adopt the new "
            "surfaces opt-in, one at a time.", kind="ok")

    # ── 2. Design tokens (v1.1 — compact) ──────────────────────────────
    h1(doc, "2. Design Tokens v1.1 (Compact)")
    p(doc, "Single source of truth: src/lib/design-tokens.ts. Tailwind utilities "
           "still own the render; the tokens object documents the agreed values.")

    h2(doc, "2.1 Spacing")
    table(doc, ["Token", "Pixels", "Notes vs v1.0"],
          [
              ["xs",  "4 px",  "unchanged"],
              ["sm",  "8 px",  "unchanged"],
              ["md",  "12 px", "Default card→card gap. Was 16 px."],
              ["lg",  "16 px", "Card content padding. Was 24 px."],
              ["xl",  "24 px", "Top-level section gap. Was 32 px."],
              ["xxl", "32 px", "Reserved for hero / cover banding."],
          ],
          col_widths_cm=[3.0, 3.5, 8.5])

    h2(doc, "2.2 Radius")
    table(doc, ["Token", "Radius", "Notes vs v1.0"],
          [
              ["chip",   "4 px",  "Pill chips, kbd hints."],
              ["button", "8 px",  "unchanged"],
              ["input",  "8 px",  "unchanged"],
              ["card",   "10 px", "Was 12 px."],
              ["drawer", "12 px", "Was 16 px."],
              ["hero",   "14 px", "Reserved for top-of-page hero cards."],
          ],
          col_widths_cm=[3.0, 3.5, 8.5])

    h2(doc, "2.3 Typography")
    table(doc, ["Role", "Size (px)", "Weight", "Notes"],
          [
              ["Display", "28", "700", "Login + cover surfaces only."],
              ["H1",      "20", "700", "Was 22. CompactHeader sets this."],
              ["H2",      "16", "600", "Was 18. Section sub-heads."],
              ["H3",      "14", "600", "unchanged"],
              ["Body",    "13", "400", "Was 14. Worklist rows + tables."],
              ["Caption", "11", "500", "Weight up from 400 for legibility."],
              ["Numeric", "13", "600 tabular-nums", "KPI values + bills + counts."],
          ],
          col_widths_cm=[3.0, 2.5, 3.0, 7.5])

    # ── 3. Compact primitives (new) ──────────────────────────────────
    h1(doc, "3. New Primitives (M2 additions)")
    p(doc, "All additive. Existing primitives in v1.0 are unchanged.")
    table(doc, ["Component", "File", "When to use"],
          [
              ["CompactHeader",     "src/components/ui/CompactHeader.tsx",
                "Dense top-of-page row: title + badge + side filters + one primary action. Replaces the loose <PageHeader> arrangement when density matters."],
              ["CompactKPI",         "src/components/ui/CompactKPI.tsx",
                "Pill-sized KPI tile (≥124 px) with tone variants neutral / info / ok / warn / danger. Combine with CompactKPIStrip."],
              ["CompactKPIStrip",    "src/components/ui/CompactKPI.tsx",
                "Wrap-flex container for 3-6 KPI tiles in the header side slot."],
              ["KbdHint",             "src/components/ui/KbdHint.tsx",
                "Tiny monospace keyboard chip. Used by the command palette + anywhere a shortcut is documented inline."],
              ["CommandPalette",      "src/components/layout/CommandPalette.tsx",
                "Universal Cmd/Ctrl+K spine. Mounted in AppShell for every role + the patient portal."],
              ["CommandPaletteTrigger","src/components/layout/CommandPalette.tsx",
                "Top-bar pill that surfaces the shortcut + opens the palette."],
          ],
          col_widths_cm=[3.5, 5.0, 8.5])

    # ── 4. Command palette (the new fast-nav spine) ──────────────────
    h1(doc, "4. Command Palette — the new fast-nav spine")
    p(doc, "Cmd K (macOS) / Ctrl K (Windows / Linux) opens the palette from "
           "any surface. Universal search across:")
    bullet(doc, "**Patients** — name / HN. Opens the right list in the active role's context.")
    bullet(doc, "**Routes** — every page reachable by the active role (admin sees all).")
    bullet(doc, "**Intents** — keyword-matched commands like 'show denial-risk claims', 'OT WHO checklist', 'NABH evidence cockpit'. AI free-text parsing arrives in Phase 2.")
    bullet(doc, "**Staff** — admin / clinical surfaces (admin role only).")
    p(doc, "Keyboard model:")
    table(doc, ["Key", "Action"],
          [["⌘K / Ctrl+K", "Toggle the palette"],
           ["↑ ↓",        "Move cursor"],
           ["↵",          "Open the highlighted item"],
           ["Esc",        "Close the palette"]],
          col_widths_cm=[3.5, 11.0])
    callout(doc, "Additive",
            "The existing top-bar patient-search input is preserved. The "
            "palette sits beside it (with a visible shortcut hint chip) — "
            "users who don't know the keyboard can click the pill.",
            kind="note")

    # ── 5. INTUITIVE pillar — operational rules ───────────────────────
    h1(doc, "5. INTUITIVE pillar — operational rules")

    h2(doc, "5.1 Progressive disclosure")
    bullet(doc, "Every surface shows the 3-6 highest-value KPIs in a top strip (CompactKPIStrip). Detail lives one click away.")
    bullet(doc, "Hover summaries on worklist rows reveal patient context without leaving the queue.")
    bullet(doc, "Drawers, not full pages, for most detail views. Drawer titles repeat the row identifier so context is never lost.")

    h2(doc, "5.2 Sane defaults")
    bullet(doc, "Today is the default filter on every dashboard.")
    bullet(doc, "Demo patient (Anil Kumar Verma, PT-44012) is the default focus when a presenter loads the palette.")
    bullet(doc, "Persisted role survives F5 — no kick to login during demo navigation.")

    h2(doc, "5.3 Optimistic feedback")
    bullet(doc, "`src/lib/optimistic.ts` — withOptimistic({ apply, revert, mutate }) keeps the UI < 200 ms even when the mock API needs a microtask.")
    bullet(doc, "Toasts confirm; they don't gate progress. Errors stay visible until acknowledged.")
    bullet(doc, "Buttons disable themselves on submit AND show a spinner / loading affordance.")

    h2(doc, "5.4 Discoverable actions")
    bullet(doc, "One primary action per surface, placed top-right (CompactHeader.primary).")
    bullet(doc, "Secondary actions are tone-tinted (warn / danger / neutral) for instant scanability.")
    bullet(doc, "Every shortcut is documented inline with a KbdHint chip.")

    h2(doc, "5.5 Empty / loading / error states")
    bullet(doc, "Empty: never just a blank table. EmptyState component with an icon + headline + one recovery action.")
    bullet(doc, "Loading: SkeletonCard preserves layout; spinners are last resort.")
    bullet(doc, "Error: a banner that stays until the user acknowledges; technical detail goes to console only.")

    # ── 6. Compaction pattern — Before vs After ───────────────────────
    h1(doc, "6. Before vs After (canonical pattern)")
    p(doc, "Three surfaces were compacted in M2 as the canonical pattern; the same rules apply to every other surface in subsequent waves:")
    table(doc, ["Surface", "v1.0", "v1.1 (M2)"],
          [
              ["Admin / Hospital Analytics",
                "space-y-6 layout · two-row header (NeonBadge + 24px h2) · scattered button styles",
                "space-y-3 · CompactHeader (one row, 20px h1, KPI strip, single-row actions tone-tinted)"],
              ["Audit Trail",
                "space-y-5 · 24px h2 · 3-cell severity strip below header",
                "space-y-3 · CompactHeader with CompactKPIStrip in side slot · single primary Export"],
              ["Doctor IPD / Inpatients",
                "Loose mb-4 header · 24px h1 · KPIs scattered across body",
                "CompactHeader with KPIStrip (Rounds due / Critical / Discharge ready)"],
          ],
          col_widths_cm=[4.0, 6.0, 7.0])
    p(doc, "Screenshots in docs/specs/screens/M0/ (baseline) and docs/specs/screens/M2/ (after compaction) — the regression suite captures both sets per role.")

    # ── 7. Preservation contract still applies ────────────────────────
    h1(doc, "7. Preservation Contract")
    p(doc, "Every M0 inventory item still resolves. M2 changes:")
    bullet(doc, "ADD CompactHeader, CompactKPI, KbdHint, CommandPalette, CommandPaletteTrigger components.")
    bullet(doc, "ADD design-tokens.ts (no removals).")
    bullet(doc, "ADD optimistic.ts helper (no removals).")
    bullet(doc, "MOUNT CommandPalette + Trigger in AppShell (additive — top bar is otherwise unchanged).")
    bullet(doc, "MODIFY admin/dashboard, audit/log, doctor/ipd page headers to use CompactHeader. All onClick handlers + downstream behaviour are preserved.")
    p(doc, "Regression sweep (scripts/regression-suite.cjs) verifies 54 assertions; this remains green at M2.")

    # ── 8. What's intentionally NOT in M2 ────────────────────────────
    h1(doc, "8. Out of M2 scope (M3 / later waves)")
    bullet(doc, "Full Storybook for the new primitives (GAP-040 — polish sprint).")
    bullet(doc, "Phone 390px regression sweep (GAP-042 — polish sprint).")
    bullet(doc, "100% WCAG-AA audit + remediation (GAP-041 — polish sprint).")
    bullet(doc, "Per-role compaction of every page beyond the three canonical surfaces — these are M3 wave items that follow the documented pattern.")

    h1(doc, "A. Version History")
    table(doc, ["Version", "Date", "Author", "Notes"],
          [
              ["v1.0", "01 Jun 2026", AUTHOR, "Initial UI/UX blueprint."],
              ["v1.1", DOC_DATE,    AUTHOR, "M2 — compact tokens, primitives, command palette, INTUITIVE pillar."],
          ],
          col_widths_cm=[2.0, 3.0, 4.5, 7.5])

    save(doc, out)


if __name__ == "__main__":
    build(Path(__file__).parent / "04_UI_UX_Design_Blueprint_v1_1.docx")
