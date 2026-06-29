/* Agentix HIMS — Admin AI copilot (grounded answer engine).
 *
 * A ChatGPT-style assistant for the COO/admin that answers natural-language
 * questions about the WHOLE hospital. It is GROUNDED: every number comes from
 * the live Zustand stores (read synchronously via `.getState()`) and the pure
 * aggregators in opsMetrics — it never invents facts. Unmatched queries return
 * a helpful capability list. This mirrors the doctorCopilot pattern but spans
 * all operational domains, and attaches "Open …" navigation deep-links.
 *
 * The real-LLM swap point lives in copilotLLM.ts (runAdminCopilot) — when a
 * model is wired, it can call these same grounded readers as tools.
 */

import { useAdmissionStore } from "@/store/useAdmissionStore"
import { useBillingStore } from "@/store/useBillingStore"
import { useInsuranceStore } from "@/store/useInsuranceStore"
import { useHRStore, type ShiftType } from "@/store/useHRStore"
import { useStatutoryStore } from "@/store/useStatutoryStore"
import { useERStore } from "@/store/useERStore"
import { useOTStore } from "@/store/useOTStore"
import { useInpatientStore } from "@/store/useInpatientStore"
import { usePharmacyStore } from "@/store/usePharmacyStore"
import { useLabOrdersStore } from "@/store/useLabOrdersStore"
import { useInventoryStore } from "@/store/useInventoryStore"
import { useQualityStore } from "@/store/useQualityStore"
import { useVendorStore } from "@/store/useVendorStore"
import { usePatientStore } from "@/store/usePatientStore"
import {
  bedMetrics, erMetrics, otMetrics, ipdMetrics, revenueMetrics, claimMetrics, staffMetrics, inr,
} from "@/lib/opsMetrics"

export type AdminLink = { label: string; route: string }
export interface AdminAnswer {
  text: string
  links?: AdminLink[]
  sources?: string[]
  confidence: number
}

const has = (q: string, ...words: string[]) => words.some(w => q.includes(w))

function currentShift(): ShiftType {
  const h = new Date().getHours()
  return h >= 6 && h < 14 ? "Morning" : h >= 14 && h < 22 ? "Evening" : "Night"
}

// ── Domain answerers ───────────────────────────────────────────────
// Each reads its store(s) at call time and returns a grounded answer.

function answerBeds(): AdminAnswer {
  const beds = useAdmissionStore.getState().beds
  const m = bedMetrics(beds)
  const top = m.byWard.slice(0, 4).map(w => `• ${w.ward}: ${w.occupied}/${w.total} (${w.pct}%)`).join("\n")
  const pending = useAdmissionStore.getState().admissionRequests?.filter(r => r.status === "Pending").length ?? 0
  return {
    text:
      `**Bed occupancy: ${m.occupancyPct}%** — ${m.occupied} occupied, **${m.available} available**, ${m.cleaning} in cleaning (of ${m.total} beds).\n` +
      `${pending} admission request(s) pending.\n\nBy ward:\n${top}`,
    links: [{ label: "Open bed map", route: "/admission/beds" }, { label: "Operations", route: "/admin/operations" }],
    sources: ["Admissions"],
    confidence: 0.95,
  }
}

function answerRevenue(): AdminAnswer {
  const m = revenueMetrics(useBillingStore.getState().bills)
  return {
    text:
      `**Revenue collected: ${inr(m.collected)}**, with **${inr(m.outstanding)} outstanding** across ${m.openCount} open bill(s). ` +
      `${m.settledCount} bill(s) settled.`,
    links: [{ label: "Open Hospital P&L", route: "/admin/finance" }, { label: "Disputes", route: "/admin/disputes" }],
    sources: ["Billing"],
    confidence: 0.94,
  }
}

function answerClaims(): AdminAnswer {
  const claims = useInsuranceStore.getState().claims
  const m = claimMetrics(claims)
  const highRisk = claims
    .filter(c => (c.aiDenialRisk?.score ?? 0) > 60)
    .sort((a, b) => (b.aiDenialRisk?.score ?? 0) - (a.aiDenialRisk?.score ?? 0))
    .slice(0, 5)
  const list = highRisk.length
    ? "\n\nHighest denial-risk:\n" + highRisk.map(c => `• ${c.patientName} — ${c.aiDenialRisk?.score}% risk · ${inr(c.amount ?? 0)}`).join("\n")
    : ""
  return {
    text:
      `**${m.pending} claim(s) in progress** worth **${inr(m.atRiskValue)}** at risk · ${m.approved} approved · ${m.rejected} rejected.` + list,
    links: [{ label: "Open Insurance desk", route: "/insurance/dashboard" }],
    sources: ["Insurance"],
    confidence: 0.93,
  }
}

function answerCredentials(): AdminAnswer {
  const expiring = useHRStore.getState().getExpiringCredentials(30)
  if (!expiring.length) {
    return { text: "✅ No staff credentials or licences expire in the next 30 days.", links: [{ label: "Credentials", route: "/admin/credentials" }], sources: ["HR"], confidence: 0.92 }
  }
  const rows = expiring
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
    .slice(0, 8)
    .map(e => `• ${e.staff.name} — ${e.credential.type} · ${e.daysUntilExpiry <= 0 ? "**EXPIRED**" : `${e.daysUntilExpiry}d left`}`)
    .join("\n")
  return {
    text: `**${expiring.length} credential(s) expiring within 30 days:**\n${rows}`,
    links: [{ label: "Open Credentials", route: "/admin/credentials" }],
    sources: ["HR"],
    confidence: 0.94,
  }
}

function answerCoverage(): AdminAnswer {
  const hr = useHRStore.getState()
  const shift = currentShift()
  const today = new Date().toISOString().slice(0, 10)
  const depts = Array.from(new Set(hr.staff.map(s => s.department).filter(Boolean))) as string[]
  const gaps = depts
    .map(d => ({ dept: d, cov: hr.getCoverage(d, today, shift) }))
    .filter(x => x.cov.severity !== "ok")
    .sort((a, b) => (a.cov.severity === "critical" ? -1 : 1))
  if (!gaps.length) {
    return { text: `✅ All departments meet minimum coverage for the **${shift}** shift today.`, links: [{ label: "Coverage", route: "/admin/coverage" }], sources: ["HR"], confidence: 0.9 }
  }
  const rows = gaps.slice(0, 8).map(g =>
    `• ${g.dept} — ${g.cov.headcount}/${g.cov.min} (need ${g.cov.min}, ideal ${g.cov.ideal}) · ${g.cov.severity === "critical" ? "🔴 critical" : "🟡 short"}`,
  ).join("\n")
  return {
    text: `**${gaps.length} department(s) below coverage** for the ${shift} shift:\n${rows}`,
    links: [{ label: "Open Coverage", route: "/admin/coverage" }, { label: "Duty roster", route: "/admin/duty" }],
    sources: ["HR"],
    confidence: 0.92,
  }
}

function answerStaff(q: string): AdminAnswer {
  const staff = useHRStore.getState().staff
  const m = staffMetrics(staff)
  let roleNote = ""
  if (has(q, "doctor")) roleNote = ` · ${staff.filter(s => s.role === "doctor" && s.status === "active").length} active doctors`
  else if (has(q, "nurse")) roleNote = ` · ${staff.filter(s => s.role === "nurse" && s.status === "active").length} active nurses`
  return {
    text: `**${m.active} active staff** of ${m.total} total · ${m.onLeave} on leave${roleNote}.`,
    links: [{ label: "Open Staff directory", route: "/admin/users" }, { label: "Staffing", route: "/admin/staffing" }],
    sources: ["HR"],
    confidence: 0.9,
  }
}

function answerStatutory(): AdminAnswer {
  const st = useStatutoryStore.getState()
  const counts = st.getStatusCounts()
  const dueSoon = st.getNextDueDays(7)
  const soonList = dueSoon.length
    ? "\n\nDue in 7 days:\n" + dueSoon.slice(0, 6).map(e => `• ${e.type} — ${e.dueDate}${e.status === "overdue" ? " · 🔴 overdue" : ""}`).join("\n")
    : ""
  return {
    text:
      `**Statutory filings:** ${counts.overdue ?? 0} overdue 🔴 · ${counts.due_soon ?? 0} due soon 🟡 · ${counts.upcoming ?? 0} upcoming · ${counts.filed ?? 0} filed.` + soonList,
    links: [{ label: "Open Statutory calendar", route: "/admin/statutory" }, { label: "Compliance", route: "/admin/compliance" }],
    sources: ["Statutory"],
    confidence: 0.93,
  }
}

function answerQuality(): AdminAnswer {
  const qs = useQualityStore.getState()
  const open = qs.incidents.filter(i => i.status !== "Resolved")
  const high = open.filter(i => i.severity === "Critical" || i.severity === "High")
  return {
    text:
      `**${open.length} open incident(s)**${high.length ? `, ${high.length} high-severity` : ""}. ` +
      (qs.nabh ? `Hand-hygiene compliance ${qs.nabh.handHygieneCompliancePct ?? "—"}%.` : ""),
    links: [{ label: "Open Quality dashboard", route: "/quality/dashboard" }, { label: "Compliance", route: "/admin/compliance" }],
    sources: ["Quality"],
    confidence: 0.88,
  }
}

function answerER(): AdminAnswer {
  const m = erMetrics(useERStore.getState().patients)
  return {
    text: `**ER census: ${m.active}** active · ${m.highAcuity} high-acuity (ESI 1–2) · ${m.awaitingTriage} awaiting triage · ${m.awaitingDisposition} awaiting disposition.`,
    links: [{ label: "Open Emergency", route: "/emergency/dashboard" }],
    sources: ["Emergency"],
    confidence: 0.92,
  }
}

function answerOT(): AdminAnswer {
  const m = otMetrics(useOTStore.getState().procedures)
  return {
    text: `**OT today:** ${m.scheduled} scheduled · ${m.inProgress} in progress · ${m.completed} completed · ${m.utilizationPct}% utilisation.`,
    links: [{ label: "Open OT board", route: "/ot/dashboard" }],
    sources: ["OT"],
    confidence: 0.9,
  }
}

function answerIPD(): AdminAnswer {
  const m = ipdMetrics(useInpatientStore.getState().inpatients)
  return {
    text: `**IPD census: ${m.census}** · ${m.critical} critical/serious · ALOS ${m.alosDays}d · ${m.dischargePending} discharge-pending.`,
    links: [{ label: "Bed map", route: "/admission/beds" }, { label: "Discharge desk", route: "/discharge/dashboard" }],
    sources: ["Inpatient"],
    confidence: 0.9,
  }
}

function answerPharmacy(): AdminAnswer {
  const rx = usePharmacyStore.getState().prescriptions
  const queued = rx.filter(p => p.status === "queued").length
  const ready = rx.filter(p => p.status === "ready").length
  return {
    text: `**Pharmacy:** ${queued} prescription(s) queued · ${ready} ready for collection · ${rx.length} total in flight.`,
    links: [{ label: "Open Pharmacy queue", route: "/pharmacy/queue" }],
    sources: ["Pharmacy"],
    confidence: 0.88,
  }
}

function answerLab(): AdminAnswer {
  const orders = useLabOrdersStore.getState().orders
  const tests = orders.flatMap(o => o.tests)
  const pending = tests.filter(t => t.status !== "verified" && t.status !== "released").length
  return {
    text: `**Lab:** ${pending} test(s) pending across ${orders.length} order(s).`,
    links: [{ label: "Open Lab dashboard", route: "/lab/dashboard" }],
    sources: ["Lab"],
    confidence: 0.86,
  }
}

function answerInventory(): AdminAnswer {
  const assets = useInventoryStore.getState().assets
  const low = assets.filter(a => a.status === "Low Stock")
  const maint = assets.filter(a => a.status === "Maintenance Required")
  return {
    text: `**Inventory:** ${low.length} item(s) low on stock · ${maint.length} asset(s) need maintenance.` +
      (low.length ? "\n\nLow stock:\n" + low.slice(0, 6).map(a => `• ${a.name}`).join("\n") : ""),
    links: [{ label: "Vendors & POs", route: "/admin/vendors" }],
    sources: ["Inventory"],
    confidence: 0.86,
  }
}

function answerVendors(): AdminAnswer {
  const invoices = useVendorStore.getState().invoices
  const unpaid = invoices.filter(i => i.status !== "paid")
  const payable = unpaid.reduce((s, i) => s + (i.amount ?? 0), 0)
  return {
    text: `**${unpaid.length} unpaid vendor invoice(s)** worth **${inr(payable)}**.`,
    links: [{ label: "Open Vendors", route: "/admin/vendors" }, { label: "Payroll", route: "/admin/payroll" }],
    sources: ["Vendor"],
    confidence: 0.88,
  }
}

function answerPatientLookup(q: string): AdminAnswer | null {
  const patients = usePatientStore.getState().patients
  const inpatients = useInpatientStore.getState().inpatients
  const tokens = q.replace(/[^a-z\s]/g, "").split(/\s+/).filter(t => t.length > 2)
  const match = (name: string) => tokens.some(t => name.toLowerCase().includes(t))
  const p = patients.find(p => match(p.name))
  const ip = inpatients.find(i => match(i.name))
  if (!p && !ip) return null
  const who = ip ?? p
  const detail = ip
    ? `admitted in ${ip.ward} (${ip.bed}) · ${ip.diagnosis} · ${ip.condition}`
    : `OPD · ${p!.department || "—"} · ${p!.queueStatus || "registered"}`
  return {
    text: `**${who!.name}** — ${detail}.`,
    links: [{ label: "Open Patients", route: "/admin/patients" }],
    sources: [ip ? "Inpatient" : "Patient"],
    confidence: 0.82,
  }
}

function answerOverview(): AdminAnswer {
  const beds = bedMetrics(useAdmissionStore.getState().beds)
  const er = erMetrics(useERStore.getState().patients)
  const ipd = ipdMetrics(useInpatientStore.getState().inpatients)
  const rev = revenueMetrics(useBillingStore.getState().bills)
  const clm = claimMetrics(useInsuranceStore.getState().claims)
  return {
    text:
      `**Hospital snapshot**\n` +
      `• Beds: ${beds.occupancyPct}% occupied · ${beds.available} free\n` +
      `• IPD census: ${ipd.census} (${ipd.critical} critical)\n` +
      `• ER: ${er.active} active · ${er.highAcuity} high-acuity\n` +
      `• Revenue: ${inr(rev.collected)} collected · ${inr(rev.outstanding)} outstanding\n` +
      `• Claims: ${inr(clm.atRiskValue)} at risk (${clm.pending} pending)`,
    links: [{ label: "Command centre", route: "/admin/command-center" }, { label: "COO dashboard", route: "/admin/dashboard" }],
    sources: ["Admissions", "Emergency", "Inpatient", "Billing", "Insurance"],
    confidence: 0.92,
  }
}

const CAPABILITIES =
  "I'm the Agentix HIMS admin assistant, grounded in live hospital data. Ask me things like:\n" +
  "• \"What's today's revenue?\" / \"outstanding receivables\"\n" +
  "• \"ICU occupancy\" / \"how many beds are free?\"\n" +
  "• \"Which licences expire this month?\"\n" +
  "• \"Coverage gaps today\" / \"staff on leave\"\n" +
  "• \"High denial-risk claims\"\n" +
  "• \"Overdue statutory filings\"\n" +
  "• \"ER census\" / \"OT schedule\" / \"open incidents\"\n" +
  "• \"Give me a hospital snapshot\""

// ── Intent matching ────────────────────────────────────────────────
// Short, ambiguous tokens (≤3 chars or substrings of common words) must
// match on a word boundary; longer/specific terms can match as substrings
// and score higher. This lets the admin phrase questions naturally.
const SHORT = new Set(["ot", "er", "icu", "ccu", "pf", "esi", "tds", "gst", "rx", "po", "hai", "los", "kpi", "pnl", "bed", "lab", "ay"])

function score(q: string, words: string[]): number {
  let s = 0
  for (const w of words) {
    if (w.length <= 3 || SHORT.has(w)) {
      if (new RegExp(`\\b${w}\\b`, "i").test(q)) s += 2
    } else if (q.includes(w)) {
      s += w.length >= 6 ? 2 : 1
    }
  }
  return s
}

type Domain = { fn: (q: string) => AdminAnswer; words: string[] }

// Ordered by priority (earlier wins ties). Generous synonyms so natural
// phrasings ("how's the money", "any beds free", "who's on leave") resolve.
const DOMAINS: Domain[] = [
  { fn: answerBeds, words: ["bed", "beds", "occupanc", "occupied", "vacant", "free bed", "available", "ward", "icu", "ccu", "capacity", "full", "empty"] },
  { fn: answerRevenue, words: ["revenue", "collected", "collection", "outstanding", "receivable", "billing", "bill", "cash", "income", "earning", "money", "financ", "turnover", "paid", "dues", "pnl", "profit", "p&l"] },
  { fn: answerClaims, words: ["claim", "denial", "denied", "deny", "pre-auth", "preauth", "tpa", "insurance", "insurer", "reimburs", "cashless"] },
  { fn: answerCredentials, words: ["licen", "credential", "certif", "expir", "registration", "council", "renew", "mci", "aerb"] },
  { fn: answerCoverage, words: ["coverage", "understaff", "short staff", "short-staff", "staffing gap", "shortfall", "cover", "minimum staff", "roster gap"] },
  { fn: answerStatutory, words: ["statutory", "filing", "file", "gst", "gstr", "pf", "esi", "tds", "professional tax", "return", "compliance", "overdue", "deadline", "due date", "regulatory"] },
  { fn: answerQuality, words: ["incident", "quality", "nabh", "fall", "infection", "hai", "near miss", "safety", "complaint", "audit", "capa", "sentinel"] },
  { fn: answerER, words: ["emergency", "casualty", "triage", "acuity", "esi", "trauma", "er"] },
  { fn: answerOT, words: ["theatre", "theater", "surger", "surgic", "operation", "procedure", "surgeon", "scheduled surg", "ot"] },
  { fn: answerIPD, words: ["ipd", "inpatient", "in-patient", "census", "admitted", "admission", "critical", "serious", "alos", "length of stay", "discharge", "ward patient"] },
  { fn: answerPharmacy, words: ["pharmac", "medicine", "medication", "prescription", "dispense", "drug", "rx", "stock out"] },
  { fn: answerLab, words: ["laborator", "pathology", "blood test", "lab", "test", "sample", "report"] },
  { fn: answerInventory, words: ["inventory", "stock", "asset", "equipment", "maintenance", "reorder", "supply", "consumable"] },
  { fn: answerVendors, words: ["vendor", "payable", "invoice", "supplier", "payment", "procurement", "purchase order", "po"] },
  { fn: answerStaff, words: ["staff", "employee", "headcount", "doctor", "nurse", "technician", "workforce", "team", "people", "on leave", "leave", "attendance", "working", "manpower"] },
]

const OVERVIEW = ["snapshot", "overview", "summary", "how is", "how are", "status", "everything", "overall", "situation", "report", "briefing", "whats happening", "what's happening", "how's the hospital", "hospital today", "give me"]

/**
 * Grounded admin answer engine. Scores the query against every hospital domain
 * and answers from the best match — reading live store data, never inventing.
 * Falls back to a useful snapshot (not a dead-end) when intent is unclear.
 */
export function respondAdmin(query: string): AdminAnswer {
  const q = query.trim().toLowerCase()
  if (!q) return { text: CAPABILITIES, confidence: 0.4 }

  // Greeting / help.
  if (/^(hi|hey|hello|yo|help|what can you|who are you|what do you do)\b/.test(q) || q === "help")
    return { text: CAPABILITIES, confidence: 0.6 }

  // Explicit overview intent.
  const overviewScore = score(q, OVERVIEW)
  let best: { d: Domain | null; s: number } = { d: null, s: 0 }
  for (const d of DOMAINS) {
    const s = score(q, d.words)
    if (s > best.s) best = { d, s }
  }

  // A clear domain match wins unless the user explicitly asked for an overview.
  if (best.d && best.s >= (overviewScore >= 4 ? 99 : 1)) return best.d.fn(q)
  if (overviewScore >= 2) return answerOverview()

  // Name lookup (e.g. "where is Kiran Patil", "patient Anil").
  const lookup = answerPatientLookup(q)
  if (lookup) return lookup

  // Never dead-end: give the live snapshot plus a gentle nudge.
  const snap = answerOverview()
  return {
    ...snap,
    text: `I wasn't sure which area you meant, so here's where the hospital stands right now:\n\n${snap.text}\n\nYou can also ask about credentials, coverage, claims, statutory filings, OT, pharmacy, lab or inventory.`,
    confidence: 0.5,
  }
}
