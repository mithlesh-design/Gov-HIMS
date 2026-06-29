import { create } from 'zustand'
import { mockCmoApi } from '@/lib/mocks/cmo/api'
import type { Ambulance } from '@/types/cmo'

interface AmbulancesState {
  ambulances: Ambulance[]
  loading: boolean
  loaded: boolean
  fetchAmbulances: () => Promise<void>
  tickVitalsAndEta: () => void
  reroute: (ambId: string, facilityId: string, facilityName: string, eta: number) => Promise<void>
}

export const useCmoAmbulancesStore = create<AmbulancesState>((set, get) => ({
  ambulances: [],
  loading: false,
  loaded: false,
  async fetchAmbulances() {
    set({ loading: true })
    const ambulances = await mockCmoApi.getAmbulances()
    set({ ambulances, loading: false, loaded: true })
  },
  tickVitalsAndEta() {
    mockCmoApi.tickAmbulances()
    mockCmoApi.getAmbulances().then(ambulances => set({ ambulances }))
  },
  async reroute(ambId, facilityId, facilityName, eta) {
    await mockCmoApi.rerouteAmbulance(ambId, facilityId, facilityName, eta)
    set({
      ambulances: get().ambulances.map(a =>
        a.id === ambId
          ? { ...a, destinationFacility: { id: facilityId, name: facilityName }, etaMinutes: eta }
          : a
      ),
    })
  },
}))
