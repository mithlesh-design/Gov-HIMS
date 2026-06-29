import type { AiEnvelope, ConfidenceTier } from '@/types/ai'

const DISCLAIMER =
  'AI-generated suggestions are for clinical decision support only. Verify before acting.'

export function getConfidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 0.85) return 'high'
  if (confidence >= 0.6) return 'medium'
  return 'low'
}

export function wrapAiResponse<T>(
  data: T,
  confidence: number,
  reasoning: string,
  modelVersion = 'agentix-ai-v1'
): AiEnvelope<T> {
  const confidenceTier = getConfidenceTier(confidence)
  return {
    data,
    confidence,
    confidenceTier,
    reasoning,
    disclaimer: DISCLAIMER,
    modelVersion,
    generatedAt: new Date().toISOString(),
    requiresReview: confidenceTier !== 'high',
  }
}

export function shouldAutoApply(envelope: AiEnvelope<unknown>): boolean {
  return envelope.confidenceTier === 'high'
}

export function confidenceColor(tier: ConfidenceTier): string {
  switch (tier) {
    case 'high':   return 'text-green-600'
    case 'medium': return 'text-amber-500'
    case 'low':    return 'text-red-500'
  }
}

export function confidenceBorderColor(tier: ConfidenceTier): string {
  switch (tier) {
    case 'high':   return 'border-green-400'
    case 'medium': return 'border-amber-400'
    case 'low':    return 'border-red-400'
  }
}

export function confidenceBgColor(tier: ConfidenceTier): string {
  switch (tier) {
    case 'high':   return 'bg-green-50'
    case 'medium': return 'bg-amber-50'
    case 'low':    return 'bg-red-50'
  }
}
