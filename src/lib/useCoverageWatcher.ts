"use client"

import { useEffect, useRef } from "react"
import { useHRStore, type ShiftType } from "@/store/useHRStore"
import { useNotificationStore } from "@/store/useNotificationStore"
import { useAuditStore } from "@/store/useAuditStore"

// ─────────────────────────────────────────────────────────────────────────
// Admin v2 / Phase 3 / M3.5 — Critical Understaffing Auto-Escalation Watcher
//
// Effect-style hook that re-evaluates coverage whenever shifts / duty /
// leaves / dept minimums change. When a critical dept drops below its
// minimum for the CURRENT shift on the CURRENT date, fires:
//   • a `coverage_critical_breach` audit event (NABH HRM)
//   • a `useNotificationStore` notification to the bed_manager + admin
//
// Debounced to avoid spamming: each (dept, date, shift) emits at most once
// per session.
// ─────────────────────────────────────────────────────────────────────────

function currentShift(): ShiftType {
  const h = new Date().getHours()
  if (h >= 6 && h < 14) return 'Morning'
  if (h >= 14 && h < 22) return 'Evening'
  return 'Night'
}

function today(): string {
  return new Date().toISOString().split('T')[0]!
}

export function useCoverageWatcher() {
  const deptMinimums = useHRStore(s => s.deptMinimums)
  const shifts = useHRStore(s => s.shifts)
  const dutyAssignments = useHRStore(s => s.dutyAssignments)
  const leaveRequests = useHRStore(s => s.leaveRequests)
  const getCoverage = useHRStore(s => s.getCoverage)

  // Track emitted (dept@date@shift) keys to avoid spam within the session.
  const emittedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const date = today()
    const shift = currentShift()

    for (const dept of deptMinimums) {
      if (!dept.perShift) continue  // only check per-shift requirements
      const cov = getCoverage(dept.department, date, shift)
      if (cov.severity !== 'critical') continue
      const key = `${dept.department}@${date}@${shift}`
      if (emittedRef.current.has(key)) continue
      emittedRef.current.add(key)

      // Fire audit
      useAuditStore.getState().log({
        userId: 'SYSTEM', userName: 'Coverage Watcher',
        action: 'coverage_critical_breach',
        resource: 'coverage', resourceId: key,
        detail: `${dept.department} · ${shift} · ${cov.headcount}/${dept.min} (below min)`,
      })

      // Fire notification to bed_manager + admin
      useNotificationStore.getState().add({
        type: 'system',
        priority: 'high',
        title: `Coverage alert · ${dept.department}`,
        body: `${dept.department} below minimum (${cov.headcount}/${dept.min}) for ${shift}. Find replacement immediately.`,
        targetRole: 'bed_manager',
        channels: ['in_app'],
      })
      useNotificationStore.getState().add({
        type: 'system',
        priority: 'high',
        title: `Coverage alert · ${dept.department}`,
        body: `${dept.department} below minimum (${cov.headcount}/${dept.min}) for ${shift}.`,
        targetRole: 'admin',
        channels: ['in_app'],
      })
    }
  }, [deptMinimums, shifts, dutyAssignments, leaveRequests, getCoverage])
}
