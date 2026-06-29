import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Quality Control store. Tracks Levey-Jennings runs per analyzer/level/analyte,
// evaluates Westgard rules on each new run, and surfaces active violations that
// gate release on the bench until cleared or supervisor-overridden.

export type AnalyzerId = 'Sysmex XN-550' | 'Roche c311' | 'Abbott i1000SR' | 'Sysmex UN-2000'
export type QCLevel = 'L1' | 'L2' | 'L3'
export type WestgardRule = '1-2s' | '1-3s' | '2-2s' | 'R-4s' | '4-1s' | '10-x'

export type QCRun = {
  id: string
  analyzer: AnalyzerId
  level: QCLevel
  analyte: string
  value: number
  mean: number
  sd: number
  at: string
}

export type Violation = {
  rule: WestgardRule
  severity: 'warn' | 'reject'
  at: string
  runId: string
  note: string
}

export type Override = {
  analyzer: AnalyzerId
  by: string
  at: string
  reason: string
}

export const ANALYZERS: AnalyzerId[] = ['Sysmex XN-550', 'Roche c311', 'Abbott i1000SR', 'Sysmex UN-2000']

// ─── Westgard evaluation ──────────────────────────────────────────────────

const z = (r: QCRun) => (r.value - r.mean) / r.sd

export function evaluateWestgard(allRuns: QCRun[], newRun: QCRun): Violation[] {
  const same = allRuns.filter(r =>
    r.analyzer === newRun.analyzer && r.analyte === newRun.analyte && r.level === newRun.level && r.id !== newRun.id
  )
  const sequence = [...same, newRun]
  const violations: Violation[] = []
  const zNew = z(newRun)

  // 1-3s: any single run with |z| > 3 (reject)
  if (Math.abs(zNew) > 3) {
    violations.push({ rule: '1-3s', severity: 'reject', at: newRun.at, runId: newRun.id,
      note: `${newRun.analyte} (${newRun.level}) value ${newRun.value} — ${zNew.toFixed(2)}σ from mean ${newRun.mean}` })
  } else if (Math.abs(zNew) > 2) {
    violations.push({ rule: '1-2s', severity: 'warn', at: newRun.at, runId: newRun.id,
      note: `${newRun.analyte} (${newRun.level}) value ${newRun.value} — ${zNew.toFixed(2)}σ from mean ${newRun.mean} (warning)` })
  }

  // 2-2s: last 2 runs both > 2 SD same side (reject)
  if (sequence.length >= 2) {
    const last2 = sequence.slice(-2)
    if (last2.every(r => z(r) > 2) || last2.every(r => z(r) < -2)) {
      violations.push({ rule: '2-2s', severity: 'reject', at: newRun.at, runId: newRun.id,
        note: `Last 2 ${newRun.analyte} runs both >2σ same side — systematic shift` })
    }
  }

  // 10-x: last 10 runs all on same side of mean (reject — trend)
  if (sequence.length >= 10) {
    const last10 = sequence.slice(-10)
    if (last10.every(r => z(r) > 0) || last10.every(r => z(r) < 0)) {
      violations.push({ rule: '10-x', severity: 'reject', at: newRun.at, runId: newRun.id,
        note: `Last 10 ${newRun.analyte} runs all same side of mean — trend` })
    }
  }

  return violations
}

// ─── Seed ────────────────────────────────────────────────────────────────

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 3600_000).toISOString()

let _qcSeq = 0
const nextQCId = () => `QC-${Date.now()}-${++_qcSeq}`

const SEED_RUNS: QCRun[] = [
  // Sysmex XN-550 (CBC) — WBC L2 clean
  { id: 'QC-001', analyzer: 'Sysmex XN-550', level: 'L2', analyte: 'WBC', value: 7400, mean: 7500, sd: 500, at: daysAgo(2) },
  { id: 'QC-002', analyzer: 'Sysmex XN-550', level: 'L2', analyte: 'WBC', value: 7700, mean: 7500, sd: 500, at: daysAgo(1) },
  { id: 'QC-003', analyzer: 'Sysmex XN-550', level: 'L2', analyte: 'WBC', value: 7600, mean: 7500, sd: 500, at: hoursAgo(8) },
  { id: 'QC-004', analyzer: 'Sysmex XN-550', level: 'L2', analyte: 'WBC', value: 7300, mean: 7500, sd: 500, at: hoursAgo(2) },

  // Roche c311 — Creatinine L2; final run synthetic 1-3s violation
  { id: 'QC-101', analyzer: 'Roche c311', level: 'L2', analyte: 'Creatinine', value: 0.98, mean: 1.0, sd: 0.05, at: daysAgo(3) },
  { id: 'QC-102', analyzer: 'Roche c311', level: 'L2', analyte: 'Creatinine', value: 1.02, mean: 1.0, sd: 0.05, at: daysAgo(2) },
  { id: 'QC-103', analyzer: 'Roche c311', level: 'L2', analyte: 'Creatinine', value: 0.99, mean: 1.0, sd: 0.05, at: daysAgo(1) },
  { id: 'QC-104', analyzer: 'Roche c311', level: 'L2', analyte: 'Creatinine', value: 1.01, mean: 1.0, sd: 0.05, at: hoursAgo(12) },
  { id: 'QC-105', analyzer: 'Roche c311', level: 'L2', analyte: 'Creatinine', value: 1.04, mean: 1.0, sd: 0.05, at: hoursAgo(8) },
  { id: 'QC-106', analyzer: 'Roche c311', level: 'L2', analyte: 'Creatinine', value: 0.97, mean: 1.0, sd: 0.05, at: hoursAgo(4) },
  // 1-3s violation (z = +5)
  { id: 'QC-107', analyzer: 'Roche c311', level: 'L2', analyte: 'Creatinine', value: 1.25, mean: 1.0, sd: 0.05, at: hoursAgo(2) },

  // Abbott i1000SR — TSH L2 clean
  { id: 'QC-201', analyzer: 'Abbott i1000SR', level: 'L2', analyte: 'TSH', value: 2.1, mean: 2.0, sd: 0.2, at: daysAgo(1) },
  { id: 'QC-202', analyzer: 'Abbott i1000SR', level: 'L2', analyte: 'TSH', value: 1.95, mean: 2.0, sd: 0.2, at: hoursAgo(6) },
  { id: 'QC-203', analyzer: 'Abbott i1000SR', level: 'L2', analyte: 'TSH', value: 2.05, mean: 2.0, sd: 0.2, at: hoursAgo(1) },

  // Sysmex UN-2000 — urine WBC L2 clean
  { id: 'QC-301', analyzer: 'Sysmex UN-2000', level: 'L2', analyte: 'WBC', value: 8, mean: 8, sd: 1, at: daysAgo(1) },
  { id: 'QC-302', analyzer: 'Sysmex UN-2000', level: 'L2', analyte: 'WBC', value: 7, mean: 8, sd: 1, at: hoursAgo(5) },
  { id: 'QC-303', analyzer: 'Sysmex UN-2000', level: 'L2', analyte: 'WBC', value: 9, mean: 8, sd: 1, at: hoursAgo(1) },
]

const SEED_VIOLATIONS: Record<string, Violation[]> = {
  'Roche c311': [
    { rule: '1-3s', severity: 'reject', at: hoursAgo(2), runId: 'QC-107',
      note: 'Creatinine (L2) value 1.25 — 5.00σ from mean 1 — REJECT, repeat after recal' }
  ],
}

// ─── Store ───────────────────────────────────────────────────────────────

interface QCState {
  runs: QCRun[]
  violations: Record<string, Violation[]>
  overrides: Override[]
  addRun: (r: Omit<QCRun, 'id' | 'at'>) => void
  override: (analyzer: AnalyzerId, by: string, reason: string) => void
  clear: (analyzer: AnalyzerId) => void
}

export const useLabQCStore = create<QCState>()(persist((set, get) => ({
  runs: SEED_RUNS,
  violations: SEED_VIOLATIONS,
  overrides: [],

  addRun: (r) => {
    const newRun: QCRun = { ...r, id: nextQCId(), at: new Date().toISOString() }
    set(s => ({ runs: [...s.runs, newRun] }))
    const newViolations = evaluateWestgard(get().runs, newRun)
    if (newViolations.length > 0) {
      set(s => ({
        violations: {
          ...s.violations,
          [r.analyzer]: [...(s.violations[r.analyzer] ?? []), ...newViolations],
        },
      }))
    }
  },

  override: (analyzer, by, reason) => {
    set(s => ({
      overrides: [...s.overrides, { analyzer, by, reason, at: new Date().toISOString() }],
      violations: { ...s.violations, [analyzer]: [] },
    }))
  },

  clear: (analyzer) => {
    set(s => ({ violations: { ...s.violations, [analyzer]: [] } }))
  },
}),
  {
    name: 'agentix-labqcstore', version: 1,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))

// Convenience selector: does this analyzer have active rejection-level violations?
export function isBlocked(analyzer: string | undefined, violations: Record<string, Violation[]>): boolean {
  if (!analyzer) return false
  return (violations[analyzer] ?? []).some(v => v.severity === 'reject')
}
