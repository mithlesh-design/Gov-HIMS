import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export interface PrescriptionItem {
  genericName: string
  brandSuggestion: string
  dose: string
  route: string
  frequency: string
  duration: string
  instructions: string
  warningFlags: string[]
}

export interface PrescriptionDraft {
  items: PrescriptionItem[]
  allergyCheckPassed: boolean
  interactionFlags: string[]
  totalItems: number
}

export async function suggestPrescription(
  diagnosisCode: string,
  allergies: string[]
): Promise<AiEnvelope<PrescriptionDraft>> {
  await new Promise((r) => setTimeout(r, 500))
  void diagnosisCode
  const hasPenicillinAllergy = allergies.some((a) => a.toLowerCase().includes('penicillin'))
  const items: PrescriptionItem[] = [
    {
      genericName: 'Amoxicillin-Clavulanate',
      brandSuggestion: 'Augmentin 625mg',
      dose: '625mg',
      route: 'Oral',
      frequency: 'TID',
      duration: '7 days',
      instructions: 'Take with food',
      warningFlags: hasPenicillinAllergy ? ['ALLERGY ALERT: Penicillin allergy documented — BLOCKED'] : [],
    },
    {
      genericName: 'Azithromycin',
      brandSuggestion: 'Azithral 500mg',
      dose: '500mg',
      route: 'Oral',
      frequency: 'OD',
      duration: '5 days',
      instructions: 'Take 1 hour before or 2 hours after meals',
      warningFlags: [],
    },
    {
      genericName: 'Salbutamol',
      brandSuggestion: 'Asthalin 100mcg inhaler',
      dose: '100mcg (2 puffs)',
      route: 'Inhalation',
      frequency: 'Q4H PRN',
      duration: '5 days',
      instructions: 'Use spacer. Shake well before use.',
      warningFlags: [],
    },
  ]
  return wrapAiResponse<PrescriptionDraft>(
    {
      items: hasPenicillinAllergy ? items.filter((_, i) => i !== 0) : items,
      allergyCheckPassed: !hasPenicillinAllergy,
      interactionFlags: [],
      totalItems: hasPenicillinAllergy ? items.length - 1 : items.length,
    },
    hasPenicillinAllergy ? 0.91 : 0.86,
    'Protocol-aligned prescription for CAP. Allergy cross-check applied.'
  )
}
