"use client"

import { useEffect } from "react"
import { useLabStore } from "@/store/useLabStore"
import { useRadiologyStore } from "@/store/useRadiologyStore"

// Simulates results coming back over time: every few seconds it advances one
// pending lab sample and one pending scan a step. When a lab finalises it sets a
// result + fires the ordering doctor's notification (critical values escalate),
// so the Results inbox fills live without a reload. Mounted in the doctor layout.
export function ResultsTicker() {
  useEffect(() => {
    const iv = setInterval(() => {
      const lab = useLabStore.getState()
      const pendingLab = lab.samples.find(s => s.status !== 'Completed')
      if (pendingLab) lab.advanceStatus(pendingLab.id)

      const rad = useRadiologyStore.getState()
      const pendingScan = rad.scans.find(s => s.status !== 'Reported')
      if (pendingScan) rad.advanceStatus(pendingScan.id)
    }, 6000)
    return () => clearInterval(iv)
  }, [])
  return null
}
