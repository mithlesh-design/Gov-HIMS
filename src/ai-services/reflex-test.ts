import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export interface ReflexSuggestion {
  testCode: string
  testName: string
  triggerCondition: string
  urgency: 'STAT' | 'routine'
  rationale: string
}

export async function suggestReflexTests(
  labResults: Record<string, string | number>
): Promise<AiEnvelope<ReflexSuggestion[]>> {
  await new Promise((r) => setTimeout(r, 350))
  void labResults
  return wrapAiResponse<ReflexSuggestion[]>(
    [
      { testCode: 'BLOOD-CULT', testName: 'Blood Culture × 2', triggerCondition: 'WBC 18,200 + Fever', urgency: 'STAT', rationale: 'Leukocytosis with fever — sepsis screening protocol' },
      { testCode: 'PCT', testName: 'Procalcitonin', triggerCondition: 'Suspected bacterial infection', urgency: 'STAT', rationale: 'Differentiates bacterial vs viral infection, guides antibiotic stewardship' },
      { testCode: 'D-DIMER', testName: 'D-Dimer', triggerCondition: 'Chest pain + dyspnoea', urgency: 'STAT', rationale: 'Rule out pulmonary embolism (Wells score ≥2)' },
    ],
    0.84,
    'Reflex triggers based on lab result patterns and clinical protocol mapping.'
  )
}
