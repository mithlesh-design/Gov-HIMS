/* Demo seed — Kiran Patil's NSTEMI / post-PCI journey end-to-end,
 * plus secondary patients that populate the queues for every role.
 *
 * Seeded into the mock API on first load (or on manual reset). Once written
 * to localStorage, this seed is the demo's source of truth — UI never reaches
 * back into legacy in-memory store seeds.
 */
import { Audit, installAuditBridge } from './audit'
import { Bills, type BillLine } from './bills'
import { DischargeApi } from './discharge'
import { Drugs } from './drugs'
import { Emergency } from './emergency'
import { Encounters } from './encounters'
import { Ipd } from './ipd'
import { Lab } from './lab'
import { Orders } from './orders'
import { Patients } from './patients'
import { Pharmacy } from './pharmacy'
import { Prescriptions } from './prescriptions'
import { Radiology } from './radiology'
import { StaffApi } from './staff'
import { Visits } from './visits'
import { markBootstrapped, isBootstrapped, resetAll, isoNow } from './_core'

const HOURS = 3600 * 1000
const DAYS = 24 * HOURS

const hoursAgo = (h: number) => new Date(Date.now() - h * HOURS).toISOString()
const daysAgo = (d: number) => new Date(Date.now() - d * DAYS).toISOString()
const minsAgo = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString()

// ─────────────────────────────────────────────────────────────────────────
// Staff identities (a slice — full directory comes from useHRStore for now)
// ─────────────────────────────────────────────────────────────────────────

const STAFF = [
  // Hero scenario actors (Anil's journey)
  { id: 'DR-1012', fullName: 'Dr. Priya Nair',     role: 'doctor',     dept: 'Emergency',     registrationNo: 'MCI-19387' },
  { id: 'DR-1019', fullName: 'Dr. Vikram Rao',     role: 'doctor',     dept: 'Surgery',       registrationNo: 'MCI-22455' },
  { id: 'DR-1023', fullName: 'Dr. Sameer Joshi',   role: 'doctor',     dept: 'Anaesthesia',   registrationNo: 'MCI-23601' },
  { id: 'DR-1024', fullName: 'Dr. Meera Iyer',     role: 'radiology',  dept: 'Radiology',     registrationNo: 'MCI-19720' },
  { id: 'DR-1025', fullName: 'Dr. Arun Menon',     role: 'lab',        dept: 'Biochemistry',  registrationNo: 'MCI-30099' },
  { id: 'NU-211',  fullName: 'Sunita Devi',         role: 'nurse',      dept: 'Surgical Ward' },
  { id: 'PH-303',  fullName: 'Rohit Sharma',        role: 'pharmacy',   dept: 'Pharmacy' },
  { id: 'IN-602',  fullName: 'Kavita Singh',        role: 'insurance',  dept: 'TPA Desk' },
  { id: 'BL-502',  fullName: 'Deepak Malhotra',     role: 'billing',    dept: 'Billing' },
  { id: 'BM-702',  fullName: 'Anjali Gupta',         role: 'bed_manager', dept: 'Bed Management' },
  // Existing actors retained
  { id: 'DR-1015', fullName: 'Dr. Arjun Mehta',     role: 'doctor',     dept: 'Emergency',     registrationNo: 'MCI-22011' },
  { id: 'DR-1018', fullName: 'Dr. Anjali Rao',      role: 'doctor',     dept: 'General Medicine', registrationNo: 'MCI-30221' },
  { id: 'DR-1021', fullName: 'Dr. Vikram Iyer',     role: 'doctor',     dept: 'Radiology',     registrationNo: 'MCI-19887' },
  { id: 'NU-205',  fullName: 'Nurse Anita Verma',   role: 'nurse',      dept: 'ICU' },
  { id: 'NU-208',  fullName: 'Nurse Kavita Joshi',  role: 'nurse',      dept: 'General Ward' },
  { id: 'RC-204',  fullName: 'Sunita Joshi',        role: 'reception',  dept: 'Front Desk' },
  { id: 'PH-301',  fullName: 'Ritu Sharma',         role: 'pharmacy',   dept: 'Pharmacy' },
  { id: 'LB-401',  fullName: 'Meera Bose',          role: 'lab',        dept: 'Haematology' },
  { id: 'LB-402',  fullName: 'Suresh Iyer',         role: 'lab',        dept: 'Biochemistry' },
  { id: 'BL-501',  fullName: 'Naveen Patel',        role: 'billing',    dept: 'Billing' },
  { id: 'IN-601',  fullName: 'Rakesh Bhatt',        role: 'insurance',  dept: 'Insurance' },
  { id: 'BM-701',  fullName: 'Lalita Menon',        role: 'bed_manager', dept: 'Bed Management' },
  { id: 'DC-801',  fullName: 'Geeta Rao',           role: 'discharge',  dept: 'Discharge' },
  { id: 'ADM-01',  fullName: 'Rajesh Kulkarni',     role: 'admin',      dept: 'Administration' },
] as const

// ─────────────────────────────────────────────────────────────────────────
// Drug master (slice — formulary, not full)
// ─────────────────────────────────────────────────────────────────────────

const DRUGS = [
  { id: 'DRG-ASA',  code: 'ASA',  name: 'Aspirin',                  form: 'Tablet', strength: '75 mg',  route: 'PO', onHand: 500, unitPrice: 1.5 },
  { id: 'DRG-CLO',  code: 'CLO',  name: 'Clopidogrel',              form: 'Tablet', strength: '75 mg',  route: 'PO', onHand: 350, unitPrice: 8 },
  { id: 'DRG-ATO',  code: 'ATO',  name: 'Atorvastatin',             form: 'Tablet', strength: '40 mg',  route: 'PO', onHand: 420, unitPrice: 6 },
  { id: 'DRG-MET',  code: 'MET',  name: 'Metoprolol',               form: 'Tablet', strength: '50 mg',  route: 'PO', onHand: 300, unitPrice: 3 },
  { id: 'DRG-RAM',  code: 'RAM',  name: 'Ramipril',                 form: 'Tablet', strength: '5 mg',   route: 'PO', onHand: 280, unitPrice: 4 },
  { id: 'DRG-PCM',  code: 'PCM',  name: 'Paracetamol',              form: 'Tablet', strength: '500 mg', route: 'PO', onHand: 800, unitPrice: 1 },
  { id: 'DRG-AMX',  code: 'AMX',  name: 'Amoxicillin',              form: 'Tablet',  strength: '500 mg', route: 'PO', onHand: 600, unitPrice: 3, allergyTags: ['penicillin'] },
  { id: 'DRG-AUG',  code: 'AUG',  name: 'Augmentin',                form: 'Tablet',  strength: '625 mg', route: 'PO', onHand: 320, unitPrice: 18, allergyTags: ['penicillin'] },
  { id: 'DRG-CIP',  code: 'CIP',  name: 'Ciprofloxacin',            form: 'Tablet',  strength: '500 mg', route: 'PO', onHand: 240, unitPrice: 12 },
  { id: 'DRG-MTZ',  code: 'MTZ',  name: 'Metronidazole',             form: 'Tablet',  strength: '400 mg', route: 'PO', onHand: 200, unitPrice: 4 },
  { id: 'DRG-LVX',  code: 'LVX',  name: 'Levofloxacin',              form: 'Injection', strength: '500 mg/100ml', route: 'IV', onHand: 80, unitPrice: 220 },
  { id: 'DRG-OND',  code: 'OND',  name: 'Ondansetron',               form: 'Tablet',  strength: '4 mg',   route: 'PO', onHand: 200, unitPrice: 5 },
  { id: 'DRG-PAN',  code: 'PAN',  name: 'Pantoprazole',              form: 'Tablet',  strength: '40 mg',  route: 'PO', onHand: 250, unitPrice: 4 },
  { id: 'DRG-LMW',  code: 'LMW',  name: 'Enoxaparin',                form: 'Injection', strength: '40 mg/0.4ml', route: 'SC', onHand: 50,  unitPrice: 180 },
  { id: 'DRG-MORC', code: 'MORC', name: 'Morphine',                  form: 'Injection', strength: '10 mg/ml',  route: 'IV', narcoticSchedule: 'I', onHand: 25, unitPrice: 60 },
  { id: 'DRG-TRA',  code: 'TRA',  name: 'Tramadol',                  form: 'Injection', strength: '50 mg/ml',  route: 'IV',                                onHand: 120, unitPrice: 22 },
]

// ─────────────────────────────────────────────────────────────────────────
// Patients (Kiran + ten secondary patients spread across roles)
// ─────────────────────────────────────────────────────────────────────────

const PATIENTS = [
  // ── HERO — Anil Kumar Verma (the demo walkthrough patient) ───────────
  { id: 'PT-44012', hn: 'KH-2026-04412', fullName: 'Anil Kumar Verma',
    phone: '+91 98109 44012', dob: '1988-03-14', age: 38, sex: 'Male' as const, bloodGroup: 'B+',
    primaryPayer: 'insurance' as const, insurerName: 'Star Health',
    address: 'Sector 56, Gurugram',
    allergies: ['Penicillin'], chronicConditions: [],
    dishaConsentAt: daysAgo(2),
    familyContacts: [{ name: 'Reena Verma', relation: 'Spouse', phone: '+91 98109 44013' }] },
  // ── Secondary inpatients / cross-role visibility ─────────────────────
  { id: 'PT-20394', hn: '20394', fullName: 'Kiran Patil',     phone: '+91 98765 12345', age: 58, sex: 'Male' as const,   bloodGroup: 'B+',  primaryPayer: 'insurance' as const, insurerName: 'Star Health',
    allergies: [], chronicConditions: ['Hypertension', 'Hyperlipidaemia', 'Post-PCI'], dishaConsentAt: daysAgo(3) },
  { id: 'PT-10234', hn: '10234', fullName: 'Aarav Sharma',     phone: '+91 99887 76543', age: 42, sex: 'Male' as const,   bloodGroup: 'A+',  primaryPayer: 'cash' as const },
  { id: 'PT-30021', hn: '30021', fullName: 'Meera Joshi',      phone: '+91 90123 45678', age: 35, sex: 'Female' as const, bloodGroup: 'O+',  primaryPayer: 'insurance' as const, insurerName: 'HDFC Ergo' },
  { id: 'PT-30022', hn: '30022', fullName: 'Sanjay Gupta',     phone: '+91 90123 45678', age: 65, sex: 'Male' as const,   bloodGroup: 'AB+', primaryPayer: 'cash' as const,
    allergies: ['penicillin'], chronicConditions: ['Type 2 Diabetes'] },
  { id: 'PT-30023', hn: '30023', fullName: 'Pooja Rao',        phone: '+91 88123 45678', age: 28, sex: 'Female' as const, bloodGroup: 'B-',  primaryPayer: 'corporate' as const },
  { id: 'PT-30024', hn: '30024', fullName: 'Ramesh Yadav',     phone: '+91 87123 45678', age: 71, sex: 'Male' as const,   bloodGroup: 'O+',  primaryPayer: 'govt' as const },
  { id: 'PT-30025', hn: '30025', fullName: 'Latha Subramanyam', phone: '+91 78123 45678', age: 52, sex: 'Female' as const, bloodGroup: 'A-',  primaryPayer: 'insurance' as const, insurerName: 'New India' },
  { id: 'PT-30026', hn: '30026', fullName: 'Imran Khan',       phone: '+91 88200 12345', age: 30, sex: 'Male' as const,   bloodGroup: 'O+',  primaryPayer: 'cash' as const },
  { id: 'PT-30027', hn: '30027', fullName: 'Sneha Iyer',       phone: '+91 99220 12345', age: 24, sex: 'Female' as const, bloodGroup: 'AB-', primaryPayer: 'cash' as const },
  { id: 'PT-30028', hn: '30028', fullName: 'Vikas Kapoor',     phone: '+91 70125 67890', age: 47, sex: 'Male' as const,   bloodGroup: 'A+',  primaryPayer: 'corporate' as const },
  // ── Background patients (lab / billing / OPD volume) ────────────────
  { id: 'PT-40031', hn: '40031', fullName: 'Asha Pillai',      phone: '+91 96450 12031', age: 62, sex: 'Female' as const, bloodGroup: 'O+',  primaryPayer: 'insurance' as const, insurerName: 'Star Health',
    chronicConditions: ['Type 2 Diabetes', 'Hypertension'] },
  { id: 'PT-40032', hn: '40032', fullName: 'Manish Bhatt',     phone: '+91 96201 30032', age: 51, sex: 'Male' as const,   bloodGroup: 'A-',  primaryPayer: 'corporate' as const },
  { id: 'PT-40033', hn: '40033', fullName: 'Reema Singh',      phone: '+91 88019 11033', age: 29, sex: 'Female' as const, bloodGroup: 'B+',  primaryPayer: 'cash' as const },
  { id: 'PT-40034', hn: '40034', fullName: 'Harish Naidu',     phone: '+91 89719 22034', age: 44, sex: 'Male' as const,   bloodGroup: 'O+',  primaryPayer: 'insurance' as const, insurerName: 'HDFC Ergo' },
  { id: 'PT-40035', hn: '40035', fullName: 'Divya Krishnan',   phone: '+91 70710 99035', age: 36, sex: 'Female' as const, bloodGroup: 'A+',  primaryPayer: 'insurance' as const, insurerName: 'Bajaj Allianz' },
  { id: 'PT-40036', hn: '40036', fullName: 'Suresh Kamath',    phone: '+91 99090 12036', age: 68, sex: 'Male' as const,   bloodGroup: 'AB+', primaryPayer: 'govt' as const,
    chronicConditions: ['COPD'] },
  { id: 'PT-40037', hn: '40037', fullName: 'Priya Khanna',     phone: '+91 87870 88037', age: 33, sex: 'Female' as const, bloodGroup: 'O-',  primaryPayer: 'corporate' as const },
]

// ─────────────────────────────────────────────────────────────────────────
// Beds
// ─────────────────────────────────────────────────────────────────────────

const BEDS = [
  { id: 'BED-ICU-1', ward: 'ICU',         code: 'ICU-1',  type: 'icu' as const,        status: 'occupied' as const },
  { id: 'BED-ICU-2', ward: 'ICU',         code: 'ICU-2',  type: 'icu' as const,        status: 'clean' as const },
  { id: 'BED-GEN-1', ward: 'General',     code: '101A',   type: 'general' as const,    status: 'occupied' as const },
  { id: 'BED-GEN-2', ward: 'General',     code: '101B',   type: 'general' as const,    status: 'clean' as const },
  { id: 'BED-GEN-3', ward: 'General',     code: '102',    type: 'general' as const,    status: 'cleaning' as const },
  { id: 'BED-PVT-1', ward: 'Private',     code: 'P-201',  type: 'private' as const,    status: 'clean' as const },
  { id: 'BED-ISO-1', ward: 'Isolation',   code: 'ISO-1',  type: 'isolation' as const,  status: 'clean' as const },
  // Surgical Ward (Anil's post-op landing)
  { id: 'BED-SUR-1', ward: 'Surgical',    code: 'SW-301', type: 'general' as const,    status: 'occupied' as const },
  { id: 'BED-SUR-2', ward: 'Surgical',    code: 'SW-302', type: 'general' as const,    status: 'clean' as const },
  { id: 'BED-SUR-3', ward: 'Surgical',    code: 'SW-303', type: 'general' as const,    status: 'clean' as const },
]

// ─────────────────────────────────────────────────────────────────────────
// Seed runner
// ─────────────────────────────────────────────────────────────────────────

async function seedStaff() {
  await Promise.all(STAFF.map((s) => StaffApi.put({ ...s, active: true })))
}

async function seedDrugs() {
  await Promise.all(DRUGS.map((d) => Drugs.put({
    ...d,
    classClass: undefined,
    allergyTags: d.allergyTags ?? [],
    interactionTags: [],
    reorderLevel: 50,
    active: true,
  } as Parameters<typeof Drugs.put>[0])))
}

async function seedPatientsAndBeds() {
  for (const p of PATIENTS) {
    await Patients.create({
      ...p,
      allergies: ('allergies' in p ? p.allergies : []) as string[],
      chronicConditions: ('chronicConditions' in p ? p.chronicConditions : []) as string[],
      familyContacts: [],
      id: p.id,
    } as unknown as Parameters<typeof Patients.create>[0])
  }
  await Promise.all(BEDS.map((b) => Ipd.beds.put(b)))
}

/* ── Kiran's journey ─────────────────────────────────────────────────────
 *  3 d ago — Reception walk-in (OPD)
 *  Today   — ER arrival, NSTEMI, admitted to ICU, post-PCI, recovering
 *           - Lab: troponin, CBC (Hema), creatinine (Biochem)
 *           - Radiology: CXR (today), ECHO (planned)
 *           - Pharmacy: ASA + Clopi + Atorva + Met + LMW
 *           - Bill: active IPD bill
 */
async function seedKiranJourney() {
  // OPD visit, 3 days ago
  await Visits.create({
    id: 'VIS-KIRAN-OPD',
    patientId: 'PT-20394',
    kind: 'OPD',
    doctorId: 'DR-1018',
    doctorName: 'Dr. Anjali Rao',
    department: 'General Medicine',
    status: 'completed',
    token: 42,
    scheduledAt: daysAgo(3),
    arrivedAt: daysAgo(3),
    servedAt: daysAgo(3),
    completedAt: daysAgo(3),
    payerType: 'insurance',
    chiefComplaint: 'Routine cardiac follow-up',
    symptoms: ['fatigue'],
  } as Parameters<typeof Visits.create>[0])

  // ER case + IPD admission (today)
  const erCase = await Emergency.createOnArrival({
    id: 'ER-KIRAN-001',
    patientId: 'PT-20394',
    patientName: 'Kiran Patil',
    age: 58, sex: 'Male',
    chiefComplaint: 'Chest pain, SpO2 94%, diaphoresis',
    esi: '2',
    esiAiSuggested: '2',
    bay: 'Resuscitation',
    doctorId: 'DR-1015',
    doctorName: 'Dr. Arjun Mehta',
    disposition: 'admit',
    disposedAt: hoursAgo(6),
  } as Parameters<typeof Emergency.createOnArrival>[0])

  await Visits.create({
    id: 'VIS-KIRAN-IPD',
    patientId: 'PT-20394',
    kind: 'IPD',
    doctorId: 'DR-1012',
    doctorName: 'Dr. Priya Nair',
    department: 'Cardiology',
    status: 'consulting',
    token: 0,
    arrivedAt: hoursAgo(6),
    servedAt: hoursAgo(5),
    payerType: 'insurance',
    chiefComplaint: 'NSTEMI, post-PCI',
    symptoms: ['chest pain', 'dyspnoea'],
  } as Parameters<typeof Visits.create>[0])

  const stay = await Ipd.stays.admit({
    id: 'IPD-KIRAN-001',
    patientId: 'PT-20394',
    visitId: 'VIS-KIRAN-IPD',
    admittingDoctorId: 'DR-1012',
    admittingDoctorName: 'Dr. Priya Nair',
    ward: 'ICU',
    bedId: 'BED-ICU-1',
    diagnosis: 'NSTEMI · post-PCI · LAD stent · TIMI 0 → 3',
  } as Parameters<typeof Ipd.stays.admit>[0])
  await Ipd.beds.assign('BED-ICU-1', stay.id)

  // Vitals — last 6 hours, 1-hour intervals
  for (let h = 6; h >= 0; h--) {
    await Ipd.vitals.capture({
      patientId: 'PT-20394',
      ipdStayId: stay.id,
      capturedBy: 'NU-205',
      capturedByName: 'Nurse Anita Verma',
      capturedAt: hoursAgo(h),
      hr: 78 - h, rr: 18, sbp: 138 - h * 2, dbp: 84, temp: 37.0, spo2: 95 + (h < 3 ? 2 : 0),
      news2: h > 3 ? 4 : 2,
    } as Parameters<typeof Ipd.vitals.capture>[0])
  }

  // Encounter + clinical notes
  await Encounters.create({
    visitId: 'VIS-KIRAN-IPD',
    patientId: 'PT-20394',
    doctorId: 'DR-1012',
    doctorName: 'Dr. Priya Nair',
    kind: 'SOAP',
    subjective: 'Mid-sternal chest pain x 3h, radiating to L arm. No syncope.',
    objective: 'P 78, BP 138/84, RR 18, SpO2 95% room air. Cardio: S1 S2 normal. No JVD.',
    assessment: 'NSTEMI · ECG: ST-↓ V4-V6 · trop 2.1 ng/mL.',
    plan: 'Cath lab activated. ASA + Clopi + LMW. Stent LAD. ICU monitoring.',
    aiPreBriefAccepted: true,
    signedAt: hoursAgo(5),
  } as Parameters<typeof Encounters.create>[0])

  // Lab orders
  const labOrderTrop = await Orders.create({
    visitId: 'VIS-KIRAN-IPD',
    patientId: 'PT-20394',
    doctorId: 'DR-1012',
    doctorName: 'Dr. Priya Nair',
    kind: 'lab',
    urgency: 'stat',
    bench: 'Biochemistry',
    indication: 'NSTEMI rule-in',
    items: [{ id: 'OI-1', name: 'Troponin I', code: 'TROP-I', qty: 1 }],
  } as Parameters<typeof Orders.create>[0])

  const labOrderCbc = await Orders.create({
    visitId: 'VIS-KIRAN-IPD',
    patientId: 'PT-20394',
    doctorId: 'DR-1012',
    doctorName: 'Dr. Priya Nair',
    kind: 'lab',
    urgency: 'routine',
    bench: 'Haematology',
    indication: 'pre-PCI',
    items: [{ id: 'OI-2', name: 'CBC', code: 'CBC', qty: 1 }],
  } as Parameters<typeof Orders.create>[0])

  await Lab.put({
    id: 'LR-TROP-1',
    orderId: labOrderTrop.id,
    patientId: 'PT-20394',
    panelCode: 'TROP-I',
    panelName: 'Troponin I',
    bench: 'Biochemistry',
    collectedAt: hoursAgo(5),
    resultedAt: hoursAgo(4),
    results: [{ code: 'TROP-I', name: 'Troponin I', value: 2.1, units: 'ng/mL', refRange: '< 0.04', critical: true }],
    qcStatus: 'pass',
    qcBy: 'LB-402', qcAt: hoursAgo(4),
    verifiedBy: 'LB-402', verifiedAt: hoursAgo(4),
    releasedAt: hoursAgo(4),
    critical: true,
    microStages: [],
  } as Parameters<typeof Lab.put>[0])

  await Lab.put({
    id: 'LR-CBC-1',
    orderId: labOrderCbc.id,
    patientId: 'PT-20394',
    panelCode: 'CBC',
    panelName: 'CBC',
    bench: 'Haematology',
    collectedAt: hoursAgo(5),
    resultedAt: hoursAgo(4),
    results: [
      { code: 'HB',  name: 'Haemoglobin', value: 13.4, units: 'g/dL', refRange: '13-17',  critical: false },
      { code: 'WBC', name: 'WBC',          value: 8.2,  units: '/uL',  refRange: '4-11',   critical: false },
      { code: 'PLT', name: 'Platelets',    value: 245,  units: '/uL',  refRange: '150-450',critical: false },
    ],
    qcStatus: 'pass',
    qcBy: 'LB-401', qcAt: hoursAgo(4),
    verifiedBy: 'LB-401', verifiedAt: hoursAgo(4),
    releasedAt: hoursAgo(4),
    critical: false,
    microStages: [],
  } as Parameters<typeof Lab.put>[0])

  // Radiology — CXR (released), ECHO scheduled
  const radCxr = await Orders.create({
    visitId: 'VIS-KIRAN-IPD',
    patientId: 'PT-20394',
    doctorId: 'DR-1012',
    doctorName: 'Dr. Priya Nair',
    kind: 'radiology',
    urgency: 'urgent',
    modality: 'CXR',
    indication: 'NSTEMI',
    items: [{ id: 'OI-CXR', name: 'CXR PA view', qty: 1 }],
  } as Parameters<typeof Orders.create>[0])

  await Radiology.put({
    id: 'RAD-CXR-1',
    orderId: radCxr.id,
    patientId: 'PT-20394',
    modality: 'CXR',
    bodyPart: 'Chest',
    status: 'released',
    scheduledAt: hoursAgo(5),
    acquiredAt: hoursAgo(4),
    technicianId: 'RT-101',
    radiologistId: 'DR-1021',
    aiDraft: 'No acute cardiopulmonary findings. Heart size normal. No pleural effusion.',
    finalReportMd: 'No acute cardiopulmonary findings. Heart size normal. No pleural effusion. **Impression: WNL.**',
    signedAt: hoursAgo(3),
    releasedAt: hoursAgo(3),
    critical: false,
  } as Parameters<typeof Radiology.put>[0])

  // Prescription — IPD post-PCI regimen
  const rx = await Prescriptions.draft({
    encounterId: undefined,
    visitId: 'VIS-KIRAN-IPD',
    patientId: 'PT-20394',
    doctorId: 'DR-1012',
    doctorName: 'Dr. Priya Nair',
    lines: [
      { id: 'RL-1', drugCode: 'ASA', drugName: 'Aspirin 75mg',      dose: '75 mg',  route: 'PO', freq: 'OD',  days: 30, quantity: 30, instructions: 'After breakfast', status: 'signed' },
      { id: 'RL-2', drugCode: 'CLO', drugName: 'Clopidogrel 75mg',  dose: '75 mg',  route: 'PO', freq: 'OD',  days: 30, quantity: 30, instructions: 'After dinner',    status: 'signed' },
      { id: 'RL-3', drugCode: 'ATO', drugName: 'Atorvastatin 40mg', dose: '40 mg',  route: 'PO', freq: 'HS',  days: 30, quantity: 30, instructions: 'At bedtime',      status: 'signed' },
      { id: 'RL-4', drugCode: 'MET', drugName: 'Metoprolol 50mg',   dose: '50 mg',  route: 'PO', freq: 'BD',  days: 30, quantity: 60, instructions: 'Before meals',    status: 'signed' },
      { id: 'RL-5', drugCode: 'LMW', drugName: 'Enoxaparin 40 mg',  dose: '40 mg',  route: 'SC', freq: 'BD',  days: 3,  quantity: 6,  instructions: 'Bridge therapy',  status: 'signed' },
    ],
  } as Parameters<typeof Prescriptions.draft>[0])

  await Prescriptions.sign(rx.id, {
    allergyChecked: true, interactionChecked: true, doseChecked: true, narcoticChecked: false, flags: [],
  })

  // Pharmacy claim — IPD
  const claim = await Pharmacy.createClaim({
    prescriptionId: rx.id,
    patientId: 'PT-20394',
    tag: 'IPD',
  } as Parameters<typeof Pharmacy.createClaim>[0])
  await Pharmacy.claim(claim.id, { userId: 'PH-301', userName: 'Ritu Sharma' })
  await Pharmacy.dispense(claim.id, { userId: 'PH-301', userName: 'Ritu Sharma' }, {
    bedside: true, drugsSummary: 'ASA + Clopi + Atorva + Met + LMW',
  })

  // MAR — schedule the next few doses
  for (let h = 0; h < 24; h += 12) {
    await Ipd.mar.schedule({
      ipdStayId: stay.id,
      patientId: 'PT-20394',
      rxLineId: 'RL-4',
      drugName: 'Metoprolol 50mg',
      dose: '50 mg PO',
      scheduledAt: new Date(Date.now() + h * HOURS).toISOString(),
    } as Parameters<typeof Ipd.mar.schedule>[0])
  }

  // Bill — active IPD bill
  const bedLine: BillLine = { id: 'BL-BED-1',    source: 'bed',     name: 'ICU bed × 1 day',  qty: 1, unitPrice: 12000, total: 12000, duplicateFlag: false }
  const consLine: BillLine = { id: 'BL-CON-1',   source: 'consult', name: 'Cardiology consult', qty: 1, unitPrice: 800,   total: 800,   duplicateFlag: false }
  const procLine: BillLine = { id: 'BL-PRC-1',   source: 'procedure', name: 'Cath + LAD stent', qty: 1, unitPrice: 145000, total: 145000, duplicateFlag: false }
  const labLine1: BillLine = { id: 'BL-LAB-1',   source: 'order',   sourceId: labOrderTrop.id, name: 'Troponin I', qty: 1, unitPrice: 800, total: 800, duplicateFlag: false }
  const labLine2: BillLine = { id: 'BL-LAB-2',   source: 'order',   sourceId: labOrderCbc.id,  name: 'CBC',         qty: 1, unitPrice: 350, total: 350, duplicateFlag: false }
  const radLine:  BillLine = { id: 'BL-RAD-1',   source: 'order',   sourceId: radCxr.id,       name: 'CXR PA view', qty: 1, unitPrice: 450, total: 450, duplicateFlag: false }
  const drugLine: BillLine = { id: 'BL-DRG-1',   source: 'drug',    name: 'Discharge medications (5)', qty: 1, unitPrice: 2200, total: 2200, duplicateFlag: false }

  const bill = await Bills.create({
    patientId: 'PT-20394',
    visitId: 'VIS-KIRAN-IPD',
    ipdStayId: stay.id,
    payerType: 'insurance',
    payerName: 'Star Health',
    status: 'open',
    lines: [bedLine, consLine, procLine, labLine1, labLine2, radLine, drugLine],
  } as Parameters<typeof Bills.create>[0])

  // Discharge — initiated, two pillars cleared so far
  const dis = await DischargeApi.initiate({
    ipdStayId: stay.id,
    patientId: 'PT-20394',
    initiatedBy: 'DR-1012',
    initiatedByName: 'Dr. Priya Nair',
  })
  await DischargeApi.setPillar(dis.id, 'pharmacy',
    'cleared', { userId: 'PH-301', userName: 'Ritu Sharma' },
    'Unused stock returned, 5 take-home drugs dispensed')
  await DischargeApi.setPillar(dis.id, 'files',
    'clearing', { userId: 'DC-801', userName: 'Geeta Rao' },
    'GP letter drafted, awaiting cardiology sign-off')
  await DischargeApi.setSummary(dis.id,
    `# Discharge Summary — Kiran Patil (PT-20394)\n\n` +
    `**Admission:** ${new Date(hoursAgo(6)).toLocaleString('en-IN')}\n` +
    `**Diagnosis:** NSTEMI; post-PCI; LAD stent\n\n` +
    `## Course\nPresented with chest pain, dyspnoea; troponin 2.1 ng/mL. Cath lab activated; LAD stent placed. Stable in ICU.\n\n` +
    `## Discharge meds\n- ASA 75 mg OD\n- Clopidogrel 75 mg OD\n- Atorvastatin 40 mg HS\n- Metoprolol 50 mg BD\n- Enoxaparin 40 mg SC BD × 3 d\n\n` +
    `## Follow-up\nCardiology OPD in 2 weeks. Continue antiplatelet for 12 months.`,
    'Cardiology OPD review in 14 days')

  return { stay, bill, dis }
}

/* ── Anil Kumar Verma — Phase-1 hero journey ─────────────────────────────
 *  Day 0 (2 days ago, 18:00): ER walk-in (RLQ pain) → triage ESI-3
 *  Day 0 + 0.5h: ER doctor consult by Dr. Priya Nair, CBC + CRP + USG abdomen ordered
 *  Day 0 + 1.5h: Labs collected, results released — WBC 14.5, CRP 86 (high)
 *  Day 0 + 1.5h: USG read + verified by Dr. Meera Iyer (acute appendicitis)
 *  Day 0 + 2h:   Surgery review by Dr. Vikram Rao → admit (lap appendectomy)
 *  Day 0 + 2.5h: Bed manager Anjali Gupta assigns bed SW-301
 *  Day 0 + 3h:   Cashless pre-auth filed by Kavita Singh → Star Health approves
 *  Day 0 + 4h:   OT day-of-surgery — WHO sign-in / time-out / sign-out
 *  Day 0 + 6h:   Post-op to Surgical Ward, nursing started by Sunita Devi
 *  Day 1 + 0:    Vitals NEWS2 = 5 (transient) → nurse escalation + doctor banner
 *  Day 1 + 1h:   IV antibiotic regimen drafted: AUGMENTIN flagged → switched to Cipro + Metro
 *  Day 1 + 3h:   Morphine 5 mg IV one-off via narcotic register (two-sig)
 *  Day 1 + 6h:   Two duplicate OT-consumable lines surface on the bill
 *  Day 2 + 0:    Discharge initiated; clearances accrue
 *  Day 2 + 1h:   Claim submitted — one line at denial-risk 0.72, awaiting sign-off
 */
async function seedAnilJourney() {
  const ER_ARRIVAL  = hoursAgo(50)   // ~Day 0 18:00 if "now" is Day 2 20:00
  const ER_TRIAGE   = hoursAgo(49.7)
  const ER_CONSULT  = hoursAgo(49.5)
  const LAB_DRAW    = hoursAgo(48.8)
  const LAB_RELEASE = hoursAgo(48.3)
  const RAD_REPORT  = hoursAgo(48.2)
  const SURG_REVIEW = hoursAgo(48.0)
  const BED_ASSIGN  = hoursAgo(47.5)
  const PREAUTH     = hoursAgo(47.0)
  const OT_SIGNIN   = hoursAgo(46.0)
  const OT_TIMEOUT  = hoursAgo(45.7)
  const OT_SIGNOUT  = hoursAgo(44.7)
  const POSTOP      = hoursAgo(44.5)
  const NEWS2_HIGH  = hoursAgo(30)    // Day 1 transient deterioration
  const NEWS2_OK    = hoursAgo(28)
  const RX_DRAFT    = hoursAgo(27)
  const RX_SIGNED   = hoursAgo(26.5)
  const MORPHINE    = hoursAgo(25)
  const BILL_BUILD  = hoursAgo(22)
  const DISCHARGE   = hoursAgo(6)
  const CLAIM_SUB   = hoursAgo(3)

  // ── ER arrival → triage → consult ─────────────────────────────────────
  const erVisit = await Visits.create({
    id: 'VIS-ANIL-ER',
    patientId: 'PT-44012',
    kind: 'ER',
    doctorId: 'DR-1012',
    doctorName: 'Dr. Priya Nair',
    department: 'Emergency',
    status: 'completed',
    arrivedAt: ER_ARRIVAL,
    servedAt: ER_CONSULT,
    completedAt: SURG_REVIEW,
    payerType: 'insurance',
    chiefComplaint: 'RLQ abdominal pain, low-grade fever',
    symptoms: ['rlq_pain', 'fever', 'nausea'],
    triageLevel: 'Medium',
  } as Parameters<typeof Visits.create>[0])

  await Emergency.createOnArrival({
    id: 'ER-ANIL-001',
    patientId: 'PT-44012',
    patientName: 'Anil Kumar Verma',
    age: 38, sex: 'Male',
    chiefComplaint: 'RLQ abdominal pain × 8h, low-grade fever, anorexia',
    esi: '3',
    esiAiSuggested: '3',
    bay: 'Observation',
    doctorId: 'DR-1012',
    doctorName: 'Dr. Priya Nair',
    disposition: 'admit',
    disposedAt: SURG_REVIEW,
    notes: 'McBurney point tenderness · Rovsing positive · WBC pending',
  } as Parameters<typeof Emergency.createOnArrival>[0])

  await Encounters.create({
    id: 'ENC-ANIL-ER',
    visitId: erVisit.id,
    patientId: 'PT-44012',
    doctorId: 'DR-1012',
    doctorName: 'Dr. Priya Nair',
    kind: 'Triage',
    startedAt: ER_CONSULT,
    subjective: 'RLQ pain, fever × 8h. No prior abdominal surgery. Penicillin allergy.',
    objective: 'T 38.2, P 102, BP 124/78, RR 18, SpO2 98%. McBurney tender, Rovsing +.',
    assessment: 'Probable acute appendicitis. Differential: ureteric colic, mesenteric adenitis.',
    plan: 'CBC + CRP + USG abdomen. Surgical review on results. NPO. IV fluids.',
    aiPreBriefAccepted: true,
    signedAt: ER_CONSULT,
  } as Parameters<typeof Encounters.create>[0])

  // ── Lab + radiology orders ────────────────────────────────────────────
  const labOrder = await Orders.create({
    id: 'ORD-ANIL-LAB',
    visitId: erVisit.id, encounterId: 'ENC-ANIL-ER',
    patientId: 'PT-44012',
    doctorId: 'DR-1012', doctorName: 'Dr. Priya Nair',
    kind: 'lab', urgency: 'urgent', bench: 'Biochemistry',
    indication: 'Suspected appendicitis',
    items: [{ id: 'OI-A-CBC', name: 'CBC',  code: 'CBC',  qty: 1 },
            { id: 'OI-A-CRP', name: 'CRP',  code: 'CRP',  qty: 1 }],
    sentAt: ER_CONSULT,
  } as Parameters<typeof Orders.create>[0])

  const radOrder = await Orders.create({
    id: 'ORD-ANIL-RAD',
    visitId: erVisit.id, encounterId: 'ENC-ANIL-ER',
    patientId: 'PT-44012',
    doctorId: 'DR-1012', doctorName: 'Dr. Priya Nair',
    kind: 'radiology', urgency: 'urgent', modality: 'USG',
    indication: 'Suspected acute appendicitis',
    items: [{ id: 'OI-A-USG', name: 'USG abdomen', qty: 1 }],
    sentAt: ER_CONSULT,
  } as Parameters<typeof Orders.create>[0])

  // Lab results released
  await Lab.put({
    id: 'LR-ANIL-CBC',
    orderId: labOrder.id, patientId: 'PT-44012',
    panelCode: 'CBC', panelName: 'CBC',
    bench: 'Haematology',
    collectedAt: LAB_DRAW, resultedAt: LAB_RELEASE,
    results: [
      { code: 'WBC', name: 'WBC',         value: 14.5, units: '×10⁹/L', refRange: '4-11',   critical: false },
      { code: 'HB',  name: 'Haemoglobin', value: 13.9, units: 'g/dL',   refRange: '13-17',  critical: false },
      { code: 'PLT', name: 'Platelets',   value: 232,  units: '×10⁹/L', refRange: '150-450', critical: false },
    ],
    qcStatus: 'pass', qcBy: 'LB-401', qcAt: LAB_RELEASE,
    verifiedBy: 'DR-1025', verifiedAt: LAB_RELEASE,
    releasedAt: LAB_RELEASE,
    critical: false, microStages: [],
  } as Parameters<typeof Lab.put>[0])

  await Lab.put({
    id: 'LR-ANIL-CRP',
    orderId: labOrder.id, patientId: 'PT-44012',
    panelCode: 'CRP', panelName: 'CRP',
    bench: 'Biochemistry',
    collectedAt: LAB_DRAW, resultedAt: LAB_RELEASE,
    results: [
      { code: 'CRP', name: 'C-Reactive Protein', value: 86, units: 'mg/L', refRange: '< 5', critical: false },
    ],
    qcStatus: 'pass', qcBy: 'LB-402', qcAt: LAB_RELEASE,
    verifiedBy: 'DR-1025', verifiedAt: LAB_RELEASE,
    releasedAt: LAB_RELEASE,
    critical: false, microStages: [],
  } as Parameters<typeof Lab.put>[0])

  // Radiology — USG read + verified by Dr. Meera Iyer
  await Radiology.put({
    id: 'RAD-ANIL-USG',
    orderId: radOrder.id, patientId: 'PT-44012',
    modality: 'USG', bodyPart: 'Abdomen',
    status: 'released',
    scheduledAt: LAB_DRAW, acquiredAt: RAD_REPORT,
    technicianId: 'RT-103',
    radiologistId: 'DR-1024',
    aiDraft: 'Aperistaltic blind-ending tubular structure in RIF, diameter 9 mm, with surrounding fat stranding. Consistent with acute appendicitis.',
    finalReportMd:
      '## USG Abdomen — Anil Kumar Verma\n\n' +
      '**Findings.** Aperistaltic blind-ending tubular structure in the right iliac fossa, ' +
      'outer diameter 9 mm, with surrounding hyperechoic fat (inflammatory stranding). ' +
      'Mild free fluid in pelvis. No abscess.\n\n' +
      '**Impression.** Findings are consistent with **acute appendicitis**. Surgical review advised.',
    signedAt: RAD_REPORT, releasedAt: RAD_REPORT,
    critical: false,
  } as Parameters<typeof Radiology.put>[0])

  await Orders.transition(labOrder.id, 'released')
  await Orders.transition(radOrder.id, 'released')

  // ── Surgery review + IPD admission + bed assign ───────────────────────
  await Encounters.create({
    id: 'ENC-ANIL-SURG',
    visitId: erVisit.id,
    patientId: 'PT-44012',
    doctorId: 'DR-1019', doctorName: 'Dr. Vikram Rao',
    kind: 'Progress',
    startedAt: SURG_REVIEW,
    subjective: 'Worsening RLQ pain · febrile.',
    objective: 'WBC 14.5, CRP 86. USG: appendicitis (9 mm, free fluid).',
    assessment: 'Acute appendicitis — surgical.',
    plan: 'Admit Surgical Ward · NPO · IV access · lap appendectomy. Pre-auth via TPA. Penicillin allergy — avoid β-lactams.',
    signedAt: SURG_REVIEW,
  } as Parameters<typeof Encounters.create>[0])

  const ipdVisit = await Visits.create({
    id: 'VIS-ANIL-IPD',
    patientId: 'PT-44012',
    kind: 'IPD',
    doctorId: 'DR-1019', doctorName: 'Dr. Vikram Rao',
    department: 'Surgery',
    status: 'consulting',
    arrivedAt: SURG_REVIEW,
    servedAt: BED_ASSIGN,
    payerType: 'insurance',
    chiefComplaint: 'Acute appendicitis — for lap appendectomy',
    symptoms: ['appendicitis'],
  } as Parameters<typeof Visits.create>[0])

  const stay = await Ipd.stays.admit({
    id: 'IPD-ANIL-001',
    patientId: 'PT-44012',
    visitId: ipdVisit.id,
    admittingDoctorId: 'DR-1019',
    admittingDoctorName: 'Dr. Vikram Rao',
    ward: 'Surgical',
    bedId: 'BED-SUR-1',
    diagnosis: 'Acute appendicitis · for laparoscopic appendectomy',
  } as Parameters<typeof Ipd.stays.admit>[0])
  await Ipd.beds.assign('BED-SUR-1', stay.id)

  // ── Vitals: pre-op → post-op → Day-1 transient NEWS2=5 → recovery ────
  // Pre-op baseline
  await Ipd.vitals.capture({
    patientId: 'PT-44012', ipdStayId: stay.id,
    capturedBy: 'NU-211', capturedByName: 'Sunita Devi',
    capturedAt: BED_ASSIGN,
    hr: 96, rr: 18, sbp: 124, dbp: 78, temp: 38.2, spo2: 98, news2: 2,
  } as Parameters<typeof Ipd.vitals.capture>[0])
  // Post-op
  await Ipd.vitals.capture({
    patientId: 'PT-44012', ipdStayId: stay.id,
    capturedBy: 'NU-211', capturedByName: 'Sunita Devi',
    capturedAt: POSTOP,
    hr: 88, rr: 17, sbp: 120, dbp: 76, temp: 37.4, spo2: 98, news2: 0,
  } as Parameters<typeof Ipd.vitals.capture>[0])
  // Day-1 transient deterioration (NEWS2=5)
  await Ipd.vitals.capture({
    patientId: 'PT-44012', ipdStayId: stay.id,
    capturedBy: 'NU-211', capturedByName: 'Sunita Devi',
    capturedAt: NEWS2_HIGH,
    hr: 112, rr: 22, sbp: 102, dbp: 64, temp: 38.4, spo2: 93, news2: 5,
  } as Parameters<typeof Ipd.vitals.capture>[0])
  // Day-1 recovery
  await Ipd.vitals.capture({
    patientId: 'PT-44012', ipdStayId: stay.id,
    capturedBy: 'NU-211', capturedByName: 'Sunita Devi',
    capturedAt: NEWS2_OK,
    hr: 92, rr: 18, sbp: 118, dbp: 74, temp: 37.6, spo2: 97, news2: 1,
  } as Parameters<typeof Ipd.vitals.capture>[0])
  // Day-2 stable for discharge
  await Ipd.vitals.capture({
    patientId: 'PT-44012', ipdStayId: stay.id,
    capturedBy: 'NU-211', capturedByName: 'Sunita Devi',
    capturedAt: hoursAgo(8),
    hr: 78, rr: 16, sbp: 118, dbp: 76, temp: 37.0, spo2: 98, news2: 0,
  } as Parameters<typeof Ipd.vitals.capture>[0])

  // ── Prescriptions: blocked Augmentin draft + cleared Cipro+Metro signed ─
  // Draft #1 — Augmentin (must trip the drug-safety block when opened)
  await Prescriptions.draft({
    visitId: ipdVisit.id,
    patientId: 'PT-44012',
    doctorId: 'DR-1019', doctorName: 'Dr. Vikram Rao',
    lines: [
      { id: 'RL-ANIL-AUG', drugCode: 'AUG', drugName: 'Augmentin 625 mg', dose: '625 mg', route: 'PO',
        freq: 'TDS', days: 5, quantity: 15, instructions: 'Post-op antibiotic',
        status: 'draft' },
    ],
  } as Parameters<typeof Prescriptions.draft>[0])

  // Draft #2 — Cipro + Metronidazole (cleared regimen, signed)
  const rxSafe = await Prescriptions.draft({
    visitId: ipdVisit.id,
    patientId: 'PT-44012',
    doctorId: 'DR-1019', doctorName: 'Dr. Vikram Rao',
    lines: [
      { id: 'RL-ANIL-CIP', drugCode: 'CIP', drugName: 'Ciprofloxacin 500 mg', dose: '500 mg', route: 'PO',
        freq: 'BD', days: 5, quantity: 10, instructions: 'Post-op (penicillin-sparing)',
        status: 'signed' },
      { id: 'RL-ANIL-MTZ', drugCode: 'MTZ', drugName: 'Metronidazole 400 mg', dose: '400 mg', route: 'PO',
        freq: 'TDS', days: 5, quantity: 15, instructions: 'Anaerobic cover',
        status: 'signed' },
      { id: 'RL-ANIL-PCM', drugCode: 'PCM', drugName: 'Paracetamol 500 mg', dose: '500 mg', route: 'PO',
        freq: 'QDS PRN', days: 5, quantity: 20, instructions: 'For pain / fever',
        status: 'signed' },
      { id: 'RL-ANIL-TRA', drugCode: 'TRA', drugName: 'Tramadol 50 mg', dose: '50 mg', route: 'IV',
        freq: 'BD PRN', days: 2, quantity: 4, instructions: 'For post-op pain',
        status: 'signed' },
    ],
  } as Parameters<typeof Prescriptions.draft>[0])
  await Prescriptions.sign(rxSafe.id, {
    allergyChecked: true, interactionChecked: true, doseChecked: true, narcoticChecked: false, flags: [],
  })

  // ── Pharmacy claim + dispense (IPD) ──────────────────────────────────
  const claim = await Pharmacy.createClaim({
    prescriptionId: rxSafe.id, patientId: 'PT-44012', tag: 'IPD',
  } as Parameters<typeof Pharmacy.createClaim>[0])
  await Pharmacy.claim(claim.id, { userId: 'PH-303', userName: 'Rohit Sharma' })
  await Pharmacy.dispense(claim.id, { userId: 'PH-303', userName: 'Rohit Sharma' }, {
    bedside: true, drugsSummary: 'Cipro + Metro + PCM + Tramadol',
  })

  // ── MAR: post-op antibiotic doses + one narcotic dose ────────────────
  for (let h = 0; h < 24; h += 12) {
    await Ipd.mar.schedule({
      ipdStayId: stay.id, patientId: 'PT-44012',
      rxLineId: 'RL-ANIL-CIP', drugName: 'Ciprofloxacin 500 mg',
      dose: '500 mg PO',
      scheduledAt: new Date(Date.now() - (h + 6) * HOURS).toISOString(),
    } as Parameters<typeof Ipd.mar.schedule>[0])
  }
  // Morphine 5 mg IV — one-off narcotic (routes through narcotic register)
  await Ipd.mar.schedule({
    ipdStayId: stay.id, patientId: 'PT-44012',
    rxLineId: 'RL-ANIL-MOR', drugName: 'Morphine 5 mg IV (narcotic, witnessed)',
    dose: '5 mg IV',
    scheduledAt: MORPHINE,
  } as Parameters<typeof Ipd.mar.schedule>[0])
  // Pharmacy narcotic sign-out (two-sig)
  await Pharmacy.narcotics.signOut({
    drugId: 'DRG-MORC', qty: 1,
    signedOutBy: 'PH-303', signedOutByName: 'Rohit Sharma',
    witnessId: 'NU-211',  witnessName: 'Sunita Devi',
    patientId: 'PT-44012',
  } as Parameters<typeof Pharmacy.narcotics.signOut>[0])

  // ── Bill: itemised, with two duplicate OT-consumable lines ───────────
  const bill = await Bills.create({
    patientId: 'PT-44012',
    visitId: ipdVisit.id, ipdStayId: stay.id,
    payerType: 'insurance', payerName: 'Star Health',
    status: 'open',
    lines: [
      { id: 'BL-AN-BED',   source: 'bed',       name: 'Surgical ward bed × 2 days',         qty: 2, unitPrice: 3500,  total: 7000,   duplicateFlag: false },
      { id: 'BL-AN-CON',   source: 'consult',   name: 'Surgery consult (Dr. Vikram Rao)',    qty: 2, unitPrice: 700,   total: 1400,   duplicateFlag: false },
      { id: 'BL-AN-OT',    source: 'procedure', name: 'Laparoscopic appendectomy (OT)',      qty: 1, unitPrice: 68000, total: 68000,  duplicateFlag: false },
      { id: 'BL-AN-ANES',  source: 'procedure', name: 'Anaesthesia (Dr. Sameer Joshi)',       qty: 1, unitPrice: 9500,  total: 9500,   duplicateFlag: false },
      { id: 'BL-AN-LAB-1', source: 'order',     sourceId: labOrder.id, name: 'CBC',           qty: 1, unitPrice: 350,   total: 350,    duplicateFlag: false },
      { id: 'BL-AN-LAB-2', source: 'order',     sourceId: labOrder.id, name: 'CRP',           qty: 1, unitPrice: 480,   total: 480,    duplicateFlag: false },
      { id: 'BL-AN-RAD',   source: 'order',     sourceId: radOrder.id, name: 'USG abdomen',   qty: 1, unitPrice: 950,   total: 950,    duplicateFlag: false },
      // ↓ Duplicate OT-consumable rows — duplicate-charge AI flags these
      { id: 'BL-AN-CONS-A', source: 'procedure', code: 'OT-TROCAR-10', name: 'OT consumable: Trocar 10 mm',       qty: 1, unitPrice: 2400,  total: 2400,   duplicateFlag: false },
      { id: 'BL-AN-CONS-B', source: 'procedure', code: 'OT-TROCAR-10', name: 'OT consumable: Trocar 10 mm',       qty: 1, unitPrice: 2400,  total: 2400,   duplicateFlag: true,
        notes: 'AI flag — possible duplicate of BL-AN-CONS-A' },
      { id: 'BL-AN-DRG',   source: 'drug',      name: 'IPD pharmacy (Cipro + Metro + PCM + Tramadol)', qty: 1, unitPrice: 1850,  total: 1850,   duplicateFlag: false },
    ],
  } as Parameters<typeof Bills.create>[0])

  // ── Discharge: pillars accruing ──────────────────────────────────────
  const dis = await DischargeApi.initiate({
    ipdStayId: stay.id, patientId: 'PT-44012',
    initiatedBy: 'DR-1019', initiatedByName: 'Dr. Vikram Rao',
  })
  await DischargeApi.setPillar(dis.id, 'pharmacy',
    'cleared', { userId: 'PH-303', userName: 'Rohit Sharma' },
    'Take-home antibiotics + analgesia dispensed')
  await DischargeApi.setPillar(dis.id, 'files',
    'clearing', { userId: 'DC-801', userName: 'Geeta Rao' },
    'OT summary + histopath request drafted; awaiting surgeon sign-off')
  await DischargeApi.setSummary(dis.id,
    `# Discharge Summary — Anil Kumar Verma (PT-44012)\n\n` +
    `**Admitted:** ${new Date(SURG_REVIEW).toLocaleString('en-IN')}\n` +
    `**Diagnosis:** Acute appendicitis; status-post laparoscopic appendectomy.\n\n` +
    `## Hospital course\n` +
    `Presented to ER with RLQ pain × 8h. WBC 14.5, CRP 86. USG: 9 mm appendix with ` +
    `inflammatory stranding. Underwent uneventful laparoscopic appendectomy under GA. ` +
    `Post-op Day 1 brief deterioration (NEWS2 = 5) — settled with hydration + analgesia. ` +
    `Penicillin allergy: avoided β-lactams; cipro + metronidazole regimen used.\n\n` +
    `## Discharge meds (5 d)\n` +
    `- Ciprofloxacin 500 mg PO BD\n` +
    `- Metronidazole 400 mg PO TDS\n` +
    `- Paracetamol 500 mg PO QDS PRN\n\n` +
    `## Follow-up\n` +
    `Surgical OPD review in 7 days. Suture / port-site check. Histopath report to be collected. ` +
    `Return to ER if fever > 38.5, worsening pain, persistent vomiting.\n\n` +
    `## Allergies\nPenicillin (avoid β-lactams — verified at every Rx).`,
    'Surgical OPD review in 7 days · histopath collection')

  return { stay, bill, dis }
}

/* ── Secondary populations — queues for every role ───────────────────── */
async function seedSecondaryQueues() {
  // OPD queue — 3 patients waiting
  await Visits.create({ patientId: 'PT-30021', kind: 'OPD', doctorId: 'DR-1018', doctorName: 'Dr. Anjali Rao', department: 'General Medicine', status: 'waiting', token: 12, arrivedAt: minsAgo(20), payerType: 'insurance', chiefComplaint: 'Fever, body ache', symptoms: ['fever', 'myalgia'] } as Parameters<typeof Visits.create>[0])
  await Visits.create({ patientId: 'PT-30022', kind: 'OPD', doctorId: 'DR-1018', doctorName: 'Dr. Anjali Rao', department: 'General Medicine', status: 'vitals', token: 13, arrivedAt: minsAgo(15), payerType: 'cash',     chiefComplaint: 'Diabetic foot check', symptoms: ['ulcer'] } as Parameters<typeof Visits.create>[0])
  await Visits.create({ patientId: 'PT-30023', kind: 'OPD', doctorId: 'DR-1012', doctorName: 'Dr. Priya Nair',   department: 'Cardiology',         status: 'consulting', token: 14, arrivedAt: minsAgo(45), servedAt: minsAgo(10), payerType: 'corporate', chiefComplaint: 'Palpitations', symptoms: ['palpitations'] } as Parameters<typeof Visits.create>[0])

  // ER triage queue — 2 cases waiting
  await Emergency.createOnArrival({ patientName: 'Walk-in 1 (unknown)', age: 45, sex: 'Male',   chiefComplaint: 'RTA — head laceration' } as Parameters<typeof Emergency.createOnArrival>[0])
  await Emergency.createOnArrival({ patientName: 'Walk-in 2 (unknown)', age: 33, sex: 'Female', chiefComplaint: 'Anaphylaxis suspected' } as Parameters<typeof Emergency.createOnArrival>[0])

  // Lab queue — Sanjay & Meera (orders sent, samples pending)
  await Orders.create({ patientId: 'PT-30022', doctorId: 'DR-1018', doctorName: 'Dr. Anjali Rao', kind: 'lab', urgency: 'routine', bench: 'Biochemistry', items: [{ id: 'OI-A1', name: 'HbA1c', code: 'HBA1C', qty: 1 }] } as Parameters<typeof Orders.create>[0])
  await Orders.create({ patientId: 'PT-30021', doctorId: 'DR-1018', doctorName: 'Dr. Anjali Rao', kind: 'lab', urgency: 'urgent',  bench: 'Microbiology', items: [{ id: 'OI-A2', name: 'Blood culture', code: 'BC', qty: 1 }] } as Parameters<typeof Orders.create>[0])

  // Radiology queue — 1 study scheduled
  await Orders.create({ patientId: 'PT-30024', doctorId: 'DR-1018', doctorName: 'Dr. Anjali Rao', kind: 'radiology', urgency: 'routine', modality: 'CT', items: [{ id: 'OI-CT', name: 'CT Brain plain', qty: 1 }] } as Parameters<typeof Orders.create>[0])
  await Radiology.put({ id: 'RAD-PEND-1', orderId: 'ORD-PENDING', patientId: 'PT-30024', modality: 'CT', bodyPart: 'Brain', status: 'scheduled', scheduledAt: minsAgo(10), critical: false } as Parameters<typeof Radiology.put>[0])

  // Pharmacy queue — 1 OPD Rx awaiting claim
  const opdRx = await Prescriptions.draft({
    visitId: undefined,
    patientId: 'PT-30021',
    doctorId: 'DR-1018',
    doctorName: 'Dr. Anjali Rao',
    lines: [
      { id: 'OL-1', drugCode: 'PCM', drugName: 'Paracetamol 500mg', dose: '500 mg', route: 'PO', freq: 'QDS', days: 3, quantity: 12, status: 'signed' },
      { id: 'OL-2', drugCode: 'AMX', drugName: 'Amoxicillin 500mg', dose: '500 mg', route: 'PO', freq: 'TDS', days: 5, quantity: 15, status: 'signed' },
    ],
  } as Parameters<typeof Prescriptions.draft>[0])
  await Prescriptions.sign(opdRx.id, { allergyChecked: true, interactionChecked: true, doseChecked: true, narcoticChecked: false, flags: [] })
  await Pharmacy.createClaim({ prescriptionId: opdRx.id, patientId: 'PT-30021', tag: 'OPD' } as Parameters<typeof Pharmacy.createClaim>[0])

  // Bills queue — Aarav cash bill, draft
  await Bills.create({
    patientId: 'PT-10234',
    payerType: 'cash',
    status: 'open',
    lines: [
      { id: 'BL-AA-1', source: 'consult', name: 'GP consult', qty: 1, unitPrice: 500, total: 500, duplicateFlag: false },
    ],
  } as Parameters<typeof Bills.create>[0])
}

// ─────────────────────────────────────────────────────────────────────────
// Public seed entry point
// ─────────────────────────────────────────────────────────────────────────

export async function runDemoSeed(): Promise<void> {
  installAuditBridge()
  await seedStaff()
  await seedDrugs()
  await seedPatientsAndBeds()
  await seedAnilJourney()       // hero — Phase-1 walkthrough patient
  await seedKiranJourney()       // secondary inpatient (NSTEMI, retained)
  await seedSecondaryQueues()
  await markBootstrapped('phase1-anil-journey-v2')
}

export async function ensureSeeded(): Promise<void> {
  if (await isBootstrapped()) {
    installAuditBridge()
    return
  }
  // Wipe any prior-version data before seeding fresh — keeps the demo
  // coherent when the schema version bumps.
  const { wipeAll } = await import('./_core')
  wipeAll()
  await runDemoSeed()
}

export async function reseed(): Promise<void> {
  await resetAll('manual-reseed')
  await runDemoSeed()
}
