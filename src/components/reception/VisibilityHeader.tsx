"use client"

// Header for reception "visibility" pages — read-only windows into another
// desk's module. No cross-role link (RoleGuard would bounce a receptionist);
// instead a live "synced with …" indicator makes the data provenance clear.
export function VisibilityHeader({ title, subtitle, owner }: { title: string; subtitle: string; owner: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h1 className="text-[24px] font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Live · synced with {owner}
      </span>
    </div>
  )
}

export const STAT_CARD = "rounded-2xl bg-white shadow-[0_1px_4px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] p-4"
