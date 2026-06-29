import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface Column<T> {
  key: string
  label: string
  className?: string
  render?: (row: T, index: number) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  onRowClick?: (row: T) => void
  emptyState?: ReactNode
  className?: string
}

export function DataTable<T>({ columns, data, keyField, onRowClick, emptyState, className }: DataTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-border bg-surface shadow-card", className)}>
      <table className="w-full text-sm">
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
          {data.length === 0 ? (
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
                className={cn(
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-surface-sunken"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("px-4 py-3.5 text-foreground-muted", col.className)}
                  >
                    {col.render
                      ? col.render(row, i)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
