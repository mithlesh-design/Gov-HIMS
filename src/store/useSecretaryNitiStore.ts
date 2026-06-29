import { create } from 'zustand'
import { mockSecretaryApi } from '@/lib/mocks/secretary/api'
import type { NitiIndicator } from '@/types/secretary'

interface NitiState {
  indicators: NitiIndicator[]
  loading: boolean
  loaded: boolean
  fetchIndicators: () => Promise<void>
  tickIndicator: (updated: NitiIndicator) => void
}

export const useSecretaryNitiStore = create<NitiState>((set, get) => ({
  indicators: [],
  loading: false,
  loaded: false,
  async fetchIndicators() {
    set({ loading: true })
    const indicators = await mockSecretaryApi.getNitiIndicators()
    set({ indicators, loading: false, loaded: true })
  },
  tickIndicator(updated) {
    set({ indicators: get().indicators.map(n => n.id === updated.id ? updated : n) })
  },
}))
