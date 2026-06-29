/* S4 — Hospital-Wide AI Copilot intent parser.
 *
 * Mock NL → typed-intent classifier used by the Command Palette. Phase-2
 * will replace the body with an LLM call returning the same envelope; the
 * palette + preview UI stays identical.
 *
 *   parseIntent("schedule MRI for Anil Tuesday 10am")
 *   → { action: "schedule", object: { kind: "imaging", value: "MRI" },
 *       patient: { name: "Anil Kumar Verma", id: "PT-44012" },
 *       time: { value: "Tuesday 10am", iso?: "2026-06-09T10:00" },
 *       confidence: 0.82, reasoning: [...], raw }
 */

export type CopilotAction =
  | "schedule"   // appointment, scan, surgery, follow-up
  | "order"      // labs, imaging, medication
  | "draft"      // pre-auth, claim, discharge summary, prescription
  | "discharge"
  | "show"       // navigation/listing (denial-risk claims, my IPD, etc.)
  | "find"       // patient lookup
  | "summarise"  // summarise patient / day / chart
  | "unknown"

export type CopilotObject = {
  kind: "imaging" | "lab" | "medication" | "appointment" | "preauth" | "claim" | "discharge_summary" | "list" | "chart"
  value: string
}

export type CopilotPatientHint = { id?: string; name?: string }

export type CopilotIntent = {
  action: CopilotAction
  object?: CopilotObject
  patient?: CopilotPatientHint
  time?: { value: string }
  destination?: { route: string; label: string }
  confidence: number       // 0..1
  reasoning: string[]      // human-readable bullets
  raw: string
}

// ── Action verbs ───────────────────────────────────────────────────────────
const ACTION_PATTERNS: { action: CopilotAction; words: RegExp; reason: string }[] = [
  { action: "schedule",  words: /\b(schedule|book|arrange|set up|plan)\b/i,      reason: "Verb 'schedule/book' matches calendar action." },
  { action: "order",     words: /\b(order|request|raise)\b/i,                     reason: "Verb 'order/request' matches order-entry." },
  { action: "draft",     words: /\b(draft|write|prepare|compose)\b/i,             reason: "Verb 'draft/write' matches document generation." },
  { action: "discharge", words: /\b(discharge|send home|release)\b/i,             reason: "Verb 'discharge' triggers the IPD discharge flow." },
  { action: "show",      words: /\b(show|list|open|view|display|see)\b/i,         reason: "Verb 'show/list/open' is a navigation intent." },
  { action: "find",      words: /\b(find|search|look up|locate|where is)\b/i,     reason: "Verb 'find/search' is a lookup." },
  { action: "summarise", words: /\b(summari[sz]e|summary|brief|recap|tldr)\b/i,   reason: "Verb 'summarise' triggers AI summary." },
]

// ── Domain objects ────────────────────────────────────────────────────────
const OBJECT_PATTERNS: { kind: CopilotObject["kind"]; words: RegExp; valueOf: (m: RegExpMatchArray) => string }[] = [
  { kind: "imaging",   words: /\b(mri|ct scan|ct|x[- ]?ray|xray|ultrasound|usg|ecg|echo|pet scan|mammogram)\b/i,                            valueOf: (m) => m[1].toUpperCase() },
  { kind: "lab",       words: /\b(cbc|crp|esr|troponin|trop[- ]?i|lft|kft|rft|electrolytes|hba1c|lipid profile|cardiac panel|labs|blood test)\b/i, valueOf: (m) => m[1].toUpperCase() },
  { kind: "medication",words: /\b(rx|prescription|tab|inj|antibiotic|amoxi|augmentin|paracetamol|aspirin|insulin)\b/i,                       valueOf: (m) => m[1] },
  { kind: "appointment", words: /\b(appointment|consult|follow[- ]?up|review|opd visit|tele consult)\b/i,                                    valueOf: (m) => m[1] },
  { kind: "preauth",   words: /\b(pre[- ]?auth|preauth|cashless approval|insurance approval)\b/i,                                           valueOf: () => "Pre-authorisation" },
  { kind: "claim",     words: /\b(claim|denial[- ]?risk|claims dashboard)\b/i,                                                              valueOf: (m) => m[1] || "claims" },
  { kind: "discharge_summary", words: /\b(discharge summary|ds note|discharge note)\b/i,                                                     valueOf: () => "Discharge summary" },
  { kind: "list",      words: /\b(my patients|today's queue|critical patients|ipd list|opd queue|denial-risk)\b/i,                          valueOf: (m) => m[1] },
  { kind: "chart",     words: /\b(chart|record|file|history|case sheet)\b/i,                                                                valueOf: (m) => m[1] },
]

// ── Patient hints — partial name fuzzy match ──────────────────────────────
function detectPatient(text: string, registry: { id: string; name: string }[]): CopilotPatientHint | undefined {
  const t = text.toLowerCase()
  for (const p of registry) {
    const first = p.name.split(/\s+/)[0]?.toLowerCase()
    if (first && t.includes(first)) return { id: p.id, name: p.name }
    if (t.includes(p.name.toLowerCase())) return { id: p.id, name: p.name }
    if (p.id && t.includes(p.id.toLowerCase())) return { id: p.id, name: p.name }
  }
  return undefined
}

// ── Time tokens — kept lo-fi, real ISO parsing is Phase-2 ────────────────
function detectTime(text: string): { value: string } | undefined {
  const T = text
  const re = /\b(today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|this evening|\d{1,2}\s?(?:am|pm)|\d{1,2}:\d{2})\b/i
  const m = T.match(re)
  if (!m) return undefined
  // capture preceding "Tuesday 10am" or "Mon 4pm" patterns more accurately
  const window = T.slice(Math.max(0, (m.index ?? 0) - 16), Math.min(T.length, (m.index ?? 0) + 24))
  const clean = window.match(/((?:mon|tue|wed|thu|fri|sat|sun)\w*\s+)?\d{1,2}(?::\d{2})?\s?(?:am|pm)?/i)?.[0]
  return { value: (clean ?? m[1]).trim() }
}

// ── Routing: which page best fulfils the intent ───────────────────────────
function destinationFor(action: CopilotAction, object?: CopilotObject): { route: string; label: string } {
  if (action === "schedule" && object?.kind === "imaging")     return { route: "/radiology/inbox",   label: "Open radiology inbox to schedule" }
  if (action === "schedule" && object?.kind === "appointment") return { route: "/reception/appointments", label: "Open appointments to schedule" }
  if (action === "order"    && object?.kind === "lab")         return { route: "/doctor/ipd",         label: "Open IPD to raise lab order" }
  if (action === "order"    && object?.kind === "imaging")     return { route: "/radiology/inbox",   label: "Open radiology inbox to order" }
  if (action === "draft"    && object?.kind === "preauth")     return { route: "/insurance/preauth", label: "Open pre-auth desk" }
  if (action === "draft"    && object?.kind === "discharge_summary") return { route: "/discharge/dashboard", label: "Open discharge desk" }
  if (action === "discharge")                                  return { route: "/discharge/dashboard", label: "Open discharge desk" }
  if (action === "show"     && /denial/i.test(object?.value ?? "")) return { route: "/insurance/dashboard", label: "Open insurance dashboard" }
  if (action === "show"     && object?.kind === "list")        return { route: "/doctor/ipd",         label: "Open IPD list" }
  if (action === "summarise")                                  return { route: "/doctor/ipd",         label: "Open patient chart to summarise" }
  if (action === "find")                                       return { route: "/admin/patients",     label: "Open patient directory" }
  return { route: "/doctor/dashboard", label: "Open doctor dashboard" }
}

export function parseIntent(
  text: string,
  ctx: { patients?: { id: string; name: string }[] } = {},
): CopilotIntent {
  const raw = text.trim()
  const reasoning: string[] = []
  let action: CopilotAction = "unknown"
  let confidence = 0

  for (const p of ACTION_PATTERNS) {
    if (p.words.test(raw)) { action = p.action; reasoning.push(p.reason); confidence += 0.35; break }
  }

  let object: CopilotObject | undefined
  for (const o of OBJECT_PATTERNS) {
    const m = raw.match(o.words)
    if (m) { object = { kind: o.kind, value: o.valueOf(m) }; reasoning.push(`Matched object "${object.value}" (${object.kind}).`); confidence += 0.25; break }
  }

  const patient = detectPatient(raw, ctx.patients ?? [])
  if (patient) { reasoning.push(`Resolved patient: ${patient.name}${patient.id ? ' (' + patient.id + ')' : ''}.`); confidence += 0.2 }

  const time = detectTime(raw)
  if (time) { reasoning.push(`Found time hint: ${time.value}.`); confidence += 0.1 }

  // Fallback — pure navigation when nothing else parses but the text mentions a known page.
  if (action === "unknown" && /\b(dashboard|inbox|queue|trail|cockpit|map)\b/i.test(raw)) {
    action = "show"; confidence = 0.25; reasoning.push("No verb but page keyword detected — treating as navigation.")
  }

  const destination = destinationFor(action, object)
  if (action !== "unknown") reasoning.push(`Best surface: ${destination.label}.`)

  // Clamp & polish.
  confidence = Math.max(0, Math.min(0.98, confidence))
  if (confidence === 0) reasoning.push("No verb / object / patient parsed — try 'schedule MRI for Anil Tuesday 10am'.")

  return { action, object, patient, time, destination, confidence, reasoning, raw }
}

/** Render a one-liner preview for the confirmation card. */
export function describeIntent(i: CopilotIntent): string {
  if (i.action === "unknown") return `Couldn't parse — try '${i.raw}' again with a verb (schedule/show/order/draft).`
  const parts: string[] = []
  parts.push(i.action.charAt(0).toUpperCase() + i.action.slice(1))
  if (i.object) parts.push(i.object.value)
  if (i.patient?.name) parts.push(`for ${i.patient.name}`)
  if (i.time) parts.push(`on ${i.time.value}`)
  return parts.join(" ")
}
