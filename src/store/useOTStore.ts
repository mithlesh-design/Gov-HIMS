import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useAuditStore } from './useAuditStore'

export type OTStatus = 'Scheduled' | 'Pre-Op' | 'In Progress' | 'Recovery' | 'Completed'

export type ChecklistItem = {
  id: string
  label: string
  checked: boolean
  critical: boolean
}

// ─── WHO Surgical Safety Checklist (WHO 2009, RCS endorsed) ───────────────
// Three phases timed around the patient's journey: Sign In before induction,
// Time Out before incision, Sign Out before patient leaves the OR.

export type WHOPhase = 'sign_in' | 'time_out' | 'sign_out'
export type WHOItem = {
  id: string; phase: WHOPhase; label: string; checked: boolean; note?: string; critical?: boolean
}

export const WHO_SIGN_IN: string[] = [
  'Patient confirmed: identity, site, procedure, consent',
  'Surgical site marked / N/A',
  'Anaesthesia safety check completed',
  'Pulse oximeter on patient and functioning',
  'Patient known allergies?',
  'Difficult airway / aspiration risk? Equipment & assistance available',
  'Risk of >500 mL blood loss (7 mL/kg in children)? IV access + fluids planned',
]
export const WHO_TIME_OUT: string[] = [
  'Team members introduced by name and role',
  'Surgeon, anaesthetist, nurse confirm: patient name, procedure, incision site',
  'Antibiotic prophylaxis given within last 60 min',
  'Surgeon — anticipated critical events (steps, duration, blood loss)',
  'Anaesthetist — patient-specific concerns',
  'Nursing — sterility confirmed, equipment issues?',
  'Essential imaging displayed',
]
export const WHO_SIGN_OUT: string[] = [
  'Nurse verbally confirms procedure name recorded',
  'Instrument, sponge, needle counts correct',
  'Specimen labelled (including patient name) — read aloud',
  'Equipment problems to be addressed',
  'Key concerns for recovery & management (surgeon, anaesthesia, nursing)',
]

export function makeWHOChecklist(): WHOItem[] {
  const items: WHOItem[] = []
  WHO_SIGN_IN.forEach((label, i)  => items.push({ id: `WHO-SI-${i}`, phase: 'sign_in',  label, checked: false, critical: i < 4 }))
  WHO_TIME_OUT.forEach((label, i) => items.push({ id: `WHO-TO-${i}`, phase: 'time_out', label, checked: false, critical: i < 3 }))
  WHO_SIGN_OUT.forEach((label, i) => items.push({ id: `WHO-SO-${i}`, phase: 'sign_out', label, checked: false, critical: i < 3 }))
  return items
}

// ─── Anaesthesia ──────────────────────────────────────────────────────────

export type ASAClass = '1' | '2' | '3' | '4' | '5' | '6'
export type Mallampati = 1 | 2 | 3 | 4

export const ASA_DESC: Record<ASAClass, string> = {
  '1': 'Normal healthy patient',
  '2': 'Mild systemic disease',
  '3': 'Severe systemic disease',
  '4': 'Severe systemic disease that is a constant threat to life',
  '5': 'Moribund — not expected to survive without operation',
  '6': 'Brain-dead, organs being removed for donor purposes',
}

export type AnesthesiaEventType = 'induction' | 'intubation' | 'incision' | 'event' | 'extubation' | 'reversal'
export type AnesthesiaEvent = {
  id: string
  at: string
  type: AnesthesiaEventType
  note?: string
  vitals?: { hr?: number; bp?: string; spo2?: number; etco2?: number; map?: number }
}

export type Anesthesia = {
  asa?: ASAClass
  mallampati?: Mallampati
  npoSince?: string                     // ISO time fasting started
  technique?: 'GA' | 'Spinal' | 'Epidural' | 'CSE' | 'Regional' | 'MAC' | 'Local'
  events: AnesthesiaEvent[]
}

// ─── Counts (sponges/instruments/needles) ──────────────────────────────────

export type CountKind = 'sponges' | 'instruments' | 'needles'
export type CountPair = { initial?: number; final?: number; correct?: boolean }
export type Counts = Partial<Record<CountKind, CountPair>>

// ─── Specimens & debrief ───────────────────────────────────────────────────

export type Specimen = {
  id: string
  label: string             // e.g. "Gallbladder for HPE"
  site?: string
  collectedAt: string
  sentTo?: 'Histopathology' | 'Cytology' | 'Microbiology' | 'Frozen Section'
}

export type Debrief = {
  complications?: string
  lessons?: string
  postOpInstructions?: string
  recordedAt?: string
}

// ─── Pre-op clearance pillars ──────────────────────────────────────────────

export type Pillar = 'surgical' | 'anesthesia' | 'nursing' | 'lab' | 'pharmacy' | 'bloodbank' | 'imaging' | 'cssd'
export type Clearance = 'pending' | 'cleared' | 'na'

export function emptyClearances(): Record<Pillar, Clearance> {
  return {
    surgical: 'pending', anesthesia: 'pending', nursing: 'pending',
    lab: 'pending', pharmacy: 'pending', bloodbank: 'pending', imaging: 'pending', cssd: 'pending',
  }
}

export type IPDBrief = {
  vitals: { hr: number; bp: string; temp: number; spo2: number }
  activeMedications: string[]
  ivDrips: string[]
  pendingLabResults: string[]
  pendingRadiology: string[]
  bloodGroup: string
  allergies: string
  lastNursingNote: string
  admittedSince: string
}

export type PreOpRequirement = {
  id: string
  type: 'radiology' | 'blood' | 'pharmacy' | 'equipment'
  description: string
  status: 'pending' | 'dispatched' | 'received'
  requestedAt: string
}

export type OTProcedure = {
  id: string
  patientId: string
  patientName: string
  patientAge: number
  procedureName: string
  surgeon: string
  anaesthetist: string
  otRoom: string
  scheduledTime: string
  durationMinutes: number
  status: OTStatus
  bloodRequired: boolean
  implants: string[]
  checklist: ChecklistItem[]
  notes?: string
  startedAt?: string
  completedAt?: string
  postOpWard?: string
  ipdBrief?: IPDBrief
  preOpRequirements?: PreOpRequirement[]
  // ── v2 additions (additive — old pages keep working) ─────────────────────
  whoChecklist?: WHOItem[]
  anesthesia?: Anesthesia
  counts?: Counts
  specimens?: Specimen[]
  debrief?: Debrief
  clearance?: Record<Pillar, Clearance>
}

export type OTRoom = {
  id: string
  name: string
  status: 'Available' | 'In Use' | 'Cleaning' | 'Maintenance'
  currentProcedureId?: string
  nextScheduledTime?: string
}

interface OTState {
  procedures: OTProcedure[]
  otRooms: OTRoom[]
  scheduleProcedure: (proc: Omit<OTProcedure, 'id' | 'checklist'>) => void
  updateStatus: (id: string, status: OTStatus) => void
  checkItem: (procedureId: string, itemId: string) => void
  addNote: (procedureId: string, note: string) => void
  addPreOpRequirement: (procedureId: string, req: Omit<PreOpRequirement, 'id' | 'requestedAt' | 'status'>) => void
  updateRequirementStatus: (procedureId: string, reqId: string, status: PreOpRequirement['status']) => void
  // ── v2 actions ───────────────────────────────────────────────────────────
  checkWHO: (procedureId: string, itemId: string) => void
  setClearance: (procedureId: string, pillar: Pillar, status: Clearance) => void
  setASA: (procedureId: string, asa: ASAClass) => void
  setMallampati: (procedureId: string, m: Mallampati) => void
  setNPOSince: (procedureId: string, iso: string) => void
  setAnesthesiaTechnique: (procedureId: string, t: Anesthesia['technique']) => void
  addAnesthesiaEvent: (procedureId: string, evt: Omit<AnesthesiaEvent, 'id' | 'at'>) => void
  setCount: (procedureId: string, kind: CountKind, side: 'initial' | 'final', value: number) => void
  confirmCounts: (procedureId: string, kind: CountKind, correct: boolean) => void
  addSpecimen: (procedureId: string, label: string, site?: string, sentTo?: Specimen['sentTo']) => void
  recordDebrief: (procedureId: string, d: Pick<Debrief, 'complications' | 'lessons' | 'postOpInstructions'>) => void
}

const DEFAULT_CHECKLIST: Omit<ChecklistItem, 'id'>[] = [
  { label: 'Informed consent signed', checked: false, critical: true },
  { label: 'Surgical site marked', checked: false, critical: true },
  { label: 'NPO confirmed (fasting ≥6h)', checked: false, critical: true },
  { label: 'Anaesthesia assessment done', checked: false, critical: true },
  { label: 'Blood arranged (if needed)', checked: false, critical: false },
  { label: 'Implants/prosthetics confirmed', checked: false, critical: false },
  { label: 'Allergies rechecked', checked: false, critical: true },
  { label: 'IV line secured', checked: false, critical: false },
  { label: 'Patient ID verified', checked: false, critical: true },
  { label: 'OT room readiness confirmed', checked: false, critical: false },
]

function makeChecklist(): ChecklistItem[] {
  return DEFAULT_CHECKLIST.map((item, i) => ({ ...item, id: `CHK-${i}` }))
}

const MOCK_PROCEDURES: OTProcedure[] = [
  {
    id: 'OT-001',
    patientId: 'PT-10220',
    patientName: 'Arvind Gupta',
    patientAge: 62,
    procedureName: 'Total Knee Replacement (TKR)',
    surgeon: 'Dr. Ravi Kumar',
    anaesthetist: 'Dr. Anisha Sharma',
    otRoom: 'OT-1',
    scheduledTime: '08:30',
    durationMinutes: 120,
    status: 'In Progress',
    bloodRequired: true,
    implants: ['Knee implant system (Size M)'],
    checklist: makeChecklist().map(c => ({ ...c, checked: true })),
    whoChecklist: makeWHOChecklist().map(i => i.phase === 'sign_in' || i.phase === 'time_out' ? { ...i, checked: true } : i),
    clearance: { surgical: 'cleared', anesthesia: 'cleared', nursing: 'cleared', lab: 'cleared', pharmacy: 'cleared', bloodbank: 'cleared', imaging: 'cleared', cssd: 'cleared' },
    anesthesia: {
      asa: '2', mallampati: 2, technique: 'Spinal',
      npoSince: new Date(Date.now() - 12 * 3600000).toISOString(),
      events: [
        { id: 'AE-1', at: new Date(Date.now() - 50 * 60000).toISOString(), type: 'induction', note: 'Spinal anesthesia, L3-L4 interspace', vitals: { hr: 78, bp: '128/80', spo2: 99, etco2: 36 } },
        { id: 'AE-2', at: new Date(Date.now() - 30 * 60000).toISOString(), type: 'incision', note: 'Skin incision', vitals: { hr: 82, bp: '132/82', spo2: 99, etco2: 38 } },
        { id: 'AE-3', at: new Date(Date.now() - 10 * 60000).toISOString(), type: 'event', note: 'Mild hypotension — fluid bolus given', vitals: { hr: 96, bp: '108/64', spo2: 98, etco2: 36 } },
      ],
    },
    startedAt: new Date(Date.now() - 45 * 60000).toISOString(),
    ipdBrief: {
      vitals: { hr: 78, bp: '136/84', temp: 98.4, spo2: 97 },
      activeMedications: ['Metformin 500mg OD', 'Amlodipine 5mg OD', 'Aspirin 75mg OD'],
      ivDrips: ['Normal Saline 0.9% — running at 80ml/hr'],
      pendingLabResults: [],
      pendingRadiology: [],
      bloodGroup: 'B+',
      allergies: 'None known',
      lastNursingNote: 'Patient is pre-medicated. NPO since 22:00 last night. Vitals stable. IV line secured on left forearm.',
      admittedSince: new Date(Date.now() - 18 * 3600000).toISOString(),
    },
    preOpRequirements: [
      { id: 'REQ-001', type: 'blood', description: '2 units Packed Red Blood Cells (B+)', status: 'received', requestedAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    ],
  },
  {
    id: 'OT-002',
    patientId: 'PT-10221',
    patientName: 'Meena Sharma',
    patientAge: 35,
    procedureName: 'Laparoscopic Cholecystectomy',
    surgeon: 'Dr. Kiran Joshi',
    anaesthetist: 'Dr. Anisha Sharma',
    otRoom: 'OT-2',
    scheduledTime: '11:00',
    durationMinutes: 60,
    status: 'Pre-Op',
    bloodRequired: false,
    implants: [],
    checklist: makeChecklist().map((c, i) => i < 5 ? { ...c, checked: true } : c),
    whoChecklist: makeWHOChecklist(),
    clearance: { surgical: 'cleared', anesthesia: 'cleared', nursing: 'cleared', lab: 'pending', pharmacy: 'cleared', bloodbank: 'na', imaging: 'pending', cssd: 'cleared' },
    anesthesia: {
      asa: '2', mallampati: 1, technique: 'GA',
      npoSince: new Date(Date.now() - 8 * 3600000).toISOString(),
      events: [],
    },
    ipdBrief: {
      vitals: { hr: 82, bp: '120/76', temp: 99.1, spo2: 98 },
      activeMedications: ['Omeprazole 20mg OD'],
      ivDrips: ['Ringer Lactate — running at 60ml/hr'],
      pendingLabResults: ['LFT — ordered 1hr ago'],
      pendingRadiology: ['Ultrasound Abdomen — result awaited'],
      bloodGroup: 'O+',
      allergies: 'Sulpha drugs — mild rash',
      lastNursingNote: 'Patient anxious but cooperative. Consent signed by patient and husband. IV line in right forearm.',
      admittedSince: new Date(Date.now() - 6 * 3600000).toISOString(),
    },
    preOpRequirements: [],
  },
  {
    id: 'OT-003',
    patientId: 'PT-10222',
    patientName: 'Suresh Pillai',
    patientAge: 48,
    procedureName: 'TURP (Transurethral Resection)',
    surgeon: 'Dr. Sanjay Mehta',
    anaesthetist: 'Dr. Praveen Bose',
    otRoom: 'OT-3',
    scheduledTime: '14:00',
    durationMinutes: 90,
    status: 'Scheduled',
    bloodRequired: false,
    implants: [],
    checklist: makeChecklist(),
    whoChecklist: makeWHOChecklist(),
    clearance: emptyClearances(),
  },
]

export const useOTStore = create<OTState>()(persist((set) => ({
  procedures: MOCK_PROCEDURES,
  otRooms: [
    { id: 'OT-1', name: 'OT-1 (Main)', status: 'In Use', currentProcedureId: 'OT-001' },
    { id: 'OT-2', name: 'OT-2 (Minor)', status: 'In Use', currentProcedureId: 'OT-002' },
    { id: 'OT-3', name: 'OT-3 (Urology)', status: 'Available', nextScheduledTime: '14:00' },
  ],

  scheduleProcedure: (proc) =>
    set((s) => ({
      procedures: [
        ...s.procedures,
        { ...proc, id: `OT-${Date.now()}`, checklist: makeChecklist() },
      ],
    })),

  updateStatus: (id, status) =>
    set((s) => ({
      procedures: s.procedures.map(p => {
        if (p.id !== id) return p
        const updates: Partial<OTProcedure> = { status }
        if (status === 'In Progress') updates.startedAt = new Date().toISOString()
        if (status === 'Completed') updates.completedAt = new Date().toISOString()
        return { ...p, ...updates }
      }),
      otRooms: s.otRooms.map(r => {
        if (r.currentProcedureId !== id) return r
        return { ...r, status: status === 'Completed' ? 'Cleaning' : r.status }
      }),
    })),

  checkItem: (procedureId, itemId) =>
    set((s) => ({
      procedures: s.procedures.map(p =>
        p.id === procedureId
          ? { ...p, checklist: p.checklist.map(c => c.id === itemId ? { ...c, checked: !c.checked } : c) }
          : p
      ),
    })),

  addNote: (procedureId, note) =>
    set((s) => ({
      procedures: s.procedures.map(p =>
        p.id === procedureId ? { ...p, notes: p.notes ? `${p.notes}\n${note}` : note } : p
      ),
    })),

  addPreOpRequirement: (procedureId, req) =>
    set((s) => ({
      procedures: s.procedures.map(p =>
        p.id === procedureId
          ? {
              ...p,
              preOpRequirements: [
                ...(p.preOpRequirements ?? []),
                { ...req, id: `REQ-${Date.now()}`, status: 'dispatched', requestedAt: new Date().toISOString() },
              ],
            }
          : p
      ),
    })),

  updateRequirementStatus: (procedureId, reqId, status) =>
    set((s) => ({
      procedures: s.procedures.map(p =>
        p.id === procedureId
          ? {
              ...p,
              preOpRequirements: (p.preOpRequirements ?? []).map(r =>
                r.id === reqId ? { ...r, status } : r
              ),
            }
          : p
      ),
    })),

  // ── v2 actions ───────────────────────────────────────────────────────────

  checkWHO: (procedureId, itemId) => {
    let phase: string | undefined
    set(s => ({
      procedures: s.procedures.map(p => {
        if (p.id !== procedureId) return p
        const list = p.whoChecklist ?? makeWHOChecklist()
        const item = list.find(i => i.id === itemId)
        phase = item?.phase
        return { ...p, whoChecklist: list.map(i => i.id === itemId ? { ...i, checked: !i.checked } : i) }
      }),
    }))
    useAuditStore.getState().log({
      userId: 'OT-SYS', userName: 'OT',
      action: 'ot_who_checklist', resource: 'ot_procedure', resourceId: procedureId,
      detail: `WHO ${phase ?? 'item'} toggled · ${itemId}`,
    })
  },

  setClearance: (procedureId, pillar, status) => {
    set(s => ({
      procedures: s.procedures.map(p => p.id === procedureId
        ? { ...p, clearance: { ...(p.clearance ?? emptyClearances()), [pillar]: status } }
        : p),
    }))
    useAuditStore.getState().log({
      userId: 'OT-SYS', userName: 'OT',
      action: 'ot_clearance_set', resource: 'ot_procedure', resourceId: procedureId,
      detail: `${pillar} → ${status}`,
    })
  },

  setASA: (procedureId, asa) => set(s => ({
    procedures: s.procedures.map(p => p.id === procedureId
      ? { ...p, anesthesia: { ...(p.anesthesia ?? { events: [] }), asa } }
      : p),
  })),

  setMallampati: (procedureId, m) => set(s => ({
    procedures: s.procedures.map(p => p.id === procedureId
      ? { ...p, anesthesia: { ...(p.anesthesia ?? { events: [] }), mallampati: m } }
      : p),
  })),

  setNPOSince: (procedureId, iso) => set(s => ({
    procedures: s.procedures.map(p => p.id === procedureId
      ? { ...p, anesthesia: { ...(p.anesthesia ?? { events: [] }), npoSince: iso } }
      : p),
  })),

  setAnesthesiaTechnique: (procedureId, t) => set(s => ({
    procedures: s.procedures.map(p => p.id === procedureId
      ? { ...p, anesthesia: { ...(p.anesthesia ?? { events: [] }), technique: t } }
      : p),
  })),

  addAnesthesiaEvent: (procedureId, evt) => set(s => ({
    procedures: s.procedures.map(p => {
      if (p.id !== procedureId) return p
      const a: Anesthesia = p.anesthesia ?? { events: [] }
      const next: AnesthesiaEvent = { ...evt, id: `AE-${Date.now()}-${a.events.length}`, at: new Date().toISOString() }
      return { ...p, anesthesia: { ...a, events: [...a.events, next] } }
    }),
  })),

  setCount: (procedureId, kind, side, value) => set(s => ({
    procedures: s.procedures.map(p => p.id === procedureId
      ? { ...p, counts: { ...(p.counts ?? {}), [kind]: { ...((p.counts ?? {})[kind] ?? {}), [side]: value } } }
      : p),
  })),

  confirmCounts: (procedureId, kind, correct) => set(s => ({
    procedures: s.procedures.map(p => p.id === procedureId
      ? { ...p, counts: { ...(p.counts ?? {}), [kind]: { ...((p.counts ?? {})[kind] ?? {}), correct } } }
      : p),
  })),

  addSpecimen: (procedureId, label, site, sentTo) => set(s => ({
    procedures: s.procedures.map(p => p.id === procedureId
      ? { ...p, specimens: [...(p.specimens ?? []), { id: `SP-${Date.now()}-${(p.specimens ?? []).length}`, label, site, sentTo: sentTo ?? 'Histopathology', collectedAt: new Date().toISOString() }] }
      : p),
  })),

  recordDebrief: (procedureId, d) => set(s => ({
    procedures: s.procedures.map(p => p.id === procedureId
      ? { ...p, debrief: { ...d, recordedAt: new Date().toISOString() } }
      : p),
  })),
}),
  {
    name: 'agentix-otstore', version: 1,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))
