import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export interface OTBriefing {
  surgeryId: string
  patientName: string
  procedure: string
  surgeon: string
  anaesthetist: string
  scheduledAt: string
  estimatedDurationMin: number
  bloodGroupReady: string
  allergies: string[]
  riskFactors: string[]
  preOpInstructions: string[]
  equipmentRequired: string[]
  implants: string[]
}

export async function generateOTBriefing(surgeryId: string): Promise<AiEnvelope<OTBriefing>> {
  await new Promise((r) => setTimeout(r, 500))
  return wrapAiResponse<OTBriefing>(
    { surgeryId, patientName: 'Kiran Patil', procedure: 'Laparoscopic Cholecystectomy', surgeon: 'Dr. Anisha Sharma', anaesthetist: 'Dr. Ramesh Gupta', scheduledAt: '2026-05-10T09:00:00Z', estimatedDurationMin: 90, bloodGroupReady: 'A+ (2 units PRBC reserved)', allergies: ['Penicillin'], riskFactors: ['T2DM — tight glucose control intraop required', 'Hypertension — maintain MAP >65 mmHg', 'CKD — avoid nephrotoxic agents'], preOpInstructions: ['NPO from midnight', 'Bowel prep not required for laparoscopic', 'Pre-op blood glucose check', 'Continue antihypertensives with sip of water'], equipmentRequired: ['Laparoscopic tower', 'CO2 insufflator', 'Harmonic scalpel', 'Hasson trocar'], implants: [] },
    0.86,
    'Briefing compiled from surgical booking, patient record, and pre-anaesthesia assessment.'
  )
}
