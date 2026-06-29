import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { runAdminCopilot } from '@/lib/copilotLLM'
import type { AdminLink } from '@/lib/adminCopilot'

// Admin AI assistant conversation — a single grounded, whole-hospital chat,
// persisted so the thread survives navigation/reload. Answers are produced by
// the grounded engine (runAdminCopilot); the store just records the exchange.

export type AdminMsg = {
  role: 'user' | 'ai'
  text: string
  links?: AdminLink[]
  sources?: string[]
  confidence?: number
  ts: string
}

interface AdminAssistantState {
  messages: AdminMsg[]
  /** Append the user's question, run the grounded engine, append the answer. */
  ask: (query: string) => void
  clear: () => void
}

export const useAdminAssistantStore = create<AdminAssistantState>()(
  persist(
    (set) => ({
      messages: [],
      ask: (query: string) => {
        const q = query.trim()
        if (!q) return
        const now = () => new Date().toISOString()
        const userMsg: AdminMsg = { role: 'user', text: q, ts: now() }
        const a = runAdminCopilot(q)
        const aiMsg: AdminMsg = {
          role: 'ai', text: a.text, links: a.links, sources: a.sources, confidence: a.confidence, ts: now(),
        }
        set(s => ({ messages: [...s.messages, userMsg, aiMsg] }))
      },
      clear: () => set({ messages: [] }),
    }),
    { name: 'umang-admin-assistant' },
  ),
)
