"use client"

import { useEffect, useState } from "react"
import { usePatientStore } from "@/store/usePatientStore"
import { useInpatientStore } from "@/store/useInpatientStore"
import { useRadiologyStudiesStore } from "@/store/useRadiologyStudiesStore"
import { useLabOrdersStore } from "@/store/useLabOrdersStore"
import { useNotificationStore } from "@/store/useNotificationStore"
import { useHRStore } from "@/store/useHRStore"
import { useDischargeStore } from "@/store/useDischargeStore"
import { detectFindings, isTatBreached, ACTIVE_STATUSES } from "@/lib/radiologyAI"

export type AiFeedItem = {
  id: string
  tone: "critical" | "ai" | "info"
  label: string
  detail: string
  meta?: string
}

export type LiveStats = {
  mounted: boolean
  opdQueue: number
  activeStaff: number
  imagingStudies: number
  aiFindings: number
  tatBreaches: number
  criticalAlerts: number
  inpatients: number
  wards: number
  dischargeReady: number
  labCritical: number
  aiFeed: AiFeedItem[]
}

/**
 * Real, SSR-safe live hospital stats derived from the seeded Zustand stores.
 * Values are gated behind `mounted` so the server render and first client paint
 * match (placeholders), and the live numbers + AI feed appear post-mount.
 * The landing page only READS stores — no mutations.
 */
export function useLiveHospitalStats(): LiveStats {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const queue = usePatientStore(s => s.queue)
  const inpatients = useInpatientStore(s => s.inpatients)
  const studies = useRadiologyStudiesStore(s => s.studies)
  const orders = useLabOrdersStore(s => s.orders)
  const notifications = useNotificationStore(s => s.notifications)
  const staff = useHRStore(s => s.staff)
  const dischargeQueue = useDischargeStore(s => s.dischargeQueue)

  // ── Imaging + AI ──────────────────────────────────────────────────────────
  const POST_ACQ = new Set(["acquired", "reading", "reported", "verified", "released"])
  const studyFindings = studies
    .filter(s => POST_ACQ.has(s.status))
    .map(s => ({ study: s, findings: (s.aiFindings?.length ? s.aiFindings : detectFindings(s).data) }))
  const aiFindings = studyFindings.filter(x => x.findings.some(f => f.category !== "normal")).length
  const tatBreaches = studies.filter(isTatBreached).length

  // ── Lab criticals ─────────────────────────────────────────────────────────
  const labCritical = orders.reduce((n, o) =>
    n + o.tests.filter(t => t.analytes.some(a => a.flag === "CH" || a.flag === "CL")).length, 0)

  // ── Notifications ─────────────────────────────────────────────────────────
  const criticalAlerts = notifications.filter(n => n.priority === "critical" || n.priority === "high").length

  // ── Beds / wards (truthful: active inpatients + distinct wards) ───────────
  const wards = new Set(inpatients.map(i => i.ward)).size

  // ── AI activity feed (real events) ────────────────────────────────────────
  const aiFeed: AiFeedItem[] = []
  for (const { study, findings } of studyFindings) {
    const crit = findings.find(f => f.category === "critical")
    const act = findings.find(f => f.category === "actionable")
    const f = crit ?? act
    if (f) {
      aiFeed.push({
        id: `rad-${study.id}`,
        tone: crit ? "critical" : "ai",
        label: crit ? "AI critical finding" : "AI finding",
        detail: `${f.label} · ${study.patientName}`,
        meta: `${study.modality} · ${Math.round(f.confidence * 100)}% confidence`,
      })
    }
  }
  for (const n of notifications.filter(n => n.priority === "critical" || n.priority === "high").slice(0, 3)) {
    aiFeed.push({
      id: `notif-${n.id}`,
      tone: n.priority === "critical" ? "critical" : "info",
      label: n.priority === "critical" ? "Critical alert" : "Clinical alert",
      detail: n.title,
      meta: n.targetRole ? `→ ${n.targetRole}` : undefined,
    })
  }
  if (tatBreaches > 0) {
    aiFeed.push({ id: "tat", tone: "info", label: "TAT watch", detail: `${tatBreaches} imaging study(ies) approaching SLA`, meta: "auto-escalation armed" })
  }

  if (!mounted) {
    return { mounted: false, opdQueue: 0, activeStaff: 0, imagingStudies: 0, aiFindings: 0, tatBreaches: 0, criticalAlerts: 0, inpatients: 0, wards: 0, dischargeReady: 0, labCritical: 0, aiFeed: [] }
  }

  return {
    mounted: true,
    opdQueue: queue.length,
    activeStaff: staff.filter(s => s.status === "active").length,
    imagingStudies: studies.filter(s => ACTIVE_STATUSES.has(s.status)).length,
    aiFindings,
    tatBreaches,
    criticalAlerts,
    inpatients: inpatients.length,
    wards,
    dischargeReady: dischargeQueue.filter(p => Object.values(p.clearances).every(c => c === "cleared")).length,
    labCritical,
    aiFeed,
  }
}
