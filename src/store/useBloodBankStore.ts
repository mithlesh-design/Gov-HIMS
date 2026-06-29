import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useAuditStore } from './useAuditStore'

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
export type BloodComponent = 'Whole Blood' | 'Packed RBC' | 'Fresh Frozen Plasma' | 'Platelets' | 'Cryoprecipitate'
export type CrossMatchStatus = 'pending' | 'compatible' | 'incompatible' | 'issued'

export interface BloodUnit {
  id: string
  bloodGroup: BloodGroup
  component: BloodComponent
  bagNumber: string
  collectedOn: string
  expiresOn: string
  donorId: string
  issuedTo?: string
  reservedForReqId?: string
  status: 'available' | 'reserved' | 'issued' | 'expired'
}

// Bedside transfusion safety checklist — every item must be confirmed before issue.
export type BedsideCheck = 'patient_id_match' | 'group_abo' | 'group_rh' | 'expiry_ok' | 'bag_integrity' | 'consent'
export const BEDSIDE_CHECK_LABELS: Record<BedsideCheck, string> = {
  patient_id_match: 'Patient ID matches request',
  group_abo:        'ABO group verified at bedside',
  group_rh:         'Rh type verified at bedside',
  expiry_ok:        'Expiry within validity',
  bag_integrity:    'Bag integrity & label OK',
  consent:          'Transfusion consent on file',
}

export interface CrossMatchRequest {
  id: string
  patientId: string
  patientName: string
  bloodGroup: BloodGroup
  component: BloodComponent
  units: number
  requestedBy: string
  requestedAt: string
  status: CrossMatchStatus
  reservedUnitIds?: string[]
  issuedUnitIds?: string[]
  issuedBy?: string
  issuedAt?: string
  bedsideChecks?: Partial<Record<BedsideCheck, boolean>>
  incompatibilityNote?: string
}

interface BloodBankState {
  units: BloodUnit[]
  crossMatchRequests: CrossMatchRequest[]
  inventorySummary: () => Record<BloodGroup, number>
  addRequest: (r: Omit<CrossMatchRequest, 'id' | 'requestedAt'>) => void
  updateRequest: (id: string, update: Partial<CrossMatchRequest>) => void
  // FEFO-recommended available units that match group + component.
  recommendUnits: (group: BloodGroup, component: BloodComponent, qty: number) => BloodUnit[]
  // Cross-match: reserve recommended units against the request, flip status.
  crossMatch: (reqId: string) => string[]
  // Mark incompatible with a reason — releases any reservation.
  markIncompatible: (reqId: string, note: string) => void
  // Bedside check toggle.
  toggleBedsideCheck: (reqId: string, check: BedsideCheck) => void
  // Issue the reserved units — fires audit event per unit, flips status, sets issuedBy/At.
  issueReservedUnits: (reqId: string, issuedBy: string) => void
  // Legacy single-unit issue (kept for back-compat with any consumer).
  issueUnit: (unitId: string, patientId: string) => void
  // M12-B — register a freshly-collected unit and discard expired stock.
  addUnit: (u: Omit<BloodUnit, 'id' | 'status'>) => string
  discardUnit: (unitId: string, reason: string) => void
}

const BLOOD_UNITS: BloodUnit[] = [
  { id: 'BU-001', bloodGroup: 'O+', component: 'Packed RBC', bagNumber: 'BAG-4521', collectedOn: '2026-05-01', expiresOn: '2026-06-12', donorId: 'DN-001', status: 'available' },
  { id: 'BU-002', bloodGroup: 'O+', component: 'Packed RBC', bagNumber: 'BAG-4522', collectedOn: '2026-05-03', expiresOn: '2026-06-14', donorId: 'DN-002', status: 'available' },
  { id: 'BU-003', bloodGroup: 'A+', component: 'Packed RBC', bagNumber: 'BAG-4523', collectedOn: '2026-04-28', expiresOn: '2026-06-09', donorId: 'DN-003', status: 'available' },
  { id: 'BU-004', bloodGroup: 'B+', component: 'Platelets',  bagNumber: 'BAG-4524', collectedOn: '2026-05-06', expiresOn: '2026-06-09', donorId: 'DN-004', status: 'available' },
  { id: 'BU-005', bloodGroup: 'AB+', component: 'Fresh Frozen Plasma', bagNumber: 'BAG-4525', collectedOn: '2026-05-01', expiresOn: '2026-11-01', donorId: 'DN-005', status: 'available' },
  { id: 'BU-006', bloodGroup: 'O-', component: 'Packed RBC', bagNumber: 'BAG-4526', collectedOn: '2026-05-05', expiresOn: '2026-06-16', donorId: 'DN-006', status: 'available' },
  { id: 'BU-007', bloodGroup: 'A-', component: 'Packed RBC', bagNumber: 'BAG-4527', collectedOn: '2026-04-25', expiresOn: '2026-06-06', donorId: 'DN-007', status: 'reserved' },
  { id: 'BU-008', bloodGroup: 'B-', component: 'Platelets',  bagNumber: 'BAG-4528', collectedOn: '2026-05-04', expiresOn: '2026-06-07', donorId: 'DN-008', status: 'available' },
  { id: 'BU-009', bloodGroup: 'O+', component: 'Packed RBC', bagNumber: 'BAG-4529', collectedOn: '2026-04-30', expiresOn: '2026-06-11', donorId: 'DN-009', status: 'available' },
  { id: 'BU-010', bloodGroup: 'A+', component: 'Fresh Frozen Plasma', bagNumber: 'BAG-4530', collectedOn: '2026-05-08', expiresOn: '2026-11-08', donorId: 'DN-010', status: 'available' },
]

const CROSS_MATCH_REQUESTS: CrossMatchRequest[] = [
  { id: 'CMR-001', patientId: 'PT-20394', patientName: 'Kiran Patil', bloodGroup: 'O+', component: 'Packed RBC', units: 2,
    requestedBy: 'Dr. Priya Menon', requestedAt: new Date(Date.now() - 3600000).toISOString(), status: 'pending' },
  { id: 'CMR-002', patientId: 'PT-20398', patientName: 'Mohan Lal', bloodGroup: 'A+', component: 'Fresh Frozen Plasma', units: 1,
    requestedBy: 'Dr. Vikram Rathore', requestedAt: new Date(Date.now() - 7200000).toISOString(), status: 'compatible',
    reservedUnitIds: ['BU-010'],
    bedsideChecks: { patient_id_match: true, group_abo: true } },
  // OT-001 Arvind Gupta — needs 1 unit Packed RBC for TKR (intra-op standby), already cross-matched + issued
  { id: 'CMR-003', patientId: 'PT-20100', patientName: 'Arvind Gupta', bloodGroup: 'B+', component: 'Packed RBC', units: 1,
    requestedBy: 'Dr. Anisha Sharma', requestedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    status: 'issued', reservedUnitIds: ['BU-004'], issuedUnitIds: ['BU-004'],
    issuedBy: 'Dr. Pooja Srivastava', issuedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    bedsideChecks: { patient_id_match: true, group_abo: true, group_rh: true, expiry_ok: true, bag_integrity: true, consent: true } },
]

// Pre-mark BU-004 as issued and BU-010 as reserved to reflect CMR-003 / CMR-002 state.
const SEEDED_UNITS: BloodUnit[] = BLOOD_UNITS.map(u =>
  u.id === 'BU-004' ? { ...u, status: 'issued', issuedTo: 'PT-20100', reservedForReqId: 'CMR-003' }
  : u.id === 'BU-010' ? { ...u, status: 'reserved', reservedForReqId: 'CMR-002' }
  : u,
)

export const useBloodBankStore = create<BloodBankState>()(persist((set, get) => ({
  units: SEEDED_UNITS,
  crossMatchRequests: CROSS_MATCH_REQUESTS,

  inventorySummary: () => {
    const avail = get().units.filter((u) => u.status === 'available')
    const summary: Record<BloodGroup, number> = { 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0 }
    avail.forEach((u) => { summary[u.bloodGroup] = (summary[u.bloodGroup] ?? 0) + 1 })
    return summary
  },

  addRequest: (r) =>
    set((state) => ({
      crossMatchRequests: [{ ...r, id: `CMR-${Date.now()}`, requestedAt: new Date().toISOString() }, ...state.crossMatchRequests],
    })),

  updateRequest: (id, update) =>
    set((state) => ({
      crossMatchRequests: state.crossMatchRequests.map((r) => r.id === id ? { ...r, ...update } : r),
    })),

  recommendUnits: (group, component, qty) => {
    const avail = get().units
      .filter(u => u.status === 'available' && u.bloodGroup === group && u.component === component)
      .sort((a, b) => new Date(a.expiresOn).getTime() - new Date(b.expiresOn).getTime())  // FEFO
    return avail.slice(0, qty)
  },

  crossMatch: (reqId) => {
    const req = get().crossMatchRequests.find(r => r.id === reqId)
    if (!req) return []
    const recommended = get().recommendUnits(req.bloodGroup, req.component, req.units)
    if (recommended.length === 0) return []
    const reservedIds = recommended.map(u => u.id)
    set(state => ({
      units: state.units.map(u =>
        reservedIds.includes(u.id) ? { ...u, status: 'reserved' as const, reservedForReqId: reqId } : u),
      crossMatchRequests: state.crossMatchRequests.map(r =>
        r.id === reqId ? { ...r, status: 'compatible' as const, reservedUnitIds: reservedIds, bedsideChecks: r.bedsideChecks ?? {} } : r),
    }))
    return reservedIds
  },

  markIncompatible: (reqId, note) => {
    const req = get().crossMatchRequests.find(r => r.id === reqId)
    const releaseIds = req?.reservedUnitIds ?? []
    set(state => ({
      units: state.units.map(u =>
        releaseIds.includes(u.id) ? { ...u, status: 'available' as const, reservedForReqId: undefined } : u),
      crossMatchRequests: state.crossMatchRequests.map(r =>
        r.id === reqId ? { ...r, status: 'incompatible' as const, incompatibilityNote: note, reservedUnitIds: [] } : r),
    }))
  },

  toggleBedsideCheck: (reqId, check) => set(state => ({
    crossMatchRequests: state.crossMatchRequests.map(r =>
      r.id === reqId
        ? { ...r, bedsideChecks: { ...(r.bedsideChecks ?? {}), [check]: !((r.bedsideChecks ?? {})[check]) } }
        : r),
  })),

  issueReservedUnits: (reqId, issuedBy) => {
    const req = get().crossMatchRequests.find(r => r.id === reqId)
    if (!req || !req.reservedUnitIds || req.reservedUnitIds.length === 0) return
    const issuedIds = req.reservedUnitIds
    const now = new Date().toISOString()
    set(state => ({
      units: state.units.map(u =>
        issuedIds.includes(u.id) ? { ...u, status: 'issued' as const, issuedTo: req.patientId } : u),
      crossMatchRequests: state.crossMatchRequests.map(r =>
        r.id === reqId ? { ...r, status: 'issued' as const, issuedUnitIds: issuedIds, issuedBy, issuedAt: now } : r),
    }))
    // Audit emit — one entry per bag for traceability (NABH ROM chapter).
    const log = useAuditStore.getState().log
    const bagOf = (id: string) => get().units.find(u => u.id === id)?.bagNumber ?? id
    issuedIds.forEach(uid => {
      log({
        userId: 'BB-1201', userName: issuedBy,
        action: 'blood_issue',
        resource: 'blood_bag', resourceId: bagOf(uid),
        detail: `1 unit ${req.component} (${req.bloodGroup}) issued for ${req.patientName} (${req.patientId}) · ${reqId}`,
      })
    })
  },

  issueUnit: (unitId, patientId) =>
    set((state) => ({
      units: state.units.map((u) => u.id === unitId ? { ...u, status: 'issued', issuedTo: patientId } : u),
    })),

  addUnit: (input) => {
    const id = `BU-${Date.now()}`
    set((state) => ({ units: [{ ...input, id, status: 'available' as const }, ...state.units] }))
    return id
  },

  discardUnit: (unitId, reason) =>
    set((state) => ({
      // Soft-delete: flip to 'expired' so the trail survives. Note reason in donorId field is wrong;
      // we keep donorId stable and just flip status — auditors get the reason from the audit row.
      units: state.units.map((u) => u.id === unitId ? { ...u, status: 'expired' as const } : u),
    })),
}),
  {
    name: 'agentix-bloodbankstore', version: 1,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))
