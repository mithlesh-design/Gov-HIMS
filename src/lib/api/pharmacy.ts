/* Pharmacy — Rx claim queue + dispense events + narcotic register. */
import { z } from 'zod'
import { audit, id as newId, isoNow, table } from './_core'

export const PharmacyClaimSchema = z.object({
  id: z.string(),                         // PCM-...
  prescriptionId: z.string(),
  patientId: z.string(),
  tag: z.enum(['OPD', 'IPD', 'OT', 'ICU', 'Discharge']),
  claimedBy: z.string().optional(),       // pharmacist id
  claimedByName: z.string().optional(),
  claimedAt: z.string().optional(),
  status: z.enum(['queued', 'claimed', 'verifying', 'ready', 'dispensed', 'cancelled']).default('queued'),
  substitutionDrugCode: z.string().optional(),
  substitutionReason: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type PharmacyClaim = z.infer<typeof PharmacyClaimSchema>

const claims = table<PharmacyClaim>('pharmacy_claims', PharmacyClaimSchema)

export const DispenseEventSchema = z.object({
  id: z.string(),                         // DSP-...
  claimId: z.string(),
  prescriptionId: z.string(),
  patientId: z.string(),
  pharmacistId: z.string(),
  pharmacistName: z.string(),
  bedside: z.boolean().default(false),
  dispensedAt: z.string(),
  drugsSummary: z.string().optional(),
})
export type DispenseEvent = z.infer<typeof DispenseEventSchema>

const dispenses = table<DispenseEvent>('pharmacy_dispense', DispenseEventSchema)

export const NarcoticLogSchema = z.object({
  id: z.string(),                         // NRC-...
  drugId: z.string(),
  qty: z.number().int().positive(),
  signedOutBy: z.string(),                // pharmacist id
  signedOutByName: z.string(),
  witnessId: z.string(),
  witnessName: z.string(),
  patientId: z.string().optional(),
  signedOutAt: z.string(),
  returnedQty: z.number().int().nonnegative().default(0),
  returnedAt: z.string().optional(),
})
export type NarcoticLog = z.infer<typeof NarcoticLogSchema>

const narcotics = table<NarcoticLog>('pharmacy_narcotics', NarcoticLogSchema)

export const Pharmacy = {
  queue: (filter?: (c: PharmacyClaim) => boolean) => claims.list(filter),
  getClaim: (id: string) => claims.get(id),
  async createClaim(input: Omit<PharmacyClaim, 'id' | 'status' | 'createdAt' | 'updatedAt'>) {
    const row: PharmacyClaim = {
      ...input,
      id: newId('PCM'),
      status: 'queued',
      createdAt: isoNow(),
      updatedAt: isoNow(),
    }
    return claims.put(row)
  },
  async claim(id: string, by: { userId: string; userName: string }) {
    const patched = await claims.patch(id, {
      status: 'claimed', claimedBy: by.userId, claimedByName: by.userName,
      claimedAt: isoNow(), updatedAt: isoNow(),
    })
    if (patched) {
      audit.emit({
        action: 'pharmacy_qty_adjusted',
        resource: 'pharmacy_claim',
        resourceId: id,
        userId: by.userId,
        userName: by.userName,
        detail: `Claimed ${patched.tag} Rx for ${patched.patientId}`,
      })
    }
    return patched
  },
  async dispense(claimId: string, by: { userId: string; userName: string }, opts: { bedside?: boolean; drugsSummary?: string } = {}) {
    const claim = await claims.get(claimId)
    if (!claim) return undefined
    await claims.patch(claimId, { status: 'dispensed', updatedAt: isoNow() })
    const evt: DispenseEvent = {
      id: newId('DSP'),
      claimId,
      prescriptionId: claim.prescriptionId,
      patientId: claim.patientId,
      pharmacistId: by.userId,
      pharmacistName: by.userName,
      bedside: opts.bedside ?? false,
      dispensedAt: isoNow(),
      drugsSummary: opts.drugsSummary,
    }
    await dispenses.put(evt)
    audit.emit({
      action: 'drug_dispense',
      resource: 'pharmacy_claim',
      resourceId: claimId,
      userId: by.userId,
      userName: by.userName,
      detail: `Dispensed (${opts.bedside ? 'bedside' : 'counter'}) ${opts.drugsSummary ?? ''}`.trim(),
    })
    return evt
  },
  async substitute(claimId: string, substitution: { drugCode: string; reason: string; by: { userId: string; userName: string } }) {
    const patched = await claims.patch(claimId, {
      substitutionDrugCode: substitution.drugCode,
      substitutionReason: substitution.reason,
      status: 'verifying',
      updatedAt: isoNow(),
    })
    if (patched) {
      audit.emit({
        action: 'pharmacy_substituted',
        resource: 'pharmacy_claim',
        resourceId: claimId,
        userId: substitution.by.userId,
        userName: substitution.by.userName,
        detail: substitution.reason,
      })
    }
    return patched
  },
  dispenses: (filter?: (d: DispenseEvent) => boolean) => dispenses.list(filter),
  narcotics: {
    list: () => narcotics.list(),
    async signOut(input: Omit<NarcoticLog, 'id' | 'signedOutAt' | 'returnedQty'>) {
      const row: NarcoticLog = {
        ...input,
        id: newId('NRC'),
        signedOutAt: isoNow(),
        returnedQty: 0,
      }
      await narcotics.put(row)
      audit.emit({
        action: 'drug_dispense',
        resource: 'narcotic',
        resourceId: row.id,
        userId: row.signedOutBy,
        userName: row.signedOutByName,
        detail: `Narcotic sign-out (witness: ${row.witnessName})`,
      })
      return row
    },
  },
  _claims: claims,
  _dispenses: dispenses,
  _narcotics: narcotics,
}
