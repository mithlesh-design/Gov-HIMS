import { create } from 'zustand'
import { mockSecretaryApi } from '@/lib/mocks/secretary/api'
import type { SecretarySession } from '@/types/secretary'

interface SessionState {
  session: SecretarySession | null
  loading: boolean
  fetchSession: () => Promise<void>
}

export const useSecretarySessionStore = create<SessionState>((set) => ({
  session: null,
  loading: false,
  async fetchSession() {
    set({ loading: true })
    const session = await mockSecretaryApi.getSession()
    set({ session, loading: false })
  },
}))
