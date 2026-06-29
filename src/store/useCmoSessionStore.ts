import { create } from 'zustand'
import { mockCmoApi } from '@/lib/mocks/cmo/api'
import type { CmoSession } from '@/types/cmo'

interface CmoSessionState {
  session: CmoSession | null
  loading: boolean
  fetchSession: () => Promise<void>
}

export const useCmoSessionStore = create<CmoSessionState>((set) => ({
  session: null,
  loading: false,
  async fetchSession() {
    set({ loading: true })
    const session = await mockCmoApi.getSession()
    set({ session, loading: false })
  },
}))
