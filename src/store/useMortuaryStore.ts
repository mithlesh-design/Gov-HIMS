import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useAuditStore } from './useAuditStore'

export type LegalClearanceStatus = 'pending' | 'mlc' | 'cleared' | 'released'
export type CauseOfDeath = 'Natural' | 'Accidental' | 'Suicide' | 'Homicide' | 'Unknown' | 'Under Investigation'

export interface DeceasedRecord {
  id: string
  patientId: string
  patientName: string
  age: number
  gender: 'M' | 'F' | 'Other'
  ward: string
  bedNumber: string
  timeOfDeath: string
  certifiedBy: string
  causeOfDeath: CauseOfDeath
  isMLC: boolean
  mlcNumber?: string
  policeStation?: string
  bodySlot: number
  legalClearance: LegalClearanceStatus
  deathCertificateNumber?: string
  releasedTo?: string
  releasedAt?: string
  autopsyRequired?: boolean
  autopsyCompletedAt?: string
}

interface MortuaryState {
  records: DeceasedRecord[]
  totalSlots: number
  addRecord: (r: Omit<DeceasedRecord, 'id'>) => void
  updateRecord: (id: string, update: Partial<DeceasedRecord>) => void
  availableSlots: () => number
  receiveBody: (r: Omit<DeceasedRecord, 'id'>, actorName: string) => string
  issueDeathCertificate: (id: string, actorName: string) => void
  clearMLC: (id: string, actorName: string, autopsyComplete?: boolean) => void
  releaseBody: (id: string, releasedTo: string, actorName: string) => void
}

const RECORDS: DeceasedRecord[] = [
  { id: 'MRT-001', patientId: 'PT-19001', patientName: 'Ramchandra Sharma', age: 78, gender: 'M', ward: 'ICU', bedNumber: 'ICU-5', timeOfDeath: '2026-05-09T03:22:00Z', certifiedBy: 'Dr. Vikram Rathore', causeOfDeath: 'Natural', isMLC: false, bodySlot: 1, legalClearance: 'cleared', deathCertificateNumber: 'DC-2026-0512' },
  { id: 'MRT-002', patientId: 'PT-19045', patientName: 'Unknown Male', age: 35, gender: 'M', ward: 'Emergency', bedNumber: 'ER-2', timeOfDeath: '2026-05-09T06:10:00Z', certifiedBy: 'Dr. Vikram Rathore', causeOfDeath: 'Accidental', isMLC: true, mlcNumber: 'MLC-2026-0234', policeStation: 'Andheri PS', bodySlot: 2, legalClearance: 'mlc', autopsyRequired: true },
]

export const useMortuaryStore = create<MortuaryState>()(persist((set, get) => ({
  records: RECORDS,
  totalSlots: 10,
  addRecord: (r) =>
    set((state) => ({ records: [{ ...r, id: `MRT-${Date.now()}` }, ...state.records] })),
  updateRecord: (id, update) =>
    set((state) => ({ records: state.records.map((r) => r.id === id ? { ...r, ...update } : r) })),
  availableSlots: () => get().totalSlots - get().records.filter((r) => r.legalClearance !== 'released').length,

  receiveBody: (r, actorName) => {
    const id = `MRT-${Date.now()}`
    set(state => ({ records: [{ ...r, id }, ...state.records] }))
    useAuditStore.getState().log({
      userId: 'MOR-1601', userName: actorName,
      action: 'mortuary_body_received',
      resource: 'mortuary_record', resourceId: id,
      detail: `${r.patientName} (${r.patientId}) · ${r.causeOfDeath} · slot ${r.bodySlot}${r.isMLC ? ` · MLC ${r.mlcNumber}` : ''}`,
    })
    return id
  },

  issueDeathCertificate: (id, actorName) => {
    const rec = get().records.find(r => r.id === id)
    if (!rec) return
    const dcNumber = `DC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*900+100)}`
    set(state => ({
      records: state.records.map(r => r.id !== id ? r : ({
        ...r,
        legalClearance: r.isMLC ? r.legalClearance : ('cleared' as const),
        deathCertificateNumber: dcNumber,
      })),
    }))
    useAuditStore.getState().log({
      userId: 'MOR-1601', userName: actorName,
      action: 'mortuary_body_received',
      resource: 'mortuary_record', resourceId: id,
      detail: `Death certificate ${dcNumber} issued for ${rec.patientName}`,
    })
  },

  clearMLC: (id, actorName, autopsyComplete) => {
    const rec = get().records.find(r => r.id === id)
    if (!rec) return
    set(state => ({
      records: state.records.map(r => r.id !== id ? r : ({
        ...r,
        legalClearance: 'cleared' as const,
        autopsyCompletedAt: autopsyComplete ? new Date().toISOString() : r.autopsyCompletedAt,
      })),
    }))
    useAuditStore.getState().log({
      userId: 'MOR-1601', userName: actorName,
      action: 'mortuary_mlc_cleared',
      resource: 'mortuary_record', resourceId: id,
      detail: `MLC cleared for ${rec.patientName} (MLC ${rec.mlcNumber})${autopsyComplete ? ' · autopsy complete' : ''}`,
    })
  },

  releaseBody: (id, releasedTo, actorName) => {
    const rec = get().records.find(r => r.id === id)
    if (!rec) return
    set(state => ({
      records: state.records.map(r => r.id !== id ? r : ({
        ...r,
        legalClearance: 'released' as const,
        releasedTo,
        releasedAt: new Date().toISOString(),
      })),
    }))
    useAuditStore.getState().log({
      userId: 'MOR-1601', userName: actorName,
      action: 'mortuary_body_released',
      resource: 'mortuary_record', resourceId: id,
      detail: `Body of ${rec.patientName} released to ${releasedTo}${rec.deathCertificateNumber ? ` · cert ${rec.deathCertificateNumber}` : ''}`,
    })
  },
}),
  {
    name: 'agentix-mortuarystore', version: 1,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))
