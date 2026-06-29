/* Lab — results + QC + verification chain. */
import { z } from 'zod'
import { audit, id as newId, isoNow, table } from './_core'

export const LabResultSchema = z.object({
  id: z.string(),                      // LR-...
  orderId: z.string(),
  patientId: z.string(),
  panelCode: z.string(),
  panelName: z.string(),
  bench: z.enum(['Haematology', 'Biochemistry', 'Immunology', 'Urine', 'Microbiology']),
  collectedAt: z.string().optional(),
  resultedAt: z.string().optional(),
  results: z.array(z.object({
    code: z.string(),
    name: z.string(),
    value: z.union([z.string(), z.number()]),
    units: z.string().optional(),
    refRange: z.string().optional(),
    critical: z.boolean().default(false),
  })).default([]),
  qcStatus: z.enum(['pending', 'pass', 'fail']).default('pending'),
  qcBy: z.string().optional(),
  qcAt: z.string().optional(),
  verifiedBy: z.string().optional(),
  verifiedAt: z.string().optional(),
  releasedAt: z.string().optional(),
  critical: z.boolean().default(false),
  microStages: z.array(z.object({
    stage: z.enum(['Gram', 'Culture', 'Sensitivity', 'Report']),
    at: z.string(),
    note: z.string().optional(),
  })).default([]),
})
export type LabResult = z.infer<typeof LabResultSchema>

const results = table<LabResult>('lab_results', LabResultSchema)

export const Lab = {
  list: (filter?: (r: LabResult) => boolean) => results.list(filter),
  get: (id: string) => results.get(id),
  byPatient: (patientId: string) => results.list((r) => r.patientId === patientId),
  byOrder: (orderId: string) => results.list((r) => r.orderId === orderId),
  released: (patientId: string) => results.list((r) => r.patientId === patientId && !!r.releasedAt),
  async put(row: LabResult) { return results.put(row) },
  async setQc(id: string, decision: 'pass' | 'fail', by: { userId: string; userName: string }) {
    const patched = await results.patch(id, {
      qcStatus: decision, qcBy: by.userId, qcAt: isoNow(),
    })
    if (patched) {
      audit.emit({
        action: decision === 'fail' ? 'lab_qc_override' : 'lab_result_released',
        resource: 'lab_result',
        resourceId: id,
        userId: by.userId,
        userName: by.userName,
        detail: `QC ${decision} for ${patched.panelName}`,
      })
    }
    return patched
  },
  async verify(id: string, by: { userId: string; userName: string }) {
    const patched = await results.patch(id, {
      verifiedBy: by.userId, verifiedAt: isoNow(),
    })
    return patched
  },
  async release(id: string, by: { userId: string; userName: string }) {
    const patched = await results.patch(id, { releasedAt: isoNow() })
    if (patched) {
      audit.emit({
        action: patched.critical ? 'lab_critical_callback' : 'lab_result_released',
        resource: 'lab_result',
        resourceId: id,
        userId: by.userId,
        userName: by.userName,
        detail: `Released ${patched.panelName}${patched.critical ? ' [CRITICAL]' : ''}`,
      })
    }
    return patched
  },
  _table: results,
}
