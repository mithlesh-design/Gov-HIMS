import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Role } from '@/store/useAuthStore'

// Internal staff-to-staff messaging — a genuine bus. Messages carry a senderId
// and conversations are between two participant ids, so the SAME thread is read
// correctly from either side (doctor and nurse both see it, each with their own
// "mine"/unread perspective). Front-end simulation of a secure messaging bus.

export type StaffContact = { id: string; name: string; role: Role; department: string }
export type ChatMsg = { id: string; senderId: string; text: string; at: string; readBy: string[] }
export type Conversation = { id: string; participants: string[]; messages: ChatMsg[]; updatedAt: string }

export const ROLE_LABEL: Record<string, string> = {
  doctor: 'Doctor', nurse: 'Nurse', pharmacy: 'Pharmacy', lab: 'Laboratory', radiology: 'Radiology',
  reception: 'Reception', bed_manager: 'Admissions', billing: 'Billing', insurance: 'Insurance / TPA',
  ot: 'Operation Theatre', emergency: 'Emergency', admin: 'Administration',
}

// The hospital directory — includes the doctor (DR-1012) so colleagues can reach back.
export const DIRECTORY: StaffContact[] = [
  { id: 'DR-1012', name: 'Dr. Priya Nair', role: 'doctor', department: 'General Medicine' },
  { id: 'DR-2001', name: 'Dr. Rohan Mehta', role: 'doctor', department: 'Cardiology' },
  { id: 'DR-2002', name: 'Dr. Ananya Iyer', role: 'doctor', department: 'Dermatology' },
  { id: 'NR-402', name: 'Anjali Desai', role: 'nurse', department: 'Cardiac Care' },
  { id: 'NR-410', name: 'Pooja Shetty', role: 'nurse', department: 'ICU' },
  { id: 'PH-301', name: 'Ritu Sharma', role: 'pharmacy', department: 'Pharmacy' },
  { id: 'LB-992', name: 'Neha Gupta', role: 'lab', department: 'Pathology' },
  { id: 'RAD-304', name: 'Dr. Sameer Khan', role: 'radiology', department: 'Radiology' },
  { id: 'RC-204', name: 'Sunita Joshi', role: 'reception', department: 'Front Desk' },
  { id: 'BM-601', name: 'Aditi Verma', role: 'bed_manager', department: 'Admission Desk' },
  { id: 'BL-801', name: 'Suresh Nair', role: 'billing', department: 'Billing' },
  { id: 'INS-011', name: 'Karan Patel', role: 'insurance', department: 'TPA Desk' },
  { id: 'OT-901', name: 'Dr. Anisha Sharma', role: 'ot', department: 'Operation Theatre' },
  { id: 'ER-110', name: 'Dr. Vikram Rathore', role: 'emergency', department: 'Emergency Room' },
  { id: 'ADM-01', name: 'Rajesh Kulkarni', role: 'admin', department: 'Administration' },
]

// Admin v2 / M1.5 — Look up identity in the canonical HR store FIRST, falling
// back to the static DIRECTORY for any legacy IDs not yet onboarded into HR.
// This means a staff member added via the Add-Staff wizard becomes addressable
// in messaging immediately, without touching this file.
export const contactById = (id: string): StaffContact => {
  // Lazy import to avoid Zustand store circular dependency during module load.
  if (typeof window !== 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const hr = require('./useHRStore') as typeof import('./useHRStore')
      const m = hr.useHRStore.getState().staff.find(s => s.id === id)
      if (m) return { id: m.id, name: m.name, role: m.role, department: m.department }
    } catch { /* fall through to DIRECTORY */ }
  }
  return DIRECTORY.find(c => c.id === id) ?? { id, name: id, role: 'admin', department: '' }
}

export const otherId = (c: Conversation, meId: string) => c.participants.find(p => p !== meId) ?? c.participants[0]
export const unreadFor = (c: Conversation, meId: string) => c.messages.filter(m => m.senderId !== meId && !m.readBy.includes(meId)).length

let _seq = 0
const uid = (p: string) => `${p}-${++_seq}`
const minsAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString()
const DOC = 'DR-1012'

function seed(): Conversation[] {
  return [
    {
      id: 'cv-nurse', participants: [DOC, 'NR-402'], updatedAt: minsAgo(8),
      messages: [{ id: uid('m'), senderId: 'NR-402', at: minsAgo(8), readBy: ['NR-402'], text: 'Dr. Nair — Kiran Patil (CCU-04) BP up to 150/95 on this round. Repeat antihypertensive or hold?' }],
    },
    {
      id: 'cv-pharm', participants: [DOC, 'PH-301'], updatedAt: minsAgo(35),
      messages: [{ id: uid('m'), senderId: 'PH-301', at: minsAgo(35), readBy: ['PH-301'], text: 'Atorvastatin 40mg is out of stock. Can I substitute Rosuvastatin 20mg for your cardiac inpatients?' }],
    },
    {
      id: 'cv-recep', participants: [DOC, 'RC-204'], updatedAt: minsAgo(120),
      messages: [
        { id: uid('m'), senderId: 'RC-204', at: minsAgo(140), readBy: ['RC-204', DOC], text: 'A walk-in cardiac referral has arrived for your 4 PM slot. OK to add to the queue?' },
        { id: uid('m'), senderId: DOC, at: minsAgo(120), readBy: [DOC], text: 'Yes, add them. Ask vitals to be taken first, and flag if chest pain is ongoing.' },
      ],
    },
  ]
}

interface MessagingState {
  conversations: Conversation[]
  sendMessage: (conversationId: string, fromId: string, text: string) => void
  startConversation: (fromId: string, toId: string, text: string) => string
  receive: (conversationId: string, fromId: string, text: string) => void
  markRead: (conversationId: string, meId: string) => void
}

const touch = (msgs: ChatMsg[], m: ChatMsg) => [...msgs, m]

export const useMessagingStore = create<MessagingState>()(
  persist(
    (set, get) => ({
      conversations: seed(),

      sendMessage: (id, fromId, text) => set(s => ({
        conversations: s.conversations.map(c => c.id === id
          ? { ...c, updatedAt: new Date().toISOString(), messages: touch(c.messages, { id: uid('m'), senderId: fromId, text, at: new Date().toISOString(), readBy: [fromId] }) }
          : c).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      })),

      startConversation: (fromId, toId, text) => {
        const existing = get().conversations.find(c => c.participants.includes(fromId) && c.participants.includes(toId))
        if (existing) { get().sendMessage(existing.id, fromId, text); return existing.id }
        const id = `cv-${fromId}-${toId}-${Date.now()}`
        set(s => ({
          conversations: [{ id, participants: [fromId, toId], updatedAt: new Date().toISOString(), messages: [{ id: uid('m'), senderId: fromId, text, at: new Date().toISOString(), readBy: [fromId] }] }, ...s.conversations],
        }))
        return id
      },

      receive: (id, fromId, text) => set(s => ({
        conversations: s.conversations.map(c => c.id === id
          ? { ...c, updatedAt: new Date().toISOString(), messages: touch(c.messages, { id: uid('m'), senderId: fromId, text, at: new Date().toISOString(), readBy: [fromId] }) }
          : c).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      })),

      markRead: (id, meId) => set(s => ({
        conversations: s.conversations.map(c => c.id === id
          ? { ...c, messages: c.messages.map(m => m.readBy.includes(meId) ? m : { ...m, readBy: [...m.readBy, meId] }) }
          : c),
      })),
    }),
    {
      name: 'agentix-messaging', version: 2, storage: createJSONStorage(() => localStorage), skipHydration: true,
      // v1 was doctor-centric (contact/mine); discard it for the participant-based bus.
      migrate: (persisted: unknown, version: number) => (version < 2 ? { conversations: seed() } : (persisted as { conversations: Conversation[] })),
    },
  ),
)
