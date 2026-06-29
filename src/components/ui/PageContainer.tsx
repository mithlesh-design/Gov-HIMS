import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Single source of truth for page width + horizontal padding.
 * Replaces the ad-hoc max-w-5xl / 6xl / 7xl + px-* sprawl across pages.
 * Mobile-first: comfortable gutters on phones, wider air on desktop.
 */
const WIDTHS = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-none",
} as const

interface PageContainerProps {
  children: ReactNode
  width?: keyof typeof WIDTHS
  /** Remove vertical padding (e.g. for full-bleed dashboards). */
  flush?: boolean
  className?: string
}

export function PageContainer({ children, width = "xl", flush, className }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        !flush && "py-5 sm:py-6",
        WIDTHS[width],
        className
      )}
    >
      {children}
    </div>
  )
}
