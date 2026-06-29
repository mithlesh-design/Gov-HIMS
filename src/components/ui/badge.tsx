import * as React from "react"
import { cn } from "@/lib/utils"

export type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted"
  | "purple"
  | "teal"
  | "orange"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: "sm" | "md"
  dot?: boolean
  pulse?: boolean
  icon?: React.ElementType
}

// Token-driven — mirrors NeonBadge so the two badges are visually identical.
// Brand tones (primary/purple/teal) collapse to the single indigo identity;
// status tones stay semantic; ink uses the *strong* tone of each hue for AA.
const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default:  "bg-surface-sunken text-foreground-muted   border-border",
  primary:  "bg-accent-soft    text-primary-dark        border-primary/20",
  success:  "bg-success-bg     text-success-strong      border-success/25",
  warning:  "bg-warning-bg     text-brand-amber-strong  border-warning/25",
  danger:   "bg-danger-bg      text-danger-strong       border-danger/25",
  info:     "bg-info-bg        text-info                border-info/25",
  muted:    "bg-surface-sunken text-foreground-lighter  border-border",
  purple:   "bg-accent-soft    text-primary-dark        border-primary/20",
  teal:     "bg-accent-soft    text-primary-dark        border-primary/20",
  orange:   "bg-warning-bg     text-brand-amber-strong  border-warning/25",
}

const DOT_STYLES: Record<BadgeVariant, string> = {
  default: "bg-foreground-placeholder",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger:  "bg-danger",
  info:    "bg-info",
  muted:   "bg-foreground-placeholder",
  purple:  "bg-primary",
  teal:    "bg-primary",
  orange:  "bg-warning",
}

export function Badge({
  variant = "default",
  size = "sm",
  dot,
  pulse,
  icon: Icon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        VARIANT_STYLES[variant] ?? VARIANT_STYLES.default,
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full flex-shrink-0",
            DOT_STYLES[variant] ?? DOT_STYLES.default,
            pulse && "animate-pulse"
          )}
        />
      )}
      {Icon && <Icon className="h-3 w-3 flex-shrink-0" />}
      {children}
    </span>
  )
}
