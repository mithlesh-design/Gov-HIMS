"use client"

/* CompactHeader — denser top-of-page pattern for M2 compaction.
 *
 * Replaces the loose <PageHeader> arrangement (h2 + lots of mb-6) with a tight
 * row that puts the title, optional KPI/badge strip, and ONE primary action on
 * a single 40px-tall row. Secondary actions live in an overflow menu (passed
 * through `secondaryActions`).
 *
 * The legacy <PageHeader> is preserved; nothing forces a page to adopt this.
 */
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface CompactHeaderProps {
  title: string
  subtitle?: string
  badge?: ReactNode
  /** The one primary CTA. */
  primary?: ReactNode
  /** Visible row of secondary chips (filters, KPIs). */
  side?: ReactNode
  className?: string
}

export function CompactHeader({ title, subtitle, badge, primary, side, className }: CompactHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-start sm:items-center gap-3 flex-wrap pb-3 mb-3 border-b border-slate-100",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-[20px] font-bold text-slate-900 leading-[1.2] tracking-tight">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle ? (
          <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
        ) : null}
      </div>
      {side ? <div className="flex items-center gap-2 flex-wrap">{side}</div> : null}
      {primary ? <div className="flex-shrink-0">{primary}</div> : null}
    </header>
  )
}
