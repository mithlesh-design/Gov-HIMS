import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Doctor AI copilot conversations — persisted to localStorage so previous
// chats survive navigation and reload.

export type AssistantDraft = { kind: 'round_note' | 'prescription' | 'discharge_summary' | 'referral'; title: string; content: string; patientId?: string; condition?: string; payload?: { meds?: string[]; specialty?: string } }
export type AssistantMsg = { role: 'user' | 'ai'; text: string; draft?: AssistantDraft }
export type AssistantThread = { id: string; title: string; messages: AssistantMsg[]; updatedAt: string }

interface AssistantState {
  threads: AssistantThread[]
  activeId: string | null
  newThread: () => string
  selectThread: (id: string) => void
  appendMessage: (id: string, msg: AssistantMsg) => void
  deleteThread: (id: string) => void
}

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set) => ({
      threads: [],
      activeId: null,
      newThread: () => {
        const id = `t-${Date.now()}`
        set(s => ({ threads: [{ id, title: 'New conversation', messages: [], updatedAt: new Date().toISOString() }, ...s.threads], activeId: id }))
        return id
      },
      selectThread: (id) => set({ activeId: id }),
      appendMessage: (id, msg) => set(s => ({
        threads: s.threads.map(t => t.id === id
          ? { ...t, messages: [...t.messages, msg], updatedAt: new Date().toISOString(), title: (t.messages.length === 0 && msg.role === 'user') ? msg.text.slice(0, 42) : t.title }
          : t),
      })),
      deleteThread: (id) => set(s => {
        const threads = s.threads.filter(t => t.id !== id)
        return { threads, activeId: s.activeId === id ? (threads[0]?.id ?? null) : s.activeId }
      }),
    }),
    { name: 'agentix-doctor-assistant' },
  ),
)
