import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Role } from '@/types/roles'
import { useAuditStore } from './useAuditStore'

// ─────────────────────────────────────────────────────────────────────────
// Admin v2 / Phase 0 — Unified canonical HR store.
//
// One source of truth for every human in the hospital:
//   • Staff directory (replaces hardcoded USERS/MOCK_STAFF/DIRECTORY/STAT_DOCTORS)
//   • Shifts (compatible with existing roster page)
//   • Duty assignments (promoted out of local state in /admin/duty)
//   • Leave requests (existing, expanded with audit + decided-by)
//   • Swap requests (NEW)
//   • Sick calls + replacement workflow (NEW)
//   • Overtime entries (NEW)
//   • Shift templates (NEW)
//   • Payroll periods (NEW)
//   • Credentials & licence expiry (NEW)
//
// Every mutation emits to the audit trail (NABH HRM chapter).
// Persisted with `skipHydration: true` — same SSR-safe pattern used by other
// persisted stores in the project.
// ─────────────────────────────────────────────────────────────────────────

// ─── Branch concept ──────────────────────────────────────────────────────
export type BranchId = 'BRANCH_MAIN' | 'BRANCH_WHITEFIELD' | 'BRANCH_INDIRANAGAR'
export const DEFAULT_BRANCH: BranchId = 'BRANCH_MAIN'

export const BRANCH_LABEL: Record<BranchId, string> = {
  BRANCH_MAIN:        'Agentix HIMS — MG Road',
  BRANCH_WHITEFIELD:  'Agentix HIMS — Whitefield',
  BRANCH_INDIRANAGAR: 'Agentix HIMS — Indiranagar',
}

// ─── Enums ──────────────────────────────────────────────────────────────
export type ContractType = 'permanent' | 'visiting' | 'locum' | 'intern' | 'contract'
export type StaffStatus  = 'active' | 'on_leave' | 'suspended' | 'terminated' | 'inactive'
export type CredentialType =
  | 'MCI' | 'Nursing Council' | 'Pharmacist' | 'X-Ray Badge'
  | 'BLS' | 'ACLS' | 'PALS' | 'NRP'
  | 'Board Cert' | 'AERB' | 'Custom'
export type ShiftType = 'Morning' | 'Evening' | 'Night' | 'Off'

export const SHIFT_HOURS: Record<ShiftType, { start: string; end: string; hours: number }> = {
  Morning: { start: '06:00', end: '14:00', hours: 8 },
  Evening: { start: '14:00', end: '22:00', hours: 8 },
  Night:   { start: '22:00', end: '06:00', hours: 8 },
  Off:     { start: '',      end: '',      hours: 0 },
}

// ─── Core types ──────────────────────────────────────────────────────────
export interface Credential {
  id: string
  type: CredentialType
  label: string                // human-readable label (e.g., "Medical Council Reg.")
  number: string               // registration / licence number
  issuedDate: string           // ISO YYYY-MM-DD
  expiryDate: string           // ISO YYYY-MM-DD
  attachmentUrl?: string       // stub for uploaded doc
}

export interface StaffMember {
  id: string                   // login ID — matches useAuthStore.currentUser.id
  employeeId: string           // HR-issued employee number (e.g., EMP-2026-0042)
  name: string
  email: string
  phone: string
  role: Role
  department: string
  designation: string          // e.g., 'Consultant', 'Senior Resident', 'Staff Nurse'
  branchId: BranchId
  joiningDate: string          // ISO date
  contractType: ContractType
  status: StaffStatus
  reportsTo?: string           // staff id of supervisor
  credentials: Credential[]
  lastLoginAt?: string
  notes?: string
  monthlyRate?: number         // base monthly pay for payroll preview
  hourlyOTRate?: number        // overtime rate per hour
}

export interface ShiftEntry {
  staffId: string
  date: string                 // YYYY-MM-DD
  shift: ShiftType
  present?: boolean
}

export interface LeaveRequest {
  id: string
  staffId: string
  staffName: string
  department: string
  fromDate: string
  toDate: string
  reason: string
  status: 'Pending' | 'Approved' | 'Rejected'
  requestedAt: string
  decidedBy?: string
  decidedAt?: string
}

export interface DutyAssignment {
  id: string
  staffId: string
  date: string
  shift: ShiftType
  ward: string
  assignedBy?: string
  assignedAt: string
  notes?: string
}

export interface SwapRequest {
  id: string
  requesterId: string
  requesterDate: string
  requesterShift: ShiftType
  targetId: string
  targetDate: string
  targetShift: ShiftType
  status: 'pending_peer' | 'pending_admin' | 'approved' | 'rejected'
  peerRespondedAt?: string
  adminDecidedBy?: string
  adminDecidedAt?: string
  reason?: string
  requestedAt: string
}

export interface SickCall {
  id: string
  staffId: string
  staffName: string
  date: string
  shift: ShiftType
  ward?: string
  expectedReturn: string
  reason: string
  replacedBy?: string
  status: 'open' | 'replaced' | 'closed'
  reportedAt: string
}

export interface OvertimeEntry {
  id: string
  staffId: string
  date: string
  hours: number
  reason: string
  approved: boolean
  loggedAt: string
}

export interface ShiftTemplate {
  id: string
  name: string                 // e.g., '5-on / 2-off Morning'
  pattern: ShiftType[]         // length 7 for a weekly pattern
  description?: string
  createdBy?: string
  createdAt: string
}

export interface PayrollPeriod {
  id: string
  from: string
  to: string
  closedBy: string
  closedAt: string
  totalGross: number
  totalNet: number
  staffCount: number
}

// Per-department minimum + ideal headcount per shift. Drives coverage gauges,
// auto-escalation, and the "Suggested duty pairings" engine.
export interface DeptMinimum {
  department: string
  min: number             // hard minimum — below = critical breach
  ideal: number           // amber..green transition
  roles: Role[]           // expected role mix (e.g., doctor + nurse for ICU)
  perShift: boolean       // if true, applies per shift; if false, daily aggregate
}

// ─── Helpers ─────────────────────────────────────────────────────────────
const isoDay = (d: Date) => d.toISOString().split('T')[0]!
const dayOffset = (offsetDays: number) => {
  const d = new Date(); d.setDate(d.getDate() + offsetDays); return isoDay(d)
}
const daysBetween = (from: string, to: string) => {
  return Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000)
}
const today = () => isoDay(new Date())

let _seedSeq = 0
const seedId = (p: string) => `${p}-${++_seedSeq}`

// ─── Canonical staff seed ────────────────────────────────────────────────
// Merges every previously-hardcoded staff identity into one canonical list.
// IDs match useAuthStore.DEMO_USERS so login flows still resolve correctly.

const SEED_STAFF: StaffMember[] = [
  // ── Doctors (Clinical leadership) ───────────────────────────────────
  {
    id: 'DR-1012', employeeId: 'EMP-2018-0012',
    name: 'Dr. Priya Nair', email: 'priya.nair@agentix.in', phone: '+91 98450 11012',
    role: 'doctor', department: 'General Medicine', designation: 'Consultant Physician',
    branchId: DEFAULT_BRANCH, joiningDate: '2018-04-15',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'MCI', label: 'Medical Council Reg.', number: 'KMC-2014-78321',
        issuedDate: '2014-06-10', expiryDate: '2029-06-10' },
      { id: seedId('CR'), type: 'BLS', label: 'Basic Life Support',   number: 'BLS-2025-A-1342',
        issuedDate: '2025-01-15', expiryDate: '2027-01-15' },
    ],
    monthlyRate: 180000, hourlyOTRate: 1200, lastLoginAt: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: 'DR-1013', employeeId: 'EMP-2019-0013',
    name: 'Dr. Rohan Mehta', email: 'rohan.mehta@agentix.in', phone: '+91 98450 11013',
    role: 'doctor', department: 'Cardiology', designation: 'Senior Consultant — Cardiology',
    branchId: DEFAULT_BRANCH, joiningDate: '2019-08-01',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'MCI', label: 'Medical Council Reg.', number: 'KMC-2008-44518',
        issuedDate: '2008-09-12', expiryDate: '2028-09-12' },
      { id: seedId('CR'), type: 'ACLS', label: 'Advanced Cardiac Life Support', number: 'ACLS-2024-B-771',
        issuedDate: '2024-03-10', expiryDate: '2026-09-10' },
      { id: seedId('CR'), type: 'Board Cert', label: 'DM Cardiology', number: 'DM-2008-1142',
        issuedDate: '2008-07-01', expiryDate: '2099-12-31' },
    ],
    monthlyRate: 320000, hourlyOTRate: 2200,
  },
  {
    id: 'DR-1014', employeeId: 'EMP-2020-0014',
    name: 'Dr. Ananya Iyer', email: 'ananya.iyer@agentix.in', phone: '+91 98450 11014',
    role: 'doctor', department: 'Dermatology', designation: 'Consultant Dermatologist',
    branchId: DEFAULT_BRANCH, joiningDate: '2020-02-20',
    contractType: 'visiting', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'MCI', label: 'Medical Council Reg.', number: 'KMC-2012-66201',
        issuedDate: '2012-10-15', expiryDate: '2027-10-15' },
      { id: seedId('CR'), type: 'BLS', label: 'Basic Life Support', number: 'BLS-2024-A-2008',
        issuedDate: '2024-05-01', expiryDate: '2026-05-01' },
    ],
    monthlyRate: 150000,
  },
  {
    id: 'DR-1015', employeeId: 'EMP-2017-0015',
    name: 'Dr. Vikram Rathore', email: 'vikram.rathore@agentix.in', phone: '+91 98450 11015',
    role: 'emergency', department: 'Emergency Room', designation: 'Senior Consultant — Emergency Medicine',
    branchId: DEFAULT_BRANCH, joiningDate: '2017-03-10',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'MCI', label: 'Medical Council Reg.', number: 'KMC-2010-55211',
        issuedDate: '2010-07-22', expiryDate: '2030-07-22' },
      { id: seedId('CR'), type: 'ACLS', label: 'Advanced Cardiac Life Support', number: 'ACLS-2025-A-099',
        issuedDate: '2025-02-12', expiryDate: '2027-02-12' },
      { id: seedId('CR'), type: 'Custom', label: 'Advanced Trauma Life Support', number: 'ATLS-2024-321',
        issuedDate: '2024-06-01', expiryDate: '2026-06-01' },
    ],
    monthlyRate: 280000, hourlyOTRate: 1900,
  },
  {
    id: 'ER-110', employeeId: 'EMP-2017-0015', // same person as DR-1015 in older code; alias collapsed
    name: 'Dr. Vikram Rathore', email: 'vikram.rathore@agentix.in', phone: '+91 98450 11015',
    role: 'emergency', department: 'Emergency Room', designation: 'Senior Consultant — Emergency Medicine',
    branchId: DEFAULT_BRANCH, joiningDate: '2017-03-10',
    contractType: 'permanent', status: 'active',
    credentials: [],
    notes: 'Alias of DR-1015 — to be deduped in Phase 1 cleanup',
  },
  {
    id: 'ER-111', employeeId: 'EMP-2021-0111',
    name: 'Dr. Neha Singh', email: 'neha.singh@agentix.in', phone: '+91 98450 21111',
    role: 'emergency', department: 'Emergency Room', designation: 'Consultant — Emergency Medicine',
    branchId: DEFAULT_BRANCH, joiningDate: '2021-11-04',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'MCI', label: 'Medical Council Reg.', number: 'KMC-2016-72119',
        issuedDate: '2016-05-08', expiryDate: '2026-08-15' },  // expiring soon — for credential alert demo
      { id: seedId('CR'), type: 'ACLS', label: 'Advanced Cardiac Life Support', number: 'ACLS-2024-B-455',
        issuedDate: '2024-09-21', expiryDate: '2026-03-21' },
    ],
    monthlyRate: 210000, hourlyOTRate: 1500,
  },
  {
    id: 'OT-901', employeeId: 'EMP-2016-0901',
    name: 'Dr. Anisha Sharma', email: 'anisha.sharma@agentix.in', phone: '+91 98450 70901',
    role: 'ot', department: 'Operation Theater', designation: 'Senior Consultant — Surgery',
    branchId: DEFAULT_BRANCH, joiningDate: '2016-09-18',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'MCI', label: 'Medical Council Reg.', number: 'KMC-2005-32108',
        issuedDate: '2005-12-04', expiryDate: '2028-12-04' },
      { id: seedId('CR'), type: 'Board Cert', label: 'MS General Surgery', number: 'MS-2005-882',
        issuedDate: '2005-11-15', expiryDate: '2099-12-31' },
    ],
    monthlyRate: 360000, hourlyOTRate: 2500,
  },
  {
    id: 'RAD-304', employeeId: 'EMP-2019-0304',
    name: 'Dr. Sameer Khan', email: 'sameer.khan@agentix.in', phone: '+91 98450 30304',
    role: 'radiology', department: 'Radiology', designation: 'Senior Consultant — Radiology',
    branchId: DEFAULT_BRANCH, joiningDate: '2019-04-22',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'MCI', label: 'Medical Council Reg.', number: 'KMC-2011-44871',
        issuedDate: '2011-08-18', expiryDate: '2031-08-18' },
      { id: seedId('CR'), type: 'AERB', label: 'AERB X-Ray Operator', number: 'AERB-RAD-2024-1102',
        issuedDate: '2024-06-15', expiryDate: '2026-06-15' },
    ],
    monthlyRate: 290000, hourlyOTRate: 2000,
  },
  {
    id: 'LP-201', employeeId: 'EMP-2014-0201',
    name: 'Dr. Asha Rao', email: 'asha.rao@agentix.in', phone: '+91 98450 20201',
    role: 'lab', department: 'Pathology', designation: 'Consultant Pathologist',
    branchId: DEFAULT_BRANCH, joiningDate: '2014-07-08',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'MCI', label: 'Medical Council Reg.', number: 'KMC-2003-21008',
        issuedDate: '2003-09-12', expiryDate: '2028-09-12' },
      { id: seedId('CR'), type: 'Board Cert', label: 'MD Pathology', number: 'MD-2003-512',
        issuedDate: '2003-06-22', expiryDate: '2099-12-31' },
    ],
    monthlyRate: 245000,
  },

  // ── Nurses ──────────────────────────────────────────────────────────
  {
    id: 'NR-402', employeeId: 'EMP-2019-0402',
    name: 'Anjali Desai', email: 'anjali.desai@agentix.in', phone: '+91 98450 40402',
    role: 'nurse', department: 'Cardiac Care', designation: 'Senior Staff Nurse',
    branchId: DEFAULT_BRANCH, joiningDate: '2019-07-12',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'Nursing Council', label: 'KNMC Reg.', number: 'KNMC-2017-08821',
        issuedDate: '2017-04-15', expiryDate: '2027-04-15' },
      { id: seedId('CR'), type: 'BLS', label: 'Basic Life Support', number: 'BLS-2024-N-2231',
        issuedDate: '2024-08-12', expiryDate: '2026-08-12' },
    ],
    monthlyRate: 38000, hourlyOTRate: 280,
  },
  {
    id: 'NR-403', employeeId: 'EMP-2020-0403',
    name: 'Pooja Shetty', email: 'pooja.shetty@agentix.in', phone: '+91 98450 40403',
    role: 'nurse', department: 'ICU', designation: 'ICU Staff Nurse',
    branchId: DEFAULT_BRANCH, joiningDate: '2020-01-19',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'Nursing Council', label: 'KNMC Reg.', number: 'KNMC-2018-09102',
        issuedDate: '2018-06-22', expiryDate: '2028-06-22' },
      { id: seedId('CR'), type: 'BLS', label: 'Basic Life Support', number: 'BLS-2025-N-1099',
        issuedDate: '2025-01-08', expiryDate: '2027-01-08' },
      { id: seedId('CR'), type: 'ACLS', label: 'Advanced Cardiac Life Support', number: 'ACLS-2025-N-201',
        issuedDate: '2025-02-04', expiryDate: '2027-02-04' },
    ],
    monthlyRate: 45000, hourlyOTRate: 350,
  },
  {
    id: 'NR-404', employeeId: 'EMP-2021-0404',
    name: 'Ramesh Rao', email: 'ramesh.rao@agentix.in', phone: '+91 98450 40404',
    role: 'nurse', department: 'General Ward', designation: 'Staff Nurse',
    branchId: DEFAULT_BRANCH, joiningDate: '2021-03-15',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'Nursing Council', label: 'KNMC Reg.', number: 'KNMC-2019-11331',
        issuedDate: '2019-08-04', expiryDate: '2029-08-04' },
      { id: seedId('CR'), type: 'BLS', label: 'Basic Life Support', number: 'BLS-2024-N-3322',
        issuedDate: '2024-10-15', expiryDate: '2026-10-15' },
    ],
    monthlyRate: 35000, hourlyOTRate: 260,
  },
  {
    id: 'NR-410', employeeId: 'EMP-2018-0410',
    name: 'Lakshmi Iyer', email: 'lakshmi.iyer@agentix.in', phone: '+91 98450 40410',
    role: 'nurse', department: 'Maternity', designation: 'Senior Staff Nurse — Maternity',
    branchId: DEFAULT_BRANCH, joiningDate: '2018-11-22',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'Nursing Council', label: 'KNMC Reg.', number: 'KNMC-2016-04781',
        issuedDate: '2016-09-15', expiryDate: '2026-09-15' },
      { id: seedId('CR'), type: 'NRP', label: 'Neonatal Resuscitation', number: 'NRP-2024-N-018',
        issuedDate: '2024-04-19', expiryDate: '2026-04-19' },
    ],
    monthlyRate: 41000,
  },
  {
    id: 'NR-501', employeeId: 'EMP-2020-0501',
    name: 'Anjali Pillai', email: 'anjali.pillai@agentix.in', phone: '+91 98450 50501',
    role: 'nurse', department: 'Emergency Room', designation: 'Triage Nurse',
    branchId: DEFAULT_BRANCH, joiningDate: '2020-05-30',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'Nursing Council', label: 'KNMC Reg.', number: 'KNMC-2018-09455',
        issuedDate: '2018-07-09', expiryDate: '2028-07-09' },
      { id: seedId('CR'), type: 'BLS', label: 'Basic Life Support', number: 'BLS-2024-N-4001',
        issuedDate: '2024-11-19', expiryDate: '2026-11-19' },
      { id: seedId('CR'), type: 'ACLS', label: 'Advanced Cardiac Life Support', number: 'ACLS-2024-N-552',
        issuedDate: '2024-12-01', expiryDate: '2026-06-01' },  // 2 weeks
    ],
    monthlyRate: 39000, hourlyOTRate: 290,
  },

  // ── Pharmacy ────────────────────────────────────────────────────────
  {
    id: 'PH-301', employeeId: 'EMP-2018-0301',
    name: 'Ritu Sharma', email: 'ritu.sharma@agentix.in', phone: '+91 98450 30301',
    role: 'pharmacy', department: 'Pharmacy', designation: 'Senior Pharmacist',
    branchId: DEFAULT_BRANCH, joiningDate: '2018-02-12',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'Pharmacist', label: 'Karnataka Pharmacy Council', number: 'KPC-2015-44218',
        issuedDate: '2015-07-15', expiryDate: '2029-07-15' },
    ],
    monthlyRate: 42000, hourlyOTRate: 300,
  },
  {
    id: 'PH-302', employeeId: 'EMP-2019-0302',
    name: 'Anil Kumar', email: 'anil.kumar@agentix.in', phone: '+91 98450 30302',
    role: 'pharmacy', department: 'Pharmacy', designation: 'Pharmacist',
    branchId: DEFAULT_BRANCH, joiningDate: '2019-10-08',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'Pharmacist', label: 'Karnataka Pharmacy Council', number: 'KPC-2016-66301',
        issuedDate: '2016-11-22', expiryDate: '2026-11-22' },
    ],
    monthlyRate: 36000, hourlyOTRate: 270,
  },

  // ── Lab ─────────────────────────────────────────────────────────────
  {
    id: 'LB-992', employeeId: 'EMP-2017-0992',
    name: 'Neha Gupta', email: 'neha.gupta@agentix.in', phone: '+91 98450 99992',
    role: 'lab', department: 'Pathology', designation: 'Senior Lab Technician',
    branchId: DEFAULT_BRANCH, joiningDate: '2017-08-30',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'Custom', label: 'DMLT Certification', number: 'DMLT-2014-8821',
        issuedDate: '2014-08-15', expiryDate: '2099-12-31' },
    ],
    monthlyRate: 34000, hourlyOTRate: 250,
  },
  {
    id: 'LT-101', employeeId: 'EMP-2020-1101',
    name: 'Ravi Menon', email: 'ravi.menon@agentix.in', phone: '+91 98450 10101',
    role: 'lab', department: 'Pathology', designation: 'Lab Technician',
    branchId: DEFAULT_BRANCH, joiningDate: '2020-06-04',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'Custom', label: 'DMLT Certification', number: 'DMLT-2018-9921',
        issuedDate: '2018-07-22', expiryDate: '2099-12-31' },
    ],
    monthlyRate: 31000,
  },
  {
    id: 'LT-102', employeeId: 'EMP-2021-1102',
    name: 'Shalu Iyer', email: 'shalu.iyer@agentix.in', phone: '+91 98450 10102',
    role: 'lab', department: 'Pathology', designation: 'Lab Technician',
    branchId: DEFAULT_BRANCH, joiningDate: '2021-02-15',
    contractType: 'permanent', status: 'active',
    credentials: [],
    monthlyRate: 29000,
  },
  {
    id: 'LT-103', employeeId: 'EMP-2022-1103',
    name: 'Biju Verma', email: 'biju.verma@agentix.in', phone: '+91 98450 10103',
    role: 'lab', department: 'Microbiology', designation: 'Microbiologist',
    branchId: DEFAULT_BRANCH, joiningDate: '2022-04-11',
    contractType: 'permanent', status: 'active',
    credentials: [],
    monthlyRate: 38000,
  },

  // ── Radiology techs ─────────────────────────────────────────────────
  {
    id: 'RT-101', employeeId: 'EMP-2020-2101',
    name: 'Ravi Bose', email: 'ravi.bose@agentix.in', phone: '+91 98450 21101',
    role: 'radiology', department: 'Radiology', designation: 'X-Ray Technologist',
    branchId: DEFAULT_BRANCH, joiningDate: '2020-09-18',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'AERB', label: 'AERB X-Ray Operator', number: 'AERB-RT-2024-2101',
        issuedDate: '2024-09-01', expiryDate: '2026-09-01' },
    ],
    monthlyRate: 32000,
  },
  {
    id: 'RT-102', employeeId: 'EMP-2021-2102',
    name: 'Babita Joshi', email: 'babita.joshi@agentix.in', phone: '+91 98450 21102',
    role: 'radiology', department: 'Radiology', designation: 'CT Technologist',
    branchId: DEFAULT_BRANCH, joiningDate: '2021-05-08',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'AERB', label: 'AERB CT Operator', number: 'AERB-RT-2024-2102',
        issuedDate: '2024-10-12', expiryDate: '2026-10-12' },
    ],
    monthlyRate: 36000,
  },

  // ── Operations roles ────────────────────────────────────────────────
  {
    id: 'RC-204', employeeId: 'EMP-2019-0204',
    name: 'Sunita Joshi', email: 'sunita.joshi@agentix.in', phone: '+91 98450 20204',
    role: 'reception', department: 'Front Desk', designation: 'Senior Receptionist',
    branchId: DEFAULT_BRANCH, joiningDate: '2019-01-22',
    contractType: 'permanent', status: 'active',
    credentials: [],
    monthlyRate: 28000,
  },
  {
    id: 'BM-601', employeeId: 'EMP-2018-0601',
    name: 'Aditi Verma', email: 'aditi.verma@agentix.in', phone: '+91 98450 60601',
    role: 'bed_manager', department: 'Admission Desk', designation: 'Bed Manager',
    branchId: DEFAULT_BRANCH, joiningDate: '2018-10-15',
    contractType: 'permanent', status: 'active',
    credentials: [],
    monthlyRate: 38000,
  },
  {
    id: 'DC-701', employeeId: 'EMP-2017-0701',
    name: 'Meena Agarwal', email: 'meena.agarwal@agentix.in', phone: '+91 98450 70701',
    role: 'discharge', department: 'Discharge Desk', designation: 'Discharge Coordinator',
    branchId: DEFAULT_BRANCH, joiningDate: '2017-12-08',
    contractType: 'permanent', status: 'active',
    credentials: [],
    monthlyRate: 36000,
  },

  // ── Finance roles ───────────────────────────────────────────────────
  {
    id: 'BL-801', employeeId: 'EMP-2018-0801',
    name: 'Suresh Nair', email: 'suresh.nair@agentix.in', phone: '+91 98450 80801',
    role: 'billing', department: 'Billing', designation: 'Senior Billing Officer',
    branchId: DEFAULT_BRANCH, joiningDate: '2018-06-15',
    contractType: 'permanent', status: 'active',
    credentials: [],
    monthlyRate: 42000,
  },
  {
    id: 'INS-011', employeeId: 'EMP-2019-0011',
    name: 'Karan Patel', email: 'karan.patel@agentix.in', phone: '+91 98450 00011',
    role: 'insurance', department: 'TPA Desk', designation: 'Insurance Coordinator',
    branchId: DEFAULT_BRANCH, joiningDate: '2019-11-25',
    contractType: 'permanent', status: 'active',
    credentials: [],
    monthlyRate: 40000,
  },
  {
    id: 'BL-2001', employeeId: 'EMP-2020-2001',
    name: 'Asha Reddy', email: 'asha.reddy@agentix.in', phone: '+91 98450 02001',
    role: 'billing', department: 'Billing', designation: 'Billing Officer',
    branchId: DEFAULT_BRANCH, joiningDate: '2020-03-12',
    contractType: 'permanent', status: 'active',
    credentials: [],
    monthlyRate: 34000,
  },

  // ── Management ──────────────────────────────────────────────────────
  {
    id: 'ADM-01', employeeId: 'EMP-2012-0001',
    name: 'Rajesh Kulkarni', email: 'rajesh.kulkarni@agentix.in', phone: '+91 98450 00001',
    role: 'admin', department: 'Administration', designation: 'Chief Operating Officer',
    branchId: DEFAULT_BRANCH, joiningDate: '2012-04-01',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'Custom', label: 'MHA — Health Administration', number: 'MHA-2010-002',
        issuedDate: '2010-06-15', expiryDate: '2099-12-31' },
    ],
    monthlyRate: 380000, hourlyOTRate: 2500,
  },
  {
    id: 'QA-1101', employeeId: 'EMP-2015-1101',
    name: 'Dr. Lalitha Iyer', email: 'lalitha.iyer@agentix.in', phone: '+91 98450 11011',
    role: 'quality', department: 'Quality & Compliance', designation: 'Quality Manager',
    branchId: DEFAULT_BRANCH, joiningDate: '2015-08-12',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'MCI', label: 'Medical Council Reg.', number: 'KMC-2007-33218',
        issuedDate: '2007-09-08', expiryDate: '2027-09-08' },
      { id: seedId('CR'), type: 'Custom', label: 'NABH Assessor Cert', number: 'NABH-A-2024-145',
        issuedDate: '2024-03-15', expiryDate: '2027-03-15' },
    ],
    monthlyRate: 195000,
  },
  {
    id: 'AU-1801', employeeId: 'EMP-2016-1801',
    name: 'Preethi Krishnan', email: 'preethi.krishnan@agentix.in', phone: '+91 98450 18001',
    role: 'audit_officer', department: 'Audit & Compliance', designation: 'Audit Officer',
    branchId: DEFAULT_BRANCH, joiningDate: '2016-02-19',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'Custom', label: 'CISA Audit Cert', number: 'CISA-2018-201',
        issuedDate: '2018-06-22', expiryDate: '2099-12-31' },
    ],
    monthlyRate: 95000,
  },

  // ── Support services ───────────────────────────────────────────────
  {
    id: 'BB-1201', employeeId: 'EMP-2016-1201',
    name: 'Dr. Pooja Srivastava', email: 'pooja.srivastava@agentix.in', phone: '+91 98450 12001',
    role: 'blood_bank', department: 'Blood Bank', designation: 'Transfusion Medicine Officer',
    branchId: DEFAULT_BRANCH, joiningDate: '2016-07-08',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'MCI', label: 'Medical Council Reg.', number: 'KMC-2009-46218',
        issuedDate: '2009-09-15', expiryDate: '2029-09-15' },
      { id: seedId('CR'), type: 'Custom', label: 'Blood Bank Drug Licence', number: 'BB-2024-001',
        issuedDate: '2024-04-10', expiryDate: '2026-04-10' },  // <1y
    ],
    monthlyRate: 145000,
  },
  {
    id: 'CS-1301', employeeId: 'EMP-2019-1301',
    name: 'Shalini Mehta', email: 'shalini.mehta@agentix.in', phone: '+91 98450 13001',
    role: 'cssd', department: 'CSSD', designation: 'CSSD Manager',
    branchId: DEFAULT_BRANCH, joiningDate: '2019-05-14',
    contractType: 'permanent', status: 'active',
    credentials: [],
    monthlyRate: 48000,
  },
  {
    id: 'DT-1401', employeeId: 'EMP-2020-1401',
    name: 'Nalini Bose', email: 'nalini.bose@agentix.in', phone: '+91 98450 14001',
    role: 'dietary', department: 'Dietary & Nutrition', designation: 'Chief Dietitian',
    branchId: DEFAULT_BRANCH, joiningDate: '2020-02-08',
    contractType: 'permanent', status: 'active',
    credentials: [
      { id: seedId('CR'), type: 'Custom', label: 'Registered Dietitian (IDA)', number: 'IDA-2014-5523',
        issuedDate: '2014-08-15', expiryDate: '2099-12-31' },
    ],
    monthlyRate: 52000,
  },
  {
    id: 'BW-1501', employeeId: 'EMP-2018-1501',
    name: 'Ganesh Rao', email: 'ganesh.rao@agentix.in', phone: '+91 98450 15001',
    role: 'bmw', department: 'Bio-Medical Waste', designation: 'BMW Officer',
    branchId: DEFAULT_BRANCH, joiningDate: '2018-04-22',
    contractType: 'permanent', status: 'active',
    credentials: [],
    monthlyRate: 31000,
  },
  {
    id: 'MT-1601', employeeId: 'EMP-2017-1601',
    name: 'Shyam Tiwari', email: 'shyam.tiwari@agentix.in', phone: '+91 98450 16001',
    role: 'mortuary', department: 'Mortuary', designation: 'Mortuary Officer',
    branchId: DEFAULT_BRANCH, joiningDate: '2017-11-30',
    contractType: 'permanent', status: 'active',
    credentials: [],
    monthlyRate: 32000,
  },
  {
    id: 'AM-1701', employeeId: 'EMP-2019-1701',
    name: 'Deepak Pandey', email: 'deepak.pandey@agentix.in', phone: '+91 98450 17001',
    role: 'ambulance', department: 'Ambulance Services', designation: 'Ambulance Coordinator',
    branchId: DEFAULT_BRANCH, joiningDate: '2019-08-12',
    contractType: 'permanent', status: 'active',
    credentials: [],
    monthlyRate: 35000,
  },
  {
    id: 'HK-1001', employeeId: 'EMP-2020-1001',
    name: 'Ramesh Kumar', email: 'ramesh.kumar@agentix.in', phone: '+91 98450 10001',
    role: 'housekeeping', department: 'Housekeeping', designation: 'Housekeeping Supervisor',
    branchId: DEFAULT_BRANCH, joiningDate: '2020-07-19',
    contractType: 'permanent', status: 'active',
    credentials: [],
    monthlyRate: 24000,
  },
  {
    id: 'INV-550', employeeId: 'EMP-2018-0550',
    name: 'Vikram Singh', email: 'vikram.singh@agentix.in', phone: '+91 98450 50550',
    role: 'inventory', department: 'Procurement', designation: 'Inventory Manager',
    branchId: DEFAULT_BRANCH, joiningDate: '2018-09-04',
    contractType: 'permanent', status: 'active',
    credentials: [],
    monthlyRate: 56000,
  },
]

// Shift pattern indexed by staff order — different roles get different patterns.
const PATTERN_DOCTOR:    ShiftType[] = ['Morning', 'Morning', 'Evening', 'Off', 'Morning', 'Morning', 'Off']
const PATTERN_NURSE_A:   ShiftType[] = ['Morning', 'Morning', 'Off', 'Night', 'Night', 'Off', 'Evening']
const PATTERN_NURSE_B:   ShiftType[] = ['Evening', 'Evening', 'Off', 'Morning', 'Morning', 'Night', 'Off']
const PATTERN_OPS:       ShiftType[] = ['Morning', 'Morning', 'Morning', 'Morning', 'Morning', 'Off', 'Off']
const PATTERN_SUPPORT:   ShiftType[] = ['Morning', 'Evening', 'Morning', 'Off', 'Morning', 'Evening', 'Off']

function patternFor(member: StaffMember, idx: number): ShiftType[] {
  if (member.role === 'doctor' || member.role === 'emergency' || member.role === 'radiology' || member.role === 'ot' || member.role === 'admin' || member.role === 'quality' || member.role === 'blood_bank') return PATTERN_DOCTOR
  if (member.role === 'nurse') return idx % 2 === 0 ? PATTERN_NURSE_A : PATTERN_NURSE_B
  if (member.role === 'reception' || member.role === 'bed_manager' || member.role === 'discharge' || member.role === 'billing' || member.role === 'insurance' || member.role === 'inventory' || member.role === 'audit_officer') return PATTERN_OPS
  return PATTERN_SUPPORT
}

const SEED_SHIFTS: ShiftEntry[] = SEED_STAFF.flatMap((member, mi) => {
  const pattern = patternFor(member, mi)
  // 28-day rolling window: -7..+20
  return Array.from({ length: 28 }, (_, offsetIdx) => {
    const offset = offsetIdx - 7
    const date = dayOffset(offset)
    const shift = pattern[((offset % 7) + 7) % 7]!
    return { staffId: member.id, date, shift }
  })
})

const SEED_LEAVES: LeaveRequest[] = [
  {
    id: seedId('LV'), staffId: 'NR-404', staffName: 'Ramesh Rao', department: 'General Ward',
    fromDate: dayOffset(2), toDate: dayOffset(4),
    reason: 'Personal — family function', status: 'Pending',
    requestedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: seedId('LV'), staffId: 'LB-992', staffName: 'Neha Gupta', department: 'Pathology',
    fromDate: dayOffset(5), toDate: dayOffset(6),
    reason: 'Medical leave', status: 'Pending',
    requestedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: seedId('LV'), staffId: 'DR-1014', staffName: 'Dr. Ananya Iyer', department: 'Dermatology',
    fromDate: dayOffset(7), toDate: dayOffset(9),
    reason: 'Attending dermatology conference (Mumbai)', status: 'Approved',
    requestedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    decidedBy: 'ADM-01', decidedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
]

const SEED_DUTY: DutyAssignment[] = [
  { id: seedId('DU'), staffId: 'DR-1012', date: today(), shift: 'Morning', ward: 'General Ward', assignedBy: 'ADM-01', assignedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: seedId('DU'), staffId: 'DR-1015', date: today(), shift: 'Morning', ward: 'Emergency',     assignedBy: 'ADM-01', assignedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: seedId('DU'), staffId: 'DR-1013', date: today(), shift: 'Morning', ward: 'Cardiology',    assignedBy: 'ADM-01', assignedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: seedId('DU'), staffId: 'NR-402',  date: today(), shift: 'Morning', ward: 'General Ward',  assignedBy: 'ADM-01', assignedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: seedId('DU'), staffId: 'NR-403',  date: today(), shift: 'Morning', ward: 'ICU',           assignedBy: 'ADM-01', assignedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: seedId('DU'), staffId: 'NR-404',  date: today(), shift: 'Evening', ward: 'General Ward',  assignedBy: 'ADM-01', assignedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: seedId('DU'), staffId: 'NR-410',  date: today(), shift: 'Morning', ward: 'Maternity',     assignedBy: 'ADM-01', assignedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: seedId('DU'), staffId: 'NR-501',  date: today(), shift: 'Morning', ward: 'Emergency',     assignedBy: 'ADM-01', assignedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: seedId('DU'), staffId: 'PH-301',  date: today(), shift: 'Morning', ward: 'Pharmacy',      assignedBy: 'ADM-01', assignedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: seedId('DU'), staffId: 'LB-992',  date: today(), shift: 'Morning', ward: 'Pathology',     assignedBy: 'ADM-01', assignedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: seedId('DU'), staffId: 'RAD-304', date: today(), shift: 'Morning', ward: 'Radiology',     assignedBy: 'ADM-01', assignedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
]

// Default dept minimums — migrated from /admin/staffing hardcoded list.
// Edit via /admin/coverage UI (Phase 3 M3.1).
const SEED_DEPT_MINIMUMS: DeptMinimum[] = [
  { department: 'Emergency Room',  min: 2, ideal: 4, roles: ['emergency', 'nurse'], perShift: true },
  { department: 'ICU',             min: 3, ideal: 5, roles: ['doctor', 'nurse'], perShift: true },
  { department: 'Cardiac Care',    min: 2, ideal: 4, roles: ['doctor', 'nurse'], perShift: true },
  { department: 'General Ward',    min: 2, ideal: 4, roles: ['nurse'], perShift: true },
  { department: 'Maternity',       min: 2, ideal: 3, roles: ['nurse'], perShift: true },
  { department: 'Operation Theater', min: 1, ideal: 2, roles: ['ot'], perShift: true },
  { department: 'Radiology',       min: 1, ideal: 2, roles: ['radiology'], perShift: false },
  { department: 'Pathology',       min: 1, ideal: 2, roles: ['lab'], perShift: false },
  { department: 'Microbiology',    min: 1, ideal: 1, roles: ['lab'], perShift: false },
  { department: 'Pharmacy',        min: 1, ideal: 2, roles: ['pharmacy'], perShift: false },
  { department: 'General Medicine', min: 1, ideal: 2, roles: ['doctor'], perShift: false },
  { department: 'Blood Bank',      min: 1, ideal: 1, roles: ['blood_bank'], perShift: false },
]

const SEED_TEMPLATES: ShiftTemplate[] = [
  { id: 'TMPL-1', name: '5-on / 2-off Morning', pattern: ['Morning','Morning','Morning','Morning','Morning','Off','Off'],
    description: 'Standard administrative pattern', createdBy: 'ADM-01', createdAt: '2026-01-15T09:00:00Z' },
  { id: 'TMPL-2', name: '4-on / 4-off Day-Night', pattern: ['Morning','Morning','Night','Night','Off','Off','Off'],
    description: 'Critical-care rotating pattern', createdBy: 'ADM-01', createdAt: '2026-01-15T09:00:00Z' },
  { id: 'TMPL-3', name: 'Alternating Morning / Evening', pattern: ['Morning','Evening','Morning','Evening','Morning','Off','Off'],
    description: 'OPD doctor pattern', createdBy: 'ADM-01', createdAt: '2026-01-15T09:00:00Z' },
]

// ─── Store interface ────────────────────────────────────────────────────
interface HRState {
  staff: StaffMember[]
  shifts: ShiftEntry[]
  leaveRequests: LeaveRequest[]
  dutyAssignments: DutyAssignment[]
  swapRequests: SwapRequest[]
  sickCalls: SickCall[]
  overtimeEntries: OvertimeEntry[]
  shiftTemplates: ShiftTemplate[]
  payrollPeriods: PayrollPeriod[]
  deptMinimums: DeptMinimum[]

  // ── Staff CRUD ────────────────────────────────────────────────────────
  addStaff: (input: Omit<StaffMember, 'id' | 'employeeId'>, actorName: string) => string
  updateStaff: (id: string, patch: Partial<StaffMember>, actorName: string) => void
  deactivateStaff: (id: string, reason: string, actorName: string) => void
  reactivateStaff: (id: string, actorName: string) => void
  terminateStaff: (id: string, reason: string, actorName: string) => void
  addCredential: (staffId: string, cred: Omit<Credential, 'id'>, actorName: string) => void
  removeCredential: (staffId: string, credId: string, actorName: string) => void
  renewCredential: (staffId: string, credId: string, patch: { newExpiry: string; newNumber?: string; newIssued?: string }, actorName: string) => void

  // ── Shifts ────────────────────────────────────────────────────────────
  updateShift: (staffId: string, date: string, shift: ShiftType, actorName?: string) => void
  bulkSetShifts: (updates: ShiftEntry[], actorName: string) => void
  applyShiftPattern: (staffIds: string[], from: string, weeks: number, templateId: string, actorName: string) => void

  // ── Leave ─────────────────────────────────────────────────────────────
  requestLeave: (input: Omit<LeaveRequest, 'id' | 'status' | 'requestedAt'>, actorName?: string) => void
  approveLeave: (id: string, actorName?: string) => void
  rejectLeave: (id: string, actorName?: string) => void

  // ── Duty ──────────────────────────────────────────────────────────────
  assignDuty: (input: Omit<DutyAssignment, 'id' | 'assignedAt'>, actorName: string) => void
  clearDuty: (id: string, actorName: string) => void

  // ── Swap ──────────────────────────────────────────────────────────────
  requestSwap: (input: Omit<SwapRequest, 'id' | 'status' | 'requestedAt'>, actorName: string) => void
  acceptSwap: (id: string, actorName: string) => void
  rejectSwap: (id: string, actorName: string) => void
  approveSwap: (id: string, actorName: string) => void

  // ── Sick call ─────────────────────────────────────────────────────────
  markSickCall: (input: Omit<SickCall, 'id' | 'status' | 'reportedAt'>, actorName: string) => string
  assignReplacement: (sickCallId: string, replacementId: string, actorName: string) => void

  // ── Overtime ──────────────────────────────────────────────────────────
  logOvertime: (input: Omit<OvertimeEntry, 'id' | 'loggedAt'>, actorName: string) => void

  // ── Dept minimums ─────────────────────────────────────────────────────
  setDeptMinimum: (dept: string, patch: Partial<Omit<DeptMinimum, 'department'>>, actorName: string) => void
  addDeptMinimum: (entry: DeptMinimum, actorName: string) => void
  removeDeptMinimum: (dept: string, actorName: string) => void

  // ── Selectors / derived ───────────────────────────────────────────────
  getStaffById: (id: string) => StaffMember | undefined
  getShift: (staffId: string, date: string) => ShiftType
  getOnDuty: (date: string, shift: ShiftType) => StaffMember[]
  getOnShiftToday: () => StaffMember[]
  getExpiringCredentials: (withinDays: number) => { staff: StaffMember; credential: Credential; daysUntilExpiry: number }[]
  getDeptMinimum: (dept: string) => DeptMinimum | undefined
  // Per-shift coverage gauge data: returns { headcount, min, ideal, severity }
  getCoverage: (dept: string, date: string, shift: ShiftType) => { headcount: number; min: number; ideal: number; severity: 'critical' | 'warning' | 'ok'; staff: StaffMember[] }
}

// ─── Audit helper ────────────────────────────────────────────────────────
function audit(
  action: string,
  resource: string,
  resourceId: string,
  detail: string,
  actorName: string,
  actorId: string = 'ADM-01',
) {
  useAuditStore.getState().log({
    userId: actorId, userName: actorName,
    action,
    resource, resourceId,
    detail,
  })
}

// ─── Derived selectors for cross-store consumers ────────────────────────
// Other stores that used to hardcode their own copy of the staff list can now
// derive it live from HR via these helpers.

export type DerivedDirectoryContact = { id: string; name: string; role: Role; department: string }

/** Returns active staff as a messaging-directory-compatible list. */
export function activeDirectory(staff: StaffMember[]): DerivedDirectoryContact[] {
  return staff
    .filter(s => s.status === 'active')
    .map(s => ({ id: s.id, name: s.name, role: s.role, department: s.department }))
}

/** Returns active doctors for the doctor-stats / analytics surfaces. */
export type DerivedDoctorRef = { id: string; name: string; department: string }
export function activeDoctors(staff: StaffMember[]): DerivedDoctorRef[] {
  return staff
    .filter(s => s.status === 'active' && (s.role === 'doctor' || s.role === 'emergency' || s.role === 'ot' || s.role === 'radiology'))
    .map(s => ({ id: s.id, name: s.name, department: s.department }))
}

// ─── Store ──────────────────────────────────────────────────────────────
export const useHRStore = create<HRState>()(
  persist(
    (set, get) => ({
      staff: SEED_STAFF,
      shifts: SEED_SHIFTS,
      leaveRequests: SEED_LEAVES,
      dutyAssignments: SEED_DUTY,
      swapRequests: [],
      sickCalls: [],
      overtimeEntries: [],
      shiftTemplates: SEED_TEMPLATES,
      payrollPeriods: [],
      deptMinimums: SEED_DEPT_MINIMUMS,

      // ── Staff CRUD ────────────────────────────────────────────────────
      addStaff: (input, actorName) => {
        const id = `${input.role.toUpperCase().slice(0, 3)}-${Date.now()}`
        const employeeId = `EMP-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`
        const member: StaffMember = { ...input, id, employeeId, branchId: input.branchId ?? DEFAULT_BRANCH }
        set(s => ({ staff: [...s.staff, member] }))
        audit('hr_staff_created', 'staff', id, `${member.name} (${member.role}/${member.department}) added`, actorName)
        return id
      },

      updateStaff: (id, patch, actorName) => {
        const before = get().staff.find(s => s.id === id)
        if (!before) return
        set(s => ({ staff: s.staff.map(x => x.id === id ? { ...x, ...patch } : x) }))
        const changes = Object.keys(patch).join(', ')
        const isRoleChange = patch.role && patch.role !== before.role
        audit(
          isRoleChange ? 'hr_staff_role_changed' : 'hr_staff_updated',
          'staff', id,
          `${before.name}${isRoleChange ? ` · role ${before.role} → ${patch.role}` : ` · ${changes}`}`,
          actorName,
        )
      },

      deactivateStaff: (id, reason, actorName) => {
        const member = get().staff.find(s => s.id === id)
        if (!member) return
        set(s => ({ staff: s.staff.map(x => x.id === id ? { ...x, status: 'inactive' as const } : x) }))
        audit('hr_staff_deactivated', 'staff', id, `${member.name} deactivated · ${reason}`, actorName)
      },

      reactivateStaff: (id, actorName) => {
        const member = get().staff.find(s => s.id === id)
        if (!member) return
        set(s => ({ staff: s.staff.map(x => x.id === id ? { ...x, status: 'active' as const } : x) }))
        audit('hr_staff_reactivated', 'staff', id, `${member.name} reactivated`, actorName)
      },

      terminateStaff: (id, reason, actorName) => {
        const member = get().staff.find(s => s.id === id)
        if (!member) return
        set(s => ({ staff: s.staff.map(x => x.id === id ? { ...x, status: 'terminated' as const } : x) }))
        audit('hr_staff_terminated', 'staff', id, `${member.name} terminated · ${reason}`, actorName)
      },

      addCredential: (staffId, cred, actorName) => {
        const member = get().staff.find(s => s.id === staffId)
        if (!member) return
        const newCred: Credential = { ...cred, id: `CR-${Date.now()}` }
        set(s => ({
          staff: s.staff.map(x => x.id === staffId ? { ...x, credentials: [...x.credentials, newCred] } : x),
        }))
        audit('hr_credential_added', 'staff_credential', newCred.id,
          `${member.name} · ${cred.label} (${cred.number}) added`, actorName)
      },

      removeCredential: (staffId, credId, actorName) => {
        const member = get().staff.find(s => s.id === staffId)
        const cred = member?.credentials.find(c => c.id === credId)
        if (!member || !cred) return
        set(s => ({
          staff: s.staff.map(x => x.id === staffId
            ? { ...x, credentials: x.credentials.filter(c => c.id !== credId) }
            : x),
        }))
        audit('hr_credential_added', 'staff_credential', credId,
          `${member.name} · ${cred.label} removed`, actorName)
      },

      renewCredential: (staffId, credId, patch, actorName) => {
        const member = get().staff.find(s => s.id === staffId)
        const cred = member?.credentials.find(c => c.id === credId)
        if (!member || !cred) return
        const renewed: Credential = {
          ...cred,
          expiryDate: patch.newExpiry,
          number: patch.newNumber ?? cred.number,
          issuedDate: patch.newIssued ?? new Date().toISOString().split('T')[0]!,
        }
        set(s => ({
          staff: s.staff.map(x => x.id === staffId
            ? { ...x, credentials: x.credentials.map(c => c.id === credId ? renewed : c) }
            : x),
        }))
        audit('hr_credential_added', 'staff_credential', credId,
          `${member.name} · ${cred.label} renewed (expires ${renewed.expiryDate}${renewed.number !== cred.number ? `, new # ${renewed.number}` : ''})`,
          actorName)
      },

      // ── Shifts ───────────────────────────────────────────────────────
      updateShift: (staffId, date, shift, actorName) => {
        const before = get().shifts.find(s => s.staffId === staffId && s.date === date)
        const member = get().staff.find(s => s.id === staffId)
        set(s => {
          const exists = s.shifts.find(sh => sh.staffId === staffId && sh.date === date)
          if (exists) {
            return { shifts: s.shifts.map(sh => sh.staffId === staffId && sh.date === date ? { ...sh, shift } : sh) }
          }
          return { shifts: [...s.shifts, { staffId, date, shift }] }
        })
        if (actorName) {
          audit('hr_shift_set', 'shift', `${staffId}@${date}`,
            `${member?.name ?? staffId} · ${date} · ${before?.shift ?? '—'} → ${shift}`, actorName)
        }
      },

      bulkSetShifts: (updates, actorName) => {
        set(s => {
          const map = new Map(s.shifts.map(sh => [`${sh.staffId}@${sh.date}`, sh]))
          for (const u of updates) map.set(`${u.staffId}@${u.date}`, u)
          return { shifts: Array.from(map.values()) }
        })
        audit('hr_shift_bulk_update', 'shift_bulk', `bulk-${Date.now()}`,
          `${updates.length} shift entries updated`, actorName)
      },

      applyShiftPattern: (staffIds, from, weeks, templateId, actorName) => {
        const template = get().shiftTemplates.find(t => t.id === templateId)
        if (!template) return
        const days = weeks * 7
        const updates: ShiftEntry[] = []
        for (const staffId of staffIds) {
          for (let i = 0; i < days; i++) {
            const d = new Date(from + 'T00:00:00'); d.setDate(d.getDate() + i)
            const date = isoDay(d)
            const shift = template.pattern[i % template.pattern.length]!
            updates.push({ staffId, date, shift })
          }
        }
        set(s => {
          const map = new Map(s.shifts.map(sh => [`${sh.staffId}@${sh.date}`, sh]))
          for (const u of updates) map.set(`${u.staffId}@${u.date}`, u)
          return { shifts: Array.from(map.values()) }
        })
        audit('hr_shift_pattern_applied', 'shift_pattern', `${templateId}-${Date.now()}`,
          `${template.name} applied · ${staffIds.length} staff · ${weeks} weeks from ${from}`, actorName)
      },

      // ── Leave ────────────────────────────────────────────────────────
      requestLeave: (input, actorName) => {
        const lr: LeaveRequest = {
          ...input,
          id: `LV-${Date.now()}`,
          status: 'Pending',
          requestedAt: new Date().toISOString(),
        }
        set(s => ({ leaveRequests: [lr, ...s.leaveRequests] }))
        if (actorName) {
          audit('hr_leave_requested', 'leave', lr.id,
            `${input.staffName} · ${input.fromDate} → ${input.toDate} · ${input.reason}`, actorName)
        }
      },

      approveLeave: (id, actorName) => {
        const leave = get().leaveRequests.find(l => l.id === id)
        if (!leave) return
        set(s => ({
          leaveRequests: s.leaveRequests.map(l => l.id === id ? {
            ...l, status: 'Approved' as const,
            decidedBy: actorName ?? 'ADM-01',
            decidedAt: new Date().toISOString(),
          } : l),
        }))
        audit('hr_leave_approved', 'leave', id,
          `${leave.staffName} · ${leave.fromDate} → ${leave.toDate} approved`, actorName ?? 'Administrator')
      },

      rejectLeave: (id, actorName) => {
        const leave = get().leaveRequests.find(l => l.id === id)
        if (!leave) return
        set(s => ({
          leaveRequests: s.leaveRequests.map(l => l.id === id ? {
            ...l, status: 'Rejected' as const,
            decidedBy: actorName ?? 'ADM-01',
            decidedAt: new Date().toISOString(),
          } : l),
        }))
        audit('hr_leave_rejected', 'leave', id,
          `${leave.staffName} · ${leave.fromDate} → ${leave.toDate} rejected`, actorName ?? 'Administrator')
      },

      // ── Duty ─────────────────────────────────────────────────────────
      assignDuty: (input, actorName) => {
        const id = `DU-${Date.now()}`
        const da: DutyAssignment = { ...input, id, assignedAt: new Date().toISOString() }
        // Replace any existing assignment for the same (staff, date, shift)
        set(s => ({
          dutyAssignments: [
            ...s.dutyAssignments.filter(d => !(d.staffId === input.staffId && d.date === input.date && d.shift === input.shift)),
            da,
          ],
        }))
        const member = get().staff.find(s => s.id === input.staffId)
        audit('hr_duty_assigned', 'duty', id,
          `${member?.name ?? input.staffId} · ${input.date} ${input.shift} → ${input.ward}`, actorName)
      },

      clearDuty: (id, actorName) => {
        const da = get().dutyAssignments.find(d => d.id === id)
        if (!da) return
        const member = get().staff.find(s => s.id === da.staffId)
        set(s => ({ dutyAssignments: s.dutyAssignments.filter(d => d.id !== id) }))
        audit('hr_duty_cleared', 'duty', id,
          `${member?.name ?? da.staffId} · ${da.date} ${da.shift} (${da.ward}) cleared`, actorName)
      },

      // ── Swap ─────────────────────────────────────────────────────────
      requestSwap: (input, actorName) => {
        const sr: SwapRequest = {
          ...input,
          id: `SW-${Date.now()}`,
          status: 'pending_peer',
          requestedAt: new Date().toISOString(),
        }
        set(s => ({ swapRequests: [sr, ...s.swapRequests] }))
        const requester = get().staff.find(s => s.id === input.requesterId)
        const target = get().staff.find(s => s.id === input.targetId)
        audit('hr_swap_requested', 'swap', sr.id,
          `${requester?.name ?? input.requesterId} (${input.requesterDate} ${input.requesterShift}) ⇄ ${target?.name ?? input.targetId} (${input.targetDate} ${input.targetShift})`,
          actorName)
      },

      acceptSwap: (id, actorName) => {
        set(s => ({
          swapRequests: s.swapRequests.map(x => x.id === id ? {
            ...x, status: 'pending_admin' as const,
            peerRespondedAt: new Date().toISOString(),
          } : x),
        }))
        audit('hr_swap_requested', 'swap', id, 'Peer accepted — awaiting admin approval', actorName)
      },

      rejectSwap: (id, actorName) => {
        const sr = get().swapRequests.find(x => x.id === id)
        if (!sr) return
        set(s => ({
          swapRequests: s.swapRequests.map(x => x.id === id ? {
            ...x, status: 'rejected' as const,
            peerRespondedAt: new Date().toISOString(),
          } : x),
        }))
        audit('hr_swap_rejected', 'swap', id, 'Peer rejected swap', actorName)
      },

      approveSwap: (id, actorName) => {
        const sr = get().swapRequests.find(x => x.id === id)
        if (!sr || sr.status !== 'pending_admin') return
        // Swap the shifts
        set(s => {
          const shifts = s.shifts.map(sh => {
            if (sh.staffId === sr.requesterId && sh.date === sr.requesterDate) return { ...sh, shift: sr.targetShift }
            if (sh.staffId === sr.targetId && sh.date === sr.targetDate) return { ...sh, shift: sr.requesterShift }
            return sh
          })
          return {
            shifts,
            swapRequests: s.swapRequests.map(x => x.id === id ? {
              ...x, status: 'approved' as const,
              adminDecidedBy: actorName, adminDecidedAt: new Date().toISOString(),
            } : x),
          }
        })
        audit('hr_swap_approved', 'swap', id, `Swap executed`, actorName)
      },

      // ── Sick call ────────────────────────────────────────────────────
      markSickCall: (input, actorName) => {
        const id = `SC-${Date.now()}`
        const sc: SickCall = { ...input, id, status: 'open', reportedAt: new Date().toISOString() }
        set(s => ({ sickCalls: [sc, ...s.sickCalls] }))
        audit('hr_sick_call', 'sick_call', id,
          `${input.staffName} · ${input.date} ${input.shift}${input.ward ? ` (${input.ward})` : ''} · ${input.reason}`,
          actorName)
        return id
      },

      assignReplacement: (sickCallId, replacementId, actorName) => {
        const sc = get().sickCalls.find(x => x.id === sickCallId)
        const replacement = get().staff.find(s => s.id === replacementId)
        if (!sc || !replacement) return
        set(s => ({
          sickCalls: s.sickCalls.map(x => x.id === sickCallId ? {
            ...x, replacedBy: replacementId, status: 'replaced' as const,
          } : x),
          // Also create the duty assignment for the replacement
          dutyAssignments: [
            ...s.dutyAssignments.filter(d => !(d.staffId === replacementId && d.date === sc.date && d.shift === sc.shift)),
            { id: `DU-${Date.now()}`, staffId: replacementId, date: sc.date, shift: sc.shift,
              ward: sc.ward ?? 'Unassigned', assignedBy: actorName, assignedAt: new Date().toISOString(),
              notes: `Replacement for sick call ${sickCallId}` },
          ],
        }))
        audit('hr_replacement_assigned', 'sick_call', sickCallId,
          `${replacement.name} assigned as replacement for ${sc.staffName}`, actorName)
      },

      // ── Overtime ─────────────────────────────────────────────────────
      logOvertime: (input, actorName) => {
        const ot: OvertimeEntry = { ...input, id: `OT-${Date.now()}`, loggedAt: new Date().toISOString() }
        set(s => ({ overtimeEntries: [ot, ...s.overtimeEntries] }))
        const member = get().staff.find(s => s.id === input.staffId)
        audit('hr_overtime_logged', 'overtime', ot.id,
          `${member?.name ?? input.staffId} · ${input.date} · ${input.hours}h · ${input.reason}`, actorName)
      },

      // ── Dept minimums ──────────────────────────────────────────────
      setDeptMinimum: (dept, patch, actorName) => {
        const before = get().deptMinimums.find(d => d.department === dept)
        if (!before) return
        set(s => ({
          deptMinimums: s.deptMinimums.map(d => d.department === dept ? { ...d, ...patch } : d),
        }))
        const changes = Object.entries(patch).map(([k, v]) => `${k}: ${before[k as keyof DeptMinimum]} → ${v}`).join(' · ')
        useAuditStore.getState().log({
          userId: 'ADM-01', userName: actorName,
          action: 'hr_shift_set',
          resource: 'dept_minimum', resourceId: dept,
          detail: `${dept} requirements · ${changes}`,
        })
      },

      addDeptMinimum: (entry, actorName) => {
        if (get().deptMinimums.some(d => d.department === entry.department)) return
        set(s => ({ deptMinimums: [...s.deptMinimums, entry] }))
        useAuditStore.getState().log({
          userId: 'ADM-01', userName: actorName,
          action: 'hr_shift_set',
          resource: 'dept_minimum', resourceId: entry.department,
          detail: `Added dept minimum · ${entry.department} · min ${entry.min} / ideal ${entry.ideal}`,
        })
      },

      removeDeptMinimum: (dept, actorName) => {
        set(s => ({ deptMinimums: s.deptMinimums.filter(d => d.department !== dept) }))
        useAuditStore.getState().log({
          userId: 'ADM-01', userName: actorName,
          action: 'hr_shift_set',
          resource: 'dept_minimum', resourceId: dept,
          detail: `Removed dept minimum requirement for ${dept}`,
        })
      },

      // ── Selectors ────────────────────────────────────────────────────
      getStaffById: (id) => get().staff.find(s => s.id === id),
      getShift: (staffId, date) =>
        get().shifts.find(s => s.staffId === staffId && s.date === date)?.shift ?? 'Off',
      getOnDuty: (date, shift) => {
        const duties = get().dutyAssignments.filter(d => d.date === date && d.shift === shift)
        const ids = new Set(duties.map(d => d.staffId))
        return get().staff.filter(s => ids.has(s.id))
      },
      getOnShiftToday: () => {
        const t = today()
        const onShiftIds = new Set(
          get().shifts.filter(s => s.date === t && s.shift !== 'Off').map(s => s.staffId),
        )
        return get().staff.filter(s => onShiftIds.has(s.id) && s.status === 'active')
      },
      getDeptMinimum: (dept) => get().deptMinimums.find(d => d.department === dept),

      getCoverage: (dept, date, shift) => {
        const min = get().deptMinimums.find(d => d.department === dept)
        const onShift = get().staff.filter(s => {
          if (s.status !== 'active') return false
          if (s.department !== dept) return false
          const sh = get().shifts.find(x => x.staffId === s.id && x.date === date)
          return sh && sh.shift === shift
        })
        const dutyAssigned = get().dutyAssignments.filter(d => d.date === date && d.shift === shift && d.ward === dept)
        const dutyIds = new Set(dutyAssigned.map(d => d.staffId))
        // Include staff assigned to this ward via duty + those rostered to the dept
        const allIds = new Set([...onShift.map(s => s.id), ...Array.from(dutyIds)])
        const allStaff = Array.from(allIds).map(id => get().staff.find(s => s.id === id)).filter((x): x is StaffMember => !!x)
        const headcount = allStaff.length
        const _min = min?.min ?? 0
        const _ideal = min?.ideal ?? 0
        const severity: 'critical' | 'warning' | 'ok' =
          headcount < _min ? 'critical' :
          headcount < _ideal ? 'warning' : 'ok'
        return { headcount, min: _min, ideal: _ideal, severity, staff: allStaff }
      },

      getExpiringCredentials: (withinDays) => {
        const out: { staff: StaffMember; credential: Credential; daysUntilExpiry: number }[] = []
        const t = today()
        for (const member of get().staff) {
          if (member.status !== 'active') continue
          for (const cred of member.credentials) {
            const d = daysBetween(t, cred.expiryDate)
            if (d <= withinDays) out.push({ staff: member, credential: cred, daysUntilExpiry: d })
          }
        }
        return out.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
      },
    }),
    {
      name: 'agentix-hr', version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
)
