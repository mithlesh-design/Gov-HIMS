import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type TriagePatient = {
  id: string
  name: string
  eta: string
  severity: 'Red' | 'Yellow' | 'Green'
  chiefComplaint: string
  ambulanceId?: string
}

interface EmergencyState {
  activeTraumas: number
  codeBlueCount: number
  triageQueue: TriagePatient[]
  admitPatient: (id: string) => void
  addToTriage: (patient: Omit<TriagePatient, 'id'>) => void
}

export const useEmergencyStore = create<EmergencyState>()(persist((set) => ({
  activeTraumas: 2,
  codeBlueCount: 0,
  triageQueue: [
    { id: 'ER-001', name: 'Unknown Male', eta: 'Arriving in 5 mins', severity: 'Red',    chiefComplaint: 'RTA - Head Trauma',     ambulanceId: 'AMB-104' },
    { id: 'ER-002', name: 'Meena Devi',   eta: 'In Waiting',         severity: 'Yellow', chiefComplaint: 'Severe Chest Pain' },
    { id: 'ER-003', name: 'Rahul Verma',  eta: 'In Waiting',         severity: 'Green',  chiefComplaint: 'Minor Laceration' },
  ],

  admitPatient: (id) =>
    set((state) => ({
      triageQueue: state.triageQueue.filter((p) => p.id !== id),
      activeTraumas: Math.max(0, state.activeTraumas - 1),
    })),

  addToTriage: (patient) =>
    set((state) => ({
      triageQueue: [
        ...state.triageQueue,
        { ...patient, id: `ER-${Date.now()}` },
      ],
      activeTraumas: state.activeTraumas + (patient.severity === 'Red' ? 1 : 0),
    })),
}),
  {
    name: 'agentix-emergencystore', version: 1,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))
