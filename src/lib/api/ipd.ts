/* IPD — admissions + beds + vitals + MAR. */
import { z } from 'zod'
import { audit, id as newId, isoNow, table } from './_core'

export const WardSchema = z.object({
  id: z.string(),
  name: z.string(),
  dept: z.string(),
})
export type Ward = z.infer<typeof WardSchema>

export const BedSchema = z.object({
  id: z.string(),                          // BED-101
  ward: z.string(),
  code: z.string(),                        // 101A
  type: z.enum(['general', 'icu', 'isolation', 'private']).default('general'),
  status: z.enum(['occupied', 'clean', 'cleaning', 'biohazard', 'out_of_service']).default('clean'),
  currentIpdStayId: z.string().optional(),
})
export type Bed = z.infer<typeof BedSchema>

export const IpdStaySchema = z.object({
  id: z.string(),                          // IPD-...
  patientId: z.string(),
  visitId: z.string(),
  admittingDoctorId: z.string(),
  admittingDoctorName: z.string(),
  ward: z.string(),
  bedId: z.string().optional(),
  startedAt: z.string(),
  endedAt: z.string().optional(),
  status: z.enum(['active', 'transferring', 'discharged']).default('active'),
  diagnosis: z.string().optional(),
})
export type IpdStay = z.infer<typeof IpdStaySchema>

export const VitalSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  ipdStayId: z.string().optional(),
  capturedAt: z.string(),
  capturedBy: z.string(),
  capturedByName: z.string().optional(),
  hr: z.number().optional(),
  rr: z.number().optional(),
  sbp: z.number().optional(),
  dbp: z.number().optional(),
  temp: z.number().optional(),
  spo2: z.number().optional(),
  news2: z.number().int().optional(),
})
export type Vital = z.infer<typeof VitalSchema>

export const MarDoseSchema = z.object({
  id: z.string(),
  ipdStayId: z.string(),
  patientId: z.string(),
  rxLineId: z.string(),
  drugName: z.string(),
  dose: z.string(),
  scheduledAt: z.string(),
  administeredAt: z.string().optional(),
  administeredBy: z.string().optional(),
  administeredByName: z.string().optional(),
  status: z.enum(['due', 'on_time', 'late', 'missed', 'refused']).default('due'),
  reason: z.string().optional(),
})
export type MarDose = z.infer<typeof MarDoseSchema>

const wards = table<Ward>('wards', WardSchema)
const beds = table<Bed>('beds', BedSchema)
const stays = table<IpdStay>('ipd_stays', IpdStaySchema)
const vitals = table<Vital>('vitals', VitalSchema)
const mars = table<MarDose>('mar_doses', MarDoseSchema)

export const Ipd = {
  wards: { list: () => wards.list(), put: (w: Ward) => wards.put(w) },
  beds: {
    list: () => beds.list(),
    get: (id: string) => beds.get(id),
    byWard: (ward: string) => beds.list((b) => b.ward === ward),
    put: (b: Bed) => beds.put(b),
    async assign(bedId: string, ipdStayId: string) {
      const patched = await beds.patch(bedId, { status: 'occupied', currentIpdStayId: ipdStayId })
      if (patched) audit.emit({
        action: 'admission_admit',
        resource: 'bed',
        resourceId: bedId,
        detail: `Bed ${patched.code} assigned to stay ${ipdStayId}`,
      })
      return patched
    },
    async free(bedId: string) {
      const patched = await beds.patch(bedId, { status: 'cleaning', currentIpdStayId: undefined })
      if (patched) audit.emit({
        action: 'housekeeping_bed_turned',
        resource: 'bed',
        resourceId: bedId,
        detail: `Bed ${patched.code} → cleaning`,
      })
      return patched
    },
    async markClean(bedId: string) {
      return beds.patch(bedId, { status: 'clean' })
    },
  },
  stays: {
    list: () => stays.list((s) => s.status !== 'discharged'),
    all: () => stays.list(),
    get: (id: string) => stays.get(id),
    byPatient: (patientId: string) => stays.list((s) => s.patientId === patientId),
    async admit(input: Omit<IpdStay, 'id' | 'startedAt' | 'status'> & { id?: string }) {
      const row: IpdStay = {
        ...input,
        id: input.id ?? newId('IPD'),
        startedAt: isoNow(),
        status: 'active',
      }
      const saved = await stays.put(row)
      audit.emit({
        action: 'admission_admit',
        resource: 'ipd_stay',
        resourceId: saved.id,
        userId: saved.admittingDoctorId,
        userName: saved.admittingDoctorName,
        detail: `Admit ${saved.patientId} to ${saved.ward}`,
      })
      return saved
    },
    async transfer(id: string, toWard: string, toBedId?: string) {
      const patched = await stays.patch(id, { ward: toWard, bedId: toBedId, status: 'active' })
      if (patched) audit.emit({
        action: 'admission_transfer',
        resource: 'ipd_stay',
        resourceId: id,
        detail: `Transfer to ${toWard}`,
      })
      return patched
    },
    async discharge(id: string) {
      const patched = await stays.patch(id, { status: 'discharged', endedAt: isoNow() })
      if (patched) audit.emit({
        action: 'admission_discharge',
        resource: 'ipd_stay',
        resourceId: id,
        detail: `Discharge ${patched.patientId}`,
      })
      return patched
    },
  },
  vitals: {
    list: (ipdStayId: string) => vitals.list((v) => v.ipdStayId === ipdStayId),
    async capture(input: Omit<Vital, 'id' | 'capturedAt'> & { capturedAt?: string }) {
      const row: Vital = {
        ...input,
        id: newId('VIT'),
        capturedAt: input.capturedAt ?? isoNow(),
      }
      await vitals.put(row)
      audit.emit({
        action: 'nurse_med_administered',
        resource: 'vital',
        resourceId: row.id,
        userId: row.capturedBy,
        userName: row.capturedByName,
        detail: `Vitals captured (NEWS2=${row.news2 ?? '?'})`,
      })
      return row
    },
  },
  mar: {
    list: (ipdStayId: string) => mars.list((m) => m.ipdStayId === ipdStayId),
    due: () => mars.list((m) => m.status === 'due' || m.status === 'late'),
    async schedule(input: Omit<MarDose, 'id' | 'status'> & { id?: string }) {
      const row: MarDose = {
        ...input,
        id: input.id ?? newId('MAR'),
        status: 'due',
      }
      return mars.put(row)
    },
    async administer(id: string, by: { userId: string; userName: string }) {
      const dose = await mars.get(id)
      if (!dose) return undefined
      const sched = new Date(dose.scheduledAt).getTime()
      const now = Date.now()
      const status = now - sched > 30 * 60 * 1000 ? 'late' : 'on_time'
      const patched = await mars.patch(id, {
        administeredAt: isoNow(),
        administeredBy: by.userId,
        administeredByName: by.userName,
        status,
      })
      if (patched) {
        audit.emit({
          action: 'nurse_med_administered',
          resource: 'mar',
          resourceId: id,
          userId: by.userId,
          userName: by.userName,
          detail: `${dose.drugName} ${dose.dose} (${status})`,
        })
      }
      return patched
    },
    async refuse(id: string, reason: string, by: { userId: string; userName: string }) {
      const patched = await mars.patch(id, {
        status: 'refused',
        reason,
        administeredAt: isoNow(),
        administeredBy: by.userId,
        administeredByName: by.userName,
      })
      return patched
    },
  },
  _wards: wards,
  _beds: beds,
  _stays: stays,
  _vitals: vitals,
  _mars: mars,
}
