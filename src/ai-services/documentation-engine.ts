import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export type NoteContext = 'OPD' | 'ward' | 'OT' | 'ICU'
export type NoteType = 'SOAP' | 'narrative' | 'procedure' | 'discharge'

export interface ClinicalNoteInput {
  context: NoteContext
  noteType: NoteType
  patientId: string
  patientName?: string
  consultationNotes?: string
  diagnosis?: string
  diagnoses?: string[]
  prescriptions?: string[]
  labFindings?: string[]
  radiologyFindings?: string[]
  ward?: string
  procedure?: string
  attendingDoctor?: string
  admissionDate?: string
}

export interface ClinicalNoteSection {
  heading: string
  content: string
}

export interface ClinicalNoteOutput {
  noteText: string
  sections: ClinicalNoteSection[]
  noteType: NoteType
  context: NoteContext
  wordCount: number
  icdCodes?: string[]
  cptCodes?: string[]
  billingReadiness: number
}

const SOAP_MOCK: Record<NoteContext, ClinicalNoteSection[]> = {
  OPD: [
    { heading: 'Subjective', content: 'Patient presents with complaints as documented. History taken and recorded.' },
    { heading: 'Objective', content: 'Vitals within acceptable limits. Examination findings as charted.' },
    { heading: 'Assessment', content: 'Working diagnosis established based on clinical presentation and investigations.' },
    { heading: 'Plan', content: 'Medications prescribed. Follow-up investigations ordered. Patient counselled.' },
  ],
  ward: [
    { heading: 'Subjective', content: 'Patient reports condition is stable. Comfortable at rest.' },
    { heading: 'Objective', content: 'Vitals monitored and recorded. IV access patent. Medications administered as charted.' },
    { heading: 'Assessment', content: 'Condition stable. Responding to treatment.' },
    { heading: 'Plan', content: 'Continue current medications. Repeat labs tomorrow. Aim for discharge if improvement continues.' },
  ],
  OT: [
    { heading: 'Pre-operative', content: 'Patient prepped and consented. WHO checklist verified. Anaesthesia administered.' },
    { heading: 'Intra-operative', content: 'Procedure carried out as planned. No intraoperative complications noted.' },
    { heading: 'Post-operative', content: 'Patient shifted to recovery. Vitals stable. Wound closed with sutures.' },
    { heading: 'Instructions', content: 'NPO for 4 hours. IV fluids continued. Wound check in 24 hours.' },
  ],
  ICU: [
    { heading: 'Clinical Status', content: 'Patient in ICU. Vitals continuously monitored. Ventilatory support in place.' },
    { heading: 'Investigations', content: 'Daily labs reviewed. ABG satisfactory.' },
    { heading: 'Assessment', content: 'Critical but stable. Responding to interventions.' },
    { heading: 'Plan', content: 'Continue current ICU protocols. Family briefed. Reassess for step-down in 24 hours.' },
  ],
}

function buildNoteText(
  input: ClinicalNoteInput,
  sections: ClinicalNoteSection[]
): string {
  const header = [
    `Clinical Note — ${input.noteType.toUpperCase()} (${input.context})`,
    `Patient: ${input.patientName ?? input.patientId}`,
    input.attendingDoctor ? `Attending: ${input.attendingDoctor}` : '',
    `Date: ${new Date().toLocaleDateString('en-IN')}`,
  ].filter(Boolean).join('\n')

  const body = sections.map((s) => `\n${s.heading.toUpperCase()}:\n${s.content}`).join('\n')

  const meta: string[] = []
  if (input.diagnosis) meta.push(`Diagnosis: ${input.diagnosis}`)
  if (input.diagnoses?.length) meta.push(`Differentials: ${input.diagnoses.join(', ')}`)
  if (input.labFindings?.length) meta.push(`Lab Findings: ${input.labFindings.join(' | ')}`)
  if (input.radiologyFindings?.length) meta.push(`Imaging: ${input.radiologyFindings.join(' | ')}`)
  if (input.prescriptions?.length) meta.push(`Medications: ${input.prescriptions.join(', ')}`)

  return [header, body, meta.length ? '\n' + meta.join('\n') : ''].filter(Boolean).join('\n')
}

export async function generateClinicalNote(
  input: ClinicalNoteInput
): Promise<AiEnvelope<ClinicalNoteOutput>> {
  await new Promise((r) => setTimeout(r, 600))

  const sections: ClinicalNoteSection[] =
    input.noteType === 'SOAP' || input.noteType === 'narrative' || input.noteType === 'procedure' || input.noteType === 'discharge'
      ? SOAP_MOCK[input.context].map((s) => ({ ...s }))
      : SOAP_MOCK[input.context]

  // Enrich sections with actual context data if provided
  if (input.diagnosis && sections[2]) {
    sections[2] = { ...sections[2], content: `${input.diagnosis}. ${sections[2].content}` }
  }
  if (input.consultationNotes && sections[0]) {
    sections[0] = { ...sections[0], content: input.consultationNotes || sections[0].content }
  }

  const noteText = buildNoteText(input, sections)
  const wordCount = noteText.split(/\s+/).length

  const billingReadiness = Math.min(100, Math.round(
    (input.diagnosis ? 25 : 0) +
    (input.prescriptions?.length ? 25 : 0) +
    (input.labFindings?.length || input.radiologyFindings?.length ? 25 : 0) +
    (input.consultationNotes ? 25 : 0)
  ))

  const icdCodes = input.diagnosis
    ? ['Z00.0', 'J06.9']
    : undefined

  return wrapAiResponse<ClinicalNoteOutput>(
    {
      noteText,
      sections,
      noteType: input.noteType,
      context: input.context,
      wordCount,
      icdCodes,
      billingReadiness,
    },
    0.84,
    `${input.noteType} note generated for ${input.context} context. Sections auto-populated from available clinical data. Billing readiness: ${billingReadiness}%.`
  )
}
