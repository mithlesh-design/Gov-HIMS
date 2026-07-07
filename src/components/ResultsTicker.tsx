"use client"

import { useEffect } from "react"
import { useLabStore } from "@/store/useLabStore"
import { useLabOrdersStore } from "@/store/useLabOrdersStore"
import { useRadiologyStore } from "@/store/useRadiologyStore"

// Simulates instrument results coming back over time: every few seconds it
// advances one already-accepted lab test and one pending scan a step. When a lab
// finalises it sets a result + fires the ordering doctor's notification (critical
// values escalate), so the Results inbox fills live without a reload.
//
// It only ever touches tests a technician has already accepted onto a bench
// (in_progress → entered → verified → released). It must NOT auto-collect a
// specimen or auto-claim a queued test: sample collection and technician accept
// are mandatory human gates, so a doctor's new order stays in the lab "In Queue"
// until a human picks it up. Mounted in the doctor layout.
const AUTO_ADVANCEABLE = new Set(['in_progress', 'entered', 'verified'])

export function ResultsTicker() {
  useEffect(() => {
    const iv = setInterval(() => {
      const processing = useLabOrdersStore.getState().orders
        .flatMap(o => o.tests)
        .find(t => AUTO_ADVANCEABLE.has(t.status))
      if (processing) useLabStore.getState().advanceStatus(processing.id)

      const rad = useRadiologyStore.getState()
      const pendingScan = rad.scans.find(s => s.status !== 'Reported')
      if (pendingScan) rad.advanceStatus(pendingScan.id)
    }, 6000)
    return () => clearInterval(iv)
  }, [])
  return null
}
