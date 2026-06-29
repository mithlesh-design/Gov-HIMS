import { wrapAiResponse } from '@/lib/ai-helpers'
import { aiJSON } from '@/lib/ai-client'
import type { AiEnvelope } from '@/types/ai'

export interface DiagnosisSuggestion {
  icdCode: string
  description: string
  probability: number
  supportingFindings: string[]
  ruledOutBy?: string[]
}

const FALLBACK: DiagnosisSuggestion[] = [
  { icdCode: 'R69', description: 'Illness, unspecified — clinical correlation needed', probability: 0.5, supportingFindings: ['Insufficient data for AI differential'] },
]

const SYSTEM = `You are a clinical decision-support assistant generating a differential diagnosis for a physician. From the clinical notes and vitals, list the most likely diagnoses with ICD-10 codes.
Return JSON: {"diagnoses":[{"icdCode":string,"description":string,"probability":number 0-1,"supportingFindings":string[],"ruledOutBy"?:string[]}]}. Order by descending probability; probabilities should sum to roughly 1. Provide 2-4 diagnoses. This is decision support only — be evidence-based and note what investigations would confirm.`

export async function suggestDiagnoses(
  notes: string,
  vitals: Record<string, string | number>,
): Promise<AiEnvelope<DiagnosisSuggestion[]>> {
  const user = `Clinical notes: ${notes || 'none provided'}\nVitals: ${JSON.stringify(vitals)}`
  const out = await aiJSON<{ diagnoses?: DiagnosisSuggestion[] }>(SYSTEM, user, { temperature: 0.3, maxTokens: 800 })
  const list = out?.diagnoses
  if (!Array.isArray(list) || !list.length) {
    return wrapAiResponse(FALLBACK, 0.4, 'AI unavailable — no differential generated; clinician assessment required.')
  }
  return wrapAiResponse(list.slice(0, 4), 0.74, 'Differential generated from clinical notes and vitals. Confirm with appropriate investigations.')
}
