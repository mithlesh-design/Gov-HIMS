/* Emergency — triage queue + floor / bay state. */
import { z } from 'zod'
import { audit, id as newId, isoNow, table } from './_core'

export const ESI = z.enum(['1', '2', '3', '4', '5'])
export const ErBay = z.enum(['Resuscitation', 'Observation', 'Triage', 'Discharge'])

export const ErCaseSchema = z.object({
  id: z.string(),                            // ER-...
  patientId: z.string().optional(),
  patientName: z.string(),                  // can register-on-arrival
  age: z.number().int().nonnegative().optional(),
  sex: z.enum(['Male', 'Female', 'Other']).optional(),
  arrivalAt: z.string(),
  chiefComplaint: z.string(),
  esi: ESI.optional(),
  esiAiSuggested: ESI.optional(),
  bay: ErBay.optional(),
  doctorId: z.string().optional(),
  doctorName: z.string().optional(),
  disposition: z.enum(['admit', 'discharge', 'transfer', 'died', 'lama']).optional(),
  disposedAt: z.string().optional(),
  notes: z.string().optional(),
})
export type ErCase = z.infer<typeof ErCaseSchema>

const erCases = table<ErCase>('er_cases', ErCaseSchema)

export const Emergency = {
  list: () => erCases.list(),
  get: (id: string) => erCases.get(id),
  triage: () => erCases.list((c) => !c.esi),
  floor: () => erCases.list((c) => !!c.esi && !c.disposition),
  async createOnArrival(input: Omit<ErCase, 'id' | 'arrivalAt'> & { id?: string }) {
    const row: ErCase = { ...input, id: input.id ?? newId('ER'), arrivalAt: isoNow() }
    const saved = await erCases.put(row)
    audit.emit({
      action: 'reception_emergency_escalation',
      resource: 'er_case',
      resourceId: saved.id,
      detail: `ER arrival: ${saved.patientName} — ${saved.chiefComplaint}`,
    })
    return saved
  },
  async setTriage(id: string, esi: '1' | '2' | '3' | '4' | '5', by: { userId: string; userName: string }) {
    const patched = await erCases.patch(id, { esi })
    if (patched) audit.emit({
      action: 'er_triage',
      resource: 'er_case',
      resourceId: id,
      userId: by.userId,
      userName: by.userName,
      detail: `ESI ${esi}`,
    })
    return patched
  },
  async dispose(id: string, disposition: ErCase['disposition'], by: { userId: string; userName: string }) {
    const patched = await erCases.patch(id, { disposition, disposedAt: isoNow() })
    if (patched) audit.emit({
      action: 'er_disposition',
      resource: 'er_case',
      resourceId: id,
      userId: by.userId,
      userName: by.userName,
      detail: `Disposition: ${disposition}`,
    })
    return patched
  },
  async setBay(id: string, bay: ErCase['bay']) {
    return erCases.patch(id, { bay })
  },
  _table: erCases,
}
