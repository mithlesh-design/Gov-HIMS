import { cn } from "@/lib/utils"

type Variant = 'success' | 'danger' | 'warning' | 'blue' | 'teal' | 'muted' | 'purple'

interface StatusBadgeProps {
  variant: Variant
  children: React.ReactNode
  dot?: boolean
  className?: string
}

// Token-driven (see globals.css). Brand tones collapse to the single indigo
// identity; status tones stay semantic. No raw Tailwind palette values.
const VARIANT_CLASSES: Record<Variant, string> = {
  success: 'bg-success-bg     text-success-strong     border-success/25',
  danger:  'bg-danger-bg      text-danger-strong      border-danger/25',
  warning: 'bg-warning-bg     text-brand-amber-strong border-warning/25',
  blue:    'bg-accent-soft    text-primary-dark       border-primary/20',
  teal:    'bg-accent-soft    text-primary-dark       border-primary/20',
  muted:   'bg-surface-sunken text-foreground-muted   border-border',
  purple:  'bg-accent-soft    text-primary-dark       border-primary/20',
}

const DOT_CLASSES: Record<Variant, string> = {
  success: 'bg-success',
  danger:  'bg-danger',
  warning: 'bg-warning',
  blue:    'bg-primary',
  teal:    'bg-primary',
  muted:   'bg-foreground-placeholder',
  purple:  'bg-primary',
}

export function StatusBadge({ variant, children, dot, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", DOT_CLASSES[variant])} />
      )}
      {children}
    </span>
  )
}
