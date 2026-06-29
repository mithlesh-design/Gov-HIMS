import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useAuditStore } from './useAuditStore'

export type InsuranceClaimStatus = 'Pending Pre-Auth' | 'Approved' | 'Rejected' | 'In Process'
export type SubmissionStatus = 'not_submitted' | 'validating' | 'validated' | 'submitted' | 'acknowledged'
export type DocumentStatus = 'verified' | 'pending' | 'rejected'

// Pipeline stage — drives the Approval Pipeline kanban view
export type ApprovalStage =
  | 'intake'            // Just registered, pre-auth not started
  | 'docs_collection'   // Gathering required documents
  | 'pre_auth_sent'     // Pre-auth request sent to TPA
  | 'tpa_query'         // TPA raised a query / needs more info
  | 'pre_auth_approved' // TPA approved pre-auth, treatment ongoing
  | 'final_claim'       // Patient discharged, submitting final bills
  | 'settled'           // Claim fully settled
  | 'rejected'          // Claim rejected

export type AiValidationFlag = {
  field: string
  severity: 'ok' | 'warning' | 'error'
  message: string
}

export type AiClaimValidation = {
  completeness: number // 0–100
  flags: AiValidationFlag[]
  canSubmit: boolean
  validatedAt: string
}

// AI denial-risk score with explanation.
export type DenialRisk = {
  score: number          // 0–100, higher = riskier
  reasons: string[]
  factors: { label: string; impact: number }[]  // +ve = increases risk, -ve = decreases
  computedAt: string
}

export type ClaimDocument = {
  id: string
  name: string
  status: DocumentStatus
  uploadedAt?: string
  rejectionReason?: string
}

export type ClaimEvent = {
  at: string
  actor: string             // who logged it
  label: string             // human summary
  kind: 'submitted' | 'queried' | 'approved' | 'partially_approved' | 'rejected' | 'document' | 'note'
}

export type InsuranceClaim = {
  id: string
  patientId?: string
  patientName: string
  policyNumber?: string
  policyHolder?: string
  sumInsured?: number
  available?: number
  provider: string
  amount: number
  approvedAmount?: number
  status: InsuranceClaimStatus
  approvalStage?: ApprovalStage
  tpaQuery?: string          // text of active TPA query (only set when approvalStage === 'tpa_query')
  aiProbability?: number
  aiDenialRisk?: DenialRisk
  submissionStatus: SubmissionStatus
  aiValidation?: AiClaimValidation
  documents?: ClaimDocument[]
  timeline?: ClaimEvent[]
  submittedAt?: string
  tpaReferenceId?: string
  diagnosis?: string
  treatmentSummary?: string
}

interface InsuranceState {
  totalClaimsValue: number
  pendingApprovals: number
  claims: InsuranceClaim[]
  setValidation: (claimId: string, validation: AiClaimValidation) => void
  setSubmissionStatus: (claimId: string, status: SubmissionStatus, tpaRef?: string) => void
  setStatus: (claimId: string, status: InsuranceClaimStatus, opts?: { approvedAmount?: number; note?: string; actor?: string }) => void
  uploadDocument: (claimId: string, documentId: string) => void
  computeDenialRisk: (claimId: string) => void
  appendTimeline: (claimId: string, event: Omit<ClaimEvent, 'at'>) => void
  moveToStage: (claimId: string, stage: ApprovalStage, opts?: { tpaRef?: string; query?: string; actor?: string }) => void
}

const STANDARD_DOCS = (filled: boolean): ClaimDocument[] => [
  { id: 'doc-policy',     name: 'Policy copy',            status: filled ? 'verified' : 'verified' },
  { id: 'doc-admission',  name: 'Admission summary',      status: 'verified' },
  { id: 'doc-prescription', name: 'Doctor prescription',  status: 'verified' },
  { id: 'doc-discharge',  name: 'Discharge summary',      status: filled ? 'verified' : 'pending' },
  { id: 'doc-bill',       name: 'Final hospital bill',    status: 'pending' },
  { id: 'doc-receipts',   name: 'Pharmacy & lab receipts', status: 'pending' },
]

// Pure denial-risk heuristic — combines completeness, AI probability, amount banding,
// and provider history into a 0–100 score.
function computeRisk(c: InsuranceClaim): DenialRisk {
  const factors: { label: string; impact: number }[] = []
  let score = 50
  const ai = c.aiProbability ?? 70
  const probImpact = -Math.round((ai - 50) * 0.6)
  factors.push({ label: `AI approval prob ${ai}%`, impact: probImpact })
  score += probImpact

  const docs = c.documents ?? []
  const pending = docs.filter(d => d.status !== 'verified').length
  if (pending > 0) {
    factors.push({ label: `${pending} document(s) pending`, impact: pending * 8 })
    score += pending * 8
  }

  if (c.amount > 100000) { factors.push({ label: 'High-value claim (>₹1L)', impact: 10 }); score += 10 }
  if (c.amount > 250000) { factors.push({ label: 'Premium-value claim (>₹2.5L)', impact: 12 }); score += 12 }

  if (c.submissionStatus === 'submitted' || c.submissionStatus === 'acknowledged') {
    factors.push({ label: 'Already submitted to TPA', impact: -8 })
    score -= 8
  }

  if (!c.diagnosis) { factors.push({ label: 'Diagnosis line missing', impact: 12 }); score += 12 }

  score = Math.max(0, Math.min(100, score))
  const reasons: string[] = []
  if (pending > 0) reasons.push('Pending documents reduce TPA confidence')
  if (c.amount > 250000) reasons.push('High-value claim attracts additional verification')
  if (!c.diagnosis) reasons.push('Diagnostic justification not yet captured')
  if (ai < 50) reasons.push('AI approval probability below baseline')
  if (reasons.length === 0) reasons.push('Risk is within normal band')

  return { score, reasons, factors, computedAt: new Date().toISOString() }
}

const SEED: InsuranceClaim[] = [
  {
    id: 'CLM-001', patientName: 'Aarav Sharma', provider: 'HDFC Ergo', amount: 45000,
    status: 'In Process', aiProbability: 98, submissionStatus: 'not_submitted',
    diagnosis: 'Acute appendicitis — laparoscopic appendectomy',
    approvalStage: 'pre_auth_approved',
  },
  {
    id: 'CLM-002', patientName: 'Meena Devi', provider: 'Star Health', amount: 120000,
    status: 'Pending Pre-Auth', aiProbability: 45, submissionStatus: 'not_submitted',
    diagnosis: 'Suspected malignancy of the chest — CT-guided biopsy',
    approvalStage: 'intake',
  },
  {
    id: 'CLM-003', patientName: 'Rahul Verma', provider: 'ICICI Lombard', amount: 35000,
    status: 'Approved', aiProbability: 99, submissionStatus: 'submitted', tpaReferenceId: 'ICICI-2026-78432',
    approvedAmount: 35000,
    diagnosis: 'Lower respiratory tract infection — IV antibiotics',
    documents: STANDARD_DOCS(true),
    approvalStage: 'settled',
  },
  // Kiran Patil — default patient login, post-NSTEMI cashless claim
  {
    id: 'CLM-2026-0098', patientId: 'PT-20394', patientName: 'Kiran Patil',
    policyNumber: 'HDFC-ERGO-NCB-77820194', policyHolder: 'Kiran Patil',
    sumInsured: 500000, available: 320000,
    provider: 'HDFC ERGO', amount: 248500,
    status: 'In Process', aiProbability: 88,
    submissionStatus: 'validated',
    diagnosis: 'NSTEMI · PCI with drug-eluting stent (LAD)',
    treatmentSummary: 'Patient presented with chest pain; troponin elevated. Underwent successful PCI with DES placement in LAD. 2-day ICU stay, transitioned to ward, discharged on DAPT + statin + beta-blocker.',
    approvalStage: 'docs_collection',
    documents: [
      { id: 'doc-policy', name: 'Policy copy', status: 'verified', uploadedAt: new Date(Date.now() - 36 * 3600000).toISOString() },
      { id: 'doc-admission', name: 'Admission summary', status: 'verified', uploadedAt: new Date(Date.now() - 36 * 3600000).toISOString() },
      { id: 'doc-prescription', name: 'Doctor prescription', status: 'verified', uploadedAt: new Date(Date.now() - 30 * 3600000).toISOString() },
      { id: 'doc-cathlab', name: 'Cath-lab procedure report', status: 'verified', uploadedAt: new Date(Date.now() - 26 * 3600000).toISOString() },
      { id: 'doc-discharge', name: 'Discharge summary', status: 'pending' },
      { id: 'doc-bill', name: 'Final hospital bill', status: 'pending' },
    ],
    timeline: [
      { at: new Date(Date.now() - 36 * 3600000).toISOString(), actor: 'TPA Desk', label: 'Pre-authorisation requested for cardiac procedure', kind: 'submitted' },
      { at: new Date(Date.now() - 32 * 3600000).toISOString(), actor: 'HDFC ERGO', label: 'Pre-auth approved for cath-lab + 48h ICU', kind: 'approved' },
      { at: new Date(Date.now() - 24 * 3600000).toISOString(), actor: 'Insurance Desk', label: 'Stent invoice & implant sticker uploaded', kind: 'document' },
      { at: new Date(Date.now() - 18 * 3600000).toISOString(), actor: 'HDFC ERGO', label: 'Query: confirm stent batch # and BIS-approval cert', kind: 'queried' },
      { at: new Date(Date.now() - 12 * 3600000).toISOString(), actor: 'Insurance Desk', label: 'Replied with batch # and BIS cert', kind: 'note' },
    ],
  },
  // Anil Kumar Verma (IPD post-RTA) — ongoing cashless claim
  {
    id: 'CLM-2026-0102', patientId: 'PT-44012', patientName: 'Anil Kumar Verma',
    policyNumber: 'STAR-HEALTH-FAM-440126', policyHolder: 'Anil Kumar Verma',
    sumInsured: 700000, available: 510000,
    provider: 'Star Health', amount: 186400,
    status: 'In Process', aiProbability: 84,
    submissionStatus: 'validated',
    diagnosis: 'Polytrauma post-RTA · ORIF tibia + observation',
    treatmentSummary: 'RTA · tibial shaft fracture · ORIF with intramedullary nail. Observation for closed head injury. 5-day ward stay.',
    approvalStage: 'pre_auth_sent',
    tpaReferenceId: 'STAR-2026-44012',
    documents: [
      { id: 'doc-anil-policy', name: 'Policy copy', status: 'verified', uploadedAt: new Date(Date.now() - 48 * 3600000).toISOString() },
      { id: 'doc-anil-admission', name: 'Admission summary', status: 'verified', uploadedAt: new Date(Date.now() - 48 * 3600000).toISOString() },
      { id: 'doc-anil-mlc', name: 'MLC certificate', status: 'verified', uploadedAt: new Date(Date.now() - 40 * 3600000).toISOString() },
      { id: 'doc-anil-ot', name: 'OT notes', status: 'pending' },
      { id: 'doc-anil-bill', name: 'Final hospital bill', status: 'pending' },
    ],
    timeline: [
      { at: new Date(Date.now() - 48 * 3600000).toISOString(), actor: 'TPA Desk', label: 'Pre-authorisation requested for ORIF', kind: 'submitted' },
      { at: new Date(Date.now() - 44 * 3600000).toISOString(), actor: 'Star Health', label: 'Pre-auth approved for surgery + 5-day stay', kind: 'approved' },
      { at: new Date(Date.now() - 24 * 3600000).toISOString(), actor: 'Insurance Desk', label: 'MLC certificate uploaded', kind: 'document' },
    ],
  },

  // --- 6 new seed claims, one per pipeline stage ---

  // 1. intake
  {
    id: 'CLM-2026-0110', patientName: 'Priya Mehta',
    policyNumber: 'NIA-FLT-330291', policyHolder: 'Priya Mehta',
    sumInsured: 300000, available: 300000,
    provider: 'New India Assurance', amount: 62000,
    status: 'Pending Pre-Auth', aiProbability: 82,
    submissionStatus: 'not_submitted',
    diagnosis: 'Cholecystitis — laparoscopic cholecystectomy',
    approvalStage: 'intake',
    documents: [
      { id: 'doc-pm-policy', name: 'Policy copy', status: 'pending' },
      { id: 'doc-pm-admission', name: 'Admission summary', status: 'pending' },
      { id: 'doc-pm-preauth', name: 'Pre-auth form', status: 'pending' },
      { id: 'doc-pm-labs', name: 'Lab reports (LFT, USG)', status: 'pending' },
      { id: 'doc-pm-bill', name: 'Estimated cost sheet', status: 'pending' },
    ],
  },

  // 2. docs_collection
  {
    id: 'CLM-2026-0111', patientName: 'Ravi Shankar',
    policyNumber: 'MAXB-IND-770451', policyHolder: 'Ravi Shankar',
    sumInsured: 500000, available: 480000,
    provider: 'Max Bupa', amount: 195000,
    status: 'Pending Pre-Auth', aiProbability: 76,
    submissionStatus: 'not_submitted',
    diagnosis: 'Knee OA — total knee replacement (right)',
    approvalStage: 'docs_collection',
    documents: [
      { id: 'doc-rs-policy', name: 'Policy copy', status: 'verified', uploadedAt: new Date(Date.now() - 6 * 3600000).toISOString() },
      { id: 'doc-rs-admission', name: 'Admission summary', status: 'verified', uploadedAt: new Date(Date.now() - 5 * 3600000).toISOString() },
      { id: 'doc-rs-xray', name: 'X-ray knee (AP & lateral)', status: 'verified', uploadedAt: new Date(Date.now() - 4 * 3600000).toISOString() },
      { id: 'doc-rs-preauth', name: 'Pre-auth form signed by surgeon', status: 'pending' },
      { id: 'doc-rs-fitness', name: 'Pre-op fitness certificate', status: 'pending' },
      { id: 'doc-rs-estimate', name: 'Cost estimate sheet', status: 'pending' },
    ],
  },

  // 3. pre_auth_sent
  {
    id: 'CLM-2026-0112', patientName: 'Suman Gupta',
    policyNumber: 'OIC-EAST-551782', policyHolder: 'Ramesh Gupta',
    sumInsured: 200000, available: 175000,
    provider: 'Oriental Insurance', amount: 28500,
    status: 'In Process', aiProbability: 91,
    submissionStatus: 'submitted',
    tpaReferenceId: 'OIC-2026-55178',
    submittedAt: new Date(Date.now() - 8 * 3600000).toISOString(),
    diagnosis: 'Dengue fever with thrombocytopenia — platelet transfusion',
    approvalStage: 'pre_auth_sent',
    documents: [
      { id: 'doc-sg-policy', name: 'Policy copy', status: 'verified', uploadedAt: new Date(Date.now() - 14 * 3600000).toISOString() },
      { id: 'doc-sg-admission', name: 'Admission summary', status: 'verified', uploadedAt: new Date(Date.now() - 13 * 3600000).toISOString() },
      { id: 'doc-sg-cbc', name: 'CBC / NS1 antigen report', status: 'verified', uploadedAt: new Date(Date.now() - 12 * 3600000).toISOString() },
      { id: 'doc-sg-preauth', name: 'Pre-auth form', status: 'verified', uploadedAt: new Date(Date.now() - 10 * 3600000).toISOString() },
    ],
    timeline: [
      { at: new Date(Date.now() - 14 * 3600000).toISOString(), actor: 'TPA Desk', label: 'Pre-auth initiated for dengue management', kind: 'submitted' },
      { at: new Date(Date.now() - 8 * 3600000).toISOString(), actor: 'TPA Desk', label: 'Pre-auth request sent to Oriental Insurance', kind: 'submitted' },
    ],
  },

  // 4. tpa_query
  {
    id: 'CLM-2026-0113', patientName: 'Deepak Joshi',
    policyNumber: 'UIL-GRP-228834', policyHolder: 'Deepak Joshi',
    sumInsured: 350000, available: 310000,
    provider: 'United India Insurance', amount: 55000,
    status: 'In Process', aiProbability: 67,
    submissionStatus: 'submitted',
    tpaReferenceId: 'UIL-2026-22883',
    diagnosis: 'Inguinal hernia — laparoscopic repair (TEP)',
    approvalStage: 'tpa_query',
    tpaQuery: 'Please submit pre-operative fitness certificate from cardiologist and anaesthesia pre-assessment note.',
    documents: [
      { id: 'doc-dj-policy', name: 'Policy copy', status: 'verified', uploadedAt: new Date(Date.now() - 30 * 3600000).toISOString() },
      { id: 'doc-dj-admission', name: 'Admission summary', status: 'verified', uploadedAt: new Date(Date.now() - 28 * 3600000).toISOString() },
      { id: 'doc-dj-preauth', name: 'Pre-auth form', status: 'verified', uploadedAt: new Date(Date.now() - 26 * 3600000).toISOString() },
      { id: 'doc-dj-fitness', name: 'Cardiology fitness cert', status: 'pending' },
      { id: 'doc-dj-anaesthesia', name: 'Anaesthesia pre-assessment', status: 'pending' },
    ],
    timeline: [
      { at: new Date(Date.now() - 30 * 3600000).toISOString(), actor: 'TPA Desk', label: 'Pre-auth submitted for hernia repair', kind: 'submitted' },
      { at: new Date(Date.now() - 10 * 3600000).toISOString(), actor: 'United India Insurance', label: 'Query raised: fitness cert + anaesthesia assessment required', kind: 'queried' },
    ],
  },

  // 5. pre_auth_approved
  {
    id: 'CLM-2026-0114', patientName: 'Lakshmi Nair',
    policyNumber: 'BAJAJ-VIS-990217', policyHolder: 'Lakshmi Nair',
    sumInsured: 200000, available: 185000,
    provider: 'Bajaj Allianz', amount: 38000,
    approvedAmount: 35000,
    status: 'In Process', aiProbability: 95,
    submissionStatus: 'acknowledged',
    tpaReferenceId: 'BAJAJ-2026-99021',
    diagnosis: 'Senile cataract (right eye) — phacoemulsification with IOL',
    approvalStage: 'pre_auth_approved',
    documents: [
      { id: 'doc-ln-policy', name: 'Policy copy', status: 'verified', uploadedAt: new Date(Date.now() - 50 * 3600000).toISOString() },
      { id: 'doc-ln-admission', name: 'Admission summary', status: 'verified', uploadedAt: new Date(Date.now() - 48 * 3600000).toISOString() },
      { id: 'doc-ln-preauth', name: 'Pre-auth approval letter', status: 'verified', uploadedAt: new Date(Date.now() - 44 * 3600000).toISOString() },
      { id: 'doc-ln-ot', name: 'OT notes', status: 'pending' },
      { id: 'doc-ln-bill', name: 'Final hospital bill', status: 'pending' },
      { id: 'doc-ln-discharge', name: 'Discharge summary', status: 'pending' },
    ],
    timeline: [
      { at: new Date(Date.now() - 50 * 3600000).toISOString(), actor: 'TPA Desk', label: 'Pre-auth submitted for cataract surgery', kind: 'submitted' },
      { at: new Date(Date.now() - 44 * 3600000).toISOString(), actor: 'Bajaj Allianz', label: 'Pre-auth approved for ₹35,000 — IOL + surgery charges', kind: 'approved' },
    ],
  },

  // 6. final_claim
  {
    id: 'CLM-2026-0115', patientName: 'Arvind Singh',
    policyNumber: 'REL-HLTH-661094', policyHolder: 'Arvind Singh',
    sumInsured: 600000, available: 420000,
    provider: 'Reliance Health', amount: 142000,
    approvedAmount: 138000,
    status: 'In Process', aiProbability: 89,
    submissionStatus: 'acknowledged',
    tpaReferenceId: 'REL-2026-66109',
    diagnosis: 'Intertrochanteric hip fracture — ORIF with proximal femoral nail',
    treatmentSummary: 'Fall at home; X-ray confirmed IT fracture. ORIF performed; stable post-op. 6-day ward stay. Discharged with walker and physiotherapy plan.',
    approvalStage: 'final_claim',
    documents: [
      { id: 'doc-as-policy', name: 'Policy copy', status: 'verified', uploadedAt: new Date(Date.now() - 96 * 3600000).toISOString() },
      { id: 'doc-as-admission', name: 'Admission summary', status: 'verified', uploadedAt: new Date(Date.now() - 94 * 3600000).toISOString() },
      { id: 'doc-as-preauth', name: 'Pre-auth approval letter', status: 'verified', uploadedAt: new Date(Date.now() - 88 * 3600000).toISOString() },
      { id: 'doc-as-ot', name: 'OT notes', status: 'verified', uploadedAt: new Date(Date.now() - 72 * 3600000).toISOString() },
      { id: 'doc-as-xray', name: 'Post-op X-ray', status: 'verified', uploadedAt: new Date(Date.now() - 48 * 3600000).toISOString() },
      { id: 'doc-as-discharge', name: 'Discharge summary', status: 'verified', uploadedAt: new Date(Date.now() - 24 * 3600000).toISOString() },
      { id: 'doc-as-bill', name: 'Final hospital bill', status: 'pending' },
      { id: 'doc-as-pharmacy', name: 'Pharmacy & implant receipts', status: 'pending' },
    ],
    timeline: [
      { at: new Date(Date.now() - 96 * 3600000).toISOString(), actor: 'TPA Desk', label: 'Pre-auth submitted for hip ORIF', kind: 'submitted' },
      { at: new Date(Date.now() - 90 * 3600000).toISOString(), actor: 'Reliance Health', label: 'Pre-auth approved for ₹1,38,000', kind: 'approved' },
      { at: new Date(Date.now() - 24 * 3600000).toISOString(), actor: 'TPA Desk', label: 'Patient discharged — compiling final claim package', kind: 'note' },
    ],
  },
]

export const useInsuranceStore = create<InsuranceState>()(persist((set, get) => ({
  totalClaimsValue: 1250000,
  pendingApprovals: 8,
  claims: SEED,

  setValidation: (claimId, validation) =>
    set((s) => ({
      claims: s.claims.map(c =>
        c.id === claimId ? { ...c, aiValidation: validation, submissionStatus: 'validated' } : c
      ),
    })),

  setSubmissionStatus: (claimId, status, tpaRef) => {
    set((s) => ({
      claims: s.claims.map(c =>
        c.id === claimId
          ? { ...c, submissionStatus: status, submittedAt: status === 'submitted' ? new Date().toISOString() : c.submittedAt, tpaReferenceId: tpaRef ?? c.tpaReferenceId }
          : c
      ),
    }))
    if (status === 'submitted') {
      useAuditStore.getState().log({
        userId: 'INS-SYS', userName: 'Insurance Desk',
        action: 'insurance_claim_submitted', resource: 'claim', resourceId: claimId,
        detail: `Claim submitted${tpaRef ? ' · TPA ref ' + tpaRef : ''}`,
      })
    }
  },

  setStatus: (claimId, status, opts) =>
    set((s) => ({
      claims: s.claims.map(c => {
        if (c.id !== claimId) return c
        const kind: ClaimEvent['kind'] =
          status === 'Approved' ? 'approved'
          : status === 'Rejected' ? 'rejected'
          : 'note'
        const label = status === 'Approved'
          ? `Claim approved${opts?.approvedAmount ? ` for ₹${opts.approvedAmount.toLocaleString('en-IN')}` : ''}${opts?.note ? ` — ${opts.note}` : ''}`
          : status === 'Rejected'
            ? `Claim rejected${opts?.note ? ` — ${opts.note}` : ''}`
            : `Status changed to ${status}${opts?.note ? ` — ${opts.note}` : ''}`
        return {
          ...c,
          status,
          approvedAmount: status === 'Approved' ? (opts?.approvedAmount ?? c.amount) : c.approvedAmount,
          timeline: [
            ...(c.timeline ?? []),
            { at: new Date().toISOString(), actor: opts?.actor ?? 'Insurance Desk', label, kind },
          ],
        }
      }),
    })),

  uploadDocument: (claimId, documentId) =>
    set((s) => ({
      claims: s.claims.map(c => c.id !== claimId ? c : ({
        ...c,
        documents: (c.documents ?? []).map(d => d.id === documentId
          ? { ...d, status: 'verified', uploadedAt: new Date().toISOString() }
          : d),
      })),
    })),

  computeDenialRisk: (claimId) => {
    const claim = get().claims.find(c => c.id === claimId)
    if (!claim) return
    set((s) => ({
      claims: s.claims.map(c => c.id === claimId ? { ...c, aiDenialRisk: computeRisk(c) } : c),
    }))
  },

  appendTimeline: (claimId, event) =>
    set((s) => ({
      claims: s.claims.map(c => c.id !== claimId ? c : ({
        ...c,
        timeline: [...(c.timeline ?? []), { ...event, at: new Date().toISOString() }],
      })),
    })),

  moveToStage: (claimId, stage, opts) => {
    const stageLabel: Record<ApprovalStage, string> = {
      intake: 'New Intake',
      docs_collection: 'Collecting Documents',
      pre_auth_sent: 'Pre-Auth Sent to TPA',
      tpa_query: 'TPA Query Raised',
      pre_auth_approved: 'Pre-Auth Approved',
      final_claim: 'Final Claim Preparation',
      settled: 'Claim Settled',
      rejected: 'Claim Rejected',
    }
    const eventKind: Partial<Record<ApprovalStage, ClaimEvent['kind']>> = {
      pre_auth_sent: 'submitted',
      pre_auth_approved: 'approved',
      settled: 'approved',
      rejected: 'rejected',
      tpa_query: 'queried',
    }
    set((s) => ({
      claims: s.claims.map(c => {
        if (c.id !== claimId) return c
        const newStatus: InsuranceClaimStatus =
          stage === 'settled' ? 'Approved'
          : stage === 'rejected' ? 'Rejected'
          : stage === 'pre_auth_approved' || stage === 'final_claim' ? 'In Process'
          : c.status
        const newSubmission: SubmissionStatus =
          stage === 'pre_auth_sent' ? 'submitted'
          : stage === 'settled' ? 'acknowledged'
          : c.submissionStatus
        return {
          ...c,
          approvalStage: stage,
          status: newStatus,
          submissionStatus: newSubmission,
          tpaReferenceId: opts?.tpaRef ?? c.tpaReferenceId,
          tpaQuery: stage === 'tpa_query' ? (opts?.query ?? c.tpaQuery) : undefined,
          timeline: [
            ...(c.timeline ?? []),
            {
              at: new Date().toISOString(),
              actor: opts?.actor ?? 'TPA Desk',
              label: stageLabel[stage],
              kind: eventKind[stage] ?? 'note',
            },
          ],
        }
      }),
    }))
  },
}),
  {
    name: 'agentix-insurancestore', version: 3,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))
