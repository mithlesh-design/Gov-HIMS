import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// The doctor's own profile/settings — availability, leave, hours, fees and a
// typed e-signature used on issued documents. Persisted so it survives reload.

export interface DoctorProfile {
  availableForOPD: boolean
  availableForOnline: boolean
  onLeave: boolean
  leaveUntil: string
  hoursStart: string
  hoursEnd: string
  opdFee: number
  onlineFee: number
  followUpFee: number
  signature: string
}

interface DoctorProfileState extends DoctorProfile {
  setProfile: (patch: Partial<DoctorProfile>) => void
}

const DEFAULTS: DoctorProfile = {
  availableForOPD: true,
  availableForOnline: true,
  onLeave: false,
  leaveUntil: '',
  hoursStart: '09:00',
  hoursEnd: '17:00',
  opdFee: 600,
  onlineFee: 500,
  followUpFee: 300,
  signature: 'Dr. Priya Nair, MBBS MD (General Medicine)',
}

export const useDoctorProfileStore = create<DoctorProfileState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setProfile: (patch) => set(patch),
    }),
    { name: 'agentix-doctor-profile', version: 1, storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
)
