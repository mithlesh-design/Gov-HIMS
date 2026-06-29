import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export interface PreBriefData {
  patientId: string
  patientName: string
  age: number
  gender: string
  chiefComplaint: string
  activeConditions: string[]
  currentMedications: string[]
  allergies: string[]
  recentLabAlerts: string[]
  lastVisitSummary: string
  suggestedFocusAreas: string[]
}

export async function generatePreBrief(patientId: string): Promise<AiEnvelope<PreBriefData>> {
  await new Promise((r) => setTimeout(r, 400))
  return wrapAiResponse<PreBriefData>(
    {
      patientId,
      patientName: 'Kiran Patil',
      age: 52,
      gender: 'Male',
      chiefComplaint: 'Shortness of breath and chest tightness since 2 days',
      activeConditions: ['Type 2 Diabetes Mellitus (ICD: E11)', 'Hypertension (ICD: I10)', 'Chronic Kidney Disease Stage 3 (ICD: N18.3)'],
      currentMedications: ['Metformin 500mg BD', 'Amlodipine 5mg OD', 'Telmisartan 40mg OD'],
      allergies: ['Penicillin (Rash)', 'Sulfonamides (Angioedema)'],
      recentLabAlerts: ['eGFR 38 mL/min (↓ from 45 — 3 months ago)', 'HbA1c 8.4% (target <7%)'],
      lastVisitSummary: 'Review 3 months ago — BP controlled, diabetes poorly controlled, advised dietary modification.',
      suggestedFocusAreas: ['Assess dyspnoea — rule out cardiac vs renal origin', 'Review metformin safety given eGFR <40', 'Evaluate fluid overload signs'],
    },
    0.88,
    'Pattern derived from 3 prior visits, lab trends, and chief complaint. Confidence high for medication review; moderate for dyspnoea aetiology without ECG/echo data.'
  )
}
