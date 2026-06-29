import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useAuditStore } from './useAuditStore'

// ─────────────────────────────────────────────────────────────────────────
// Admin v2 / Phase 6 / M6.4 — Statutory Returns Calendar
//
// Tracks every statutory filing the hospital is legally required to submit:
//   • PF — monthly by 15th
//   • ESI — monthly by 15th
//   • GSTR-1 — monthly by 11th
//   • GSTR-3B — monthly by 20th
//   • TDS — monthly by 7th
//   • Professional Tax — monthly
//   • Trade Licence renewal — annual
//   • Pollution Clearance — annual
//   • Drug Licence (Form 21) — 5-yearly
//   • AERB Licence (Radiology) — 5-yearly
//   • Boiler / Lift inspection — annual
//   • Income Tax advance — quarterly
//
// Each entry: type, due date, status (upcoming/due/filed/late), acknowledgement #.
// ─────────────────────────────────────────────────────────────────────────

export type StatutoryType =
  | 'PF' | 'ESI' | 'GSTR1' | 'GSTR3B' | 'TDS' | 'PT'
  | 'TRADE_LICENCE' | 'POLLUTION' | 'DRUG_LICENCE' | 'AERB' | 'BOILER' | 'LIFT'
  | 'IT_ADVANCE' | 'OTHER'

export type StatutoryStatus = 'upcoming' | 'due_soon' | 'overdue' | 'filed' | 'exempted'

export const STATUTORY_LABEL: Record<StatutoryType, string> = {
  PF:            'Provident Fund (EPF)',
  ESI:           'ESI Contribution',
  GSTR1:         'GSTR-1 (Outward Supplies)',
  GSTR3B:        'GSTR-3B (Summary)',
  TDS:           'TDS Deposit',
  PT:            'Professional Tax',
  TRADE_LICENCE: 'Trade Licence Renewal',
  POLLUTION:     'Pollution Clearance',
  DRUG_LICENCE:  'Drug Licence (Form 21)',
  AERB:          'AERB Radiology Licence',
  BOILER:        'Boiler Inspection',
  LIFT:          'Lift Inspection',
  IT_ADVANCE:    'Income Tax — Advance',
  OTHER:         'Other Return',
}

export const STATUTORY_PERIODICITY: Record<StatutoryType, string> = {
  PF:            'Monthly · 15th',
  ESI:           'Monthly · 15th',
  GSTR1:         'Monthly · 11th',
  GSTR3B:        'Monthly · 20th',
  TDS:           'Monthly · 7th',
  PT:            'Monthly · 20th',
  TRADE_LICENCE: 'Annual',
  POLLUTION:     'Annual',
  DRUG_LICENCE:  '5-yearly',
  AERB:          '5-yearly',
  BOILER:        'Annual',
  LIFT:          'Annual',
  IT_ADVANCE:    'Quarterly',
  OTHER:         '—',
}

export const STATUTORY_AUTHORITY: Record<StatutoryType, string> = {
  PF:            'EPFO',
  ESI:           'ESIC',
  GSTR1:         'GST Network',
  GSTR3B:        'GST Network',
  TDS:           'CBDT / NSDL',
  PT:            'State Commercial Tax',
  TRADE_LICENCE: 'Municipal Corporation',
  POLLUTION:     'State Pollution Control Board',
  DRUG_LICENCE:  'State FDA',
  AERB:          'Atomic Energy Regulatory Board',
  BOILER:        'Directorate of Boilers',
  LIFT:          'Directorate of Electrical Inspection',
  IT_ADVANCE:    'Income Tax Department',
  OTHER:         '—',
}

export interface StatutoryReturn {
  id: string
  type: StatutoryType
  periodLabel: string         // e.g., "April 2026", "Q1 FY26-27"
  dueDate: string             // ISO YYYY-MM-DD
  status: StatutoryStatus
  filedDate?: string
  ackNumber?: string
  amount?: number             // optional ₹ amount filed
  owner: string               // staff responsible (default: ADM-01)
  notes?: string
}

interface StatutoryState {
  entries: StatutoryReturn[]
  markFiled: (id: string, ackNumber: string, amount: number, actorName: string) => void
  markExempted: (id: string, reason: string, actorName: string) => void
  addEntry: (entry: Omit<StatutoryReturn, 'id'>, actorName: string) => string
  // selectors
  getStatusCounts: () => Record<StatutoryStatus, number>
  getNextDueDays: (days: number) => StatutoryReturn[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────
const isoDay = (d: Date) => d.toISOString().split('T')[0]!
const today = () => isoDay(new Date())

// Build a date for "day D of given month/year"
function dueDate(year: number, month: number, day: number): string {
  return isoDay(new Date(year, month - 1, day))
}

// Auto-classify status from due date
function classify(dueIso: string, currentlyFiled: boolean): StatutoryStatus {
  if (currentlyFiled) return 'filed'
  const t = today()
  const diff = Math.round((new Date(dueIso + 'T00:00:00').getTime() - new Date(t + 'T00:00:00').getTime()) / 86400000)
  if (diff < 0) return 'overdue'
  if (diff <= 7) return 'due_soon'
  return 'upcoming'
}

// ─── Seed: 12 rolling months of monthly returns + annual + 5-yearly ──────
function buildSeed(): StatutoryReturn[] {
  const out: StatutoryReturn[] = []
  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1   // 1-12

  // Monthly returns for the past 6 + next 6 months
  for (let offset = -6; offset <= 6; offset++) {
    const targetMonth = curMonth + offset
    const yearAdjust = Math.floor((targetMonth - 1) / 12)
    const year = curYear + yearAdjust
    const month = ((targetMonth - 1) % 12 + 12) % 12 + 1
    const periodLabel = new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

    const monthly: Array<[StatutoryType, number]> = [
      ['TDS', 7],
      ['GSTR1', 11],
      ['PF', 15],
      ['ESI', 15],
      ['GSTR3B', 20],
      ['PT', 20],
    ]
    for (const [type, day] of monthly) {
      // Skip future months beyond next 2
      if (offset > 2) continue
      const dueIso = dueDate(year, month, day)
      const filed = offset <= -1   // returns from past months are filed
      out.push({
        id: `STAT-${type}-${year}-${String(month).padStart(2, '0')}`,
        type, periodLabel, dueDate: dueIso,
        status: classify(dueIso, filed),
        filedDate: filed ? dueDate(year, month, day - 1) : undefined,
        ackNumber: filed ? `${type}-${year}${String(month).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}` : undefined,
        amount: filed ? estimateAmount(type) : undefined,
        owner: 'ADM-01',
      })
    }
  }

  // Quarterly: Income Tax Advance
  const quarters: Array<[string, { y: number; m: number; d: number }]> = [
    ['Q1 FY26-27', { y: 2026, m: 6, d: 15 }],
    ['Q2 FY26-27', { y: 2026, m: 9, d: 15 }],
    ['Q3 FY26-27', { y: 2026, m: 12, d: 15 }],
    ['Q4 FY26-27', { y: 2027, m: 3, d: 15 }],
  ]
  for (const [periodLabel, { y, m, d }] of quarters) {
    const dueIso = dueDate(y, m, d)
    const filed = dueIso < today()
    out.push({
      id: `STAT-IT_ADVANCE-${y}-${m}`,
      type: 'IT_ADVANCE', periodLabel, dueDate: dueIso,
      status: classify(dueIso, filed),
      filedDate: filed ? dueDate(y, m, d - 2) : undefined,
      ackNumber: filed ? `ITA-${y}-${m}-${Math.floor(Math.random() * 9000 + 1000)}` : undefined,
      amount: filed ? 1200000 : undefined,
      owner: 'ADM-01',
    })
  }

  // Annual: Trade Licence, Pollution, Boiler, Lift
  const annual: Array<[StatutoryType, string, { y: number; m: number; d: number }]> = [
    ['TRADE_LICENCE', 'FY 2026-27', { y: 2027, m: 3, d: 31 }],
    ['POLLUTION',     '2026-27 cycle', { y: 2026, m: 12, d: 31 }],
    ['BOILER',        'Annual 2026', { y: 2026, m: 8, d: 15 }],
    ['LIFT',          'Annual 2026', { y: 2026, m: 9, d: 30 }],
  ]
  for (const [type, periodLabel, { y, m, d }] of annual) {
    const dueIso = dueDate(y, m, d)
    out.push({
      id: `STAT-${type}-${y}`,
      type, periodLabel, dueDate: dueIso,
      status: classify(dueIso, false),
      owner: 'ADM-01',
    })
  }

  // 5-yearly: Drug Licence, AERB
  const fiveYearly: Array<[StatutoryType, string, { y: number; m: number; d: number }]> = [
    ['DRUG_LICENCE', '2026-31', { y: 2026, m: 11, d: 30 }],
    ['AERB',         '2026-31', { y: 2026, m: 7, d: 15 }],
  ]
  for (const [type, periodLabel, { y, m, d }] of fiveYearly) {
    const dueIso = dueDate(y, m, d)
    out.push({
      id: `STAT-${type}-${y}`,
      type, periodLabel, dueDate: dueIso,
      status: classify(dueIso, false),
      owner: 'ADM-01',
    })
  }

  return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

// Plausible filing amounts for the seed
function estimateAmount(type: StatutoryType): number {
  switch (type) {
    case 'PF':     return 480000   // ~₹4.8L PF per month for 40 staff
    case 'ESI':    return 65000
    case 'GSTR1':  return 0        // GSTR-1 is summary not payment
    case 'GSTR3B': return 285000   // GST liability
    case 'TDS':    return 320000   // TDS on salaries
    case 'PT':     return 9800     // Professional tax
    default:       return 0
  }
}

export const useStatutoryStore = create<StatutoryState>()(
  persist(
    (set, get) => ({
      entries: buildSeed(),

      markFiled: (id, ackNumber, amount, actorName) => {
        const entry = get().entries.find(e => e.id === id)
        if (!entry) return
        set(s => ({
          entries: s.entries.map(e => e.id === id ? {
            ...e, status: 'filed' as const,
            filedDate: today(), ackNumber, amount,
          } : e),
        }))
        useAuditStore.getState().log({
          userId: 'ADM-01', userName: actorName,
          action: 'finance_period_closed',
          resource: 'statutory_return', resourceId: id,
          detail: `${STATUTORY_LABEL[entry.type]} · ${entry.periodLabel} filed · ack ${ackNumber}${amount ? ` · ₹${amount.toLocaleString('en-IN')}` : ''}`,
        })
      },

      markExempted: (id, reason, actorName) => {
        const entry = get().entries.find(e => e.id === id)
        if (!entry) return
        set(s => ({
          entries: s.entries.map(e => e.id === id ? {
            ...e, status: 'exempted' as const, notes: reason,
          } : e),
        }))
        useAuditStore.getState().log({
          userId: 'ADM-01', userName: actorName,
          action: 'finance_period_closed',
          resource: 'statutory_return', resourceId: id,
          detail: `${STATUTORY_LABEL[entry.type]} · ${entry.periodLabel} exempted · ${reason}`,
        })
      },

      addEntry: (entry, actorName) => {
        const id = `STAT-${entry.type}-${Date.now()}`
        const e: StatutoryReturn = { ...entry, id }
        set(s => ({ entries: [...s.entries, e].sort((a, b) => a.dueDate.localeCompare(b.dueDate)) }))
        useAuditStore.getState().log({
          userId: 'ADM-01', userName: actorName,
          action: 'finance_period_closed',
          resource: 'statutory_return', resourceId: id,
          detail: `Added ${STATUTORY_LABEL[entry.type]} · ${entry.periodLabel} due ${entry.dueDate}`,
        })
        return id
      },

      getStatusCounts: () => {
        const counts: Record<StatutoryStatus, number> = {
          upcoming: 0, due_soon: 0, overdue: 0, filed: 0, exempted: 0,
        }
        for (const e of get().entries) {
          // Re-classify on read so date drift is reflected
          const live = e.status === 'filed' || e.status === 'exempted' ? e.status : classify(e.dueDate, false)
          counts[live]++
        }
        return counts
      },

      getNextDueDays: (days) => {
        const t = today()
        const limit = isoDay(new Date(Date.now() + days * 86400000))
        return get().entries
          .filter(e => e.status !== 'filed' && e.status !== 'exempted' && e.dueDate >= t && e.dueDate <= limit)
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      },
    }),
    {
      name: 'agentix-statutory', version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
)
