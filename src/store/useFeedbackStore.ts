import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type FeedbackVote = 'up' | 'down'

export interface AiFeedback {
  id: string
  featureId: string
  envelopeId?: string
  vote: FeedbackVote
  comment?: string
  userId: string
  userName: string
  timestamp: string
}

export interface AiPerformanceReport {
  byFeature: Array<{
    featureId: string
    totalVotes: number
    upVotes: number
    downVotes: number
    acceptanceRate: number
  }>
  totalFeedbacks: number
  overallAcceptanceRate: number
}

interface FeedbackState {
  feedbacks: AiFeedback[]
  addFeedback: (f: Omit<AiFeedback, 'id' | 'timestamp'>) => void
  getFeatureSummary: (featureId: string) => { up: number; down: number }
  getPerformanceReport: () => AiPerformanceReport
}

export const useFeedbackStore = create<FeedbackState>()(persist((set, get) => ({
  feedbacks: [],
  addFeedback: (f) =>
    set((state) => ({
      feedbacks: [
        {
          ...f,
          id: `FB-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          timestamp: new Date().toISOString(),
        },
        ...state.feedbacks,
      ],
    })),
  getFeatureSummary: (featureId) => {
    const list = get().feedbacks.filter((f) => f.featureId === featureId)
    return { up: list.filter((f) => f.vote === 'up').length, down: list.filter((f) => f.vote === 'down').length }
  },
  getPerformanceReport: () => {
    const all = get().feedbacks
    const byFeature = Object.entries(
      all.reduce<Record<string, AiFeedback[]>>((acc, f) => {
        acc[f.featureId] = [...(acc[f.featureId] ?? []), f]
        return acc
      }, {})
    ).map(([featureId, list]) => {
      const upVotes = list.filter(f => f.vote === 'up').length
      return {
        featureId,
        totalVotes: list.length,
        upVotes,
        downVotes: list.length - upVotes,
        acceptanceRate: list.length > 0 ? Math.round((upVotes / list.length) * 100) : 0,
      }
    })
    const totalUp = all.filter(f => f.vote === 'up').length
    return {
      byFeature,
      totalFeedbacks: all.length,
      overallAcceptanceRate: all.length > 0 ? Math.round((totalUp / all.length) * 100) : 0,
    }
  },
}),
  {
    name: 'agentix-feedbackstore', version: 1,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))
