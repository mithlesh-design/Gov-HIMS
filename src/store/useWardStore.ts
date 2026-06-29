import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Vitals = { hr: number; bp: string; temp: number; spo2: number }

export type RoundsNote = {
  id: string
  timestamp: string
  text: string
  category: 'observation' | 'medication' | 'test' | 'instruction'
  author: string
  medicines?: { name: string; dosage: string; frequency: string }[]
  tests?: { name: string; urgency: 'Routine' | 'Urgent' }[]
  instructions?: string[]
}

export type Medication = {
  name: string
  dosage: string
  frequency: string
  route: 'Oral' | 'IV' | 'IM'
  status: 'Active' | 'Completed'
}

export type IVDrip = {
  fluid: string
  rate: string
  startedAt: string
  status: 'Running' | 'Completed' | 'Paused'
}

export type PatientBed = {
  id: string
  name: string
  bedNumber: string
  condition: 'Stable' | 'Critical' | 'Discharging'
  vitals: Vitals
  lastChecked: string
  aiAlert?: string
  rounds?: RoundsNote[]
  currentMedications?: Medication[]
  ivDrips?: IVDrip[]
}

interface WardState {
  patients: PatientBed[]
  activeNurses: number
  availableBeds: number
  updateVitals: (id: string, vitals: Vitals) => void
  dismissAlert: (id: string) => void
  addRoundsNote: (patientId: string, note: Omit<RoundsNote, 'id'>) => void
  addMedication: (patientId: string, med: Medication) => void
  addIVDrip: (patientId: string, drip: IVDrip) => void
}

export const useWardStore = create<WardState>()(persist((set) => ({
  activeNurses: 12,
  availableBeds: 5,
  patients: [
    {
      id: 'IPD-1021', name: 'Ramesh Kumar', bedNumber: 'Ward A - 01', condition: 'Stable',
      vitals: { hr: 75, bp: '120/80', temp: 98.6, spo2: 98 }, lastChecked: '10 mins ago',
      currentMedications: [
        { name: 'Paracetamol', dosage: '500mg', frequency: 'TDS', route: 'Oral', status: 'Active' },
        { name: 'Pantoprazole', dosage: '40mg', frequency: 'OD', route: 'Oral', status: 'Active' },
      ],
      ivDrips: [],
      rounds: [
        { id: 'r1', timestamp: '09:15 AM', text: 'Patient comfortable. Vitals stable. Continue current management.', category: 'observation', author: 'Dr. Priya Nair' },
      ],
    },
    {
      id: 'IPD-1022', name: 'Sunita Sharma', bedNumber: 'Ward A - 02', condition: 'Critical',
      vitals: { hr: 110, bp: '145/90', temp: 101.2, spo2: 92 }, lastChecked: 'Just now', aiAlert: 'Sepsis Risk Detected',
      currentMedications: [
        { name: 'Meropenem', dosage: '1g', frequency: 'Q8H', route: 'IV', status: 'Active' },
        { name: 'Norepinephrine', dosage: '0.1 mcg/kg/min', frequency: 'Continuous', route: 'IV', status: 'Active' },
      ],
      ivDrips: [
        { fluid: 'NS 0.9% 500ml', rate: '80 ml/hr', startedAt: '08:00 AM', status: 'Running' },
      ],
      rounds: [],
    },
    {
      id: 'IPD-1023', name: 'Amit Singh', bedNumber: 'Ward B - 05', condition: 'Discharging',
      vitals: { hr: 70, bp: '115/75', temp: 98.4, spo2: 99 }, lastChecked: '1 hour ago',
      currentMedications: [
        { name: 'Cefixime', dosage: '200mg', frequency: 'BD', route: 'Oral', status: 'Active' },
      ],
      ivDrips: [],
      rounds: [],
    },
  ],

  updateVitals: (id, vitals) =>
    set((state) => ({
      patients: state.patients.map((p) =>
        p.id === id
          ? {
              ...p, vitals, lastChecked: 'Just now',
              condition: vitals.hr > 110 || vitals.spo2 < 93 || vitals.temp > 101
                ? 'Critical' : p.condition === 'Discharging' ? 'Discharging' : 'Stable',
            }
          : p
      ),
    })),

  dismissAlert: (id) =>
    set((state) => ({
      patients: state.patients.map((p) => p.id === id ? { ...p, aiAlert: undefined } : p),
    })),

  addRoundsNote: (patientId, note) =>
    set((state) => ({
      patients: state.patients.map((p) =>
        p.id === patientId
          ? { ...p, rounds: [...(p.rounds ?? []), { ...note, id: `r-${Date.now()}` }] }
          : p
      ),
    })),

  addMedication: (patientId, med) =>
    set((state) => ({
      patients: state.patients.map((p) =>
        p.id === patientId
          ? { ...p, currentMedications: [...(p.currentMedications ?? []), med] }
          : p
      ),
    })),

  addIVDrip: (patientId, drip) =>
    set((state) => ({
      patients: state.patients.map((p) =>
        p.id === patientId
          ? { ...p, ivDrips: [...(p.ivDrips ?? []), drip] }
          : p
      ),
    })),
}),
  {
    name: 'agentix-wardstore', version: 1,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))
