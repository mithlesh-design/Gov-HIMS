import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type PostDischargeEventType =
  | 'wellness_checkin'
  | 'diagnostic_reminder'
  | 'pre_followup_reminder'
  | 'doctor_availability'

export type PostDischargeEvent = {
  id: string
  type: PostDischargeEventType
  label: string
  scheduledDate: string
  channel: 'whatsapp' | 'sms' | 'in_app'
  status: 'scheduled' | 'sent' | 'responded' | 'missed'
  message: string
}

export type FollowupPatient = {
  id: string
  patientId: string
  patientName: string
  dischargedOn: string
  diagnosis: string
  attendingDoctor: string
  doctorAvailable?: boolean
  followUpDate?: string
  followUpBooked: boolean
  riskLevel: 'Low' | 'Medium' | 'High'
  callbackScheduled: boolean
  callbackDone: boolean
  dischargeSummary: string
  medications: { name: string; dose: string; frequency: string; duration: string }[]
  redFlagSymptoms: string[]
  dietaryAdvice: string
  claimDocumentsReady: boolean
  readmitted?: boolean
  postDischargeEvents: PostDischargeEvent[]
}

interface FollowupState {
  patients: FollowupPatient[]
  bookFollowup: (patientId: string, date: string) => void
  scheduleCallback: (patientId: string) => void
  markCallbackDone: (patientId: string) => void
}

function makeEvents(dischargedOn: string, followUpDate?: string): PostDischargeEvent[] {
  const d = new Date(dischargedOn)
  const day = (n: number) => new Date(d.getTime() + n * 86400000).toISOString()
  const events: PostDischargeEvent[] = [
    {
      id: 'EV-1', type: 'wellness_checkin', label: 'Day 1 Wellness Check-in',
      scheduledDate: day(1), channel: 'whatsapp', status: 'sent',
      message: 'How are you feeling today? Please reply: Good / Not well / Emergency',
    },
    {
      id: 'EV-2', type: 'diagnostic_reminder', label: 'Day 3 Diagnostic Follow-up Reminder',
      scheduledDate: day(3), channel: 'sms', status: 'scheduled',
      message: 'Reminder: Please complete any pending lab tests ordered at discharge.',
    },
  ]
  if (followUpDate) {
    const fu = new Date(followUpDate)
    events.push({
      id: 'EV-3', type: 'pre_followup_reminder', label: 'Day Before Follow-up',
      scheduledDate: new Date(fu.getTime() - 86400000).toISOString(), channel: 'whatsapp', status: 'scheduled',
      message: 'Reminder: Your follow-up appointment is tomorrow at Agentix HIMS.',
    })
    events.push({
      id: 'EV-4', type: 'doctor_availability', label: 'Follow-up Day Confirmation',
      scheduledDate: followUpDate, channel: 'sms', status: 'scheduled',
      message: 'Your doctor is available today for your follow-up. Agentix HIMS OPD timings: 9am–1pm.',
    })
  }
  return events
}

const d1Discharged = new Date(Date.now() - 2 * 24 * 3600000).toISOString()
const d1FollowUp = new Date(Date.now() + 12 * 24 * 3600000).toISOString()
const d2Discharged = new Date(Date.now() - 1 * 24 * 3600000).toISOString()

export const useFollowupStore = create<FollowupState>()(persist((set) => ({
  patients: [
    {
      id: 'FU-001',
      patientId: 'PT-10203',
      patientName: 'Mohan Lal',
      dischargedOn: d1Discharged,
      diagnosis: 'Type 2 Diabetes — stabilised',
      attendingDoctor: 'Dr. Priya Menon',
      doctorAvailable: true,
      followUpDate: d1FollowUp,
      followUpBooked: true,
      riskLevel: 'Medium',
      callbackScheduled: true,
      callbackDone: false,
      dischargeSummary: 'Patient stabilised on insulin regimen. HbA1c reduced from 11.2% to expected 8.5% with current therapy. Oral hypoglycaemics initiated. Renal function stable.',
      medications: [
        { name: 'Metformin', dose: '500mg', frequency: 'Twice daily', duration: '3 months' },
        { name: 'Glimepiride', dose: '2mg', frequency: 'Once daily (morning)', duration: '3 months' },
        { name: 'Lisinopril', dose: '5mg', frequency: 'Once daily', duration: 'Ongoing' },
      ],
      redFlagSymptoms: ['Blood glucose >300 mg/dL consistently', 'Fever >38.5°C for >2 days', 'Swelling in feet or legs', 'Chest pain or breathlessness', 'Decreased urination'],
      dietaryAdvice: 'Low-carbohydrate diet. Avoid sugar and processed foods. Small frequent meals. Regular blood glucose monitoring at home twice daily.',
      claimDocumentsReady: true,
      postDischargeEvents: makeEvents(d1Discharged, d1FollowUp),
    },
    {
      id: 'FU-002',
      patientId: 'PT-10202',
      patientName: 'Priya Sharma',
      dischargedOn: d2Discharged,
      diagnosis: 'Post-laparoscopic appendectomy',
      attendingDoctor: 'Dr. Ravi Kumar',
      doctorAvailable: true,
      followUpBooked: false,
      riskLevel: 'Low',
      callbackScheduled: false,
      callbackDone: false,
      dischargeSummary: 'Uncomplicated laparoscopic appendectomy. Patient recovered well. Oral diet tolerated. Wound clean and dry. Discharged on oral antibiotics.',
      medications: [
        { name: 'Amoxicillin-Clavulanate', dose: '625mg', frequency: 'Twice daily', duration: '5 days' },
        { name: 'Ibuprofen', dose: '400mg', frequency: 'TDS after meals', duration: '3 days' },
        { name: 'Pantoprazole', dose: '40mg', frequency: 'Once daily (morning)', duration: '7 days' },
      ],
      redFlagSymptoms: ['Fever >38°C', 'Increasing abdominal pain', 'Wound redness/discharge', 'Inability to eat or drink', 'Vomiting not settling'],
      dietaryAdvice: 'Light, easily digestible food for 1 week. Avoid heavy lifting or strenuous activity for 2 weeks. Keep surgical site dry.',
      claimDocumentsReady: false,
      postDischargeEvents: makeEvents(d2Discharged),
    },
  ],

  bookFollowup: (patientId, date) =>
    set((s) => ({
      patients: s.patients.map(p => p.patientId === patientId ? { ...p, followUpDate: date, followUpBooked: true } : p),
    })),

  scheduleCallback: (patientId) =>
    set((s) => ({
      patients: s.patients.map(p => p.patientId === patientId ? { ...p, callbackScheduled: true } : p),
    })),

  markCallbackDone: (patientId) =>
    set((s) => ({
      patients: s.patients.map(p => p.patientId === patientId ? { ...p, callbackDone: true } : p),
    })),
}),
  {
    name: 'agentix-followupstore', version: 1,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))
