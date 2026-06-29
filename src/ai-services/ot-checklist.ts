import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export interface ChecklistItem {
  id: string
  category: 'identity' | 'consent' | 'site' | 'anaesthesia' | 'equipment' | 'team'
  label: string
  status: 'verified' | 'pending' | 'not_applicable'
  verifiedBy?: string
  isCritical: boolean
}

export interface ChecklistResult {
  surgeryId: string
  phase: 'sign_in' | 'time_out' | 'sign_out'
  items: ChecklistItem[]
  canProceed: boolean
  blockingItems: string[]
}

export async function verifyOTChecklist(surgeryId: string): Promise<AiEnvelope<ChecklistResult>> {
  await new Promise((r) => setTimeout(r, 300))
  const items: ChecklistItem[] = [
    { id: 'C1', category: 'identity', label: 'Patient identity confirmed (name + DOB + MRN)', status: 'verified', verifiedBy: 'Nurse Anjali', isCritical: true },
    { id: 'C2', category: 'consent', label: 'Informed consent signed and on chart', status: 'verified', verifiedBy: 'Dr. Anisha Sharma', isCritical: true },
    { id: 'C3', category: 'site', label: 'Surgical site marked by operating surgeon', status: 'verified', verifiedBy: 'Dr. Anisha Sharma', isCritical: true },
    { id: 'C4', category: 'anaesthesia', label: 'Anaesthesia safety check completed', status: 'verified', verifiedBy: 'Dr. Ramesh Gupta', isCritical: true },
    { id: 'C5', category: 'equipment', label: 'Pulse oximeter functional and reading', status: 'verified', isCritical: true },
    { id: 'C6', category: 'team', label: 'All team members introduced', status: 'pending', isCritical: false },
    { id: 'C7', category: 'identity', label: 'Known allergies confirmed with team', status: 'verified', isCritical: true },
  ]
  const blockingItems = items.filter((i) => i.isCritical && i.status === 'pending').map((i) => i.label)
  return wrapAiResponse<ChecklistResult>(
    { surgeryId, phase: 'sign_in', items, canProceed: blockingItems.length === 0, blockingItems },
    0.97,
    'WHO Surgical Safety Checklist verification. Deterministic gate — all critical items must be verified.'
  )
}
