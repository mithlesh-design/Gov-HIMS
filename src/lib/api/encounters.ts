/* Encounters — clinical notes (SOAP / progress notes) tied to a visit. */
import { z } from 'zod'
import { audit, id as newId, isoNow, table } from './_core'

export const EncounterSchema = z.object({
  id: z.string(),                  // ENC-...
  visitId: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  doctorName: z.string(),
  startedAt: z.string(),
  endedAt: z.string().optional(),
  kind: z.enum(['SOAP', 'Progress', 'Discharge', 'Triage', 'OnlineConsult']).default('SOAP'),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  noteMarkdown: z.string().optional(),
  aiPreBriefAccepted: z.boolean().optional(),
  signedAt: z.string().optional(),
})
export type Encounter = z.infer<typeof EncounterSchema>

const encounters = table<Encounter>('encounters', EncounterSchema)

export const Encounters = {
  list: (filter?: (e: Encounter) => boolean) => encounters.list(filter),
  get: (id: string) => encounters.get(id),
  byVisit: (visitId: string) => encounters.list((e) => e.visitId === visitId),
  byPatient: (patientId: string) => encounters.list((e) => e.patientId === patientId),
  async create(input: Omit<Encounter, 'id' | 'startedAt'> & { id?: string; startedAt?: string }) {
    const row: Encounter = {
      ...input,
      id: input.id ?? newId('ENC'),
      startedAt: input.startedAt ?? isoNow(),
    }
    const saved = await encounters.put(row)
    audit.emit({
      action: 'disha_record_accessed',
      resource: 'encounter',
      resourceId: saved.id,
      userId: saved.doctorId,
      userName: saved.doctorName,
      detail: `${saved.patientId} encounter opened`,
    })
    return saved
  },
  async sign(id: string) {
    const patched = await encounters.patch(id, { signedAt: isoNow(), endedAt: isoNow() })
    if (patched) {
      audit.emit({
        action: 'admission_admit',
        resource: 'encounter',
        resourceId: id,
        userId: patched.doctorId,
        userName: patched.doctorName,
        detail: `Encounter signed for ${patched.patientId}`,
      })
    }
    return patched
  },
  patch: (id: string, partial: Partial<Encounter>) => encounters.patch(id, partial),
  _table: encounters,
}
