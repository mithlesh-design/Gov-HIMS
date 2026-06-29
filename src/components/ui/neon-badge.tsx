import * as React from "react"
import { cn } from "@/lib/utils"

export type NeonBadgeVariant = "blue" | "teal" | "purple" | "orange" | "green" | "danger" | "warning" | "success" | "muted"

export interface NeonBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: NeonBadgeVariant
  dot?: boolean
  pulse?: boolean
}

// Token-driven status chips — every variant resolves to the design-system
// semantic tokens (globals.css), never raw Tailwind palette values. Ink uses
// the *strong* tone of each hue so the label stays legible on its tint (the
// soft ink failed AA on amber); a hairline of the same hue keeps the
// enterprise "borders-first" language. Brand tones (blue/teal/purple) collapse
// to the single indigo identity; status tones stay semantic.
const VARIANT_STYLES: Record<NeonBadgeVariant, string> = {
  blue:    "bg-accent-soft    text-primary-dark        border-primary/20",
  teal:    "bg-accent-soft    text-primary-dark        border-primary/20",
  purple:  "bg-accent-soft    text-primary-dark        border-primary/20",
  orange:  "bg-warning-bg     text-brand-amber-strong  border-warning/25",
  green:   "bg-success-bg     text-success-strong      border-success/25",
  success: "bg-success-bg     text-success-strong      border-success/25",
  danger:  "bg-danger-bg      text-danger-strong       border-danger/25",
  warning: "bg-warning-bg     text-brand-amber-strong  border-warning/25",
  muted:   "bg-surface-sunken text-foreground-muted    border-border",
}

const DOT_STYLES: Record<NeonBadgeVariant, string> = {
  blue:    "bg-primary",
  teal:    "bg-primary",
  purple:  "bg-primary",
  orange:  "bg-warning",
  green:   "bg-success",
  success: "bg-success",
  danger:  "bg-danger",
  warning: "bg-warning",
  muted:   "bg-foreground-placeholder",
}

export const NeonBadge = React.forwardRef<HTMLSpanElement, NeonBadgeProps>(
  ({ className, variant = "blue", dot, pulse, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-tight transition-all",
        VARIANT_STYLES[variant] ?? VARIANT_STYLES.muted,
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full flex-shrink-0",
            DOT_STYLES[variant] ?? DOT_STYLES.muted,
            pulse && "animate-pulse"
          )}
        />
      )}
      {children}
    </span>
  )
)
NeonBadge.displayName = "NeonBadge"
