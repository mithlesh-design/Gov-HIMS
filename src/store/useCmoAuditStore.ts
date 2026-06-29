import { create } from 'zustand'
import { mockCmoApi } from '@/lib/mocks/cmo/api'
import type { AuditLogEntry } from '@/types/cmo'

interface CmoAuditState {
  entries: AuditLogEntry[]
  loading: boolean
  loaded: boolean
  fetchAuditLog: (limit?: number) => Promise<void>
}

export const useCmoAuditStore = create<CmoAuditState>((set) => ({
  entries: [],
  loading: false,
  loaded: false,
  async fetchAuditLog(limit = 50) {
    set({ loading: true })
    const entries = await mockCmoApi.getAuditLog(limit)
    set({ entries, loading: false, loaded: true })
  },
}))
