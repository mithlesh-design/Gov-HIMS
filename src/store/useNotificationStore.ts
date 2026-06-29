import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low'
export type NotificationChannel = 'in_app' | 'sms' | 'push' | 'whatsapp' | 'email'

export type NotificationType =
  | 'critical_value' | 'drug_interaction' | 'allergy_alert'
  | 'bed_request' | 'discharge_ready' | 'lab_result'
  | 'appointment' | 'system'
  | 'bed_allocated' | 'ot_confirmed' | 'medicines_ready' | 'discharge_initiated' | 'followup_reminder'
  | string

export interface DispatchRecord {
  channel: NotificationChannel
  sentAt: string
  recipient?: string
}

export interface Notification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  body: string
  targetRole?: string
  targetUserId?: string
  patientName?: string
  patientPhone?: string
  channels: NotificationChannel[]
  dispatched?: DispatchRecord[]
  read: boolean
  createdAt: string
  readAt?: string
  /** Optional explicit deep-link; clicking the notification navigates here. */
  link?: string
}

export type ChannelConfigMap = Partial<Record<NotificationType, NotificationChannel[]>>

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  channelConfig: ChannelConfigMap
  add: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markRead: (id: string) => void
  markAllRead: (targetRole?: string) => void
  dismiss: (id: string) => void
  updateChannelConfig: (type: NotificationType, channels: NotificationChannel[]) => void
  recordDispatch: (notificationId: string, records: DispatchRecord[]) => void
}

const SEED: Notification[] = [
  { id: 'N-001', type: 'critical_value', priority: 'critical', title: 'Critical Lab Value', body: 'Pt. Kiran Patil — K+ 6.8 mEq/L (critical high)', targetRole: 'doctor', patientName: 'Kiran Patil', channels: ['in_app'], read: false, createdAt: new Date(Date.now() - 300000).toISOString() },
  { id: 'N-002', type: 'drug_interaction', priority: 'high', title: 'Drug Interaction Alert', body: 'Warfarin + Aspirin — major interaction flagged', targetRole: 'doctor', channels: ['in_app'], read: false, createdAt: new Date(Date.now() - 600000).toISOString() },
  { id: 'N-004', type: 'lab_result', priority: 'medium', title: 'Lab result ready', body: 'CBC report finalised for Pt. Aarav Sharma', targetRole: 'doctor', patientName: 'Aarav Sharma', channels: ['in_app'], read: false, createdAt: new Date(Date.now() - 900000).toISOString() },
  { id: 'N-003', type: 'bed_request', priority: 'medium', title: 'Bed Request Pending', body: 'ICU Bed requested for Pt. Mohan Lal', targetRole: 'bed_manager', patientName: 'Mohan Lal', channels: ['in_app'], read: true, readAt: new Date().toISOString(), createdAt: new Date(Date.now() - 1800000).toISOString() },
]

const DEFAULT_CHANNEL_CONFIG: ChannelConfigMap = {
  bed_allocated:      ['in_app', 'whatsapp'],
  ot_confirmed:       ['in_app', 'whatsapp', 'sms'],
  medicines_ready:    ['in_app', 'whatsapp'],
  discharge_initiated:['in_app', 'whatsapp', 'sms'],
  followup_reminder:  ['whatsapp', 'sms'],
  critical_value:     ['in_app', 'push'],
  drug_interaction:   ['in_app'],
  discharge_ready:    ['in_app', 'whatsapp'],
  appointment:        ['in_app', 'sms'],
}

let _notifSeq = 0

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
  notifications: SEED,
  unreadCount: SEED.filter((n) => !n.read).length,
  channelConfig: DEFAULT_CHANNEL_CONFIG,

  add: (n) =>
    set((state) => {
      // Monotonic suffix so notifications added in the same millisecond (batched
      // notifyAndAudit calls) get unique ids — duplicate ids broke React keys.
      const entry: Notification = { ...n, id: `N-${Date.now()}-${++_notifSeq}`, read: false, createdAt: new Date().toISOString() }
      return { notifications: [entry, ...state.notifications], unreadCount: state.unreadCount + 1 }
    }),

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) => n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllRead: (targetRole) =>
    set((state) => {
      const next = state.notifications.map((n) =>
        (!targetRole || n.targetRole === targetRole) ? { ...n, read: true, readAt: n.readAt ?? new Date().toISOString() } : n
      )
      return { notifications: next, unreadCount: next.filter((n) => !n.read).length }
    }),

  dismiss: (id) =>
    set((state) => {
      const n = state.notifications.find((x) => x.id === id)
      return {
        notifications: state.notifications.filter((x) => x.id !== id),
        unreadCount: n && !n.read ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      }
    }),

  updateChannelConfig: (type, channels) =>
    set((state) => ({ channelConfig: { ...state.channelConfig, [type]: channels } })),

  recordDispatch: (notificationId, records) =>
    set((state) => ({
      notifications: state.notifications.map(n =>
        n.id === notificationId ? { ...n, dispatched: [...(n.dispatched ?? []), ...records] } : n
      ),
    })),
    }),
    {
      name: 'agentix-notifications',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      // v2: drop any notifications with duplicate ids left by the old
      // millisecond-only id scheme, and recompute unreadCount.
      migrate: (persisted) => {
        const p = persisted as { notifications?: Notification[]; unreadCount?: number } | undefined
        if (p?.notifications) {
          const seen = new Set<string>()
          p.notifications = p.notifications.filter(n => (seen.has(n.id) ? false : (seen.add(n.id), true)))
          p.unreadCount = p.notifications.filter(n => !n.read).length
        }
        return p as NotificationState
      },
    },
  ),
)
