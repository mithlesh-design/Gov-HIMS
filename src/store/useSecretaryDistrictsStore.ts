import { create } from 'zustand'
import { mockSecretaryApi } from '@/lib/mocks/secretary/api'
import type { District } from '@/types/secretary'

interface DistrictsState {
  districts: District[]
  loading: boolean
  loaded: boolean
  fetchDistricts: () => Promise<void>
  tickDistrict: (id: string, delta: number) => void
  sendCongratulation: (districtId: string) => Promise<void>
  issueShowCause: (districtId: string, reason: string) => Promise<void>
}

export const useSecretaryDistrictsStore = create<DistrictsState>((set, get) => ({
  districts: [],
  loading: false,
  loaded: false,
  async fetchDistricts() {
    set({ loading: true })
    const districts = await mockSecretaryApi.getDistrictRanking()
    set({ districts, loading: false, loaded: true })
  },
  tickDistrict(id, delta) {
    const updated = mockSecretaryApi.tickDistrictScore(id, delta)
    set({
      districts: get().districts.map(d => d.id === updated.id ? updated : d),
    })
  },
  async sendCongratulation(districtId) {
    await mockSecretaryApi.sendCongratulation(districtId)
  },
  async issueShowCause(districtId, reason) {
    await mockSecretaryApi.issueShowCause(districtId, reason)
  },
}))
