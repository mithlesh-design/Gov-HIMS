import { wrapAiResponse } from '@/lib/ai-helpers'
import { aiJSON } from '@/lib/ai-client'
import type { AiEnvelope } from '@/types/ai'

export interface TriageAssessment {
  esiLevel: 1 | 2 | 3 | 4 | 5
  label: string
  color: string
  expectedWaitMinutes: number
  immediateActions: string[]
  reasoning: string
}

const FALLBACK: TriageAssessment = {
  esiLevel: 3,
  label: 'Urgent',
  color: '#F59E0B',
  expectedWaitMinutes: 30,
  immediateActions: ['Record full vitals', 'Pain score assessment', 'Notify triage physician'],
  reasoning: 'Reference assessment (AI unavailable) — clinician review required.',
}

const SYSTEM = `You are an experienced emergency-department triage nurse applying the Emergency Severity Index (ESI). Given a chief complaint and vitals, assign an ESI level with immediate actions.
ESI mapping: 1 = Resuscitation (#DC2626), 2 = Emergent (#EF4444), 3 = Urgent (#F59E0B), 4 = Less urgent (#10B981), 5 = Non-urgent (#22C55E).
Return JSON: {"esiLevel":1|2|3|4|5,"label":string,"color":"#hex","expectedWaitMinutes":number,"immediateActions":string[3-5],"reasoning":string}. Be clinically sound and concise. Escalate for red-flag features (chest pain, hypoxia, altered mental status, severe bleeding).`

export async function assessTriage(
  vitals: Record<string, string | number>,
  chiefComplaint: string,
): Promise<AiEnvelope<TriageAssessment>> {
  const user = `Chief complaint: ${chiefComplaint || 'unspecified'}\nVitals: ${JSON.stringify(vitals)}`
  const data = await aiJSON<TriageAssessment>(SYSTEM, user, { temperature: 0.2 })
  if (!data || !data.esiLevel) {
    return wrapAiResponse(FALLBACK, 0.5, 'AI unavailable — reference triage shown; verify manually.')
  }
  return wrapAiResponse(data, data.esiLevel <= 2 ? 0.9 : 0.82, data.reasoning || 'ESI triage from vitals and chief complaint.')
}
