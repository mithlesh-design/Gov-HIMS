import { create } from 'zustand'
import { mockSecretaryApi } from '@/lib/mocks/secretary/api'
import type { StateAlert } from '@/types/secretary'

interface AlertsState {
  alerts: StateAlert[]
  loading: boolean
  loaded: boolean
  fetchAlerts: () => Promise<void>
  acknowledge: (id: string) => Promise<void>
  dismiss: (id: string) => Promise<void>
  pushAlert: (a: StateAlert) => void
  ageAlerts: () => void
}

export const useSecretaryAlertsStore = create<AlertsState>((set, get) => ({
  alerts: [],
  loading: false,
  loaded: false,
  async fetchAlerts() {
    set({ loading: true })
    const alerts = await mockSecretaryApi.getStateAlerts()
    set({ alerts, loading: false, loaded: true })
  },
  async acknowledge(id) {
    await mockSecretaryApi.acknowledgeAlert(id)
    set({ alerts: get().alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a) })
  },
  async dismiss(id) {
    await mockSecretaryApi.dismissAlert(id)
    set({ alerts: get().alerts.filter(a => a.id !== id) })
  },
  pushAlert(a) {
    set({ alerts: [a, ...get().alerts] })
  },
  ageAlerts() {
    mockSecretaryApi.ageAlerts()
    set({ alerts: get().alerts.map(a => ({ ...a, ageMinutes: a.ageMinutes + 1.5 })) })
  },
}))
