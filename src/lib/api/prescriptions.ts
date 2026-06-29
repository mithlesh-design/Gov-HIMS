/* Prescriptions — signed Rx with line items. */
import { z } from 'zod'
import { audit, id as newId, isoNow, table } from './_core'

export const RxLineSchema = z.object({
  id: z.string(),
  drugCode: z.string().optional(),
  drugName: z.string(),
  dose: z.string(),                       // e.g. "500 mg"
  route: z.string().optional(),           // PO / IV / IM
  freq: z.string().optional(),            // BD / TDS / Q6H
  days: z.number().int().positive().default(5),
  quantity: z.number().int().nonnegative().default(0),
  instructions: z.string().optional(),
  status: z.enum(['draft', 'signed', 'dispensed', 'cancelled']).default('draft'),
})
export type RxLine = z.infer<typeof RxLineSchema>

export const SafetyEnvelopeSchema = z.object({
  allergyChecked: z.boolean(),
  interactionChecked: z.boolean(),
  doseChecked: z.boolean(),
  narcoticChecked: z.boolean(),
  flags: z.array(z.string()).default([]),
})

export const PrescriptionSchema = z.object({
  id: z.string(),
  encounterId: z.string().optional(),
  visitId: z.string().optional(),
  patientId: z.string(),
  doctorId: z.string(),
  doctorName: z.string(),
  signedAt: z.string().optional(),
  status: z.enum(['draft', 'signed', 'dispensing', 'dispensed', 'cancelled']).default('draft'),
  lines: z.array(RxLineSchema).default([]),
  safety: SafetyEnvelopeSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Prescription = z.infer<typeof PrescriptionSchema>

const rx = table<Prescription>('prescriptions', PrescriptionSchema)

export const Prescriptions = {
  list: (filter?: (r: Prescription) => boolean) => rx.list(filter),
  get: (id: string) => rx.get(id),
  byPatient: (patientId: string) => rx.list((r) => r.patientId === patientId),
  byStatus: (status: Prescription['status']) => rx.list((r) => r.status === status),
  async draft(input: Omit<Prescription, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'lines'> & {
    lines?: RxLine[]
  }) {
    const row: Prescription = {
      ...input,
      id: newId('RX'),
      status: 'draft',
      lines: input.lines ?? [],
      createdAt: isoNow(),
      updatedAt: isoNow(),
    }
    return rx.put(row)
  },
  async sign(id: string, safety: z.infer<typeof SafetyEnvelopeSchema>) {
    const patched = await rx.patch(id, {
      status: 'signed',
      signedAt: isoNow(),
      safety,
      updatedAt: isoNow(),
    })
    if (patched) {
      audit.emit({
        action: 'prescription_create',
        resource: 'prescription',
        resourceId: id,
        userId: patched.doctorId,
        userName: patched.doctorName,
        detail: `${patched.lines.length} line(s) for ${patched.patientId}`,
      })
    }
    return patched
  },
  async setDispenseStatus(id: string, status: 'dispensing' | 'dispensed') {
    return rx.patch(id, { status, updatedAt: isoNow() })
  },
  put: (row: Prescription) => rx.put(row),
  _table: rx,
}
