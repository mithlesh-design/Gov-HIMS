import { create } from 'zustand'
import { mockSecretaryApi } from '@/lib/mocks/secretary/api'
import type { AssemblyQuestion } from '@/types/secretary'

interface AssemblyState {
  questions: AssemblyQuestion[]
  loading: boolean
  loaded: boolean
  fetchQuestions: () => Promise<void>
  draftAnswer: (questionId: string) => Promise<string>
  saveDraftAnswer: (questionId: string, answer: string) => Promise<void>
  lodgeAnswer: (questionId: string) => Promise<void>
}

export const useSecretaryAssemblyStore = create<AssemblyState>((set, get) => ({
  questions: [],
  loading: false,
  loaded: false,
  async fetchQuestions() {
    set({ loading: true })
    const questions = await mockSecretaryApi.getAssemblyQuestions()
    set({ questions, loading: false, loaded: true })
  },
  async draftAnswer(questionId) {
    return mockSecretaryApi.draftAssemblyAnswer(questionId)
  },
  async saveDraftAnswer(questionId, answer) {
    await mockSecretaryApi.saveDraftAnswer(questionId, answer)
    set({ questions: get().questions.map(q => q.id === questionId ? { ...q, draftAnswer: answer, status: 'drafted' } : q) })
  },
  async lodgeAnswer(questionId) {
    await mockSecretaryApi.lodgeAssemblyAnswer(questionId)
    set({ questions: get().questions.map(q => q.id === questionId ? { ...q, status: 'lodged' } : q) })
  },
}))
