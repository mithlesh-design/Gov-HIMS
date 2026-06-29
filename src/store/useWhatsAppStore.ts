import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type IntentType =
  | 'APPOINTMENT_BOOK'
  | 'APPOINTMENT_QUERY'
  | 'REPORT_REQUEST'
  | 'PRESCRIPTION_REMINDER'
  | 'FOLLOWUP_BOOK'
  | 'INTAKE_ASSIST'
  | 'GENERAL_QUERY'
  | 'ESCALATION_NEEDED'
  | 'OTP_VERIFICATION'
  | 'UNKNOWN'

export interface WhatsAppMessage {
  id: string
  from: 'patient' | 'ai' | 'human_agent'
  text: string
  timestamp: string
  intent?: IntentType
  requiresOTP?: boolean
}

export interface WhatsAppThread {
  id: string
  patientPhone: string
  patientName?: string
  patientId?: string
  identityVerified: boolean
  messages: WhatsAppMessage[]
  lastActivity: string
  escalatedToHuman: boolean
  status: 'active' | 'resolved' | 'escalated'
}

interface WhatsAppStore {
  threads: WhatsAppThread[]
  addThread: (thread: WhatsAppThread) => void
  addMessage: (threadId: string, message: Omit<WhatsAppMessage, 'id' | 'timestamp'>) => void
  resolvePatientIdentity: (threadId: string, patientId: string, patientName: string) => void
  escalateToHuman: (threadId: string) => void
  resolveThread: (threadId: string) => void
}

const DEMO_THREADS: WhatsAppThread[] = [
  {
    id: 'WA-001',
    patientPhone: '+91 98765 43210',
    patientName: 'Meera Pillai',
    patientId: 'PT-20391',
    identityVerified: true,
    lastActivity: new Date(Date.now() - 5 * 60000).toISOString(),
    escalatedToHuman: false,
    status: 'active',
    messages: [
      {
        id: 'msg-1',
        from: 'patient',
        text: 'Hello, I want to book an appointment with cardiologist',
        timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
        intent: 'APPOINTMENT_BOOK',
      },
      {
        id: 'msg-2',
        from: 'ai',
        text: 'Hello! I can help you book an appointment with our Cardiology department. What date works for you?',
        timestamp: new Date(Date.now() - 11 * 60000).toISOString(),
        intent: 'APPOINTMENT_BOOK',
      },
      {
        id: 'msg-3',
        from: 'patient',
        text: 'Tomorrow morning if possible',
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        intent: 'APPOINTMENT_BOOK',
      },
    ],
  },
  {
    id: 'WA-002',
    patientPhone: '+91 99887 76655',
    patientName: 'Rakesh Verma',
    patientId: 'PT-20396',
    identityVerified: false,
    lastActivity: new Date(Date.now() - 25 * 60000).toISOString(),
    escalatedToHuman: false,
    status: 'active',
    messages: [
      {
        id: 'msg-4',
        from: 'patient',
        text: 'Send me my lab reports',
        timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
        intent: 'REPORT_REQUEST',
        requiresOTP: true,
      },
      {
        id: 'msg-5',
        from: 'ai',
        text: 'To share your reports securely, please verify your identity. We\'ve sent an OTP to your registered number. Please enter it here.',
        timestamp: new Date(Date.now() - 24 * 60000).toISOString(),
        intent: 'OTP_VERIFICATION',
        requiresOTP: true,
      },
    ],
  },
  {
    id: 'WA-003',
    patientPhone: '+91 97123 45678',
    patientName: 'Nalini Kumar',
    identityVerified: true,
    lastActivity: new Date(Date.now() - 60 * 60000).toISOString(),
    escalatedToHuman: true,
    status: 'escalated',
    messages: [
      {
        id: 'msg-6',
        from: 'patient',
        text: 'Mere baache ki tabiyat bahut kharab hai, kya karein?',
        timestamp: new Date(Date.now() - 65 * 60000).toISOString(),
        intent: 'ESCALATION_NEEDED',
      },
      {
        id: 'msg-7',
        from: 'ai',
        text: 'I understand you are worried. I am connecting you to our reception team immediately.',
        timestamp: new Date(Date.now() - 64 * 60000).toISOString(),
        intent: 'ESCALATION_NEEDED',
      },
      {
        id: 'msg-8',
        from: 'human_agent',
        text: 'Hello, this is Agentix HIMS reception. Please tell us your child\'s symptoms and we will guide you immediately.',
        timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
      },
    ],
  },
]

export const useWhatsAppStore = create<WhatsAppStore>()(persist((set) => ({
  threads: DEMO_THREADS,

  addThread: (thread) =>
    set(state => ({ threads: [thread, ...state.threads] })),

  addMessage: (threadId, message) =>
    set(state => ({
      threads: state.threads.map(t => {
        if (t.id !== threadId) return t
        const newMsg: WhatsAppMessage = {
          ...message,
          id: `msg-${Date.now()}`,
          timestamp: new Date().toISOString(),
        }
        return { ...t, messages: [...t.messages, newMsg], lastActivity: newMsg.timestamp }
      }),
    })),

  resolvePatientIdentity: (threadId, patientId, patientName) =>
    set(state => ({
      threads: state.threads.map(t =>
        t.id === threadId ? { ...t, patientId, patientName, identityVerified: true } : t
      ),
    })),

  escalateToHuman: (threadId) =>
    set(state => ({
      threads: state.threads.map(t =>
        t.id === threadId ? { ...t, escalatedToHuman: true, status: 'escalated' } : t
      ),
    })),

  resolveThread: (threadId) =>
    set(state => ({
      threads: state.threads.map(t =>
        t.id === threadId ? { ...t, status: 'resolved' } : t
      ),
    })),
}),
  {
    name: 'agentix-whatsappstore', version: 1,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))
