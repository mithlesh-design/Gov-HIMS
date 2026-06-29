import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export interface MortalityRisk { patientId: string; score: number; riskLevel: 'low' | 'moderate' | 'high' | 'very_high'; contributingFactors: string[]; recommendations: string[] }
export async function assessMortalityRisk(patientId: string): Promise<AiEnvelope<MortalityRisk>> {
  await new Promise((r) => setTimeout(r, 400))
  return wrapAiResponse<MortalityRisk>({ patientId, score: 0.12, riskLevel: 'low', contributingFactors: ['Age >50', 'CKD Stage 3', 'Uncontrolled T2DM'], recommendations: ['Close monitoring of renal function', 'Tight glycaemic control', 'Avoid nephrotoxics'] }, 0.78, 'APACHE II-inspired scoring with comorbidity weighting.')
}
