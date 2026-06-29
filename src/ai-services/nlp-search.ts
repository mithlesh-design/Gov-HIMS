import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export interface PatientSearchResult { patientId: string; name: string; age: number; gender: string; mrn: string; matchScore: number; matchedOn: string }
export async function nlpPatientSearch(query: string): Promise<AiEnvelope<PatientSearchResult[]>> {
  await new Promise((r) => setTimeout(r, 250))
  void query
  return wrapAiResponse<PatientSearchResult[]>([{ patientId: 'PT-20394', name: 'Kiran Patil', age: 52, gender: 'M', mrn: 'MRN-2024-20394', matchScore: 0.96, matchedOn: 'Name + DOB' }], 0.9, 'NLP query parsed against patient index. Fuzzy match on name, DOB, MRN, and phone.')
}
