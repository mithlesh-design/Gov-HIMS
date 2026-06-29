/**
 * Centralised domain → status-token registry.
 *
 * The #1 driver of visual drift on this platform is every module hand-rolling
 * its own colour map (`TRIAGE_TINT`, `SOURCE_STYLE`, `URGENCY_COLOR`,
 * `STATUS_STYLE`, `SLOT_STYLE`, `SEVERITY_COLOR`, `newsChip`, `ORDER_STYLES`…)
 * with raw Tailwind palette values. This file is the single home for those
 * mappings: a domain value in, a token-driven {@link StatusToken} out.
 *
 * A `StatusToken` carries BOTH renderers so call sites pick the right one:
 *   • `status`  → feed {@link StatusPill} (colour + icon + text — the
 *     triple-encoded, patient-safe form; preferred for clinical state).
 *   • `variant` → feed {@link NeonBadge} (compact chip).
 *   • `label`   → the canonical word (override at the call site if needed).
 *
 * This is a SUPERSET of `clinicalStatus.ts` (triage/queue/priority/severity),
 * which is kept and re-exported here so there is one import site.
 */
import type { Status } from "@/components/ui/StatusPill"
import type { NeonBadgeVariant } from "@/components/ui/neon-badge"

export interface StatusToken {
  status: Status
  variant: NeonBadgeVariant
  label: string
}

/** NeonBadge has no burnt-orange, so urgent/caution both collapse to amber there. */
const VARIANT_FOR_STATUS: Record<Status, NeonBadgeVariant> = {
  critical: "danger",
  urgent:   "warning",
  caution:  "warning",
  stable:   "success",
  done:     "success",
  info:     "blue",
  pending:  "muted",
  neutral:  "muted",
}

/** Build a token from a StatusPill status + label (variant derived). */
export function token(status: Status, label: string): StatusToken {
  return { status, variant: VARIANT_FOR_STATUS[status], label }
}

const norm = (v?: string | null) => (v ?? "").toLowerCase().replace(/[\s_]+/g, "-").trim()

/* ─────────────────────────── Radiology ─────────────────────────── */

/** RIS study lifecycle: ordered → arrived → acquiring → reading → reported → released. */
export function studyStatusToken(s?: string | null): StatusToken {
  switch (norm(s)) {
    case "ordered":
    case "requested":
    case "scheduled":      return token("pending", "Ordered")
    case "arrived":
    case "checked-in":
    case "registered":     return token("info", "Arrived")
    case "acquiring":
    case "in-progress":
    case "scanning":       return token("info", "Acquiring")
    case "acquired":
    case "captured":       return token("info", "Acquired")
    case "reading":
    case "in-read":
    case "dictating":      return token("info", "Reading")
    case "preliminary":
    case "draft":          return token("caution", "Preliminary")
    case "reported":
    case "to-verify":
    case "pending-verify":
    case "unverified":     return token("caution", "To verify")
    case "addendum":       return token("info", "Addendum")
    case "verified":
    case "released":
    case "final":
    case "signed":         return token("done", "Released")
    case "critical":
    case "critical-result":return token("critical", "Critical")
    case "cancelled":
    case "declined":       return token("neutral", "Cancelled")
    default:               return token("neutral", s || "—")
  }
}

const MODALITY_LABEL: Record<string, string> = {
  ct: "CT", mr: "MRI", mri: "MRI", xr: "X-ray", cr: "X-ray", dx: "X-ray", "x-ray": "X-ray",
  us: "Ultrasound", uss: "Ultrasound", ultrasound: "Ultrasound", nm: "Nuclear", pet: "PET",
  "pet-ct": "PET-CT", mg: "Mammography", mammo: "Mammography", fl: "Fluoroscopy", fluoro: "Fluoroscopy",
  dexa: "DEXA", bmd: "DEXA", ecg: "ECG", echo: "Echo",
}

/** Modality code → display label (e.g. "MR" → "MRI"). */
export function modalityLabel(m?: string | null): string {
  const k = norm(m)
  return MODALITY_LABEL[k] ?? (m ? m.toUpperCase() : "—")
}

/* ─────────────────────── Nurse / clinical ───────────────────────── */

/** NEWS2 aggregate early-warning band. Medium triggers an urgent response; high is critical. */
export function news2Token(band?: string | null): StatusToken {
  switch (norm(band)) {
    case "low":           return token("stable", "Low")
    case "low-medium":
    case "low-med":       return token("caution", "Low-Med")
    case "medium":
    case "med":           return token("urgent", "Medium")
    case "high":          return token("critical", "High")
    default:              return token("neutral", band || "—")
  }
}

/** Derive a NEWS2 token from the aggregate score (0 low · 1–4 low · 5–6 medium · 7+ high). */
export function news2ScoreToken(score: number): StatusToken {
  if (score >= 7) return token("critical", `${score}`)
  if (score >= 5) return token("urgent", `${score}`)
  if (score >= 1) return token("caution", `${score}`)
  return token("stable", `${score}`)
}

/** Turnaround-time SLA from elapsed vs expected minutes: on-time / at-risk / breached. */
export function tatToken(elapsedMin: number, expectedMin: number): StatusToken {
  if (expectedMin <= 0) return token("neutral", "—")
  const ratio = elapsedMin / expectedMin
  if (ratio > 1)    return token("critical", "Breached")
  if (ratio >= 0.8) return token("caution", "At risk")
  return token("stable", "On time")
}

/* ───────────── Re-export clinicalStatus (one import site) ──────────── */
export {
  triageMeta,
  queueStatusMeta,
  priorityMeta,
  severityMeta,
  type StatusMeta,
} from "@/lib/clinicalStatus"
