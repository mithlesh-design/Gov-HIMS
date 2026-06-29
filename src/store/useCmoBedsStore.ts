import { create } from 'zustand'
import { mockCmoApi } from '@/lib/mocks/cmo/api'
import type { BedNetworkSummary } from '@/types/cmo'

interface BedsState {
  bedNetwork: BedNetworkSummary | null
  loading: boolean
  loaded: boolean
  fetchBedNetwork: () => Promise<void>
  reserveBed: (facilityId: string, wardType: string, bedId: string, patientName: string) => Promise<void>
  tick: () => void
}

export const useCmoBedsStore = create<BedsState>((set, get) => ({
  bedNetwork: null,
  loading: false,
  loaded: false,
  async fetchBedNetwork() {
    set({ loading: true })
    const bedNetwork = await mockCmoApi.getBedNetwork()
    set({ bedNetwork, loading: false, loaded: true })
  },
  async reserveBed(facilityId, wardType, bedId, patientName) {
    await mockCmoApi.reserveBed(facilityId, wardType, bedId, patientName)
    const updated = await mockCmoApi.getBedNetwork()
    set({ bedNetwork: updated })
  },
  tick() {
    mockCmoApi.tickBeds()
    mockCmoApi.getBedNetwork().then(bedNetwork => set({ bedNetwork }))
  },
}))
