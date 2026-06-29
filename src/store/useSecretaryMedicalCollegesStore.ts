import { create } from 'zustand'
import { mockSecretaryApi } from '@/lib/mocks/secretary/api'
import type { MedicalCollege } from '@/types/secretary'

interface MedCollegesState {
  colleges: MedicalCollege[]
  loading: boolean
  loaded: boolean
  fetchColleges: () => Promise<void>
}

export const useSecretaryMedicalCollegesStore = create<MedCollegesState>((set) => ({
  colleges: [],
  loading: false,
  loaded: false,
  async fetchColleges() {
    set({ loading: true })
    const colleges = await mockSecretaryApi.getMedicalColleges()
    set({ colleges, loading: false, loaded: true })
  },
}))
