import { create } from 'zustand'
import { mockCmoApi } from '@/lib/mocks/cmo/api'
import type { Approval } from '@/types/cmo'

interface ApprovalsState {
  approvals: Approval[]
  loading: boolean
  loaded: boolean
  fetchApprovals: () => Promise<void>
  approve: (id: string, note?: string) => Promise<void>
  reject: (id: string, reason: string) => Promise<void>
}

export const useCmoApprovalsStore = create<ApprovalsState>((set, get) => ({
  approvals: [],
  loading: false,
  loaded: false,
  async fetchApprovals() {
    set({ loading: true })
    const approvals = await mockCmoApi.getApprovals()
    set({ approvals, loading: false, loaded: true })
  },
  async approve(id, note) {
    await mockCmoApi.approveItem(id, note)
    set({
      approvals: get().approvals.map(a =>
        a.id === id ? { ...a, status: 'approved', actionedAt: new Date().toISOString(), actionNote: note } : a
      ),
    })
  },
  async reject(id, reason) {
    await mockCmoApi.rejectItem(id, reason)
    set({
      approvals: get().approvals.map(a =>
        a.id === id ? { ...a, status: 'rejected', actionedAt: new Date().toISOString(), actionNote: reason } : a
      ),
    })
  },
}))
