/* Agentix HIMS — Live OPD wait-time ETA (Track A · reduce waiting anxiety)
 *
 * Turns the static per-patient `estimatedWait` into a position-aware ETA that
 * updates as the queue advances: a patient's wait = (patients ahead of them in
 * their doctor's active queue) × average consult time, plus a partial slot if
 * someone is currently being seen. Pure → testable and reusable on the
 * reception board, the patient portal, and the public family-track page.
 *
 * The ordering MUST match the OPD board (triage rank, then token) so the shown
 * ETA agrees with the visible queue order.
 */

import type { Patient, TriageLevel } from '@/store/usePatientStore'

export const AVG_CONSULT_MIN = 8

const TRIAGE_RANK: Record<TriageLevel, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }

export interface QueueEta {
  /** How many patients are ahead of this one in their doctor's queue. */
  positionAhead: number
  /** Estimated minutes until this patient is seen. */
  etaMin: number
  /** True when no one is ahead — patient is next to be called. */
  nextUp: boolean
}

/** Patients waiting (or in vitals) for the same doctor, in board order. */
function activeQueueFor(patient: Patient, patients: Patient[]): Patient[] {
  return patients
    .filter(p => p.doctor === patient.doctor && (p.queueStatus === 'waiting' || p.queueStatus === 'vitals'))
    .sort((a, b) =>
      (TRIAGE_RANK[a.triageLevel ?? 'Low'] - TRIAGE_RANK[b.triageLevel ?? 'Low']) || a.token - b.token)
}

export function computeQueueEta(
  patient: Patient,
  patients: Patient[],
  avgMin: number = AVG_CONSULT_MIN,
): QueueEta {
  const queue = activeQueueFor(patient, patients)
  const idx = queue.findIndex(p => p.id === patient.id)
  const positionAhead = idx < 0 ? 0 : idx
  const consultingNow = patients.some(p => p.doctor === patient.doctor && p.queueStatus === 'consulting')
  const etaMin = positionAhead * avgMin + (consultingNow ? Math.round(avgMin / 2) : 0)
  return { positionAhead, etaMin, nextUp: positionAhead === 0 }
}
