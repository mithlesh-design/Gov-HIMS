import { create } from 'zustand'
import { mockSecretaryApi } from '@/lib/mocks/secretary/api'
import type { AuditLogEntrySecretary } from '@/types/secretary'

interface SecretaryAuditState {
  log: AuditLogEntrySecretary[]
  loading: boolean
  loaded: boolean
  fetchLog: () => Promise<void>
}

export const useSecretaryAuditStore = create<SecretaryAuditState>((set) => ({
  log: [],
  loading: false,
  loaded: false,
  fetchLog: async () => {
    set({ loading: true })
    const log = await mockSecretaryApi.getAuditLog()
    set({ log, loading: false, loaded: true })
  },
}))
