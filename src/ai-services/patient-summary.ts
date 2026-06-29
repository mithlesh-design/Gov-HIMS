import { wrapAiResponse } from '@/lib/ai-helpers'
import { aiJSON } from '@/lib/ai-client'
import { usePatientStore } from '@/store/usePatientStore'
import type { AiEnvelope } from '@/types/ai'

export interface PatientSummary { patientId: string; headline: string; activeProblems: string[]; keyMetrics: Array<{ label: string; value: string; trend: 'up' | 'down' | 'stable' }>; nextActions: string[] }

const SYSTEM = `You are a hospital physician writing a concise clinical summary card from a patient's record. Produce a one-line headline (age, sex, key problems, status), the active problem list, key metrics with trend, and recommended next actions.
Return JSON: {"headline":string,"activeProblems":string[],"keyMetrics":[{"label":string,"value":string,"trend":"up"|"down"|"stable"}],"nextActions":string[]}. Base it ONLY on the data provided — do not invent vitals or diagnoses. Keep it brief and clinical.`

export async function generatePatientSummary(patientId: string): Promise<AiEnvelope<PatientSummary>> {
  const p = usePatientStore.getState().patients.find(x => x.id === patientId)
  const fallback: PatientSummary = {
    patientId,
    headline: p ? `${p.age}${p.gender[0]} — ${p.department}` : 'Patient summary unavailable',
    activeProblems: p?.symptoms ?? [],
    keyMetrics: [],
    nextActions: ['Clinician review required'],
  }
  if (!p) return wrapAiResponse(fallback, 0.4, 'Patient not found — no summary generated.')

  const user = `Patient record:\n${JSON.stringify({
    name: p.name, age: p.age, gender: p.gender, department: p.department,
    symptoms: p.symptoms, history: p.history, triageLevel: p.triageLevel,
  })}`
  const out = await aiJSON<Omit<PatientSummary, 'patientId'>>(SYSTEM, user, { temperature: 0.3 })
  if (!out || !out.headline) return wrapAiResponse(fallback, 0.5, 'AI unavailable — minimal summary shown.')

  return wrapAiResponse({
    patientId,
    headline: out.headline,
    activeProblems: out.activeProblems ?? fallback.activeProblems,
    keyMetrics: Array.isArray(out.keyMetrics) ? out.keyMetrics : [],
    nextActions: out.nextActions ?? fallback.nextActions,
  }, 0.86, 'Summary synthesised from the patient record.')
}
