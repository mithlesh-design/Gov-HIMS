import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useNotificationStore } from './useNotificationStore'
import { useAdmissionStore } from './useAdmissionStore'
import { useAuditStore } from './useAuditStore'
import { useMortuaryStore } from './useMortuaryStore'
import { usePatientStore } from './usePatientStore'
import { useFamilyTokenStore } from './useFamilyTokenStore'
import {
  news2 as calcNEWS2,
  qsofa as calcQSOFA,
  suggestArea,
  type Vitals,
  type ESIBand,
  type TreatmentArea,
} from '@/lib/erClinical'

// ── Domain types ───────────────────────────────────────────────────────────

export type Arrival = 'walk_in' | 'ambulance' | 'transfer'
export type Disposition = 'admit_ward' | 'admit_icu' | 'admit_hdu' | 'discharge' | 'transfer' | 'deceased' | 'against_medical_advice'
export type Phase = 'awaiting_triage' | 'triaged' | 'in_treatment' | 'awaiting_disposition' | 'disposed'

export type VitalsRecord = Vitals & { at: string; by?: string }

export type ERStaff = { id: string; name: string }

// M13.3 — Medico-Legal Case (MLC) record for police/legal-investigation cases.
// Documented bedside on trauma / poisoning / assault / suicide-attempt cases.
export type MLCInjuryType = 'RTA' | 'Assault' | 'Self-harm' | 'Burn' | 'Fall' | 'Poisoning' | 'Other'
export type MLCAlcoholScreen = 'pending' | 'positive' | 'negative' | 'refused'
export interface MLCRecord {
  mlcNumber: string
  policeStation: string
  officerName?: string
  officerBadge?: string
  injuryType: MLCInjuryType
  alcoholScreen: MLCAlcoholScreen
  witnessName?: string
  witnessPhone?: string
  notes?: string
  filedBy: string
  filedAt: string
}

export type ERPatient = {
  id: string
  patientId: string
  name: string
  age: number
  gender: 'M' | 'F' | 'X'
  arrival: Arrival
  arrivedAt: string                  // door-time
  triagedAt?: string
  doctorClaimAt?: string
  decisionAt?: string                // disposition decided
  dispositionAt?: string             // actually left ER
  chiefComplaint: string
  trauma: boolean
  esi?: ESIBand
  esiReason?: string
  area?: TreatmentArea
  assignedTo?: ERStaff
  vitalsHistory: VitalsRecord[]
  bedNumber?: string
  notes?: string
  disposition?: Disposition
  dispositionNote?: string
  callbackLogged?: { calledBy: string; calledAt: string; recipient: string }
  phase: Phase
  mci?: boolean                      // mass-casualty incident flag
  mlc?: MLCRecord                    // M13.3 — police/legal case file
}

// ── Helpers ────────────────────────────────────────────────────────────────

const minsAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString()
let _erSeq = 0
const nextId = () => `ER-${Date.now()}-${++_erSeq}`

export function latestVitals(p: ERPatient): VitalsRecord | undefined {
  return p.vitalsHistory[p.vitalsHistory.length - 1]
}

export function getNEWS2(p: ERPatient) {
  const v = latestVitals(p)
  if (!v) return { score: 0, band: 'low' as const, trigger: 'No vitals recorded' }
  return calcNEWS2(v)
}

export function getQSOFA(p: ERPatient) {
  const v = latestVitals(p)
  if (!v) return { score: 0, positive: false, criteria: [] }
  return calcQSOFA(v)
}

// ── State ──────────────────────────────────────────────────────────────────

interface ERState {
  patients: ERPatient[]
  mciActive: boolean
  toggleMCI: () => void
  registerArrival: (input: {
    // M13.10 — extended to capture the full arrival registration in one go:
    // patient identity (or unconscious flag), attendant contact for SMS-link,
    // cashless insurance flag for immediate insurance-desk handoff.
    patientId?: string                    // optional — auto-generated if not supplied
    name?: string                         // optional when unconscious
    age?: number                          // optional when unconscious / age-unknown
    gender?: 'M' | 'F' | 'X'
    arrival: Arrival; chiefComplaint: string; trauma?: boolean
    phone?: string                        // patient's phone (if conscious)
    attendantName?: string                // accompanying person (parent/spouse/friend)
    attendantPhone?: string               // attendant's phone — primary SMS target
    unconscious?: boolean                 // forces ER-TEMP UHID, defers SMS until ID
    insurer?: string                      // if non-empty → fires cashless notification
    policyNumber?: string
  }) => string
  recordVitals: (id: string, v: Vitals, by: string) => void
  setESI: (id: string, esi: ESIBand, reason: string) => void
  routeToArea: (id: string, area: TreatmentArea, bed?: string) => void
  claim: (id: string, doctor: ERStaff) => void
  unclaim: (id: string) => void
  setDisposition: (id: string, disposition: Disposition, note?: string) => void
  dispose: (id: string) => void
  logCallback: (id: string, calledBy: string, recipient: string) => void
  setMLC: (id: string, mlc: Omit<MLCRecord, 'filedAt'>) => void
}

// ── Roster ────────────────────────────────────────────────────────────────

export const ER_VIKRAM: ERStaff = { id: 'ER-110', name: 'Dr. Vikram Rathore' }
export const ER_NEHA: ERStaff = { id: 'ER-111', name: 'Dr. Neha Singh' }
export const ER_TRIAGE_NURSE: ERStaff = { id: 'NR-501', name: 'Anjali Pillai' }

// ── Seed ──────────────────────────────────────────────────────────────────

const SEED: ERPatient[] = [
  // 1. Awaiting triage — walked in just now
  {
    id: nextId(),
    patientId: 'PT-30001', name: 'Sandeep Yadav', age: 48, gender: 'M',
    arrival: 'walk_in', arrivedAt: minsAgo(3),
    chiefComplaint: 'Sudden chest pain radiating to left arm, sweating', trauma: false,
    vitalsHistory: [],
    phase: 'awaiting_triage',
  },
  // 2. Awaiting triage — ambulance arrival with trauma
  {
    id: nextId(),
    patientId: 'PT-30002', name: 'Kiran Iyer', age: 28, gender: 'M',
    arrival: 'ambulance', arrivedAt: minsAgo(8),
    chiefComplaint: 'RTA · helmeted · LOC reported by bystander', trauma: true,
    vitalsHistory: [
      { rr: 22, spo2: 96, sbp: 110, hr: 105, temp: 36.8, gcs: 13, at: minsAgo(8), by: 'EMT Saira' },
    ],
    phase: 'awaiting_triage',
  },
  // 3. Triaged ESI 2, in Critical area, claimed by Dr Vikram, mid-sepsis screen
  {
    id: nextId(),
    patientId: 'PT-30003', name: 'Lalita Devi', age: 64, gender: 'F',
    arrival: 'ambulance', arrivedAt: minsAgo(40),
    triagedAt: minsAgo(35),
    doctorClaimAt: minsAgo(28),
    chiefComplaint: 'Fever 3 days, drowsy, oliguric', trauma: false,
    esi: 2, esiReason: 'qSOFA positive — sepsis suspected', area: 'CRITICAL',
    assignedTo: ER_VIKRAM, bedNumber: 'C-2',
    vitalsHistory: [
      { rr: 24, spo2: 93, sbp: 92, hr: 122, temp: 39.2, gcs: 13, at: minsAgo(35), by: ER_TRIAGE_NURSE.name },
      { rr: 24, spo2: 95, sbp: 96, hr: 118, temp: 38.9, gcs: 14, at: minsAgo(15), by: ER_VIKRAM.name, onOxygen: true },
    ],
    phase: 'in_treatment',
  },
  // 4. Triaged ESI 3, Acute, awaiting doctor
  {
    id: nextId(),
    patientId: 'PT-30004', name: 'Reeta Gupta', age: 32, gender: 'F',
    arrival: 'walk_in', arrivedAt: minsAgo(55),
    triagedAt: minsAgo(50),
    chiefComplaint: 'Lower abdominal pain, vomiting, no per-vaginal bleed', trauma: false,
    esi: 3, esiReason: 'Multiple-resource presentation', area: 'ACUTE',
    vitalsHistory: [
      { rr: 18, spo2: 99, sbp: 118, hr: 92, temp: 37.4, gcs: 15, at: minsAgo(50), by: ER_TRIAGE_NURSE.name },
    ],
    phase: 'in_treatment',
  },
  // 5. ESI 4 Fast-track — ankle injury
  {
    id: nextId(),
    patientId: 'PT-30005', name: 'Arjun Kapoor', age: 22, gender: 'M',
    arrival: 'walk_in', arrivedAt: minsAgo(75),
    triagedAt: minsAgo(70),
    chiefComplaint: 'Sport injury · suspected right ankle sprain', trauma: false,
    esi: 4, esiReason: 'Single-resource presentation', area: 'FAST_TRACK',
    vitalsHistory: [
      { rr: 16, spo2: 99, sbp: 122, hr: 78, temp: 36.7, gcs: 15, at: minsAgo(70), by: ER_TRIAGE_NURSE.name },
    ],
    assignedTo: ER_NEHA,
    doctorClaimAt: minsAgo(60),
    phase: 'in_treatment',
  },
  // 7. Disposed — Kiran Patil, the default patient login (PT-20394).
  // He arrived 3 days ago with chest pain, was triaged ESI 2, NEWS2 high,
  // admitted to ICU for PCI workup. Visible from /patient/emergency.
  {
    id: nextId(),
    patientId: 'PT-20394', name: 'Kiran Patil', age: 58, gender: 'M',
    arrival: 'ambulance', arrivedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    triagedAt: new Date(Date.now() - 3 * 86400000 + 8 * 60000).toISOString(),
    doctorClaimAt: new Date(Date.now() - 3 * 86400000 + 12 * 60000).toISOString(),
    decisionAt: new Date(Date.now() - 3 * 86400000 + 95 * 60000).toISOString(),
    dispositionAt: new Date(Date.now() - 3 * 86400000 + 110 * 60000).toISOString(),
    chiefComplaint: 'Severe central chest pain radiating to jaw, sweating, dyspnoea', trauma: false,
    esi: 2, esiReason: 'Suspected ACS · NEWS2 high · cath-lab on standby', area: 'RESUS',
    assignedTo: ER_VIKRAM, bedNumber: 'R-1',
    vitalsHistory: [
      { rr: 26, spo2: 91, sbp: 148, hr: 118, temp: 36.9, gcs: 15, at: new Date(Date.now() - 3 * 86400000 + 8 * 60000).toISOString(), onOxygen: true, by: ER_TRIAGE_NURSE.name },
      { rr: 22, spo2: 95, sbp: 132, hr: 102, temp: 36.8, gcs: 15, at: new Date(Date.now() - 3 * 86400000 + 60 * 60000).toISOString(), onOxygen: true, by: ER_VIKRAM.name },
    ],
    disposition: 'admit_icu',
    dispositionNote: 'Trop I rising — for urgent PCI · ICU bed booked',
    phase: 'disposed',
  },
  // M13.3 — 8. RTA trauma case requiring MLC documentation
  {
    id: nextId(),
    patientId: 'PT-30008', name: 'Sundar Bhosle', age: 36, gender: 'M',
    arrival: 'ambulance', arrivedAt: minsAgo(22),
    triagedAt: minsAgo(18), doctorClaimAt: minsAgo(15),
    chiefComplaint: 'RTA · bike + truck · multiple lacerations · query head injury', trauma: true,
    esi: 2, esiReason: 'Trauma · NEWS2 5 · GCS 14', area: 'TRAUMA',
    assignedTo: ER_VIKRAM, bedNumber: 'T-1',
    vitalsHistory: [
      { rr: 22, spo2: 96, sbp: 108, hr: 112, temp: 36.7, gcs: 14, at: minsAgo(18), by: ER_TRIAGE_NURSE.name },
    ],
    phase: 'in_treatment',
  },
  // M13.3 — 9. Stab wound trauma needing emergency OT
  {
    id: nextId(),
    patientId: 'PT-30009', name: 'Imran Quraishi', age: 24, gender: 'M',
    arrival: 'ambulance', arrivedAt: minsAgo(8),
    triagedAt: minsAgo(5), doctorClaimAt: minsAgo(3),
    chiefComplaint: 'Penetrating abdominal stab wound · suspected liver lac', trauma: true,
    esi: 1, esiReason: 'Penetrating trauma · haemodynamic instability', area: 'RESUS',
    assignedTo: ER_VIKRAM, bedNumber: 'R-2',
    vitalsHistory: [
      { rr: 28, spo2: 94, sbp: 86, hr: 132, temp: 36.4, gcs: 15, at: minsAgo(5), by: ER_TRIAGE_NURSE.name },
    ],
    phase: 'in_treatment',
  },

  // 6. Awaiting disposition — admit to ward
  {
    id: nextId(),
    patientId: 'PT-30006', name: 'Mohan Lal', age: 71, gender: 'M',
    arrival: 'ambulance', arrivedAt: minsAgo(180),
    triagedAt: minsAgo(170),
    doctorClaimAt: minsAgo(160), decisionAt: minsAgo(20),
    chiefComplaint: 'Worsening shortness of breath · ?CCF exacerbation', trauma: false,
    esi: 2, esiReason: 'NEWS2 7 — emergency response', area: 'CRITICAL',
    assignedTo: ER_VIKRAM, bedNumber: 'C-1',
    vitalsHistory: [
      { rr: 28, spo2: 88, sbp: 96, hr: 124, temp: 37.0, gcs: 14, at: minsAgo(170), onOxygen: true, by: ER_TRIAGE_NURSE.name },
      { rr: 22, spo2: 94, sbp: 110, hr: 102, temp: 36.9, gcs: 15, at: minsAgo(30), onOxygen: true, by: ER_VIKRAM.name },
    ],
    disposition: 'admit_ward', dispositionNote: 'Stabilised on IV diuretics + O2; admit Cardiology ward.',
    phase: 'awaiting_disposition',
  },
]

// ── Store ─────────────────────────────────────────────────────────────────

export const useERStore = create<ERState>()(persist((set, get) => ({
  patients: SEED,
  mciActive: false,

  toggleMCI: () => set(s => ({ mciActive: !s.mciActive })),

  registerArrival: (input) => {
    const id = nextId()
    const arrivedAt = new Date().toISOString()
    // M13.10 — UHID strategy:
    // - Conscious arrival with name → permanent UHID PT-NNNNN
    // - Unconscious / unidentified → temporary ER-TEMP-NNNNN (becomes UHID
    //   once attendant arrives or ID is found — NABH ACC.4.1 deferred reg)
    const isTemp = !!input.unconscious || !input.name
    const uhid = input.patientId ?? (isTemp
      ? `ER-TEMP-${Date.now().toString().slice(-5)}`
      : `PT-${30100 + Math.floor(Math.random() * 800)}`)
    const displayName = input.name ?? (input.gender === 'F' ? 'Unidentified female' : input.gender === 'M' ? 'Unidentified male' : 'Unidentified patient')
    const age = input.age ?? 0
    const gender = input.gender ?? 'X'

    set(s => ({
      patients: [{
        id,
        patientId: uhid,
        name: displayName,
        age,
        gender,
        arrival: input.arrival,
        arrivedAt,
        chiefComplaint: input.chiefComplaint,
        trauma: !!input.trauma,
        vitalsHistory: [],
        phase: 'awaiting_triage',
      }, ...s.patients],
    }))

    // ── M13.10 cross-store side-effects ────────────────────────────────
    // (a) Create / link a usePatientStore profile so the UHID is visible
    //     across the hospital (OPD board, lab orders, journey timeline,
    //     billing, insurance). For temp IDs this is still created — the
    //     name is updated when ID is captured later.
    if (!isTemp || input.name) {
      const existing = usePatientStore.getState().patients.find(p => p.id === uhid)
      if (!existing) {
        usePatientStore.getState().addPatient({
          id: uhid,
          name: displayName,
          age,
          gender: gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : 'Other',
          phone: input.phone ?? input.attendantPhone ?? '0000000000',
          symptoms: [input.chiefComplaint],
          department: 'Emergency',
          doctor: 'ER on-call',
          triageLevel: 'High',
          insurer: input.insurer,
        })
      }
    }

    // (b) SMS-link mock to attendant — primary, since attendant is often
    //     more reachable than the patient. If unconscious / no attendant
    //     phone, defer until ID captured.
    const smsTarget = input.attendantPhone || input.phone
    if (smsTarget && !isTemp) {
      // Consented, time-boxed tracking token so the SMS link (not the bare
      // UHID) is the credential for the public family page.
      const trackToken = useFamilyTokenStore.getState().issue(uhid, displayName, {
        consent: true, issuedBy: 'ER-DESK',
      })
      useNotificationStore.getState().add({
        type: 'system', priority: 'medium',
        title: `Welcome to Agentix HIMS · UHID ${uhid}`,
        body: `${displayName} registered at Emergency · ${new Date(arrivedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}. View live status: agentix.in/p/${uhid.toLowerCase()}?t=${trackToken}. SMS sent to ${smsTarget}.`,
        targetRole: 'patient',
        patientName: displayName,
        patientPhone: smsTarget,
        channels: ['in_app', 'sms'],
      })
    }

    // (c) Cashless walk-in → insurance desk picks up immediately so they
    //     can start pre-auth in parallel with the doctor evaluation.
    if (input.insurer) {
      useNotificationStore.getState().add({
        type: 'system', priority: 'high',
        title: `Cashless ER arrival · ${displayName}`,
        body: `${displayName} (${uhid}) arrived at Emergency as cashless under ${input.insurer}${input.policyNumber ? ` · policy ${input.policyNumber}` : ''}. Pre-auth likely if admission triggered. Chief complaint: ${input.chiefComplaint}.`,
        targetRole: 'insurance',
        patientName: displayName,
        channels: ['in_app'],
      })
    }

    // (d) Audit row for the arrival itself.
    useAuditStore.getState().log({
      userId: 'ER-DESK', userName: 'ER Registration',
      action: 'reception_registered',
      resource: 'er_patient', resourceId: uhid,
      detail: `${displayName} arrived ${input.arrival}${input.trauma ? ' · trauma' : ''}${isTemp ? ' · deferred-registration (unconscious)' : ''}${input.insurer ? ` · cashless (${input.insurer})` : ''}`,
    })
    return id
  },

  recordVitals: (id, v, by) => set(s => ({
    patients: s.patients.map(p => p.id === id
      ? { ...p, vitalsHistory: [...p.vitalsHistory, { ...v, at: new Date().toISOString(), by }] }
      : p),
  })),

  setESI: (id, esi, reason) => set(s => ({
    patients: s.patients.map(p => p.id === id
      ? { ...p, esi, esiReason: reason, triagedAt: p.triagedAt ?? new Date().toISOString(), phase: p.phase === 'awaiting_triage' ? 'triaged' as Phase : p.phase }
      : p),
  })),

  routeToArea: (id, area, bed) => set(s => ({
    patients: s.patients.map(p => p.id === id
      ? { ...p, area, bedNumber: bed ?? p.bedNumber, phase: 'in_treatment' as Phase }
      : p),
  })),

  claim: (id, doctor) => set(s => ({
    patients: s.patients.map(p => p.id === id
      ? { ...p, assignedTo: doctor, doctorClaimAt: p.doctorClaimAt ?? new Date().toISOString() }
      : p),
  })),

  unclaim: (id) => set(s => ({
    patients: s.patients.map(p => p.id === id ? { ...p, assignedTo: undefined } : p),
  })),

  setDisposition: (id, disposition, note) => {
    set(s => ({
      patients: s.patients.map(p => p.id === id
        ? { ...p, disposition, dispositionNote: note, decisionAt: new Date().toISOString(), phase: 'awaiting_disposition' as Phase }
        : p),
    }))
    const p = get().patients.find(x => x.id === id)
    if (!p) return

    // ── M13.3 — handoff routing by disposition ─────────────────────────
    const actorId = p.assignedTo?.id ?? 'ER-DOC'
    const actorName = p.assignedTo?.name ?? 'ER Doctor'

    if (disposition === 'admit_ward' || disposition === 'admit_icu' || disposition === 'admit_hdu') {
      // Admit → bed manager. Already existed; preserved.
      const admitMap = { admit_ward: 'General Ward', admit_icu: 'ICU', admit_hdu: 'Semi-Private' } as const
      const targetWard = admitMap[disposition]
      useAdmissionStore.getState().requestAdmission({
        patientId: p.patientId, patientName: p.name, patientAge: p.age,
        patientGender: p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other',
        diagnosis: p.chiefComplaint, admissionType: targetWard, bedTypePreference: targetWard,
        reason: `ER handover · ESI ${p.esi ?? '?'} · ${note ?? ''}`.trim(),
        requestedBy: actorName, department: 'Emergency',
        triageLevel: p.esi === 1 ? 'Critical' : p.esi === 2 ? 'High' : 'Routine',
        payerType: 'General',
      })
      useNotificationStore.getState().add({
        type: 'system', priority: disposition === 'admit_icu' ? 'critical' : 'high',
        title: `ER admission · ${p.name}`,
        body: `${dispositionLabel(disposition)} — ESI ${p.esi ?? '?'} · ${p.chiefComplaint}. ${note ?? ''}`.trim(),
        targetRole: 'bed_manager', patientName: p.name, channels: ['in_app'],
      })
      useAuditStore.getState().log({
        userId: actorId, userName: actorName, action: 'er_disposition',
        resource: 'er_patient', resourceId: p.patientId,
        detail: `${p.name} · handover to bed-manager · ${dispositionLabel(disposition)} (${targetWard})`,
      })
    } else if (disposition === 'discharge') {
      // Discharge from ER → close visit, notify reception/billing, return patient to OPD board as done.
      useNotificationStore.getState().add({
        type: 'system', priority: 'medium',
        title: `ER discharge · ${p.name}`,
        body: `${p.name} discharged from ER · ESI ${p.esi ?? '?'} · ${note ?? p.chiefComplaint}. Billing + take-home Rx to follow.`,
        targetRole: 'billing', patientName: p.name, channels: ['in_app'],
      })
      // If this patient also exists in OPD queue, mark them done.
      const opdPatient = usePatientStore.getState().patients.find(x => x.id === p.patientId)
      if (opdPatient) {
        usePatientStore.getState().updateStatus(p.patientId, 'done')
      }
      useAuditStore.getState().log({
        userId: actorId, userName: actorName, action: 'er_disposition',
        resource: 'er_patient', resourceId: p.patientId,
        detail: `${p.name} · discharged from ER · ${note ?? ''}`,
      })
    } else if (disposition === 'transfer') {
      // Transfer-out → ambulance/dispatch desk needs to arrange transport.
      useNotificationStore.getState().add({
        type: 'system', priority: 'high',
        title: `ER transfer-out · ${p.name}`,
        body: `Inter-facility transfer requested for ${p.name} · ${p.chiefComplaint}. Destination + ambulance to be arranged. Note: ${note ?? '—'}`,
        targetRole: 'ambulance', patientName: p.name, channels: ['in_app'],
      })
      useAuditStore.getState().log({
        userId: actorId, userName: actorName, action: 'er_disposition',
        resource: 'er_patient', resourceId: p.patientId,
        detail: `${p.name} · transfer-out requested · ${note ?? ''}`,
      })
    } else if (disposition === 'deceased') {
      // Deceased → mortuary record. MLC flag carried through.
      const isMLC = p.trauma || !!p.mlc
      useMortuaryStore.getState().receiveBody({
        patientId: p.patientId, patientName: p.name, age: p.age,
        gender: p.gender === 'X' ? 'Other' : p.gender,
        ward: 'Emergency', bedNumber: p.bedNumber ?? 'ER',
        timeOfDeath: new Date().toISOString(), certifiedBy: actorName,
        causeOfDeath: p.trauma ? 'Accidental' : 'Under Investigation',
        isMLC, mlcNumber: p.mlc?.mlcNumber, policeStation: p.mlc?.policeStation,
        bodySlot: Math.max(1, useMortuaryStore.getState().availableSlots()),
        legalClearance: isMLC ? 'mlc' : 'pending',
        autopsyRequired: isMLC && p.trauma,
      }, actorName)
      useNotificationStore.getState().add({
        type: 'system', priority: 'critical',
        title: `Deceased in ER · ${p.name}`,
        body: `${p.name} (${p.age}${p.gender}) declared deceased at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}. Body transferred to mortuary.${isMLC ? ' MLC clearance pending.' : ''}`,
        targetRole: 'mortuary', patientName: p.name, channels: ['in_app'],
      })
      useNotificationStore.getState().add({
        type: 'system', priority: 'high',
        title: `Deceased · ${p.name}`,
        body: `Death certificate workflow initiated. Family counselling required.${isMLC ? ' MLC documentation in progress.' : ''}`,
        targetRole: 'admin', patientName: p.name, channels: ['in_app'],
      })
      useAuditStore.getState().log({
        userId: actorId, userName: actorName, action: 'er_disposition',
        resource: 'er_patient', resourceId: p.patientId,
        detail: `${p.name} · deceased in ER · cause ${p.trauma ? 'accidental (trauma)' : 'under investigation'}${isMLC ? ' · MLC' : ''}`,
      })
    } else if (disposition === 'against_medical_advice') {
      useNotificationStore.getState().add({
        type: 'system', priority: 'high',
        title: `AMA · ${p.name}`,
        body: `${p.name} signed AMA/DAMA against medical advice · ESI ${p.esi ?? '?'} · ${p.chiefComplaint}. Note: ${note ?? '—'}`,
        targetRole: 'admin', patientName: p.name, channels: ['in_app'],
      })
      useAuditStore.getState().log({
        userId: actorId, userName: actorName, action: 'er_disposition',
        resource: 'er_patient', resourceId: p.patientId,
        detail: `${p.name} · AMA · ${note ?? ''}`,
      })
    }
  },

  setMLC: (id, mlc) => {
    const filedAt = new Date().toISOString()
    set(s => ({
      patients: s.patients.map(p => p.id === id ? { ...p, mlc: { ...mlc, filedAt } } : p),
    }))
    const p = get().patients.find(x => x.id === id)
    if (!p) return
    useNotificationStore.getState().add({
      type: 'system', priority: 'high',
      title: `MLC filed · ${p.name}`,
      body: `MLC ${mlc.mlcNumber} filed (${mlc.injuryType}) · ${mlc.policeStation}${mlc.officerName ? ` · IO ${mlc.officerName}` : ''}. Alcohol screen: ${mlc.alcoholScreen}.`,
      targetRole: 'audit_officer', patientName: p.name, channels: ['in_app'],
    })
    useAuditStore.getState().log({
      userId: mlc.filedBy.includes('Dr') ? 'ER-DOC' : 'ER-NURSE', userName: mlc.filedBy,
      action: 'er_disposition',
      resource: 'er_mlc', resourceId: mlc.mlcNumber,
      detail: `${p.name} · MLC ${mlc.mlcNumber} · ${mlc.injuryType} · ${mlc.policeStation}`,
    })
  },

  dispose: (id) => set(s => ({
    patients: s.patients.map(p => p.id === id
      ? { ...p, phase: 'disposed' as Phase, dispositionAt: new Date().toISOString() }
      : p),
  })),

  logCallback: (id, calledBy, recipient) => set(s => ({
    patients: s.patients.map(p => p.id === id
      ? { ...p, callbackLogged: { calledBy, recipient, calledAt: new Date().toISOString() } }
      : p),
  })),
}),
  {
    name: 'agentix-erstore', version: 2,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))

export function dispositionLabel(d: Disposition): string {
  return {
    admit_ward: 'Admit · ward',
    admit_icu:  'Admit · ICU',
    admit_hdu:  'Admit · HDU',
    discharge:  'Discharge',
    transfer:   'Transfer out',
    deceased:   'Deceased',
    against_medical_advice: 'AMA (against medical advice)',
  }[d]
}
