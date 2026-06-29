import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export interface RadiologySuggestion {
  studyId: string
  modality: string
  bodyPart: string
  findings: string
  impression: string
  recommendations: string[]
  criticalFindings: string[]
}

export async function generateRadiologyReport(studyId: string): Promise<AiEnvelope<RadiologySuggestion>> {
  await new Promise((r) => setTimeout(r, 800))
  return wrapAiResponse<RadiologySuggestion>(
    {
      studyId,
      modality: 'X-ray',
      bodyPart: 'Chest (PA)',
      findings: 'Homogeneous opacity in the left lower zone. Costophrenic angles sharp bilaterally. Cardiac silhouette normal size. No pneumothorax. Trachea midline.',
      impression: 'Left lower lobe consolidation — consistent with pneumonia. No pleural effusion.',
      recommendations: ['Clinical correlation with fever, cough, and inflammatory markers recommended', 'Follow-up X-ray in 6 weeks to confirm resolution', 'Consider HRCT if no improvement in 4–6 weeks'],
      criticalFindings: [],
    },
    0.81,
    'Pattern recognition on uploaded X-ray image. Radiologist review mandatory before reporting.'
  )
}
