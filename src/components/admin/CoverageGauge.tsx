"use client"

import { useMemo } from "react"
import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react"
import { useHRStore, type ShiftType } from "@/store/useHRStore"
import { cn } from "@/lib/utils"

export interface CoverageGaugeProps {
  dept: string
  date: string                  // YYYY-MM-DD
  shift: ShiftType
  /** Show staff names on hover/tooltip. Default: true. */
  showStaffTooltip?: boolean
  /** Size variant. Default: 'md'. */
  size?: 'sm' | 'md' | 'lg'
  /** Click handler for drill-down. */
  onClick?: () => void
}

const SEVERITY_STYLE = {
  critical: {
    bg: 'bg-red-50 border-red-300',
    text: 'text-red-700',
    icon: ShieldAlert,
    label: 'Below min',
    ringColor: '#dc2626',
  },
  warning: {
    bg: 'bg-amber-50 border-amber-300',
    text: 'text-amber-700',
    icon: AlertTriangle,
    label: 'Below ideal',
    ringColor: '#f59e0b',
  },
  ok: {
    bg: 'bg-emerald-50 border-emerald-300',
    text: 'text-emerald-700',
    icon: ShieldCheck,
    label: 'On target',
    ringColor: '#10b981',
  },
} as const

const SIZE_STYLE = {
  sm: { card: 'p-2', label: 'text-[10px]', number: 'text-base', icon: 'h-3 w-3' },
  md: { card: 'p-3', label: 'text-[11px]', number: 'text-xl', icon: 'h-3.5 w-3.5' },
  lg: { card: 'p-4', label: 'text-xs',    number: 'text-2xl', icon: 'h-4 w-4' },
}

/**
 * Real-time coverage gauge for one (dept, date, shift) cell.
 * Reads useHRStore.getCoverage selector and renders a colour-coded card with
 * the headcount vs min, ratio bar, and severity badge.
 *
 * Reusable across:
 *   • /admin/coverage live snapshot grid
 *   • COO dashboard overview strip
 *   • Bed manager / nurse dashboards (specific ward focus)
 */
export function CoverageGauge({ dept, date, shift, showStaffTooltip = true, size = 'md', onClick }: CoverageGaugeProps) {
  const getCoverage = useHRStore(s => s.getCoverage)
  const coverage = useMemo(() => getCoverage(dept, date, shift), [getCoverage, dept, date, shift])

  const style = SEVERITY_STYLE[coverage.severity]
  const Icon = style.icon
  const sz = SIZE_STYLE[size]

  // Ratio bar (clamped at 100%)
  const pct = coverage.ideal > 0 ? Math.min(100, (coverage.headcount / coverage.ideal) * 100) : 0
  const tooltip = showStaffTooltip && coverage.staff.length > 0
    ? coverage.staff.map(s => s.name).join(', ')
    : `${coverage.headcount} / ${coverage.min} minimum · ${coverage.ideal} ideal`

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      title={tooltip}
      data-testid={`coverage-${dept.toLowerCase().replace(/\s+/g, '-')}`}
      className={cn(
        'rounded-xl border text-left transition w-full',
        sz.card,
        style.bg,
        onClick ? 'cursor-pointer hover:shadow-md' : 'cursor-default',
      )}>
      <div className="flex items-center justify-between mb-1.5">
        <p className={cn('font-bold uppercase tracking-wide truncate', sz.label, style.text)}>{dept}</p>
        <Icon className={cn(sz.icon, style.text)} />
      </div>
      <div className="flex items-baseline gap-1 mb-1">
        <span className={cn('font-black tabular-nums', sz.number, style.text)}>{coverage.headcount}</span>
        <span className={cn(sz.label, 'text-slate-500')}>/ {coverage.min}</span>
        {coverage.ideal > coverage.min && (
          <span className={cn(sz.label, 'text-slate-400 ml-1')}>· ideal {coverage.ideal}</span>
        )}
      </div>
      <div className="h-1 rounded-full bg-white/60 overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: style.ringColor }} />
      </div>
      <p className={cn('font-bold uppercase tracking-wide mt-1', sz.label, style.text)}>{style.label}</p>
    </button>
  )
}

/**
 * Compact horizontal strip — useful for COO dashboard at-a-glance.
 */
export function CoverageStrip({ depts, date, shift, onClickDept }: {
  depts: string[]
  date: string
  shift: ShiftType
  onClickDept?: (dept: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {depts.map(dept => (
        <CoverageGauge key={dept} dept={dept} date={date} shift={shift} size="sm"
          onClick={onClickDept ? () => onClickDept(dept) : undefined} />
      ))}
    </div>
  )
}
