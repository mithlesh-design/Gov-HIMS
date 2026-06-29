import { cn } from "@/lib/utils"

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("shimmer rounded-md", className)} />
  )
}

interface SkeletonCardProps {
  lines?: number
  className?: string
  showAvatar?: boolean
}

export function SkeletonCard({ lines = 2, className, showAvatar = true }: SkeletonCardProps) {
  return (
    <div className={cn("bg-surface border border-border rounded-2xl p-5 shadow-card", className)}>
      <div className="flex items-center gap-4">
        {showAvatar && <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />}
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-4 w-2/3" />
          {Array.from({ length: Math.max(0, lines - 1) }).map((_, i) => (
            <Skeleton key={i} className={`h-3 ${i % 2 === 0 ? "w-1/2" : "w-3/4"}`} />
          ))}
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  )
}

export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={cn("bg-surface border border-border rounded-2xl p-5 shadow-card", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-11 w-11 rounded-xl flex-shrink-0" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn("bg-surface border border-border rounded-2xl overflow-hidden shadow-card", className)}>
      <div className="bg-surface-sunken border-b border-border px-4 py-3 flex gap-6">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex gap-6">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className={`h-4 flex-1 ${j === 0 ? "max-w-[120px]" : ""}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonList({ count = 3, ...props }: SkeletonCardProps & { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} {...props} />
      ))}
    </div>
  )
}
