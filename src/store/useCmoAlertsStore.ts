import { create } from 'zustand'
import { mockCmoApi } from '@/lib/mocks/cmo/api'
import type { Alert } from '@/types/cmo'

interface AlertsState {
  alerts: Alert[]
  loading: boolean
  loaded: boolean
  fetchAlerts: () => Promise<void>
  acknowledge: (id: string) => Promise<void>
  dismiss: (id: string) => Promise<void>
  assign: (id: string, ownerName: string) => Promise<void>
  pushAlert: (a: Alert) => void
  ageAlerts: () => void
}

export const useCmoAlertsStore = create<AlertsState>((set, get) => ({
  alerts: [],
  loading: false,
  loaded: false,
  async fetchAlerts() {
    set({ loading: true })
    const alerts = await mockCmoApi.getAlerts()
    set({ alerts, loading: false, loaded: true })
  },
  async acknowledge(id) {
    await mockCmoApi.acknowledgeAlert(id)
    set({ alerts: get().alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a) })
  },
  async dismiss(id) {
    await mockCmoApi.dismissAlert(id)
    set({ alerts: get().alerts.filter(a => a.id !== id) })
  },
  async assign(id, ownerName) {
    await mockCmoApi.assignAlert(id, ownerName)
    set({
      alerts: get().alerts.map(a =>
        a.id === id
          ? { ...a, owner: { id: ownerName, name: ownerName, avatar: ownerName.substring(0, 2).toUpperCase() } }
          : a
      ),
    })
  },
  pushAlert(a) {
    set({ alerts: [a, ...get().alerts] })
  },
  ageAlerts() {
    mockCmoApi.ageAlerts()
    set({ alerts: get().alerts.map(a => ({ ...a, ageMinutes: a.ageMinutes + (10 / 60) })) })
  },
}))
