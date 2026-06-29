import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export interface RecallCohort {
  cohortId: string
  condition: string
  patientCount: number
  overdueForFollowup: number
  avgDaysSinceLastVisit: number
  riskLevel: 'low' | 'medium' | 'high'
  recommendedAction: string
  suggestedMessage: string
}

export interface RecallCohortReport {
  cohorts: RecallCohort[]
  totalPatientsAtRisk: number
  priorityCohort: string
}

const MOCK_COHORTS: RecallCohort[] = [
  {
    cohortId: 'COHORT-DM',
    condition: 'Type 2 Diabetes',
    patientCount: 142,
    overdueForFollowup: 38,
    avgDaysSinceLastVisit: 74,
    riskLevel: 'high',
    recommendedAction: 'Send WhatsApp recall message; schedule HbA1c camp',
    suggestedMessage: 'Dear patient, your diabetes follow-up is overdue. Please visit Agentix HIMS for HbA1c check and prescription renewal.',
  },
  {
    cohortId: 'COHORT-HTN',
    condition: 'Hypertension',
    patientCount: 89,
    overdueForFollowup: 22,
    avgDaysSinceLastVisit: 62,
    riskLevel: 'medium',
    recommendedAction: 'Send BP monitoring reminder; offer teleconsult option',
    suggestedMessage: 'Dear patient, it\'s time for your BP check. Share your home BP readings with us via WhatsApp or book a teleconsult.',
  },
  {
    cohortId: 'COHORT-CAD',
    condition: 'Coronary Artery Disease',
    patientCount: 34,
    overdueForFollowup: 8,
    avgDaysSinceLastVisit: 85,
    riskLevel: 'high',
    recommendedAction: 'Priority outreach — cardiology follow-up critical for this cohort',
    suggestedMessage: 'Dear patient, your cardiologist recommends a follow-up visit. Please call us to schedule your appointment — your heart health is our priority.',
  },
  {
    cohortId: 'COHORT-CKD',
    condition: 'Chronic Kidney Disease',
    patientCount: 21,
    overdueForFollowup: 5,
    avgDaysSinceLastVisit: 91,
    riskLevel: 'high',
    recommendedAction: 'Urgent recall — eGFR monitoring and nephrologist review required',
    suggestedMessage: 'Dear patient, your kidney function check is overdue. Please visit us urgently for blood tests and doctor review.',
  },
]

export async function suggestRecallCohorts(
  _patientData: unknown,
): Promise<AiEnvelope<RecallCohortReport>> {
  await new Promise(r => setTimeout(r, 600))

  const highRisk = MOCK_COHORTS.filter(c => c.riskLevel === 'high')
  const totalAtRisk = MOCK_COHORTS.reduce((sum, c) => sum + c.overdueForFollowup, 0)
  const priority = highRisk.sort((a, b) => b.overdueForFollowup - a.overdueForFollowup)[0]

  return wrapAiResponse<RecallCohortReport>(
    {
      cohorts: MOCK_COHORTS,
      totalPatientsAtRisk: totalAtRisk,
      priorityCohort: priority?.cohortId ?? MOCK_COHORTS[0].cohortId,
    },
    0.83,
    `Recall cohort analysis over ${MOCK_COHORTS.reduce((s, c) => s + c.patientCount, 0)} registered chronic patients. ${totalAtRisk} patients overdue for follow-up. Priority: ${priority?.condition}.`,
  )
}
