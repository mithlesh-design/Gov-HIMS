import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'
import type { AiClaimValidation } from '@/store/useInsuranceStore'

export interface PreAuthDraft {
  admissionId: string
  insurerId: string
  policyNumber: string
  diagnosisCodes: string[]
  plannedProcedures: string[]
  estimatedCost: number
  requestedAmount: number
  clinicalJustification: string
  attachmentsRequired: string[]
}

export async function draftPreAuth(admissionId: string): Promise<AiEnvelope<PreAuthDraft>> {
  await new Promise((r) => setTimeout(r, 500))
  return wrapAiResponse<PreAuthDraft>(
    { admissionId, insurerId: 'INS-STAR-001', policyNumber: 'SHI-2026-445892', diagnosisCodes: ['J18.9', 'E11'], plannedProcedures: ['Chest X-ray', 'CBC', 'Blood Culture', 'IV Antibiotic Therapy'], estimatedCost: 42500, requestedAmount: 38000, clinicalJustification: 'Patient admitted with community acquired pneumonia requiring IV antibiotics, oxygen therapy and continuous monitoring due to SpO2 <92% and WBC >18,000.', attachmentsRequired: ['Admission summary', 'Lab reports', 'Chest X-ray report', 'Treating doctor letter'] },
    0.83,
    'Pre-auth draft generated from admission data, ICD codes, and insurer policy matrix.'
  )
}

const CLAIM_VALIDATION_SCENARIOS: Record<string, AiClaimValidation> = {
  'CLM-001': {
    completeness: 94,
    canSubmit: true,
    validatedAt: new Date().toISOString(),
    flags: [
      { field: 'Patient Identity',       severity: 'ok',      message: 'Name, DOB and policy number match provider records' },
      { field: 'Diagnosis Codes (ICD)',   severity: 'ok',      message: 'Valid ICD-10 codes present and match clinical notes' },
      { field: 'Procedure Codes',         severity: 'ok',      message: 'All procedures coded correctly per CGHS schedule' },
      { field: 'Discharge Summary',       severity: 'ok',      message: 'Signed discharge summary attached' },
      { field: 'Itemised Bill',           severity: 'ok',      message: 'Line-item bill matches approved schedule of charges' },
      { field: 'Pre-auth Reference',      severity: 'warning', message: 'Pre-auth reference number present but issued >72hrs ago — may require renewal confirmation from TPA' },
    ],
  },
  'CLM-002': {
    completeness: 58,
    canSubmit: false,
    validatedAt: new Date().toISOString(),
    flags: [
      { field: 'Patient Identity',       severity: 'ok',      message: 'Identity documents verified' },
      { field: 'Diagnosis Codes (ICD)',   severity: 'error',   message: 'ICD-10 codes missing — diagnosis coded as free text only; TPA will reject' },
      { field: 'Procedure Codes',         severity: 'error',   message: 'Procedure codes not mapped — unable to compute payable amounts' },
      { field: 'Discharge Summary',       severity: 'warning', message: 'Discharge summary not yet finalised (status: draft)' },
      { field: 'Itemised Bill',           severity: 'ok',      message: 'Bill present' },
      { field: 'Pre-auth Reference',      severity: 'error',   message: 'No pre-authorisation reference number on file for this admission' },
      { field: 'Investigation Reports',   severity: 'warning', message: 'Lab reports referenced in discharge summary are not attached' },
    ],
  },
  'CLM-003': {
    completeness: 100,
    canSubmit: true,
    validatedAt: new Date().toISOString(),
    flags: [
      { field: 'Patient Identity',     severity: 'ok', message: 'All identity fields complete and verified' },
      { field: 'Diagnosis Codes',      severity: 'ok', message: 'ICD-10 codes present and validated' },
      { field: 'Procedure Codes',      severity: 'ok', message: 'All procedures coded with approved tariff amounts' },
      { field: 'Discharge Summary',    severity: 'ok', message: 'Finalised discharge summary attached' },
      { field: 'Itemised Bill',        severity: 'ok', message: 'Detailed bill with quantity, rate and total attached' },
      { field: 'Pre-auth Reference',   severity: 'ok', message: 'Pre-auth reference confirmed with ICICI Lombard' },
    ],
  },
}

export async function validateInsuranceClaim(claimId: string): Promise<AiEnvelope<AiClaimValidation>> {
  await new Promise((r) => setTimeout(r, 1300))

  const result = CLAIM_VALIDATION_SCENARIOS[claimId] ?? {
    completeness: 72,
    canSubmit: true,
    validatedAt: new Date().toISOString(),
    flags: [
      { field: 'Patient Identity',   severity: 'ok',      message: 'Identity documents verified' },
      { field: 'Diagnosis Codes',    severity: 'ok',      message: 'ICD codes present' },
      { field: 'Discharge Summary',  severity: 'warning', message: 'Discharge summary present but not yet co-signed by consultant' },
      { field: 'Itemised Bill',      severity: 'ok',      message: 'Bill present and itemised' },
      { field: 'Pre-auth Reference', severity: 'warning', message: 'Pre-auth reference could not be verified — please confirm with TPA before submitting' },
    ],
  }

  return wrapAiResponse<AiClaimValidation>(
    result,
    0.88,
    `AI scanned claim documents and cross-referenced against ${claimId} provider policy rules. ${result.canSubmit ? 'Claim appears ready for digital submission.' : 'Errors must be resolved before submission.'}`
  )
}
