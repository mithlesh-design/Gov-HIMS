import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useAuditStore } from '@/store/useAuditStore'

export type JourneyState =
  | 'OPD_REGISTERED'
  | 'VITALS_IN_PROGRESS'
  | 'IN_CONSULT'
  | 'LAB_ORDERED'
  | 'LAB_RESULTED'
  | 'RADIOLOGY_ORDERED'
  | 'RADIOLOGY_RESULTED'
  | 'PHARMACY_QUEUED'
  | 'BILLING_PENDING'
  | 'DISCHARGE_PENDING_BILLING'
  | 'ADMITTED_IPD'
  | 'IPD_STABLE'
  | 'IPD_CRITICAL'
  | 'DISCHARGE_INITIATED'
  | 'COMPLETED'

export interface JourneyStateEntry {
  state: JourneyState
  enteredAt: string
  exitedAt?: string
}

export interface JourneyEntry {
  patientId: string
  patientName: string
  currentState: JourneyState
  enteredStateAt: string
  stateHistory: JourneyStateEntry[]
  assignedDoctor?: string
  assignedWard?: string
  slaBreachRisk: boolean
  estimatedCompletionAt?: string
}

// SLA thresholds in minutes per state
const SLA_MINUTES: Partial<Record<JourneyState, number>> = {
  VITALS_IN_PROGRESS: 10,
  IN_CONSULT: 30,
  LAB_ORDERED: 60,
  LAB_RESULTED: 45,
  PHARMACY_QUEUED: 20,
  BILLING_PENDING: 30,
  DISCHARGE_PENDING_BILLING: 60,
}

function computeSlaBreachRisk(state: JourneyState, enteredAt: string): boolean {
  const threshold = SLA_MINUTES[state]
  if (!threshold) return false
  const minutesInState = (Date.now() - new Date(enteredAt).getTime()) / 60000
  return minutesInState > threshold
}

interface JourneyStore {
  entries: JourneyEntry[]
  addPatient: (patientId: string, patientName: string, assignedDoctor?: string) => void
  transition: (patientId: string, nextState: JourneyState, actorUserId?: string, actorUserName?: string) => void
  getBottlenecks: () => JourneyEntry[]
  getSlaBreaches: () => JourneyEntry[]
  removePatient: (patientId: string) => void
}

// Demo data to populate the journey view
const DEMO_ENTRIES: JourneyEntry[] = [
  {
    patientId: 'P001',
    patientName: 'Meera Pillai',
    currentState: 'PHARMACY_QUEUED',
    enteredStateAt: new Date(Date.now() - 25 * 60000).toISOString(),
    slaBreachRisk: true,
    assignedDoctor: 'Dr. Priya Nair',
    stateHistory: [
      { state: 'OPD_REGISTERED', enteredAt: new Date(Date.now() - 90 * 60000).toISOString(), exitedAt: new Date(Date.now() - 80 * 60000).toISOString() },
      { state: 'VITALS_IN_PROGRESS', enteredAt: new Date(Date.now() - 80 * 60000).toISOString(), exitedAt: new Date(Date.now() - 70 * 60000).toISOString() },
      { state: 'IN_CONSULT', enteredAt: new Date(Date.now() - 70 * 60000).toISOString(), exitedAt: new Date(Date.now() - 45 * 60000).toISOString() },
      { state: 'LAB_ORDERED', enteredAt: new Date(Date.now() - 45 * 60000).toISOString(), exitedAt: new Date(Date.now() - 30 * 60000).toISOString() },
      { state: 'LAB_RESULTED', enteredAt: new Date(Date.now() - 30 * 60000).toISOString(), exitedAt: new Date(Date.now() - 25 * 60000).toISOString() },
      { state: 'PHARMACY_QUEUED', enteredAt: new Date(Date.now() - 25 * 60000).toISOString() },
    ],
  },
  {
    patientId: 'P006',
    patientName: 'Rakesh Verma',
    currentState: 'BILLING_PENDING',
    enteredStateAt: new Date(Date.now() - 35 * 60000).toISOString(),
    slaBreachRisk: true,
    assignedDoctor: 'Dr. Arjun Mehta',
    stateHistory: [
      { state: 'OPD_REGISTERED', enteredAt: new Date(Date.now() - 120 * 60000).toISOString(), exitedAt: new Date(Date.now() - 110 * 60000).toISOString() },
      { state: 'IN_CONSULT', enteredAt: new Date(Date.now() - 110 * 60000).toISOString(), exitedAt: new Date(Date.now() - 40 * 60000).toISOString() },
      { state: 'BILLING_PENDING', enteredAt: new Date(Date.now() - 35 * 60000).toISOString() },
    ],
  },
  {
    patientId: 'P004',
    patientName: 'Kiran Patil',
    currentState: 'IN_CONSULT',
    enteredStateAt: new Date(Date.now() - 15 * 60000).toISOString(),
    slaBreachRisk: false,
    assignedDoctor: 'Dr. Sunita Rao',
    stateHistory: [
      { state: 'OPD_REGISTERED', enteredAt: new Date(Date.now() - 40 * 60000).toISOString(), exitedAt: new Date(Date.now() - 30 * 60000).toISOString() },
      { state: 'VITALS_IN_PROGRESS', enteredAt: new Date(Date.now() - 30 * 60000).toISOString(), exitedAt: new Date(Date.now() - 15 * 60000).toISOString() },
      { state: 'IN_CONSULT', enteredAt: new Date(Date.now() - 15 * 60000).toISOString() },
    ],
  },
  {
    patientId: 'PT-10210',
    patientName: 'Vikram Nair',
    currentState: 'IPD_CRITICAL',
    enteredStateAt: new Date(Date.now() - 180 * 60000).toISOString(),
    slaBreachRisk: false,
    assignedWard: 'ICU',
    assignedDoctor: 'Dr. Priya Menon',
    stateHistory: [
      { state: 'ADMITTED_IPD', enteredAt: new Date(Date.now() - 300 * 60000).toISOString(), exitedAt: new Date(Date.now() - 180 * 60000).toISOString() },
      { state: 'IPD_CRITICAL', enteredAt: new Date(Date.now() - 180 * 60000).toISOString() },
    ],
  },
  {
    patientId: 'PT-10211',
    patientName: 'Lakshmi Iyer',
    currentState: 'DISCHARGE_PENDING_BILLING',
    enteredStateAt: new Date(Date.now() - 200 * 60000).toISOString(),
    slaBreachRisk: true,
    assignedWard: 'General Ward',
    assignedDoctor: 'Dr. Vikram Rathore',
    stateHistory: [
      { state: 'ADMITTED_IPD', enteredAt: new Date(Date.now() - 2880 * 60000).toISOString(), exitedAt: new Date(Date.now() - 210 * 60000).toISOString() },
      { state: 'DISCHARGE_INITIATED', enteredAt: new Date(Date.now() - 210 * 60000).toISOString(), exitedAt: new Date(Date.now() - 200 * 60000).toISOString() },
      { state: 'DISCHARGE_PENDING_BILLING', enteredAt: new Date(Date.now() - 200 * 60000).toISOString() },
    ],
  },
]

export const useJourneyStore = create<JourneyStore>()(persist((set, get) => ({
  entries: DEMO_ENTRIES,

  addPatient: (patientId, patientName, assignedDoctor) => {
    const now = new Date().toISOString()
    const entry: JourneyEntry = {
      patientId,
      patientName,
      currentState: 'OPD_REGISTERED',
      enteredStateAt: now,
      stateHistory: [{ state: 'OPD_REGISTERED', enteredAt: now }],
      assignedDoctor,
      slaBreachRisk: false,
    }
    set((state) => ({ entries: [entry, ...state.entries] }))
  },

  transition: (patientId, nextState, actorUserId = 'system', actorUserName = 'System') => {
    const now = new Date().toISOString()
    set((state) => ({
      entries: state.entries.map((e) => {
        if (e.patientId !== patientId) return e
        const updatedHistory = e.stateHistory.map((h) =>
          h.state === e.currentState && !h.exitedAt ? { ...h, exitedAt: now } : h
        )
        updatedHistory.push({ state: nextState, enteredAt: now })
        return {
          ...e,
          currentState: nextState,
          enteredStateAt: now,
          stateHistory: updatedHistory,
          slaBreachRisk: computeSlaBreachRisk(nextState, now),
        }
      }),
    }))
    useAuditStore.getState().log({
      userId: actorUserId,
      userName: actorUserName,
      action: 'journey_transition',
      resource: 'patient_journey',
      resourceId: patientId,
      detail: `Transitioned to ${nextState}`,
      before: { state: get().entries.find((e) => e.patientId === patientId)?.currentState },
      after: { state: nextState },
    })
  },

  getBottlenecks: () => {
    return get().entries.filter((e) => e.slaBreachRisk)
  },

  getSlaBreaches: () => {
    return get().entries.filter((e) => {
      const threshold = SLA_MINUTES[e.currentState]
      if (!threshold) return false
      const minutes = (Date.now() - new Date(e.enteredStateAt).getTime()) / 60000
      return minutes > threshold
    })
  },

  removePatient: (patientId) => {
    set((state) => ({ entries: state.entries.filter((e) => e.patientId !== patientId) }))
  },
}),
  {
    name: 'agentix-journeystore', version: 1,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))
