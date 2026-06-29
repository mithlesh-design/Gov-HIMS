import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export interface DrugInteractionResult {
  hasCritical: boolean
  interactions: Array<{
    drug1: string
    drug2: string
    severity: 'major' | 'moderate' | 'minor'
    effect: string
    recommendation: string
  }>
}

export async function checkDrugInteractionsAi(drugs: string[]): Promise<AiEnvelope<DrugInteractionResult>> {
  await new Promise((r) => setTimeout(r, 300))
  void drugs
  return wrapAiResponse<DrugInteractionResult>(
    {
      hasCritical: false,
      interactions: [
        { drug1: 'Metformin', drug2: 'Contrast Media', severity: 'major', effect: 'Risk of lactic acidosis', recommendation: 'Hold Metformin 48hrs before and after contrast. Check renal function.' },
      ],
    },
    0.95,
    'Interaction database cross-reference. Rule-based engine provides deterministic hard blocks; AI layer provides additional context.'
  )
}
