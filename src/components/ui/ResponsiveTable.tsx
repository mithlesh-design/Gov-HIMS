import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface ResponsiveColumn<T> {
  key: string
  label: string
  className?: string
  render?: (row: T, index: number) => ReactNode
  /** Hide this column's label/value in the mobile card view. */
  hideOnMobile?: boolean
  /** Use this column as the card title in mobile view (first such column wins). */
  primary?: boolean
}

interface ResponsiveTableProps<T> {
  columns: ResponsiveColumn<T>[]
  data: T[]
  keyField: keyof T
  onRowClick?: (row: T) => void
  emptyState?: ReactNode
  className?: string
  /** Accessible caption for the table (screen-reader only). */
  caption?: string
}

function cellValue<T>(col: ResponsiveColumn<T>, row: T, i: number): ReactNode {
  return col.render ? col.render(row, i) : String((row as Record<string, unknown>)[col.key] ?? "")
}

/**
 * Mobile-first data table: a real <table> at md+ (semantic, scannable) and a
 * stacked card list below md — no more horizontal overflow on phones.
 * API mirrors DataTable so existing tables migrate with minimal churn.
 */
export function ResponsiveTable<T>({
  columns,
  data,
  keyField,
  onRowClick,
  emptyState,
  className,
  caption,
}: ResponsiveTableProps<T>) {
  const primaryCol = columns.find((c) => c.primary) ?? columns[0]
  const isEmpty = data.length === 0

  return (
    <div className={cn("rounded-2xl border border-border bg-surface shadow-card overflow-hidden", className)}>
      {/* ── Desktop / tablet: table ─────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-surface-sunken border-b border-border">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3.5 text-left t-overline text-foreground-lighter whitespace-nowrap",
                    col.className
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {isEmpty ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-foreground-placeholder">
                  {emptyState ?? <span className="t-body">No data</span>}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={String(row[keyField])}
                  onClick={() => onRowClick?.(row)}
                  className={cn("transition-colors", onRowClick && "cursor-pointer hover:bg-surface-sunken")}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3.5 text-foreground-muted", col.className)}>
                      {cellValue(col, row, i)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile: stacked cards ───────────────────────────── */}
      <div className="md:hidden divide-y divide-border-light">
        {isEmpty ? (
          <div className="py-12 text-center text-foreground-placeholder">
            {emptyState ?? <span className="t-body">No data</span>}
          </div>
        ) : (
          data.map((row, i) => (
            <button
              key={String(row[keyField])}
              type="button"
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "w-full text-left p-4 flex flex-col gap-2",
                onRowClick && "hover:bg-surface-sunken transition-colors"
              )}
            >
              <div className="t-title text-foreground">{cellValue(primaryCol, row, i)}</div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {columns
                  .filter((c) => c !== primaryCol && !c.hideOnMobile)
                  .map((col) => (
                    <div key={col.key} className="min-w-0">
                      <dt className="t-caption text-foreground-lighter">{col.label}</dt>
                      <dd className="t-body text-foreground-muted truncate">{cellValue(col, row, i)}</dd>
                    </div>
                  ))}
              </dl>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
