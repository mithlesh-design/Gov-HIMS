import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export interface SlotSuggestion { date: string; startTime: string; endTime: string; expectedWaitMin: number; utilizationPct: number; patientCategory: string }
export async function optimizeAppointmentSlots(docId: string): Promise<AiEnvelope<SlotSuggestion[]>> {
  await new Promise((r) => setTimeout(r, 400))
  void docId
  return wrapAiResponse<SlotSuggestion[]>([{ date: '2026-05-10', startTime: '09:00', endTime: '09:15', expectedWaitMin: 5, utilizationPct: 85, patientCategory: 'Follow-up' }, { date: '2026-05-10', startTime: '10:30', endTime: '10:45', expectedWaitMin: 12, utilizationPct: 90, patientCategory: 'New consultation' }], 0.79, 'Historical no-show rate, appointment duration distribution, and patient category mix used for slot optimisation.')
}
