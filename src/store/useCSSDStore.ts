import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useAuditStore } from './useAuditStore'

export type SterilizationMethod = 'Autoclave' | 'ETO' | 'Plasma' | 'Chemical'
export type CycleStatus = 'pending' | 'running' | 'passed' | 'failed'
export type InstrumentStatus = 'clean' | 'dirty' | 'sterilizing' | 'ready' | 'in_use'

export interface SterilizationCycle {
  id: string
  batchNumber: string
  method: SterilizationMethod
  startedAt: string
  completedAt?: string
  status: CycleStatus
  operatorId: string
  operatorName?: string
  instrumentIds: string[]
  assignedTo?: string
  biologicalIndicator?: boolean | null   // null = pending, true = pass, false = fail
  chemicalIndicatorPass?: boolean
  failureNote?: string
}

export interface Instrument {
  id: string
  name: string
  category: string
  quantity: number
  status: InstrumentStatus
  lastSterilizedAt?: string
  currentCycleId?: string
  assignedOT?: string
}

interface CSSDState {
  cycles: SterilizationCycle[]
  instruments: Instrument[]
  addCycle: (c: Omit<SterilizationCycle, 'id'>) => void
  updateCycle: (id: string, update: Partial<SterilizationCycle>) => void
  updateInstrument: (id: string, update: Partial<Instrument>) => void
  // Start a new sterilization batch — assigns selected instruments, flips them to 'sterilizing'.
  startCycle: (input: { method: SterilizationMethod; instrumentIds: string[]; operatorId: string; operatorName?: string }) => string
  // Mark cycle as passed/failed — flips instruments ready or back to dirty, fires audit.
  completeCycle: (cycleId: string, opts: { biPass: boolean; chemPass?: boolean; note?: string }) => void
  // Mark BI result post-completion (some labs report BI 24h later).
  updateBiologicalIndicator: (cycleId: string, pass: boolean) => void
}

const INSTRUMENTS: Instrument[] = [
  { id: 'INS-001', name: 'Scalpel Handle No.3', category: 'General Surgery', quantity: 12, status: 'ready', lastSterilizedAt: '2026-05-29T06:00:00Z' },
  { id: 'INS-002', name: 'Mosquito Forceps', category: 'General Surgery', quantity: 24, status: 'sterilizing', currentCycleId: 'CYC-001' },
  { id: 'INS-003', name: 'Laparoscope 10mm', category: 'Laparoscopy', quantity: 4, status: 'in_use', assignedOT: 'OT-2' },
  { id: 'INS-004', name: 'Retractor Set', category: 'General Surgery', quantity: 6, status: 'dirty' },
  { id: 'INS-005', name: 'Endoscope Biopsy Forceps', category: 'Endoscopy', quantity: 8, status: 'ready', lastSterilizedAt: '2026-05-29T07:00:00Z' },
  { id: 'INS-006', name: 'TKR Tray',                category: 'Orthopaedic', quantity: 1, status: 'dirty' },
  { id: 'INS-007', name: 'Suction Cannulas',        category: 'General Surgery', quantity: 18, status: 'clean' },
]

const CYCLES: SterilizationCycle[] = [
  { id: 'CYC-001', batchNumber: 'BATCH-20260530-01', method: 'Autoclave',
    startedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    status: 'running', operatorId: 'CS-1301', operatorName: 'Rajesh Yadav', instrumentIds: ['INS-002'],
    biologicalIndicator: null, chemicalIndicatorPass: true },
  { id: 'CYC-002', batchNumber: 'BATCH-20260530-02', method: 'Plasma',
    startedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    completedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    status: 'passed', operatorId: 'CS-1301', operatorName: 'Rajesh Yadav', instrumentIds: ['INS-005'],
    biologicalIndicator: true, chemicalIndicatorPass: true },
]

const seq = { n: 3 }

export const useCSSDStore = create<CSSDState>()(persist((set, get) => ({
  cycles: CYCLES,
  instruments: INSTRUMENTS,

  addCycle: (c) =>
    set((state) => ({ cycles: [{ ...c, id: `CYC-${Date.now()}` }, ...state.cycles] })),

  updateCycle: (id, update) =>
    set((state) => ({ cycles: state.cycles.map((c) => c.id === id ? { ...c, ...update } : c) })),

  updateInstrument: (id, update) =>
    set((state) => ({ instruments: state.instruments.map((i) => i.id === id ? { ...i, ...update } : i) })),

  startCycle: ({ method, instrumentIds, operatorId, operatorName }) => {
    const id = `CYC-${Date.now()}`
    const batchNumber = `BATCH-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(seq.n++).padStart(2,'0')}`
    const startedAt = new Date().toISOString()
    set(state => ({
      cycles: [{
        id, batchNumber, method, startedAt,
        status: 'running' as const,
        operatorId, operatorName, instrumentIds,
        biologicalIndicator: null, chemicalIndicatorPass: undefined,
      }, ...state.cycles],
      instruments: state.instruments.map(i => instrumentIds.includes(i.id)
        ? { ...i, status: 'sterilizing' as const, currentCycleId: id }
        : i),
    }))
    const log = useAuditStore.getState().log
    log({
      userId: operatorId, userName: operatorName ?? 'CSSD Tech',
      action: 'cssd_cycle_started',
      resource: 'sterilization_cycle', resourceId: batchNumber,
      detail: `${method} cycle started · ${instrumentIds.length} instrument set(s)`,
    })
    return id
  },

  completeCycle: (cycleId, { biPass, chemPass, note }) => {
    const cycle = get().cycles.find(c => c.id === cycleId)
    if (!cycle) return
    const completedAt = new Date().toISOString()
    const chemFailed = chemPass === false
    const biFailed = biPass === false
    const passed = !chemFailed && !biFailed
    set(state => ({
      cycles: state.cycles.map(c => c.id !== cycleId ? c : ({
        ...c,
        completedAt,
        status: passed ? 'passed' as const : 'failed' as const,
        biologicalIndicator: biPass,
        chemicalIndicatorPass: chemPass ?? c.chemicalIndicatorPass ?? true,
        failureNote: passed ? undefined : (note ?? 'Indicator failure'),
      })),
      instruments: state.instruments.map(i => cycle.instrumentIds.includes(i.id)
        ? (passed
            ? { ...i, status: 'ready' as const, currentCycleId: undefined, lastSterilizedAt: completedAt }
            : { ...i, status: 'dirty' as const, currentCycleId: undefined })
        : i),
    }))
    const log = useAuditStore.getState().log
    if (passed) {
      log({
        userId: cycle.operatorId, userName: cycle.operatorName ?? 'CSSD Tech',
        action: 'cssd_cycle_passed',
        resource: 'sterilization_cycle', resourceId: cycle.batchNumber,
        detail: `${cycle.method} cycle passed · BI ${biPass === true ? 'pass' : 'pending'} · Chem ${chemFailed ? 'fail' : 'pass'}`,
      })
    } else {
      log({
        userId: cycle.operatorId, userName: cycle.operatorName ?? 'CSSD Tech',
        action: 'cssd_cycle_failed',
        resource: 'sterilization_cycle', resourceId: cycle.batchNumber,
        detail: `${cycle.method} cycle FAILED · ${note ?? 'Indicator failure'} · ${cycle.instrumentIds.length} set(s) re-queued`,
      })
      if (biFailed) {
        log({
          userId: cycle.operatorId, userName: cycle.operatorName ?? 'CSSD Tech',
          action: 'cssd_bi_negative',
          resource: 'sterilization_cycle', resourceId: cycle.batchNumber,
          detail: 'Biological indicator NEGATIVE — recall and re-process batch',
        })
      }
    }
  },

  updateBiologicalIndicator: (cycleId, pass) => {
    const cycle = get().cycles.find(c => c.id === cycleId)
    if (!cycle) return
    set(state => ({
      cycles: state.cycles.map(c => c.id !== cycleId ? c : ({
        ...c,
        biologicalIndicator: pass,
        status: pass ? c.status : 'failed' as const,
      })),
    }))
    if (!pass) {
      useAuditStore.getState().log({
        userId: cycle.operatorId, userName: cycle.operatorName ?? 'CSSD Tech',
        action: 'cssd_bi_negative',
        resource: 'sterilization_cycle', resourceId: cycle.batchNumber,
        detail: 'Biological indicator negative on delayed read — recall instruments',
      })
    }
  },
}),
  {
    name: 'agentix-cssdstore', version: 1,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))
