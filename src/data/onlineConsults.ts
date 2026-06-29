import type { Patient } from '@/store/usePatientStore'

// Online-consult patients are full Patient records so the consultation
// workspace gives the doctor every OPD tool during/after the call. Shared by
// the Online Consultation queue and the Patient Records table.
export type OnlineConsult = Patient & { slot: string; reason: string }

export const ONLINE_CONSULTS: OnlineConsult[] = [
  {
    id: 'OC-2041', name: 'Rajan Mehta', age: 45, gender: 'Male', phone: '9845511223', bloodGroup: 'B+', token: 0,
    queueStatus: 'consulting', estimatedWait: 0, doctor: 'Dr. Priya Nair', department: 'General Medicine',
    vitals: { bp: '138/86', temp: '98.4°F', weight: '78 kg', spo2: '98%', pulse: '80 bpm' },
    symptoms: ['Diabetes follow-up', 'Mild fatigue'], history: ['Type 2 Diabetes', 'Hypertension'], registeredAt: '10:00 AM',
    triageLevel: 'Medium', slot: '10:00 AM', reason: 'Diabetes follow-up',
  },
  {
    id: 'OC-2042', name: 'Savita Devi', age: 62, gender: 'Female', phone: '9812245566', bloodGroup: 'O+', token: 0,
    queueStatus: 'consulting', estimatedWait: 0, doctor: 'Dr. Priya Nair', department: 'General Medicine',
    vitals: undefined, symptoms: ['Blood pressure review'], history: ['Hypertension'], registeredAt: '10:30 AM',
    triageLevel: 'Low', slot: '10:30 AM', reason: 'Hypertension review',
  },
  {
    id: 'OC-2043', name: 'Imran Qureshi', age: 29, gender: 'Male', phone: '9890011223', bloodGroup: 'A+', token: 0,
    queueStatus: 'consulting', estimatedWait: 0, doctor: 'Dr. Priya Nair', department: 'General Medicine',
    vitals: undefined, symptoms: ['Cough', 'Low-grade fever'], history: ['No significant history'], registeredAt: '11:00 AM',
    triageLevel: 'Low', slot: '11:00 AM', reason: 'Upper respiratory symptoms',
  },
]
