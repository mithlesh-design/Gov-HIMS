import { create } from 'zustand'
import { mockSecretaryApi } from '@/lib/mocks/secretary/api'
import { seedCabinetTemplates } from '@/lib/mocks/secretary/seed-cabinet-templates'
import type { CabinetNote } from '@/types/secretary'

interface CabinetState {
  notes: CabinetNote[]
  templates: typeof seedCabinetTemplates
  currentDraft: string | null
  drafterPrompt: string
  drafting: boolean
  setDrafterPrompt: (p: string) => void
  generateDraft: () => Promise<void>
  saveDraft: () => Promise<void>
  signDraft: (id: string) => Promise<void>
  sendToMinister: (id: string, channel: string) => Promise<void>
  discardDraft: () => void
  loadNotes: () => void
}

export const useSecretaryCabinetStore = create<CabinetState>((set, get) => ({
  notes: [],
  templates: seedCabinetTemplates,
  currentDraft: null,
  drafterPrompt: '',
  drafting: false,
  setDrafterPrompt(p) {
    set({ drafterPrompt: p })
  },
  async generateDraft() {
    set({ drafting: true, currentDraft: null })
    const draft = await mockSecretaryApi.draftCabinetNote(get().drafterPrompt)
    set({ drafting: false, currentDraft: draft })
  },
  async saveDraft() {
    const { drafterPrompt, currentDraft } = get()
    if (!currentDraft) return
    const note = await mockSecretaryApi.saveCabinetNote(drafterPrompt, currentDraft)
    set({ notes: [note, ...get().notes] })
  },
  async signDraft(id) {
    const updated = await mockSecretaryApi.signCabinetNote(id)
    if (updated) {
      set({ notes: get().notes.map(n => n.id === id ? updated : n) })
    }
  },
  async sendToMinister(id, channel) {
    await mockSecretaryApi.sendCabinetNoteToMinister(id, channel)
    set({ notes: get().notes.map(n => n.id === id ? { ...n, status: 'sent', sentAt: new Date().toISOString() } : n) })
  },
  discardDraft() {
    set({ currentDraft: null, drafterPrompt: '' })
  },
  loadNotes() {
    set({ notes: mockSecretaryApi.getCabinetNotes() })
  },
}))
