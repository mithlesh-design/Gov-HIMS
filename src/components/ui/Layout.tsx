import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Thin layout helpers that pin spacing to the design scale so pages stop
 * hand-picking gap-1.5 … gap-6 ad-hoc. Use sparingly for vertical rhythm
 * and simple responsive grids; drop to raw flex/grid for bespoke layouts.
 */
const GAP = { xs: "gap-1.5", sm: "gap-2", md: "gap-3", lg: "gap-4", xl: "gap-6" } as const
type Gap = keyof typeof GAP

export function Stack({
  children,
  gap = "lg",
  className,
}: {
  children: ReactNode
  gap?: Gap
  className?: string
}) {
  return <div className={cn("flex flex-col", GAP[gap], className)}>{children}</div>
}

const COLS = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
} as const

export function Grid({
  children,
  cols = 3,
  gap = "lg",
  className,
}: {
  children: ReactNode
  cols?: keyof typeof COLS
  gap?: Gap
  className?: string
}) {
  return <div className={cn("grid", COLS[cols], GAP[gap], className)}>{children}</div>
}
