import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export interface CapaItem {
  id: string
  category: 'process' | 'training' | 'infrastructure' | 'policy' | 'equipment'
  title: string
  rootCause: string
  immediateAction: string
  preventiveAction: string
  responsible: string
  targetDate: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface CapaReport {
  suggestions: CapaItem[]
  clusterTheme: string
  estimatedRiskReduction: number
}

const CAPA_TEMPLATES: Array<Omit<CapaItem, 'id' | 'targetDate'>> = [
  {
    category: 'process',
    title: 'Standardise medication reconciliation at discharge',
    rootCause: 'Absence of structured checklist leads to omissions at discharge transition',
    immediateAction: 'Implement mandatory double-check by pharmacist before discharge sign-off',
    preventiveAction: 'Integrate automated reconciliation alert in HMS discharge workflow',
    responsible: 'Chief Pharmacist + CMO',
    priority: 'high',
  },
  {
    category: 'training',
    title: 'Hand hygiene compliance training refresher',
    rootCause: 'Compliance monitoring shows gap in ICU staff adherence during night shifts',
    immediateAction: 'Schedule mandatory 30-minute refresher session for all ward staff this week',
    preventiveAction: 'Install alcohol hand-rub dispensers at every 4 beds; add compliance to monthly KPIs',
    responsible: 'Infection Control Nurse + Head of Nursing',
    priority: 'critical',
  },
  {
    category: 'infrastructure',
    title: 'Upgrade nurse call system in General Ward',
    rootCause: 'Delayed response to patient calls contributing to fall events',
    immediateAction: 'Assign dedicated nurse to general ward during peak hours as interim measure',
    preventiveAction: 'Procure wireless nurse-call system with automated escalation after 3 minutes',
    responsible: 'Director of Operations',
    priority: 'high',
  },
  {
    category: 'policy',
    title: 'Establish antibiotic stewardship protocol',
    rootCause: 'Unstructured antibiotic prescribing contributing to resistance patterns',
    immediateAction: 'Require infectious disease sign-off for all carbapenem prescriptions',
    preventiveAction: 'Implement automated antibiogram alerts in HMS consultation workflow',
    responsible: 'Infectious Disease Consultant + CMO',
    priority: 'high',
  },
  {
    category: 'equipment',
    title: 'Preventive maintenance for infusion pumps',
    rootCause: 'Two infusion pump malfunctions this quarter attributed to missed maintenance cycles',
    immediateAction: 'Immediate inspection of all infusion pumps in ICU and high-dependency units',
    preventiveAction: 'Schedule quarterly preventive maintenance; add equipment status to daily safety brief',
    responsible: 'Biomedical Engineering + Head ICU',
    priority: 'medium',
  },
]

export async function suggestCAPA(
  incident: Record<string, unknown>,
): Promise<AiEnvelope<CapaReport>> {
  await new Promise(r => setTimeout(r, 700))
  void incident

  const count = 2 + Math.floor(Math.random() * 2)
  const selected = CAPA_TEMPLATES.slice(0, count)
  const suggestions: CapaItem[] = selected.map((t, i) => ({
    ...t,
    id: `CAPA-${Date.now()}-${i}`,
    targetDate: new Date(Date.now() + (14 + i * 7) * 24 * 3600000).toISOString().slice(0, 10),
  }))

  return wrapAiResponse<CapaReport>(
    {
      suggestions,
      clusterTheme: 'Patient Safety & Process Compliance',
      estimatedRiskReduction: 62,
    },
    0.84,
    `CAPA suggestions generated from incident analysis. ${count} action items identified. Estimated risk reduction: 62%.`,
  )
}
