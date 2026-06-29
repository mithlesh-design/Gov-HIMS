import { create } from 'zustand'
import { mockSecretaryApi } from '@/lib/mocks/secretary/api'
import type { StateApproval } from '@/types/secretary'

interface ApprovalsState {
  approvals: StateApproval[]
  loading: boolean
  loaded: boolean
  fetchApprovals: () => Promise<void>
  approve: (id: string, note?: string) => Promise<void>
  reject: (id: string, note: string) => Promise<void>
}

export const useSecretaryApprovalsStore = create<ApprovalsState>((set, get) => ({
  approvals: [],
  loading: false,
  loaded: false,
  async fetchApprovals() {
    set({ loading: true })
    const approvals = await mockSecretaryApi.getStateApprovals()
    set({ approvals, loading: false, loaded: true })
  },
  async approve(id, note = '') {
    await mockSecretaryApi.approveItem(id, note)
    set({ approvals: get().approvals.map(a => a.id === id ? { ...a, status: 'approved', actionedAt: new Date().toISOString(), actionNote: note } : a) })
  },
  async reject(id, note) {
    await mockSecretaryApi.rejectItem(id, note)
    set({ approvals: get().approvals.map(a => a.id === id ? { ...a, status: 'rejected', actionedAt: new Date().toISOString(), actionNote: note } : a) })
  },
}))
