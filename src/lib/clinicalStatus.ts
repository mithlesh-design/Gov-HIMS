import type { NeonBadgeVariant } from "@/components/ui/neon-badge"

/**
 * Single source of truth for clinical status → visual mapping.
 *
 * Every module was reinventing its own colour map (TRIAGE_GRADIENTS,
 * SOURCE_COLORS, STATUS_STYLE, SLOT_STYLE…), each with hand-picked raw
 * Tailwind palette values. That is the #1 driver of visual drift across the
 * platform. This helper maps domain vocabularies to the token-driven
 * {@link NeonBadge} variant system so a "Critical" triage looks identical on
 * the doctor worklist, the lab bench and the patient app.
 *
 * Colour is never the only signal — pair the returned variant with the label
 * (and an icon at the call site) so meaning survives in greyscale.
 */
export interface StatusMeta {
  variant: NeonBadgeVariant
  label: string
}

/** Triage acuity (ESI-style): Critical / High / Medium / Low. */
export function triageMeta(level?: string | null): StatusMeta {
  switch ((level ?? "").toLowerCase()) {
    case "critical": return { variant: "danger", label: "Critical" }
    case "high":     return { variant: "warning", label: "High" }
    case "medium":   return { variant: "warning", label: "Medium" }
    case "low":      return { variant: "success", label: "Low" }
    default:         return { variant: "muted", label: level || "—" }
  }
}

/** OPD/IPD queue status: waiting → vitals → consulting → pharmacy/billing → done. */
export function queueStatusMeta(status?: string | null): StatusMeta {
  switch ((status ?? "").toLowerCase()) {
    case "consulting": return { variant: "blue", label: "Consulting" }
    case "vitals":     return { variant: "warning", label: "Vitals" }
    case "waiting":    return { variant: "muted", label: "Waiting" }
    case "pharmacy":   return { variant: "blue", label: "Pharmacy" }
    case "billing":    return { variant: "blue", label: "Billing" }
    case "done":       return { variant: "success", label: "Done" }
    default:           return { variant: "muted", label: status || "—" }
  }
}

/** Order/result urgency: Routine vs Urgent/STAT. */
export function priorityMeta(priority?: string | null): StatusMeta {
  switch ((priority ?? "").toLowerCase()) {
    case "stat":
    case "emergency": return { variant: "danger", label: priority || "STAT" }
    case "urgent":    return { variant: "warning", label: "Urgent" }
    case "routine":   return { variant: "muted", label: "Routine" }
    default:          return { variant: "muted", label: priority || "—" }
  }
}

/** Generic severity ladder for incidents/alerts: Critical / High / Medium / Low. */
export function severityMeta(severity?: string | null): StatusMeta {
  switch ((severity ?? "").toLowerCase()) {
    case "critical": return { variant: "danger", label: "Critical" }
    case "high":     return { variant: "danger", label: "High" }
    case "medium":   return { variant: "warning", label: "Medium" }
    case "low":      return { variant: "success", label: "Low" }
    default:         return { variant: "muted", label: severity || "—" }
  }
}
