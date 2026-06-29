import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export interface HandoverBrief { wardId: string; generatedAt: string; outgoingNurse: string; incomingNurse: string; patients: Array<{ patientId: string; name: string; bed: string; situation: string; background: string; assessment: string; recommendation: string; urgencyFlag?: string }> }
export async function generateHandoverBrief(wardId: string): Promise<AiEnvelope<HandoverBrief>> {
  await new Promise((r) => setTimeout(r, 600))
  return wrapAiResponse<HandoverBrief>({ wardId, generatedAt: new Date().toISOString(), outgoingNurse: 'Anjali Desai', incomingNurse: 'Kavitha Nair', patients: [{ patientId: 'PT-20394', name: 'Kiran Patil', bed: 'G-12', situation: 'Day 4 CAP — improving', background: 'T2DM, HTN, CKD3. Admitted for CAP.', assessment: 'Afebrile × 48hrs. SpO2 97% RA. Tolerating oral diet.', recommendation: 'Continue oral antibiotics. Blood glucose monitoring QID. Plan discharge tomorrow.', urgencyFlag: undefined }, { patientId: 'PT-20398', name: 'Mohan Lal', bed: 'ICU-3', situation: 'Sepsis Day 2 — qSOFA 2', background: 'No significant PMH. Admitted with septic shock.', assessment: 'MAP 68 mmHg on vasopressor. Lactate 2.1 mmol/L (improving).', recommendation: 'URGENT — wean vasopressor if MAP stable >65 for 2 hours. Repeat lactate at midnight.', urgencyFlag: 'CRITICAL WATCH' }] }, 0.85, 'SBAR handover brief auto-generated from nursing documentation, vitals trends, and active care plans.')
}
