import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Not persisted: the 365-day series is seeded relative to "now" and live actions
// bump today's row, so a fresh seed each load keeps the trend correct (persisting
// it would freeze the seed dates and make "Today" drift). User-created data
// (rounds, messages, settings) is persisted in its own stores.

// Per-doctor activity for accountability — viewable by the doctor (own) and
// admin (all doctors). Stored as per-day aggregates so any time window
// (today → year) can be summed cheaply; live actions bump today's row.

export type Metric = 'opd' | 'online' | 'tests' | 'prescriptions' | 'admissions'
export type DayStat = { doctorId: string; date: string; opd: number; online: number; tests: number; prescriptions: number; admissions: number }
export type DoctorRef = { id: string; name: string; department: string }

export const STAT_DOCTORS: DoctorRef[] = [
  { id: 'DR-1012', name: 'Dr. Priya Nair',   department: 'General Medicine' },
  { id: 'DR-1013', name: 'Dr. Rohan Mehta',  department: 'Cardiology' },
  { id: 'DR-1014', name: 'Dr. Ananya Iyer',  department: 'Dermatology' },
  { id: 'DR-1015', name: 'Dr. Vikram Rao',   department: 'ENT' },
]

// Deterministic pseudo-random (same on server & client — avoids hydration drift).
const prand = (seed: number) => { const x = Math.sin(seed) * 10000; return x - Math.floor(x) }
const iso = (d: Date) => d.toISOString().slice(0, 10)

function seedDayStats(): DayStat[] {
  const out: DayStat[] = []
  const now = Date.now()
  for (let d = 0; d < 365; d++) {
    const dt = new Date(now - d * 86400000)
    const date = iso(dt)
    const weekend = dt.getDay() === 0
    STAT_DOCTORS.forEach((doc, di) => {
      const base = [16, 12, 9, 10][di]
      const f = 0.6 + prand(d * 7 + di * 13) * 0.8
      const opd = Math.max(0, Math.round(base * f * (weekend ? 0.4 : 1)))
      const online = Math.round(opd * (0.18 + prand(d + di) * 0.15))
      const tests = Math.round(opd * (0.5 + prand(d * 3 + di) * 0.4))
      const prescriptions = Math.round(opd * 0.82)
      const admissions = prand(d * 11 + di) > 0.82 ? 1 + Math.round(prand(d + di * 5) * 2) : (prand(d * 2 + di) > 0.62 ? 1 : 0)
      out.push({ doctorId: doc.id, date, opd, online, tests, prescriptions, admissions })
    })
  }
  return out
}

// Period → number of days back (for the analytics period selector).
export const PERIODS = [
  { key: 'today', label: 'Today', days: 1 },
  { key: 'yesterday', label: 'Yesterday', days: 1, offset: 1 },
  { key: 'week', label: 'This week', days: 7 },
  { key: 'month', label: 'This month', days: 30 },
  { key: 'quarter', label: 'Quarter', days: 90 },
  { key: 'half', label: 'Half year', days: 182 },
  { key: 'year', label: 'Year', days: 365 },
] as const
export type PeriodKey = typeof PERIODS[number]['key']

export type Totals = { opd: number; online: number; tests: number; prescriptions: number; admissions: number; consults: number }
export type DaySeriesPoint = { date: string; consults: number; opd: number; online: number; tests: number; prescriptions: number }

interface StatsState {
  dayStats: DayStat[]
  record: (doctorId: string, metric: Metric, n?: number) => void
  totalsFor: (doctorId: string | 'all', period: PeriodKey) => Totals
  totalsForRange: (doctorId: string | 'all', startISO: string, endISO: string) => Totals
  seriesFor: (doctorId: string | 'all', fromISO: string, toISO: string) => DaySeriesPoint[]
}

const sumRows = (rows: DayStat[]): Totals => {
  const t: Totals = { opd: 0, online: 0, tests: 0, prescriptions: 0, admissions: 0, consults: 0 }
  for (const r of rows) { t.opd += r.opd; t.online += r.online; t.tests += r.tests; t.prescriptions += r.prescriptions; t.admissions += r.admissions }
  t.consults = t.opd + t.online
  return t
}

function inWindow(date: string, period: PeriodKey): boolean {
  const p = PERIODS.find(x => x.key === period)!
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(date + 'T00:00:00')
  const dayDiff = Math.round((today.getTime() - target.getTime()) / 86400000)
  if (period === 'today') return dayDiff === 0
  if (period === 'yesterday') return dayDiff === 1
  return dayDiff >= 0 && dayDiff < p.days
}

export const useDoctorStatsStore = create<StatsState>()(persist((set, get) => ({
  dayStats: seedDayStats(),

  record: (doctorId, metric, n = 1) =>
    set((s) => {
      const today = iso(new Date())
      const idx = s.dayStats.findIndex(x => x.doctorId === doctorId && x.date === today)
      if (idx >= 0) {
        const copy = [...s.dayStats]
        copy[idx] = { ...copy[idx], [metric]: copy[idx][metric] + n }
        return { dayStats: copy }
      }
      const fresh: DayStat = { doctorId, date: today, opd: 0, online: 0, tests: 0, prescriptions: 0, admissions: 0, [metric]: n }
      return { dayStats: [fresh, ...s.dayStats] }
    }),

  totalsFor: (doctorId, period) =>
    sumRows(get().dayStats.filter(x => (doctorId === 'all' || x.doctorId === doctorId) && inWindow(x.date, period))),

  totalsForRange: (doctorId, startISO, endISO) => {
    const [lo, hi] = startISO <= endISO ? [startISO, endISO] : [endISO, startISO]
    return sumRows(get().dayStats.filter(x => (doctorId === 'all' || x.doctorId === doctorId) && x.date >= lo && x.date <= hi))
  },

  seriesFor: (doctorId, fromISO, toISO) => {
    const [lo, hi] = fromISO <= toISO ? [fromISO, toISO] : [toISO, fromISO]
    const rows = get().dayStats.filter(x => (doctorId === 'all' || x.doctorId === doctorId) && x.date >= lo && x.date <= hi)
    const byDate = new Map<string, { opd: number; online: number; tests: number; prescriptions: number }>()
    for (const r of rows) {
      const e = byDate.get(r.date) ?? { opd: 0, online: 0, tests: 0, prescriptions: 0 }
      e.opd += r.opd; e.online += r.online; e.tests += r.tests; e.prescriptions += r.prescriptions
      byDate.set(r.date, e)
    }
    const out: DaySeriesPoint[] = []
    const d = new Date(lo + 'T00:00:00'); const end = new Date(hi + 'T00:00:00')
    while (d <= end) {
      const key = iso(d)
      const e = byDate.get(key) ?? { opd: 0, online: 0, tests: 0, prescriptions: 0 }
      out.push({ date: key, consults: e.opd + e.online, opd: e.opd, online: e.online, tests: e.tests, prescriptions: e.prescriptions })
      d.setDate(d.getDate() + 1)
    }
    return out
  },
}),
  {
    name: 'agentix-doctorstatsstore', version: 1,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))
