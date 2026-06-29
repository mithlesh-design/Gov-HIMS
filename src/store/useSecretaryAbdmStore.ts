import { create } from 'zustand'
import { mockSecretaryApi } from '@/lib/mocks/secretary/api'
import type { AbdmMilestone } from '@/types/secretary'

interface AbdmState {
  milestones: AbdmMilestone[]
  loading: boolean
  loaded: boolean
  fetchMilestones: () => Promise<void>
}

export const useSecretaryAbdmStore = create<AbdmState>((set) => ({
  milestones: [],
  loading: false,
  loaded: false,
  async fetchMilestones() {
    set({ loading: true })
    const milestones = await mockSecretaryApi.getAbdmMilestones()
    set({ milestones, loading: false, loaded: true })
  },
}))
