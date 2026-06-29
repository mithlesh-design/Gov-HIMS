import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  issueFamilyToken,
  type FamilyTokenPayload,
} from '@/lib/familyToken'

/* Family-tracking access tokens (frontend pattern).
 *
 * Issues self-validating tokens for the public `/p/<uhid>` page and keeps a
 * record so staff can see / revoke active tracking links. The page validates
 * the token statelessly (see `@/lib/familyToken`); this store only adds the
 * revocation denylist + an issuance record. Phase-2: this becomes a server
 * table (issued tokens + revoked jtis), validated in a route handler. */

export interface FamilyTokenRecord {
  uhid: string
  name: string
  jti: string
  token: string
  issuedAt: number
  expiresAt: number
  consent: boolean
  issuedBy?: string
}

interface FamilyTokenState {
  /** Active records keyed by UHID (upper-cased). */
  records: Record<string, FamilyTokenRecord>
  /** Revoked token ids (denylist). */
  revoked: string[]
  /**
   * Issue (or re-issue) a tracking token for a UHID. Idempotent per UHID:
   * re-issuing replaces the active record. Returns the token string to embed
   * in the link. Consent defaults to true here because issuance happens from
   * an authenticated staff/patient context that already captured consent at
   * registration; pass `consent:false` to force the consent gate.
   */
  issue: (
    uhid: string,
    name: string,
    opts?: { ttlHours?: number; consent?: boolean; issuedBy?: string },
  ) => string
  /** Revoke the active token for a UHID (adds its jti to the denylist). */
  revoke: (uhid: string) => void
  /** Grant consent on the active record (re-issues with consent=true). */
  grantConsent: (uhid: string) => string | undefined
  get: (uhid: string) => FamilyTokenRecord | undefined
}

export const useFamilyTokenStore = create<FamilyTokenState>()(
  persist(
    (set, get) => ({
      records: {},
      revoked: [],

      issue: (uhid, name, opts = {}) => {
        const key = uhid.toUpperCase()
        const { token, payload }: { token: string; payload: FamilyTokenPayload } =
          issueFamilyToken(key, name, {
            ttlHours: opts.ttlHours ?? 72,
            consent: opts.consent ?? true,
          })
        const record: FamilyTokenRecord = {
          uhid: key,
          name,
          jti: payload.jti,
          token,
          issuedAt: payload.iat,
          expiresAt: payload.exp,
          consent: payload.consent,
          issuedBy: opts.issuedBy,
        }
        set((s) => ({ records: { ...s.records, [key]: record } }))
        return token
      },

      revoke: (uhid) => {
        const key = uhid.toUpperCase()
        const rec = get().records[key]
        if (!rec) return
        set((s) => {
          const nextRecords = { ...s.records }
          delete nextRecords[key]
          return {
            records: nextRecords,
            revoked: s.revoked.includes(rec.jti) ? s.revoked : [...s.revoked, rec.jti],
          }
        })
      },

      grantConsent: (uhid) => {
        const key = uhid.toUpperCase()
        const rec = get().records[key]
        if (!rec) return undefined
        // Re-issue with consent so the new token carries the consent claim.
        return get().issue(key, rec.name, { consent: true, issuedBy: rec.issuedBy })
      },

      get: (uhid) => get().records[uhid.toUpperCase()],
    }),
    {
      name: 'agentix-family-token-store',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
)
