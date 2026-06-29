import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'
import type { JourneyEntry, JourneyState } from '@/store/useJourneyStore'

export interface BottleneckItem {
  state: JourneyState
  patientsStuck: number
  avgMinutesInState: number
  slaBreachCount: number
  recommendation: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
}

export interface BottleneckReport {
  bottlenecks: BottleneckItem[]
  systemPressureScore: number
  predictedPeakIn?: string
  suggestedActions: string[]
  totalPatientsActive: number
}

const STATE_LABELS: Partial<Record<JourneyState, string>> = {
  VITALS_IN_PROGRESS: 'Vitals Capture',
  IN_CONSULT: 'Consultation',
  LAB_ORDERED: 'Lab — Awaiting Results',
  LAB_RESULTED: 'Lab Results Ready',
  PHARMACY_QUEUED: 'Pharmacy Queue',
  BILLING_PENDING: 'Billing',
  DISCHARGE_PENDING_BILLING: 'Discharge — Billing Pending',
  ADMITTED_IPD: 'IPD Admission',
  IPD_CRITICAL: 'ICU/Critical Care',
}

const RECOMMENDATIONS: Partial<Record<JourneyState, string>> = {
  VITALS_IN_PROGRESS: 'Deploy additional nursing staff to vitals station.',
  IN_CONSULT: 'Open additional consultation rooms or request on-call doctors.',
  LAB_ORDERED: 'Escalate to lab supervisor — TAT breach risk.',
  LAB_RESULTED: 'Notify doctors with pending lab results to review.',
  PHARMACY_QUEUED: 'Activate second dispensing counter — queue exceeding SLA.',
  BILLING_PENDING: 'Alert billing team — multiple patients awaiting clearance.',
  DISCHARGE_PENDING_BILLING: 'Priority discharge clearance required — patients blocked.',
  IPD_CRITICAL: 'Ensure ICU staffing levels are adequate.',
  ADMITTED_IPD: 'Review bed allocation — admission queue forming.',
}

export async function detectFlowBottlenecks(
  entries: JourneyEntry[]
): Promise<AiEnvelope<BottleneckReport>> {
  await new Promise((r) => setTimeout(r, 500))

  const stateCounts: Partial<Record<JourneyState, { count: number; totalMinutes: number; slaBreaches: number }>> = {}

  for (const entry of entries) {
    const state = entry.currentState
    const minutesInState = (Date.now() - new Date(entry.enteredStateAt).getTime()) / 60000
    if (!stateCounts[state]) stateCounts[state] = { count: 0, totalMinutes: 0, slaBreaches: 0 }
    stateCounts[state]!.count++
    stateCounts[state]!.totalMinutes += minutesInState
    if (entry.slaBreachRisk) stateCounts[state]!.slaBreaches++
  }

  const bottlenecks: BottleneckItem[] = Object.entries(stateCounts)
    .filter(([, data]) => data.slaBreaches > 0 || data.count >= 2)
    .map(([state, data]) => {
      const avgMinutes = data.totalMinutes / data.count
      const urgency: BottleneckItem['urgency'] =
        data.slaBreaches >= 3 ? 'critical' :
        data.slaBreaches >= 2 ? 'high' :
        data.slaBreaches >= 1 ? 'medium' : 'low'

      return {
        state: state as JourneyState,
        patientsStuck: data.count,
        avgMinutesInState: Math.round(avgMinutes),
        slaBreachCount: data.slaBreaches,
        recommendation: RECOMMENDATIONS[state as JourneyState] ?? `Review ${STATE_LABELS[state as JourneyState] ?? state} workflow.`,
        urgency,
      }
    })
    .sort((a, b) => ['critical', 'high', 'medium', 'low'].indexOf(a.urgency) - ['critical', 'high', 'medium', 'low'].indexOf(b.urgency))

  const totalBreaches = entries.filter(e => e.slaBreachRisk).length
  const systemPressureScore = Math.min(100, Math.round((totalBreaches / Math.max(entries.length, 1)) * 100 * 1.5))

  const suggestedActions: string[] = []
  if (systemPressureScore > 80) suggestedActions.push('Activate surge protocol — system under critical load.')
  if (bottlenecks.some(b => b.state === 'DISCHARGE_PENDING_BILLING')) suggestedActions.push('Priority discharge billing clearance to free beds.')
  if (bottlenecks.some(b => b.state === 'PHARMACY_QUEUED')) suggestedActions.push('Open additional pharmacy counter.')
  if (bottlenecks.some(b => b.state === 'LAB_ORDERED')) suggestedActions.push('Alert lab for urgent TAT review.')
  if (suggestedActions.length === 0) suggestedActions.push('System operating within normal parameters.')

  return wrapAiResponse<BottleneckReport>(
    {
      bottlenecks,
      systemPressureScore,
      predictedPeakIn: systemPressureScore > 60 ? '30–45 minutes' : undefined,
      suggestedActions,
      totalPatientsActive: entries.length,
    },
    0.82,
    `Bottleneck analysis over ${entries.length} active patients. ${totalBreaches} SLA breach(es) detected. System pressure: ${systemPressureScore}/100.`
  )
}
