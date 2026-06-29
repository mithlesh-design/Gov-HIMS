import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'
import type { DietPlan } from '@/store/useDietaryStore'

export async function suggestDietPlan(patientId: string): Promise<AiEnvelope<Omit<DietPlan, 'id' | 'ward' | 'bedNumber' | 'startDate'>>> {
  await new Promise((r) => setTimeout(r, 450))
  return wrapAiResponse(
    { patientId, patientName: 'Kiran Patil', dietType: 'Diabetic' as const, allergyFlags: [], calorieTarget: 1800, notes: 'Low-GI foods preferred. Limit refined carbohydrates. Adequate protein for tissue repair during infection.', prescribedBy: 'AI Diet Planner', aiGenerated: true, aiConfidence: 0.87 },
    0.87,
    'Diet plan based on diagnosis (T2DM + CAP), weight, renal function, and allergy profile.'
  )
}
