"use client"

import { useState } from "react"
import { Users, Building2, Video, FlaskConical, Pill, BedDouble, Activity, CalendarRange, TrendingUp } from "lucide-react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { useDoctorStatsStore, PERIODS, type PeriodKey } from "@/store/useDoctorStatsStore"
import { useAuthStore } from "@/store/useAuthStore"
import { ClientOnly } from "@/components/ClientOnly"
import { cn } from "@/lib/utils"
import { DaySummaryCard } from "@/components/doctor/DaySummaryCard"

const GRAPH_DAYS: Record<PeriodKey, number> = { today: 7, yesterday: 7, week: 7, month: 30, quarter: 90, half: 182, year: 365 }

const CARD = "rounded-2xl bg-white shadow-[0_1px_4px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)]"
const isoDay = (d: Date) => d.toISOString().slice(0, 10)
const fmtDay = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export default function DoctorAnalytics() {
  const currentUser = useAuthStore(s => s.currentUser)
  const totalsFor = useDoctorStatsStore(s => s.totalsFor)
  const totalsForRange = useDoctorStatsStore(s => s.totalsForRange)
  const [period, setPeriod] = useState<PeriodKey>('today')
  const [custom, setCustom] = useState(false)
  const [range, setRange] = useState({ from: isoDay(new Date(Date.now() - 29 * 86400000)), to: isoDay(new Date()) })
  const doctorId = currentUser?.id ?? 'DR-1012'
  const seriesFor = useDoctorStatsStore(s => s.seriesFor)
  const t = custom ? totalsForRange(doctorId, range.from, range.to) : totalsFor(doctorId, period)
  const periodLabel = custom ? `${fmtDay(range.from)} – ${fmtDay(range.to)}` : (PERIODS.find(p => p.key === period)?.label ?? '')

  const gFrom = custom ? range.from : isoDay(new Date(Date.now() - (GRAPH_DAYS[period] - 1) * 86400000))
  const gTo = custom ? range.to : isoDay(new Date())
  const series = seriesFor(doctorId, gFrom, gTo)
  const tickFmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  const tiles = [
    { label: 'Total consultations', value: t.consults, icon: Users, tint: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]' },
    { label: 'In-person (OPD)', value: t.opd, icon: Building2, tint: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]' },
    { label: 'Online consults', value: t.online, icon: Video, tint: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]' },
    { label: 'Tests ordered', value: t.tests, icon: FlaskConical, tint: 'bg-rose-50 text-rose-600' },
    { label: 'Prescriptions', value: t.prescriptions, icon: Pill, tint: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]' },
    { label: 'Admissions', value: t.admissions, icon: BedDouble, tint: 'bg-amber-50 text-amber-600' },
  ]

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* M4-W1 — S15: Day-in-Review explainable narration. */}
      <div className="mb-4">
        <DaySummaryCard doctorId={doctorId} doctorName={currentUser?.name ?? 'Dr. Priya Nair'} />
      </div>
      <div className="mb-4">
        <h1 className="text-[24px] font-bold text-slate-900 tracking-tight">My Activity</h1>
        <p className="text-[13px] text-slate-500 mt-1">{currentUser?.name} · {currentUser?.id} — your consultation & ordering record, for accountability.</p>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100 w-fit">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => { setCustom(false); setPeriod(p.key) }}
              className={cn("px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition", !custom && period === p.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              {p.label}
            </button>
          ))}
          <button onClick={() => setCustom(true)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition", custom ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            <CalendarRange className="h-3.5 w-3.5" /> Custom
          </button>
        </div>

        {custom && (
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-1.5 shadow-sm">
            <input type="date" value={range.from} max={range.to} onChange={e => setRange(r => ({ ...r, from: e.target.value }))}
              className="text-[12.5px] font-medium text-slate-700 outline-none bg-transparent" aria-label="From date" />
            <span className="text-slate-300">→</span>
            <input type="date" value={range.to} min={range.from} max={isoDay(new Date())} onChange={e => setRange(r => ({ ...r, to: e.target.value }))}
              className="text-[12.5px] font-medium text-slate-700 outline-none bg-transparent" aria-label="To date" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {tiles.map(tile => (
          <div key={tile.label} className={cn(CARD, "p-5")}>
            <div className="flex items-center justify-between">
              <span className={cn("h-10 w-10 rounded-2xl flex items-center justify-center", tile.tint)}><tile.icon className="h-5 w-5" /></span>
            </div>
            <p className="text-[30px] font-bold text-slate-900 mt-3 leading-none tabular-nums">{tile.value.toLocaleString('en-IN')}</p>
            <p className="text-[12.5px] font-semibold text-slate-500 mt-1.5">{tile.label}</p>
          </div>
        ))}
      </div>

      {/* Performance trend */}
      <div className={cn(CARD, "p-5 mt-4")}>
        <div className="flex items-center gap-2 mb-3"><TrendingUp className="h-4.5 w-4.5 text-[var(--color-primary)]" /><h3 className="text-[15px] font-bold text-slate-900">Performance trend · {periodLabel}</h3></div>
        <ClientOnly fallback={<div className="h-[260px] flex items-center justify-center"><div className="h-7 w-7 rounded-full border-4 border-[rgba(8,145,178,0.20)] border-t-blue-600 animate-spin" /></div>}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={series} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="date" tickFormatter={tickFmt} minTickGap={36} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip labelFormatter={(d) => tickFmt(d as string)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="consults" name="Consultations" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="tests" name="Tests" stroke="#16A34A" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="prescriptions" name="Prescriptions" stroke="#64748B" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ClientOnly>
      </div>

      <div className={cn(CARD, "p-5 mt-4")}>
        <div className="flex items-center gap-2 mb-2"><Activity className="h-4.5 w-4.5 text-slate-400" /><h3 className="text-[15px] font-bold text-slate-900">Consultation mix · {periodLabel}</h3></div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[12.5px] font-semibold text-slate-500 w-24">In-person</span>
          <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[rgba(8,145,178,0.07)]0" style={{ width: `${t.consults ? (t.opd / t.consults) * 100 : 0}%` }} /></div>
          <span className="text-[12.5px] font-bold text-slate-700 w-10 text-right">{t.opd}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12.5px] font-semibold text-slate-500 w-24">Online</span>
          <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[rgba(8,145,178,0.07)]0" style={{ width: `${t.consults ? (t.online / t.consults) * 100 : 0}%` }} /></div>
          <span className="text-[12.5px] font-bold text-slate-700 w-10 text-right">{t.online}</span>
        </div>
        <p className="text-[11.5px] text-slate-400 mt-3">Live — completing a consultation, ordering tests, prescribing or admitting updates today&apos;s figures instantly.</p>
      </div>
    </div>
  )
}
