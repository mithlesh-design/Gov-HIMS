import { create } from 'zustand'
import { mockSecretaryApi } from '@/lib/mocks/secretary/api'
import type { MobilizationRequest } from '@/types/secretary'

interface MobilizationState {
  requests: MobilizationRequest[]
  loading: boolean
  loaded: boolean
  fetchRequests: () => Promise<void>
  approve: (id: string) => Promise<void>
  reject: (id: string, reason: string) => Promise<void>
  tickEtas: () => void
  pushRequest: (r: MobilizationRequest) => void
}

export const useSecretaryMobilizationStore = create<MobilizationState>((set, get) => ({
  requests: [],
  loading: false,
  loaded: false,
  async fetchRequests() {
    set({ loading: true })
    const requests = await mockSecretaryApi.getMobilizationRequests()
    set({ requests, loading: false, loaded: true })
  },
  async approve(id) {
    const updated = await mockSecretaryApi.approveMobilization(id)
    if (updated) {
      set({ requests: get().requests.map(r => r.id === id ? updated : r) })
    }
  },
  async reject(id, reason) {
    await mockSecretaryApi.rejectMobilization(id, reason)
    set({ requests: get().requests.map(r => r.id === id ? { ...r, status: 'rejected' } : r) })
  },
  tickEtas() {
    mockSecretaryApi.tickMobilizationEta()
    set({
      requests: get().requests.map(r =>
        r.status === 'in-transit' && r.etaMinutes !== undefined
          ? { ...r, etaMinutes: Math.max(0, r.etaMinutes - 0.5) }
          : r
      ),
    })
  },
  pushRequest(r) {
    set({ requests: [r, ...get().requests] })
  },
}))
