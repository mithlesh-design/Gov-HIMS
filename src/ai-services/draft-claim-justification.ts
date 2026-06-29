import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export interface ClaimJustificationInput {
  patientId: string
  patientName?: string
  admissionDate?: string
  dischargeDate?: string
  primaryDiagnosis: string
  procedures?: string[]
  tpaName?: string
  claimType: 'pre_auth' | 'final_claim'
}

export interface TpaDocumentChecklist {
  item: string
  required: boolean
  present: boolean
}

export interface ClaimJustification {
  narrativeSummary: string
  icdCodes: string[]
  procedureCodes: string[]
  estimatedAmount: number
  tpaDocumentChecklist: TpaDocumentChecklist[]
  preAuthNarrative?: string
  finalClaimNarrative?: string
  coverageNotes: string
}

export async function draftClaimJustification(
  input: ClaimJustificationInput
): Promise<AiEnvelope<ClaimJustification>> {
  await new Promise((r) => setTimeout(r, 700))

  const checklist: TpaDocumentChecklist[] = [
    { item: 'Admission Summary', required: true, present: true },
    { item: 'Discharge Summary', required: true, present: input.claimType === 'final_claim' },
    { item: 'OT Notes', required: (input.procedures?.length ?? 0) > 0, present: (input.procedures?.length ?? 0) > 0 },
    { item: 'Anaesthesia Record', required: (input.procedures?.length ?? 0) > 0, present: false },
    { item: 'Lab Reports', required: true, present: true },
    { item: 'Radiology Reports', required: false, present: false },
    { item: 'Pharmacy Bills', required: true, present: true },
    { item: 'Signed Consent Forms', required: true, present: true },
    { item: 'Pre-Auth Approval Copy', required: input.claimType === 'final_claim', present: input.claimType === 'final_claim' },
  ]

  const narrative = `Patient ${input.patientName ?? input.patientId} was admitted on ${input.admissionDate ?? 'as documented'} with ${input.primaryDiagnosis}. The clinical course necessitated ${input.procedures?.join(', ') || 'conservative management'}. All investigations and treatments were medically necessary and in accordance with standard treatment protocols. The case qualifies for ${input.tpaName ?? 'insurance'} coverage under the applicable policy clauses.`

  return wrapAiResponse<ClaimJustification>(
    {
      narrativeSummary: narrative,
      icdCodes: ['Z00.0', 'I10', 'E11.9'],
      procedureCodes: input.procedures?.map((_, i) => `CPT-${8000 + i}`) ?? [],
      estimatedAmount: 45000,
      tpaDocumentChecklist: checklist,
      preAuthNarrative: input.claimType === 'pre_auth'
        ? `Pre-authorisation requested for ${input.primaryDiagnosis} treatment. Estimated length of stay: 4 days. Planned procedures: ${input.procedures?.join(', ') || 'Medical management'}. Expected total: ₹45,000.`
        : undefined,
      finalClaimNarrative: input.claimType === 'final_claim'
        ? `Final claim for ${input.primaryDiagnosis} — hospitalisation from ${input.admissionDate} to ${input.dischargeDate}. All procedures and investigations as per attached bills. Total claim: ₹${(45000).toLocaleString('en-IN')}.`
        : undefined,
      coverageNotes: `Standard hospitalisation coverage applies. Verify policy exclusions for ${input.primaryDiagnosis}. Pre-existing condition waiting period check recommended.`,
    },
    0.86,
    `Claim justification drafted based on clinical course and ${input.tpaName ?? 'TPA'} documentation requirements.`
  )
}
