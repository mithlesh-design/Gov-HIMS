/* Agentix HIMS — M2 design tokens.
 *
 * Single source of truth for the COMPACTED design system. Imported by the new
 * compact primitives (CompactHeader, CompactKPI, DenseRow, CommandPalette).
 * Tailwind utilities still own the actual rendering — this file documents the
 * tokens AND exposes them in case a component needs the raw values.
 *
 * Rules of compaction:
 *   - Dense over generous: 8/12/16/24 grid, not 24/32/48.
 *   - One primary action per surface, surfaced visually.
 *   - Section bulk lives in the title row, not in nested cards.
 *   - Skeletons preserve layout; spinners are last resort.
 *   - AAA contrast on clinical surfaces; AA elsewhere.
 */

export const tokens = {
  // ── Spacing scale (compact) ──────────────────────────────────────────
  // Map: gap-1 = 4, gap-2 = 8, gap-3 = 12, gap-4 = 16, gap-6 = 24
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const,

  // ── Radius (compact) ─────────────────────────────────────────────────
  radius: {
    chip:   4,   // pill chips / kbd hints
    button: 8,
    input:  8,
    card:   10,  // ↓ from 12: tighter card edges
    drawer: 12,  // ↓ from 16: tighter drawers
    hero:   14,  // top of dashboard hero card
  } as const,

  // ── Typography (compact) ────────────────────────────────────────────
  // Compaction lowers the H1 and lifts captions slightly; body unchanged.
  type: {
    display: { sizePx: 28, weight: 700, lineHeight: 1.1  },
    h1:      { sizePx: 20, weight: 700, lineHeight: 1.2  }, // ↓ from 22
    h2:      { sizePx: 16, weight: 600, lineHeight: 1.25 }, // ↓ from 18
    h3:      { sizePx: 14, weight: 600, lineHeight: 1.3  },
    body:    { sizePx: 13, weight: 400, lineHeight: 1.45 }, // ↓ 1px to tighten worklists
    caption: { sizePx: 11, weight: 500, lineHeight: 1.35 }, // ↑ weight for legibility at small size
    numeric: { sizePx: 13, weight: 600, lineHeight: 1.0,  features: 'tabular-nums' },
  } as const,

  // ── Density classes (Tailwind shorthand for components to use) ──────
  density: {
    // Card padding
    card:   'p-3.5',       // ↓ from p-5 (default)
    cardLg: 'p-4',         // for hero cards
    // Row padding (table-like)
    row:    'px-3 py-2',
    rowLg:  'px-3.5 py-2.5',
    // Header padding
    header: 'pb-3',        // ↓ from pb-6 (mb-6)
    // Gap between sections
    section: 'gap-3',      // ↓ from gap-4
    sectionLg: 'gap-4',    // for top-level
  } as const,

  // ── Z-index (palette + drawers + dialogs) ──────────────────────────
  z: {
    sticky:    20,
    drawer:    40,
    dialog:    60,
    palette:   80,
    toast:     90,
  } as const,

  // ── Motion (calm — match clinical pace) ────────────────────────────
  motion: {
    fast:    120,  // micro-interactions
    base:    180,  // dropdowns, panels
    smooth:  240,  // page transitions / drawers
    easing:  'cubic-bezier(0.4, 0, 0.2, 1)',
  } as const,
}

// ── Motion presets (framer-motion) ───────────────────────────────────
// Single source for the entrance choreography so every worklist row, card,
// and panel animates with the same spring + cadence (28ms stagger, matches
// the `--stagger-step` token). Spread directly onto a <motion.*> element:
//   <motion.li {...motionPresets.listItem(i)}>…
// The spring curve mirrors `--ease-spring` (cubic-bezier(0.16,1,0.3,1)).
const EASE_SPRING = [0.16, 1, 0.3, 1] as const

export const motionPresets = {
  /** List/grid item entrance — staggered by index (capped so long lists stay snappy). */
  listItem: (i = 0) => ({
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: Math.min(i, 12) * 0.028, duration: 0.28, ease: EASE_SPRING },
  }),
  /** Card / panel entrance. */
  cardIn: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.28, ease: EASE_SPRING },
  },
  /** Subtle fade for content swaps within the same container. */
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.18, ease: EASE_SPRING },
  },
  /** Press feedback for tappable cards/buttons driven by framer. */
  press: { whileTap: { scale: 0.985 } },
} as const

// ── Keyboard shortcut atoms (used by CommandPalette + KbdHint) ────────
export const kbd = {
  modKey: (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)) ? '⌘' : 'Ctrl',
  shift:  '⇧',
  alt:    (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)) ? '⌥' : 'Alt',
  enter:  '↵',
}
