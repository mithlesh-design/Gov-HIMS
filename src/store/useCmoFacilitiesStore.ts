import { create } from 'zustand'
import { mockCmoApi } from '@/lib/mocks/cmo/api'
import type { Facility } from '@/types/cmo'

interface FacilitiesState {
  facilities: Facility[]
  loading: boolean
  loaded: boolean
  fetchFacilities: () => Promise<void>
}

export const useCmoFacilitiesStore = create<FacilitiesState>((set) => ({
  facilities: [],
  loading: false,
  loaded: false,
  async fetchFacilities() {
    set({ loading: true })
    const facilities = await mockCmoApi.getFacilities()
    set({ facilities, loading: false, loaded: true })
  },
}))
