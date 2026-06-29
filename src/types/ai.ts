export type ConfidenceTier = 'high' | 'medium' | 'low'

export interface AiAction {
  id: string
  label: string
  type: 'navigate' | 'store_mutation' | 'notification' | 'external'
  payload: Record<string, unknown>
  requiresConfirmation: boolean
}

export interface AiEnvelope<T> {
  data: T
  confidence: number
  confidenceTier: ConfidenceTier
  reasoning: string
  disclaimer: string
  modelVersion: string
  generatedAt: string
  requiresReview: boolean
  actions?: AiAction[]
  sessionId?: string
}

export interface HitlDecision {
  envelopeId: string
  action: 'accept' | 'reject' | 'modify'
  reason?: string
  userId: string
  timestamp: string
}
