/* Discharge — 4-pillar clearance + summary. */
import { z } from 'zod'
import { audit, id as newId, isoNow, table } from './_core'

export const DischargePillar = z.enum(['pharmacy', 'billing', 'files', 'handover'])
export const DischargePillarStatus = z.enum(['open', 'clearing', 'cleared', 'blocked'])

export const DischargeSchema = z.object({
  id: z.string(),                            // DIS-...
  ipdStayId: z.string(),
  patientId: z.string(),
  initiatedBy: z.string(),
  initiatedByName: z.string().optional(),
  initiatedAt: z.string(),
  completedAt: z.string().optional(),
  pillars: z.record(DischargePillar, z.object({
    status: DischargePillarStatus,
    clearedBy: z.string().optional(),
    clearedByName: z.string().optional(),
    clearedAt: z.string().optional(),
    note: z.string().optional(),
  })),
  summaryMd: z.string().optional(),
  followUpPlan: z.string().optional(),
})
export type Discharge = z.infer<typeof DischargeSchema>

const discharges = table<Discharge>('discharges', DischargeSchema)

export const DischargeApi = {
  list: () => discharges.list(),
  get: (id: string) => discharges.get(id),
  byIpd: (ipdStayId: string) => discharges.list((d) => d.ipdStayId === ipdStayId).then((rows) => rows[0]),
  async initiate(input: { ipdStayId: string; patientId: string; initiatedBy: string; initiatedByName: string }) {
    const row: Discharge = {
      id: newId('DIS'),
      ipdStayId: input.ipdStayId,
      patientId: input.patientId,
      initiatedBy: input.initiatedBy,
      initiatedByName: input.initiatedByName,
      initiatedAt: isoNow(),
      pillars: {
        pharmacy: { status: 'open' },
        billing: { status: 'open' },
        files: { status: 'open' },
        handover: { status: 'open' },
      } as Discharge['pillars'],
    }
    const saved = await discharges.put(row)
    audit.emit({
      action: 'discharge_clearance',
      resource: 'discharge',
      resourceId: saved.id,
      userId: input.initiatedBy,
      userName: input.initiatedByName,
      detail: `Discharge initiated for ${input.patientId}`,
    })
    return saved
  },
  async setPillar(id: string, pillar: 'pharmacy' | 'billing' | 'files' | 'handover',
                  status: 'open' | 'clearing' | 'cleared' | 'blocked',
                  by: { userId: string; userName: string },
                  note?: string) {
    const dis = await discharges.get(id)
    if (!dis) return undefined
    const updated: Discharge = {
      ...dis,
      pillars: {
        ...dis.pillars,
        [pillar]: {
          status,
          clearedBy: status === 'cleared' ? by.userId : undefined,
          clearedByName: status === 'cleared' ? by.userName : undefined,
          clearedAt: status === 'cleared' ? isoNow() : undefined,
          note,
        },
      },
    }
    const saved = await discharges.put(updated)
    audit.emit({
      action: 'discharge_clearance',
      resource: 'discharge',
      resourceId: id,
      userId: by.userId,
      userName: by.userName,
      detail: `${pillar} → ${status}${note ? ' · ' + note : ''}`,
    })
    return saved
  },
  async exit(id: string, by: { userId: string; userName: string }) {
    const dis = await discharges.get(id)
    if (!dis) return undefined
    const allCleared = (['pharmacy', 'billing', 'files', 'handover'] as const)
      .every((p) => dis.pillars[p]?.status === 'cleared')
    if (!allCleared) return undefined  // server-side gate
    const patched = await discharges.patch(id, { completedAt: isoNow() })
    if (patched) {
      audit.emit({
        action: 'exit_clearance_issued',
        resource: 'discharge',
        resourceId: id,
        userId: by.userId,
        userName: by.userName,
        detail: `Discharge complete for ${patched.patientId}`,
      })
    }
    return patched
  },
  async setSummary(id: string, summaryMd: string, followUpPlan?: string) {
    return discharges.patch(id, { summaryMd, followUpPlan })
  },
  _table: discharges,
}
