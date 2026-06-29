/* Anil-journey companion seed for the legacy Zustand stores that the mock
 * API doesn't own. Idempotent — gated by a localStorage marker so it runs
 * exactly once per browser session. */

const ANIL_LEGACY_MARKER = 'agentix.legacy-seed.anil-v5'

const HOURS = 3600 * 1000
const hoursAgo = (h: number) => new Date(Date.now() - h * HOURS).toISOString()

export async function seedAnilLegacyStores(): Promise<void> {
  if (typeof window === 'undefined') return
  if (window.localStorage.getItem(ANIL_LEGACY_MARKER)) return

  const [
    { useERStore },
    { useInsuranceStore },
    { useOTStore },
    { useNarcoticsStore },
    { useDrugMasterStore },
    { useAdmissionStore },
    { useInpatientStore },
    { usePatientStore },
    { useBillingStore },
    { useDischargeStore },
    { useAuditStore },
  ] = await Promise.all([
    import('@/store/useERStore'),
    import('@/store/useInsuranceStore'),
    import('@/store/useOTStore'),
    import('@/store/useNarcoticsStore'),
    import('@/store/useDrugMasterStore'),
    import('@/store/useAdmissionStore'),
    import('@/store/useInpatientStore'),
    import('@/store/usePatientStore'),
    import('@/store/useBillingStore'),
    import('@/store/useDischargeStore'),
    import('@/store/useAuditStore'),
  ])

  // ── ER triage queue ──────────────────────────────────────────────────
  const erState = useERStore.getState() as unknown as { patients: unknown[] }
  const erPatientRow = {
    id: 'ER-ANIL',
    patientId: 'PT-44012',
    name: 'Anil Kumar Verma',
    age: 38, gender: 'M' as const,
    arrival: 'walk_in' as const,
    arrivedAt: hoursAgo(50),
    triagedAt: hoursAgo(49.7),
    doctorClaimAt: hoursAgo(49.5),
    decisionAt: hoursAgo(48.0),
    dispositionAt: hoursAgo(47.8),
    chiefComplaint: 'RLQ abdominal pain × 8h, low-grade fever',
    trauma: false,
    esi: 3 as 1 | 2 | 3 | 4 | 5,
    esiReason: 'Surgical referral — moderate severity, stable',
    area: 'SUBACUTE' as 'RESUS' | 'TRAUMA' | 'CRITICAL' | 'ACUTE' | 'SUBACUTE' | 'FAST_TRACK' | 'OBS',
    assignedTo: { id: 'DR-1012', name: 'Dr. Priya Nair' },
    vitalsHistory: [
      { at: hoursAgo(49.7), by: 'Sunita Devi', hr: 102, rr: 18, sbp: 124, dbp: 78, temp: 38.2, spo2: 98 },
    ],
    bedNumber: 'ER-OBS-2',
    disposition: 'admit_ward' as const,
    dispositionNote: 'Surgical Ward — for lap appendectomy',
    phase: 'disposed' as const,
  }
  useERStore.setState({
    patients: [
      erPatientRow,
      ...(erState.patients ?? []).filter((p) => (p as { patientId: string }).patientId !== 'PT-44012'),
    ],
  } as unknown as Parameters<typeof useERStore.setState>[0])

  // ── Insurance claim with denial-risk 0.72 + AI justification ────────
  const insState = useInsuranceStore.getState() as { claims: unknown[] }
  useInsuranceStore.setState({
    claims: [
      {
        id: 'CLM-ANIL-001',
        patientId: 'PT-44012',
        patientName: 'Anil Kumar Verma',
        policyNumber: 'STAR-FP-994412',
        policyHolder: 'Anil Kumar Verma',
        sumInsured: 500000,
        available: 472000,
        provider: 'Star Health',
        amount: 94730,
        status: 'In Process',
        aiProbability: 64,
        aiDenialRisk: {
          score: 72,
          reasons: [
            'Duplicate-charge AI flag on OT-consumable line BL-AN-CONS-B',
            'Final bill exceeds pre-auth amount by 12 %',
            'Discharge summary still pending sign-off',
          ],
          factors: [
            { label: 'Duplicate-charge AI flagged 1 OT-consumable line',  impact: +18 },
            { label: 'Cashless pre-auth amount vs final bill +12 %',       impact: +10 },
            { label: 'AI claim probability 64 %',                            impact: +8 },
            { label: 'Documents incomplete (discharge summary pending)',   impact: +6 },
          ],
          computedAt: hoursAgo(0.75),
        },
        submissionStatus: 'validated',
        aiValidation: {
          completeness: 78,
          flags: [
            { field: 'bill_lines',       severity: 'warning', message: 'OT-consumable Trocar 10mm appears twice (BL-AN-CONS-A/B).' },
            { field: 'discharge_summary', severity: 'warning', message: 'Discharge summary status: pending sign-off.' },
          ],
          canSubmit: false,
          validatedAt: hoursAgo(1),
        },
        documents: [
          { id: 'doc-policy',       name: 'Policy copy',             status: 'verified',  uploadedAt: hoursAgo(46) },
          { id: 'doc-admission',    name: 'Admission summary',        status: 'verified',  uploadedAt: hoursAgo(46) },
          { id: 'doc-prescription', name: 'Doctor prescription',      status: 'verified',  uploadedAt: hoursAgo(46) },
          { id: 'doc-discharge',    name: 'Discharge summary',        status: 'pending' },
          { id: 'doc-bill',         name: 'Final hospital bill',     status: 'verified',  uploadedAt: hoursAgo(4) },
          { id: 'doc-receipts',     name: 'Pharmacy & lab receipts', status: 'verified',  uploadedAt: hoursAgo(4) },
        ],
        timeline: [
          { at: hoursAgo(47), actor: 'Kavita Singh',           label: 'Pre-auth filed',                          kind: 'submitted' },
          { at: hoursAgo(46), actor: 'Star Health TPA',         label: 'Pre-auth approved (cashless ₹85,000)',     kind: 'approved' },
          { at: hoursAgo(4),  actor: 'Deepak Malhotra',         label: 'Final bill posted ₹94,730',                 kind: 'note' },
          { at: hoursAgo(0.75), actor: 'AI Denial-Risk Scorer', label: 'Denial-risk 0.72 — doctor sign-off required', kind: 'note' },
        ],
        tpaReferenceId: 'SH-PRE-2026-AN-44012',
        diagnosis: 'Acute appendicitis',
        treatmentSummary: 'Laparoscopic appendectomy under GA. Penicillin allergy — non-β-lactam regimen.',
      },
      ...(insState.claims ?? []).filter((c) => (c as { id: string }).id !== 'CLM-ANIL-001'),
    ],
  } as unknown as Parameters<typeof useInsuranceStore.setState>[0])

  // ── OT procedure with WHO 2009 checklist ────────────────────────────
  const otState = useOTStore.getState() as { procedures: unknown[] }
  const checklist = [
    { id: 'CHK-0', label: 'Informed consent signed',                checked: true,  critical: true },
    { id: 'CHK-1', label: 'Surgical site marked (right iliac fossa)', checked: true, critical: true },
    { id: 'CHK-2', label: 'NPO confirmed (fasting ≥6h)',            checked: true,  critical: true },
    { id: 'CHK-3', label: 'Anaesthesia assessment done',             checked: true,  critical: true },
    { id: 'CHK-4', label: 'Blood arranged (if needed)',               checked: false, critical: false },
    { id: 'CHK-5', label: 'Implants/prosthetics confirmed',           checked: false, critical: false },
    { id: 'CHK-6', label: 'Allergies rechecked (Penicillin!)',       checked: true,  critical: true },
    { id: 'CHK-7', label: 'IV line secured',                          checked: true,  critical: false },
    { id: 'CHK-8', label: 'Patient ID verified',                       checked: true,  critical: true },
    { id: 'CHK-9', label: 'OT room readiness confirmed',               checked: true,  critical: false },
  ]
  const whoChecklist = [
    { id: 'WHO-SI-1', phase: 'sign_in',  label: 'Patient identity and procedure confirmed',         checked: true },
    { id: 'WHO-SI-2', phase: 'sign_in',  label: 'Site marked',                                       checked: true },
    { id: 'WHO-SI-3', phase: 'sign_in',  label: 'Anaesthesia safety check complete',                 checked: true },
    { id: 'WHO-SI-4', phase: 'sign_in',  label: 'Pulse oximeter on patient and functioning',         checked: true },
    { id: 'WHO-SI-5', phase: 'sign_in',  label: 'Known allergy? — Penicillin (verified, avoided)',  checked: true },
    { id: 'WHO-TO-1', phase: 'time_out', label: 'Team introductions',                                  checked: true },
    { id: 'WHO-TO-2', phase: 'time_out', label: 'Patient, site, procedure confirmed',                  checked: true },
    { id: 'WHO-TO-3', phase: 'time_out', label: 'Antibiotic prophylaxis given within 60 min',          checked: true },
    { id: 'WHO-TO-4', phase: 'time_out', label: 'Imaging displayed',                                    checked: true },
    { id: 'WHO-SO-1', phase: 'sign_out', label: 'Procedure name recorded',                              checked: true },
    { id: 'WHO-SO-2', phase: 'sign_out', label: 'Instrument / sponge / needle counts correct',         checked: true },
    { id: 'WHO-SO-3', phase: 'sign_out', label: 'Specimen labelled (appendix to histopathology)',       checked: true },
    { id: 'WHO-SO-4', phase: 'sign_out', label: 'Equipment problems to address — none',                 checked: true },
  ]
  const anilProc = {
    id: 'OT-ANIL-001',
    patientId: 'PT-44012',
    patientName: 'Anil Kumar Verma',
    patientAge: 38,
    procedureName: 'Laparoscopic Appendectomy',
    surgeon: 'Dr. Vikram Rao',
    anaesthetist: 'Dr. Sameer Joshi',
    otRoom: 'OT-2',
    scheduledTime: '06:00',
    durationMinutes: 60,
    status: 'Completed',
    bloodRequired: false,
    implants: [],
    checklist,
    whoChecklist,
    anesthesia: {
      asa: '2', mallampati: 2, technique: 'GA',
      npoSince: hoursAgo(54),
      events: [
        { id: 'AE-1', at: hoursAgo(46),   type: 'induction',  note: 'GA induction · uneventful',                    vitals: { hr: 88, bp: '124/76', spo2: 99, etco2: 36 } },
        { id: 'AE-2', at: hoursAgo(45.8), type: 'intubation', note: 'ETT placed atraumatically',                    vitals: { hr: 92, bp: '128/78', spo2: 99, etco2: 38 } },
        { id: 'AE-3', at: hoursAgo(45.7), type: 'incision',   note: 'Skin incision — three ports placed',           vitals: { hr: 90, bp: '124/76', spo2: 99, etco2: 38 } },
        { id: 'AE-4', at: hoursAgo(44.8), type: 'extubation', note: 'Smooth extubation; transferred to recovery',    vitals: { hr: 82, bp: '120/74', spo2: 99, etco2: 38 } },
      ],
    },
    counts: {
      sponges:     { initial: 10, final: 10, correct: true },
      instruments: { initial: 24, final: 24, correct: true },
      needles:     { initial:  6, final:  6, correct: true },
    },
    specimens: [{ id: 'SP-ANIL-1', label: 'Appendix', site: 'RIF', collectedAt: hoursAgo(44.8), sentTo: 'Histopathology' }],
    debrief: {
      complications: 'None',
      lessons: 'Standard 3-port lap appendectomy. No conversion required.',
      postOpInstructions: 'NPO 4h then sips. Mobilise from 6h. Tramadol IV PRN. Cipro + Metro PO when tolerating.',
      recordedAt: hoursAgo(44.5),
    },
    clearance: {
      surgical: 'cleared', anesthesia: 'cleared', nursing: 'cleared',
      lab: 'cleared',      pharmacy: 'cleared',   bloodbank: 'na',
      imaging: 'cleared',  cssd: 'cleared',
    },
    startedAt:   hoursAgo(46),
    completedAt: hoursAgo(44.7),
    postOpWard: 'Surgical',
  }
  useOTStore.setState({
    procedures: [
      anilProc,
      ...(otState.procedures ?? []).filter((p) => (p as { id: string }).id !== 'OT-ANIL-001'),
    ],
  } as unknown as Parameters<typeof useOTStore.setState>[0])

  // ── Narcotic register: Morphine sign-out ─────────────────────────────
  const narcState = useNarcoticsStore.getState() as { log: unknown[] }
  const morphAt = new Date(Date.now() - 25 * HOURS)
  useNarcoticsStore.setState({
    log: [
      {
        id: 'N-ANIL-001',
        drug: 'Morphine 10mg/mL',
        date: morphAt.toISOString().split('T')[0]!,
        time: morphAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        patient: 'Anil Kumar Verma',
        patientId: 'PT-44012',
        dose: '5 mg IV',
        prescriber: 'Dr. Vikram Rao',
        dispenser: 'Rohit Sharma',
        secondSignatory: 'Sunita Devi',
        batchNo: 'BTH-20240722-M',
        runningStock: 11,
      },
      ...(narcState.log ?? []),
    ],
  } as unknown as Parameters<typeof useNarcoticsStore.setState>[0])

  // ── Drug Master: Augmentin (penicillin) + Cipro + Metro ─────────────
  const dmState = useDrugMasterStore.getState() as { drugs: { genericName: string }[] }
  if (!dmState.drugs.some((d) => d.genericName === 'Augmentin')) {
    useDrugMasterStore.setState({
      drugs: [
        ...dmState.drugs,
        {
          id: 'D-AUG', genericName: 'Augmentin',
          brandNames: ['Augmentin', 'Clavam', 'Moxikind-CV'],
          form: 'tablet', strength: '625mg', schedule: 'H', atcCode: 'J01CR02',
          contraindications: ['Penicillin allergy', 'Severe hepatic impairment'],
          interactions: ['Warfarin', 'Methotrexate', 'Allopurinol'],
          allergyClasses: ['Penicillin', 'β-lactam'],
          maxDailyDoseMg: 1875,
        },
        {
          id: 'D-CIP', genericName: 'Ciprofloxacin',
          brandNames: ['Ciplox', 'Cifran', 'Ciprobid'],
          form: 'tablet', strength: '500mg', schedule: 'H', atcCode: 'J01MA02',
          contraindications: ['Tendon disorders history', 'Pregnancy', 'QT prolongation'],
          interactions: ['Theophylline', 'NSAIDs', 'Antacids'],
          allergyClasses: ['Fluoroquinolone'],
          maxDailyDoseMg: 1500,
        },
        {
          id: 'D-MTZ', genericName: 'Metronidazole',
          brandNames: ['Flagyl', 'Metrogyl'],
          form: 'tablet', strength: '400mg', schedule: 'H', atcCode: 'J01XD01',
          contraindications: ['First trimester pregnancy', 'Alcohol intake'],
          interactions: ['Alcohol', 'Warfarin', 'Phenytoin'],
          allergyClasses: ['Nitroimidazole'],
          maxDailyDoseMg: 2000,
        },
      ],
    } as unknown as Parameters<typeof useDrugMasterStore.setState>[0])
  }

  // ── Admission request (assigned to surgical-ward bed) ────────────────
  const admState = useAdmissionStore.getState() as { admissionRequests: { id: string }[] }
  useAdmissionStore.setState({
    admissionRequests: [
      {
        id: 'ADM-REQ-ANIL',
        patientId: 'PT-44012',
        patientName: 'Anil Kumar Verma',
        patientAge: 38,
        patientGender: 'Male',
        diagnosis: 'Acute appendicitis — for lap appendectomy',
        admissionType: 'Emergency',
        bedTypePreference: 'General',
        reason: 'Acute appendicitis (USG 9 mm, free fluid). For laparoscopic appendectomy.',
        requestedBy: 'Dr. Priya Nair',
        department: 'Surgery',
        triageLevel: 'Medium',
        payerType: 'insurance',
        requestedAt: hoursAgo(48),
        status: 'Admitted',
        assignedBedId: 'BED-SUR-1',
      },
      ...(admState.admissionRequests ?? []).filter((r) => r.id !== 'ADM-REQ-ANIL'),
    ],
  } as unknown as Parameters<typeof useAdmissionStore.setState>[0])

  // ── Inpatient store — surface Anil in /doctor/ipd + /nurse/dashboard ─
  const ipState = useInpatientStore.getState() as unknown as { inpatients: { patientId: string }[] }
  if (!(ipState.inpatients ?? []).some((p) => p.patientId === 'PT-44012')) {
    const anilInpatient = {
      patientId: 'PT-44012',
      name: 'Anil Kumar Verma',
      age: 38, gender: 'Male',
      bed: 'SW-301', ward: 'Surgical',
      admittingDoctor: 'Dr. Vikram Rao',
      diagnosis: 'Acute appendicitis · post-lap appendectomy',
      admittedAt: hoursAgo(47.5),
      expectedDischarge: hoursAgo(-1),
      stage: 'PostOp', condition: 'Improving',
      rounds: [],
      meds: [
        { name: 'Ciprofloxacin 500 mg', dose: '500 mg', route: 'PO', freq: 'BD', schedule: ['08:00', '20:00'],
          startedAt: hoursAgo(26), days: 5, prescriber: 'Dr. Vikram Rao', status: 'active' },
        { name: 'Metronidazole 400 mg', dose: '400 mg', route: 'PO', freq: 'TDS', schedule: ['08:00', '14:00', '22:00'],
          startedAt: hoursAgo(26), days: 5, prescriber: 'Dr. Vikram Rao', status: 'active' },
        { name: 'Paracetamol 500 mg', dose: '500 mg', route: 'PO', freq: 'QDS PRN', schedule: [],
          startedAt: hoursAgo(26), days: 5, prescriber: 'Dr. Vikram Rao', status: 'active' },
      ],
      tests: [],
      progressNotes: [],
      events: [],
      allergies: ['Penicillin'],
      comorbidities: [],
      latestVitals: { hr: 78, rr: 16, sbp: 118, dbp: 76, temp: 37.0, spo2: 98, at: hoursAgo(8) },
      vitals: [
        { hr: 102, rr: 18, sbp: 124, dbp: 78, temp: 38.2, spo2: 98, at: hoursAgo(49.7), by: 'Sunita Devi' },
        { hr:  88, rr: 17, sbp: 120, dbp: 76, temp: 37.4, spo2: 98, at: hoursAgo(44.5), by: 'Sunita Devi' },
        { hr: 112, rr: 22, sbp: 102, dbp: 64, temp: 38.4, spo2: 93, at: hoursAgo(30),   by: 'Sunita Devi' },
        { hr:  92, rr: 18, sbp: 118, dbp: 74, temp: 37.6, spo2: 97, at: hoursAgo(28),   by: 'Sunita Devi' },
        { hr:  78, rr: 16, sbp: 118, dbp: 76, temp: 37.0, spo2: 98, at: hoursAgo(8),    by: 'Sunita Devi' },
      ],
      mar: [],
      io: [],
    }
    useInpatientStore.setState({
      inpatients: [anilInpatient, ...(ipState.inpatients ?? [])],
    } as unknown as Parameters<typeof useInpatientStore.setState>[0])
  }

  // ── Patient store — reception / general-patient surfaces find Anil ──
  const ptState = usePatientStore.getState() as unknown as { patients: { id: string }[] }
  if (!(ptState.patients ?? []).some((p) => p.id === 'PT-44012')) {
    const anilPatient = {
      id: 'PT-44012',
      name: 'Anil Kumar Verma',
      age: 38,
      gender: 'Male' as const,
      phone: '+91 98109 44012',
      bloodGroup: 'B+',
      token: 0,
      queueStatus: 'done' as const,
      estimatedWait: 0,
      doctor: 'Dr. Vikram Rao',
      department: 'Surgery',
      vitals: { bp: '118/76', temp: '37.0', weight: '72', spo2: '98', pulse: '78' },
      symptoms: ['RLQ pain', 'fever', 'nausea'],
      history: ['Penicillin allergy'],
      registeredAt: hoursAgo(50),
      // M3: Anil's record was created 2 days ago but we tag the registeredDate
      // as TODAY so he surfaces in Reception's default "Today" tab — necessary
      // for the hero-journey demo to walk clean.
      registeredDate: new Date().toISOString().split('T')[0]!,
      triageLevel: 'Medium' as const,
      hasReports: true,
      insurer: 'Star Health',
    }
    usePatientStore.setState({
      patients: [anilPatient, ...(ptState.patients ?? [])],
    } as unknown as Parameters<typeof usePatientStore.setState>[0])
  }

  // ── Billing store — Anil's IPD bill (with the duplicate-charge AI flag) ──
  const blState = useBillingStore.getState() as unknown as { bills: { patientId: string }[]; chargeItems: { patientId: string }[] }
  if (!(blState.bills ?? []).some((b) => b.patientId === 'PT-44012')) {
    const anilBill = {
      id: 'BL-ANIL-001',
      patientId: 'PT-44012',
      patientName: 'Anil Kumar Verma',
      visitType: 'IPD' as const,
      admissionDate: hoursAgo(48),
      dischargeDate: hoursAgo(6),
      subtotal: 94730,
      discounts: 0,
      nonPayables: 0,
      insuranceCovered: 85000,
      patientDue: 9730,
      status: 'frozen' as const,
      payerType: 'Cashless (Star Health)',
      paidAmount: 0,
    }
    const anilItems = [
      { id: 'CI-ANIL-1', patientId: 'PT-44012', type: 'ward' as const,        description: 'Surgical ward bed × 2 days',       amount: 7000,  quantity: 2, date: hoursAgo(47), source: 'Ward' },
      { id: 'CI-ANIL-2', patientId: 'PT-44012', type: 'consultation' as const, description: 'Surgery consult (Dr. Vikram Rao)',  amount: 1400,  quantity: 2, date: hoursAgo(47), source: 'OPD' },
      { id: 'CI-ANIL-3', patientId: 'PT-44012', type: 'ot' as const,            description: 'Laparoscopic appendectomy (OT)',     amount: 68000, quantity: 1, date: hoursAgo(45), source: 'OT' },
      { id: 'CI-ANIL-4', patientId: 'PT-44012', type: 'procedure' as const,    description: 'Anaesthesia (Dr. Sameer Joshi)',     amount: 9500,  quantity: 1, date: hoursAgo(45), source: 'OT' },
      { id: 'CI-ANIL-5', patientId: 'PT-44012', type: 'lab' as const,           description: 'CBC',                                amount: 350,   quantity: 1, date: hoursAgo(48), source: 'Lab' },
      { id: 'CI-ANIL-6', patientId: 'PT-44012', type: 'lab' as const,           description: 'CRP',                                amount: 480,   quantity: 1, date: hoursAgo(48), source: 'Lab' },
      { id: 'CI-ANIL-7', patientId: 'PT-44012', type: 'radiology' as const,    description: 'USG abdomen',                       amount: 950,   quantity: 1, date: hoursAgo(48), source: 'Radiology' },
      // Two duplicate Trocar lines — duplicate-charge AI flags
      { id: 'CI-ANIL-8', patientId: 'PT-44012', type: 'consumable' as const,   description: 'OT consumable: Trocar 10 mm',       amount: 2400,  quantity: 1, date: hoursAgo(45), source: 'OT' },
      { id: 'CI-ANIL-9', patientId: 'PT-44012', type: 'consumable' as const,   description: 'OT consumable: Trocar 10 mm',       amount: 2400,  quantity: 1, date: hoursAgo(45), source: 'OT' },
      { id: 'CI-ANIL-10', patientId: 'PT-44012', type: 'pharmacy' as const,    description: 'IPD pharmacy (Cipro/Metro/PCM/Tramadol)', amount: 1850, quantity: 1, date: hoursAgo(40), source: 'Pharmacy' },
    ]
    useBillingStore.setState({
      bills: [anilBill, ...(blState.bills ?? [])],
      chargeItems: [...anilItems, ...(blState.chargeItems ?? [])],
    } as unknown as Parameters<typeof useBillingStore.setState>[0])
  }

  // ── Discharge store — Anil in the queue (clearances in flight) ──
  const dsState = useDischargeStore.getState() as unknown as { dischargeQueue: { patientId: string }[] }
  if (!(dsState.dischargeQueue ?? []).some((d) => d.patientId === 'PT-44012')) {
    const anilDis = {
      id: 'DC-ANIL-001',
      patientId: 'PT-44012',
      patientName: 'Anil Kumar Verma',
      wardBed: 'Surgical SW-301',
      diagnosis: 'Acute appendicitis · post-lap appendectomy',
      admittedOn: hoursAgo(48),
      expectedDischarge: new Date().toISOString(),
      attendingDoctor: 'Dr. Vikram Rao',
      clearances: { doctor: 'cleared', nursing: 'cleared', pharmacy: 'cleared', billing: 'pending', insurance: 'pending' },
      blockers: [
        { id: 'BLK-ANIL-1', type: 'Insurance', description: 'Star Health claim awaiting doctor sign-off (denial-risk 0.72)', owner: 'Kavita Singh (TPA)' },
      ],
      summaryDrafted: true,
      summaryApproved: false,
      exitClearanceIssued: false,
      payerType: 'Cashless (Star Health)',
      dischargeSummary: [
        `DISCHARGE SUMMARY · Anil Kumar Verma (PT-44012)`,
        `Ward/Bed: Surgical SW-301 · Attending: Dr. Vikram Rao · LOS: 2 days`,
        ``,
        `1. Diagnosis: Acute appendicitis, treated with laparoscopic appendectomy.`,
        `2. Course: Emergency laparoscopic appendectomy performed without intra-operative complications. Post-operative recovery uneventful — afebrile, haemodynamically stable, tolerating oral diet. Wound clean and dry; no signs of infection.`,
        `3. Investigations: CBC normalising (WBC trending down), CRP improving. USG abdomen confirmed appendicitis pre-op; no residual collection.`,
        `4. Medications at discharge (TTO): Tab Cefuroxime 500mg BD × 5 days, Tab Paracetamol 650mg TDS PRN for pain, Cap Pantoprazole 40mg OD × 5 days. Reconciled prescription attached.`,
        `5. Follow-up: Surgical OPD review in 7 days with Dr. Vikram Rao for wound check and suture removal.`,
        `6. Red-flag advice: Return to ER immediately if fever > 38.5°C, increasing abdominal pain, wound redness/discharge, persistent vomiting or abdominal distension.`,
        `7. Activity: Resume light activities as tolerated. Avoid heavy lifting and strenuous exercise for 2 weeks.`,
        `8. Diet: Light, easily digestible diet for 3–4 days; resume normal diet thereafter as tolerated.`,
      ].join('\n'),
    }
    useDischargeStore.setState({
      dischargeQueue: [anilDis, ...(dsState.dischargeQueue ?? [])],
    } as unknown as Parameters<typeof useDischargeStore.setState>[0])
  }

  // ── Audit emits for the legacy-side actions ─────────────────────────
  type AuditPayload = Parameters<ReturnType<typeof useAuditStore.getState>['log']>[0]
  const audit = (action: string, resource: string, resourceId: string, detail: string, userName: string) =>
    useAuditStore.getState().log({
      userId: 'SYS', userName,
      action: action as AuditPayload['action'],
      resource, resourceId, detail,
    } as AuditPayload)

  audit('admission_admit',                   'admission_request', 'ADM-REQ-ANIL',
        'Bed SW-301 (Surgical) assigned to Anil Kumar Verma (PT-44012)', 'Anjali Gupta')
  audit('ot_who_checklist',                  'ot_procedure',      'OT-ANIL-001',
        'WHO sign-in / time-out / sign-out completed — Anil Kumar Verma', 'Dr. Vikram Rao')
  audit('ot_specimen_logged',                'ot_procedure',      'OT-ANIL-001',
        'Appendix specimen sent to Histopathology', 'Dr. Vikram Rao')
  audit('drug_dispense',                     'narcotic',          'N-ANIL-001',
        'Morphine 5 mg IV — Rohit Sharma, witnessed by Sunita Devi', 'Rohit Sharma')
  audit('insurance_doc_upload',              'claim',             'CLM-ANIL-001',
        'Pre-auth filed · Star Health TPA · cashless approved ₹85,000', 'Kavita Singh')
  audit('insurance_denial_risk_run',         'claim',             'CLM-ANIL-001',
        'Denial-risk 0.72 — doctor sign-off required before submission', 'AI Denial Scorer')

  // M4-W1 / S3 — seed a recent lab_critical_callback so the closed-loop
  // banner is visible on first demo load. The presenter acknowledges it
  // during the walkthrough; ack persists in localStorage (agentix.cv-ack.*).
  audit('lab_critical_callback',             'lab_result',         'LR-ANIL-TROPI',
        'CRITICAL — Anil Kumar Verma · Troponin I = 2.1 ng/mL (ref < 0.04). NSTEMI pattern. Doctor + nurse acknowledgement required.',
        'Lab — Dr. Arun Menon')

  window.localStorage.setItem(ANIL_LEGACY_MARKER, JSON.stringify({ at: new Date().toISOString() }))
}
