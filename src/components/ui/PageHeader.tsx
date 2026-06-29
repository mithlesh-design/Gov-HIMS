import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  badge?: ReactNode
  className?: string
  /** Heading level. Defaults to h2 because AppShell already renders the page h1. */
  as?: "h1" | "h2"
}

export function PageHeader({ title, subtitle, actions, badge, className, as = "h2" }: PageHeaderProps) {
  const Heading = as
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-6", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Heading className="t-h2 text-foreground">{title}</Heading>
          {badge}
        </div>
        {subtitle && (
          <p className="t-body text-foreground-lighter mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  )
}
