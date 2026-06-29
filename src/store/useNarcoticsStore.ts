import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Controlled-substance (Schedule H1/X) register. Dispensing a scheduled drug
// auto-appends a dual-signature entry (NDPS-style audit). Physical register still
// required in reality — this is the digital mirror.
export type NarcoticEntry = {
  id: string
  drug: string
  date: string
  time: string
  patient: string
  patientId: string
  dose: string
  prescriber: string
  dispenser: string
  secondSignatory: string
  batchNo: string
  runningStock: number
}

const SEED: NarcoticEntry[] = [
  { id: 'N-001', drug: 'Morphine 10mg/mL', date: '2026-05-26', time: '08:30', patient: 'Kiran Patil', patientId: 'PT-20394', dose: '5mg IV', prescriber: 'Dr. Priya Nair', dispenser: 'Ritu Sharma', secondSignatory: 'Dr. Priya Nair', batchNo: 'BTH-20240501-M', runningStock: 13 },
  { id: 'N-002', drug: 'Morphine 10mg/mL', date: '2026-05-26', time: '12:30', patient: 'Mohan Lal', patientId: 'PT-20398', dose: '5mg IV', prescriber: 'Dr. Vikram Rathore', dispenser: 'Ritu Sharma', secondSignatory: 'Dr. Vikram Rathore', batchNo: 'BTH-20240501-M', runningStock: 12 },
]

interface NarcoticsState {
  log: NarcoticEntry[]
  addEntry: (e: Omit<NarcoticEntry, 'id'>) => void
}

let _seq = 0
export const useNarcoticsStore = create<NarcoticsState>()(persist((set) => ({
  log: SEED,
  addEntry: (e) => set(s => ({ log: [{ ...e, id: `N-${Date.now()}-${++_seq}` }, ...s.log] })),
}),
  {
    name: 'agentix-narcoticsstore', version: 1,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))
