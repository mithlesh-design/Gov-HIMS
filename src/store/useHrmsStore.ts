import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// HRMS companion store — the NEW modules (attendance, recruitment, onboarding,
// appraisals). Staff identity + leave live in useHRStore; these reference its
// staffId values. Kept separate to avoid bloating the 1,300-line HR store.

const todayISO = () => new Date().toISOString().slice(0, 10)
const nowTime = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString()

// ── Attendance ──────────────────────────────────────────────────────────
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'leave' | 'half_day'
export interface AttendanceRecord {
  id: string; staffId: string; date: string
  clockIn?: string; clockOut?: string; status: AttendanceStatus
}

// ── Recruitment ─────────────────────────────────────────────────────────
export type ApplicantStage = 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Hired' | 'Rejected'
export const APPLICANT_STAGES: ApplicantStage[] = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']
export interface JobOpening {
  id: string; title: string; department: string; openings: number
  type: 'Full-time' | 'Locum' | 'Contract' | 'Intern'; status: 'Open' | 'On hold' | 'Closed'; postedAt: string
}
export interface Applicant {
  id: string; openingId: string; name: string; email: string; phone: string
  stage: ApplicantStage; appliedAt: string; rating?: number
}

// ── Onboarding ──────────────────────────────────────────────────────────
export interface OnboardingTask { label: string; done: boolean }
export interface OnboardingChecklist {
  id: string; staffId: string; name: string; role: string; startedAt: string; tasks: OnboardingTask[]
}
export const DEFAULT_ONBOARDING_TASKS = [
  'Offer letter signed', 'ID & access card issued', 'Email & system accounts',
  'Department orientation', 'Credentials verified', 'Payroll & bank details',
  'Uniform & equipment issued', 'Policy & compliance training',
]

// ── Appraisals ──────────────────────────────────────────────────────────
export type ReviewStatus = 'draft' | 'submitted' | 'acknowledged'
export interface AppraisalCycle { id: string; name: string; period: string; status: 'Active' | 'Closed' }
export interface Review {
  id: string; cycleId: string; staffId: string; staffName: string; reviewer: string
  goals: string; strengths: string; rating: number; status: ReviewStatus; updatedAt: string
}

interface HrmsState {
  attendance: AttendanceRecord[]
  openings: JobOpening[]
  applicants: Applicant[]
  onboarding: OnboardingChecklist[]
  cycles: AppraisalCycle[]
  reviews: Review[]
  // attendance
  clockIn: (staffId: string) => void
  clockOut: (staffId: string) => void
  setAttendance: (staffId: string, status: AttendanceStatus) => void
  // recruitment
  addOpening: (o: { title: string; department: string; openings: number; type: JobOpening['type'] }) => void
  addApplicant: (a: { openingId: string; name: string; email: string; phone: string }) => void
  moveApplicant: (id: string, stage: ApplicantStage) => void
  // onboarding
  startOnboarding: (input: { staffId: string; name: string; role: string }) => void
  toggleOnboardingTask: (checklistId: string, idx: number) => void
  // appraisals
  addCycle: (input: { name: string; period: string }) => void
  upsertReview: (input: { id?: string; cycleId: string; staffId: string; staffName: string; reviewer: string; goals: string; strengths: string; rating: number }) => void
  setReviewStatus: (id: string, status: ReviewStatus) => void
}

const SEED_OPENINGS: JobOpening[] = [
  { id: 'JOB-001', title: 'Staff Nurse — ICU', department: 'ICU', openings: 3, type: 'Full-time', status: 'Open', postedAt: hoursAgo(72) },
  { id: 'JOB-002', title: 'Junior Resident — Emergency Medicine', department: 'Emergency Room', openings: 2, type: 'Full-time', status: 'Open', postedAt: hoursAgo(120) },
  { id: 'JOB-003', title: 'Lab Technician — Pathology', department: 'Pathology', openings: 1, type: 'Contract', status: 'On hold', postedAt: hoursAgo(240) },
]

const SEED_APPLICANTS: Applicant[] = [
  { id: 'APP-001', openingId: 'JOB-001', name: 'Sneha Kulkarni', email: 'sneha.k@example.com', phone: '+91 98xxxx1201', stage: 'Interview', appliedAt: hoursAgo(60), rating: 4 },
  { id: 'APP-002', openingId: 'JOB-001', name: 'Rahul Verma',    email: 'rahul.v@example.com', phone: '+91 98xxxx1202', stage: 'Screening', appliedAt: hoursAgo(48) },
  { id: 'APP-003', openingId: 'JOB-002', name: 'Dr. Imran Sheikh', email: 'imran.s@example.com', phone: '+91 98xxxx1203', stage: 'Offer', appliedAt: hoursAgo(90), rating: 5 },
  { id: 'APP-004', openingId: 'JOB-002', name: 'Dr. Kavya Reddy',  email: 'kavya.r@example.com', phone: '+91 98xxxx1204', stage: 'Applied', appliedAt: hoursAgo(20) },
  { id: 'APP-005', openingId: 'JOB-003', name: 'Manish Patel',    email: 'manish.p@example.com', phone: '+91 98xxxx1205', stage: 'Rejected', appliedAt: hoursAgo(200) },
]

const SEED_ONBOARDING: OnboardingChecklist[] = [
  {
    id: 'ONB-001', staffId: 'NEW-9001', name: 'Divya Menon', role: 'Staff Nurse', startedAt: hoursAgo(36),
    tasks: DEFAULT_ONBOARDING_TASKS.map((label, i) => ({ label, done: i < 3 })),
  },
]

const SEED_CYCLES: AppraisalCycle[] = [
  { id: 'CYC-2026H1', name: 'Appraisal Cycle — H1 2026', period: 'Jan–Jun 2026', status: 'Active' },
]

const SEED_REVIEWS: Review[] = [
  { id: 'REV-001', cycleId: 'CYC-2026H1', staffId: 'DR-1012', staffName: 'Dr. Priya Nair', reviewer: 'Anita Rao', goals: 'OPD throughput, patient satisfaction ≥ 90%', strengths: 'Strong clinical judgment; mentors residents.', rating: 4, status: 'submitted', updatedAt: hoursAgo(30) },
  { id: 'REV-002', cycleId: 'CYC-2026H1', staffId: 'NR-402', staffName: 'Anjali Desai', reviewer: 'Anita Rao', goals: 'Zero medication errors; timely vitals', strengths: 'Reliable, excellent handovers.', rating: 5, status: 'draft', updatedAt: hoursAgo(5) },
]

const SEED_ATTENDANCE: AttendanceRecord[] = [
  { id: uid('att'), staffId: 'DR-1012', date: todayISO(), clockIn: '08:55', status: 'present' },
  { id: uid('att'), staffId: 'NR-402',  date: todayISO(), clockIn: '09:18', status: 'late' },
  { id: uid('att'), staffId: 'RAD-304', date: todayISO(), status: 'leave' },
]

export const useHrmsStore = create<HrmsState>()(persist((set) => ({
  attendance: SEED_ATTENDANCE,
  openings: SEED_OPENINGS,
  applicants: SEED_APPLICANTS,
  onboarding: SEED_ONBOARDING,
  cycles: SEED_CYCLES,
  reviews: SEED_REVIEWS,

  clockIn: (staffId) => set(s => {
    const existing = s.attendance.find(a => a.staffId === staffId && a.date === todayISO())
    if (existing) {
      return { attendance: s.attendance.map(a => a === existing ? { ...a, clockIn: a.clockIn ?? nowTime(), status: a.status === 'absent' || a.status === 'leave' ? 'present' : a.status } : a) }
    }
    return { attendance: [{ id: uid('att'), staffId, date: todayISO(), clockIn: nowTime(), status: 'present' }, ...s.attendance] }
  }),
  clockOut: (staffId) => set(s => ({
    attendance: s.attendance.map(a => a.staffId === staffId && a.date === todayISO() ? { ...a, clockOut: nowTime() } : a),
  })),
  setAttendance: (staffId, status) => set(s => {
    const existing = s.attendance.find(a => a.staffId === staffId && a.date === todayISO())
    if (existing) return { attendance: s.attendance.map(a => a === existing ? { ...a, status } : a) }
    return { attendance: [{ id: uid('att'), staffId, date: todayISO(), status }, ...s.attendance] }
  }),

  addOpening: (o) => set(s => ({
    openings: [{ id: uid('JOB'), status: 'Open', postedAt: new Date().toISOString(), ...o }, ...s.openings],
  })),
  addApplicant: (a) => set(s => ({
    applicants: [{ id: uid('APP'), stage: 'Applied', appliedAt: new Date().toISOString(), ...a }, ...s.applicants],
  })),
  moveApplicant: (id, stage) => set(s => ({
    applicants: s.applicants.map(a => a.id === id ? { ...a, stage } : a),
  })),

  startOnboarding: (input) => set(s => {
    if (s.onboarding.some(o => o.staffId === input.staffId)) return s
    return {
      onboarding: [{
        id: uid('ONB'), staffId: input.staffId, name: input.name, role: input.role,
        startedAt: new Date().toISOString(), tasks: DEFAULT_ONBOARDING_TASKS.map(label => ({ label, done: false })),
      }, ...s.onboarding],
    }
  }),
  toggleOnboardingTask: (checklistId, idx) => set(s => ({
    onboarding: s.onboarding.map(o => o.id === checklistId
      ? { ...o, tasks: o.tasks.map((t, i) => i === idx ? { ...t, done: !t.done } : t) }
      : o),
  })),

  addCycle: (input) => set(s => ({
    cycles: [{ id: uid('CYC'), name: input.name, period: input.period, status: 'Active' }, ...s.cycles],
  })),
  upsertReview: (input) => set(s => {
    if (input.id) {
      return { reviews: s.reviews.map(r => r.id === input.id ? { ...r, ...input, updatedAt: new Date().toISOString() } : r) }
    }
    return {
      reviews: [{ id: uid('REV'), status: 'draft', updatedAt: new Date().toISOString(), ...input }, ...s.reviews],
    }
  }),
  setReviewStatus: (id, status) => set(s => ({
    reviews: s.reviews.map(r => r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r),
  })),
}), {
  name: 'agentix-hrms', version: 1, storage: createJSONStorage(() => localStorage), skipHydration: true,
}))
