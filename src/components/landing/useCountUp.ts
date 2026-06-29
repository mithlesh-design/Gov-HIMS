"use client"

import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"

/**
 * Animates a number from 0 → target once `active` becomes true.
 * Respects prefers-reduced-motion (jumps straight to target).
 */
export function useCountUp(target: number, active: boolean, durationMs = 1100): number {
  const reduce = useReducedMotion()
  const [value, setValue] = useState(0)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    if (reduce || target === 0) { setValue(target); return }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setValue(target * eased)
      if (t < 1) raf.current = requestAnimationFrame(tick)
      else setValue(target)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, active, reduce, durationMs])

  return value
}
