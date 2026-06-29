/* Radiology — study + report. */
import { z } from 'zod'
import { audit, id as newId, isoNow, table } from './_core'

export const RadStudySchema = z.object({
  id: z.string(),                          // RAD-...
  orderId: z.string(),
  patientId: z.string(),
  modality: z.string(),                    // CXR / CT / MRI / USG / ECG
  bodyPart: z.string().optional(),
  status: z.enum(['scheduled', 'acquired', 'reading', 'verified', 'released', 'cancelled']).default('scheduled'),
  scheduledAt: z.string().optional(),
  acquiredAt: z.string().optional(),
  technicianId: z.string().optional(),
  radiologistId: z.string().optional(),
  aiDraft: z.string().optional(),
  finalReportMd: z.string().optional(),
  signedAt: z.string().optional(),
  releasedAt: z.string().optional(),
  critical: z.boolean().default(false),
})
export type RadStudy = z.infer<typeof RadStudySchema>

const studies = table<RadStudy>('radiology_studies', RadStudySchema)

export const Radiology = {
  list: (filter?: (r: RadStudy) => boolean) => studies.list(filter),
  get: (id: string) => studies.get(id),
  byPatient: (patientId: string) => studies.list((r) => r.patientId === patientId),
  byOrder: (orderId: string) => studies.list((r) => r.orderId === orderId),
  inbox: () => studies.list((r) => r.status === 'scheduled' || r.status === 'acquired'),
  reading: () => studies.list((r) => r.status === 'reading'),
  released: (patientId: string) => studies.list((r) => r.patientId === patientId && !!r.releasedAt),
  put: (row: RadStudy) => studies.put(row),
  async transition(id: string, status: RadStudy['status']) {
    return studies.patch(id, { status })
  },
  async signReport(id: string, by: { userId: string; userName: string }, reportMd: string) {
    const patched = await studies.patch(id, {
      finalReportMd: reportMd,
      radiologistId: by.userId,
      status: 'verified',
      signedAt: isoNow(),
    })
    if (patched) {
      audit.emit({
        action: 'radiology_report_verified',
        resource: 'radiology_study',
        resourceId: id,
        userId: by.userId,
        userName: by.userName,
        detail: `${patched.modality} ${patched.bodyPart ?? ''} report signed for ${patched.patientId}`,
      })
    }
    return patched
  },
  async release(id: string, by: { userId: string; userName: string }) {
    const patched = await studies.patch(id, { status: 'released', releasedAt: isoNow() })
    if (patched && patched.critical) {
      audit.emit({
        action: 'radiology_critical_callback',
        resource: 'radiology_study',
        resourceId: id,
        userId: by.userId,
        userName: by.userName,
        detail: `Critical radiology released for ${patched.patientId}`,
      })
    }
    return patched
  },
  _table: studies,
}
