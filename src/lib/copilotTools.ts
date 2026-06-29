import { useInpatientStore } from '@/store/useInpatientStore'
import { usePatientStore } from '@/store/usePatientStore'
import { usePharmacyStore } from '@/store/usePharmacyStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { AssistantDraft } from '@/store/useAssistantStore'
import type { Condition } from '@/store/useInpatientStore'
import { checkRx, hasMajor } from '@/lib/drugSafety'

// The copilot's drafts are executable: each maps to a real store mutation so the
// doctor can act on a suggestion in one click (file the Rx, apply the discharge,
// route the referral, save the note) instead of copy-pasting.

export type ToolResult = { ok: boolean; message: string }

export const EXECUTE_LABEL: Record<AssistantDraft['kind'], string> = {
  round_note: 'Save to chart',
  prescription: 'Send to pharmacy',
  discharge_summary: 'Apply to discharge',
  referral: 'Route referral',
}
export const DONE_LABEL: Record<AssistantDraft['kind'], string> = {
  round_note: 'Saved to chart',
  prescription: 'Sent to pharmacy',
  discharge_summary: 'Applied',
  referral: 'Routed',
}

const isoDay = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10)

export function executeDraft(draft: AssistantDraft, doctorName: string): ToolResult {
  const pid = draft.patientId
  if (!pid) return { ok: false, message: 'No patient is linked to this draft.' }

  const ipStore = useInpatientStore.getState()
  const inpatient = ipStore.inpatients.find(i => i.patientId === pid)

  switch (draft.kind) {
    case 'round_note': {
      if (!inpatient) return { ok: false, message: 'Round notes apply to admitted patients only.' }
      ipStore.addProgressNote(pid, draft.content, (draft.condition as Condition) ?? 'Stable')
      return { ok: true, message: `Saved to ${inpatient.name}'s progress notes` }
    }
    case 'prescription': {
      const patient = usePatientStore.getState().patients.find(p => p.id === pid)
      const name = patient?.name ?? inpatient?.name
      if (!name) return { ok: false, message: 'Patient record not found.' }
      const lines = (draft.payload?.meds ?? draft.content.split('\n').filter(l => /^\d+\.\s/.test(l)).map(l => l.replace(/^\d+\.\s/, '')))
      if (!lines.length) return { ok: false, message: 'No medicines found in the draft.' }
      // Prescribe-time safety gate before filing.
      const warnings = checkRx(lines, { history: patient?.history, allergies: inpatient?.allergies, comorbidities: inpatient?.comorbidities })
      if (hasMajor(warnings)) { const w = warnings.find(x => x.severity === 'major')!; return { ok: false, message: `Blocked — ${w.title}: ${w.note} Adjust the prescription first.` } }
      usePharmacyStore.getState().addPrescription({
        id: `RX-${Date.now()}`,
        patientId: pid,
        patientName: name,
        tokenNumber: patient?.token ?? 0,
        doctorName,
        department: patient?.department ?? inpatient?.ward ?? 'General Medicine',
        status: 'queued',
        dispatchedAt: new Date().toISOString(),
        estimatedReadyIn: lines.length * 3,
        triageLevel: patient?.triageLevel,
        medicines: lines.map(l => ({ name: l, dosage: 'As written', frequency: 'As directed', duration: '5 days', quantity: 10 })),
      })
      return { ok: true, message: `Prescription for ${name} sent to Pharmacy (${lines.length} item${lines.length > 1 ? 's' : ''})` }
    }
    case 'discharge_summary': {
      if (!inpatient) return { ok: false, message: 'Discharge applies to admitted patients only.' }
      if (!inpatient.discharge && inpatient.stage !== 'discharged') ipStore.initiateDischarge(pid)
      ipStore.setDischargeSummary(pid, {
        summary: draft.content,
        followUpDate: isoDay(7),
        meds: inpatient.meds.filter(m => m.status === 'active').map(m => ({ name: m.name, dose: m.dose, freq: m.freq, duration: '7 days' })),
        redFlags: ['Chest pain or breathlessness', 'High fever', 'Persistent vomiting'],
      })
      return { ok: true, message: `Discharge summary applied to ${inpatient.name}'s chart` }
    }
    case 'referral': {
      if (!inpatient) return { ok: false, message: 'Open the consultation to send an OPD referral.' }
      const specialty = draft.payload?.specialty ?? 'Specialist'
      ipStore.referInpatient(pid, { specialty, reason: 'Referral per AI copilot draft — review letter', urgent: false })
      useNotificationStore.getState().add({ type: 'referral', priority: 'medium', title: `Referral — ${specialty}`, body: `${inpatient.name} (${inpatient.ward} ${inpatient.bed})`, channels: ['in_app'], targetRole: 'doctor', patientName: inpatient.name })
      return { ok: true, message: `Referral to ${specialty} routed for ${inpatient.name}` }
    }
  }
}
