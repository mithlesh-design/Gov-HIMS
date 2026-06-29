import { create } from 'zustand'

export interface CentreCorrespondence {
  id: string
  type: 'letter' | 'circular' | 'fund' | 'programme'
  subject: string
  from: string
  date: string
  dueDate?: string
  status: 'pending' | 'responded' | 'acknowledged' | 'overdue'
  amount?: number
  priority: 'high' | 'medium' | 'low'
}

const _mockCorrespondence: CentreCorrespondence[] = [
  { id: 'cc_001', type: 'fund',       subject: 'NHM Q2 2024-25 fund tranche — ₹187 Cr', from: 'MoHFW Finance Division', date: '2024-06-10', dueDate: '2024-06-30', status: 'pending',   amount: 187_00_00_000, priority: 'high' },
  { id: 'cc_002', type: 'circular',   subject: 'Revised ABDM M3 compliance guidelines', from: 'NHA, New Delhi',         date: '2024-06-05', dueDate: '2024-07-05', status: 'pending',   priority: 'high' },
  { id: 'cc_003', type: 'letter',     subject: 'PM-JAY fraud audit objections — 14 claims', from: 'NHA Audit Cell',     date: '2024-06-08', dueDate: '2024-06-28', status: 'pending',   priority: 'high' },
  { id: 'cc_004', type: 'programme',  subject: 'NPCDCS Q2 programme review — MP performance', from: 'MoHFW NCD Cell',  date: '2024-06-01', status: 'responded',  priority: 'medium' },
  { id: 'cc_005', type: 'circular',   subject: 'Mandatory ABHA for CGHS-linked facilities', from: 'MoHFW ABDM',        date: '2024-05-28', status: 'acknowledged', priority: 'medium' },
  { id: 'cc_006', type: 'fund',       subject: 'Sickle Cell Mission Q2 release — ₹18.4 Cr', from: 'MoHFW (Tribal Health)', date: '2024-06-12', status: 'responded',  amount: 18_40_00_000, priority: 'medium' },
  { id: 'cc_007', type: 'letter',     subject: 'RTI appeal — maternal deaths tribal districts', from: 'CIC / MoHFW',   date: '2024-06-15', dueDate: '2024-06-30', status: 'pending',   priority: 'high' },
  { id: 'cc_008', type: 'programme',  subject: 'RNTCP Q1 performance review — TB notifications', from: 'NTB, Delhi',   date: '2024-05-20', status: 'responded',  priority: 'medium' },
  { id: 'cc_009', type: 'circular',   subject: 'New IPC guidelines for healthcare facilities', from: 'MoHFW',           date: '2024-06-18', dueDate: '2024-07-18', status: 'pending',   priority: 'low' },
  { id: 'cc_010', type: 'fund',       subject: 'RKSK supplementary allocation — ₹4.2 Cr', from: 'MoHFW RCH Division', date: '2024-06-20', status: 'acknowledged', amount: 4_20_00_000, priority: 'low' },
]

interface CentreState {
  correspondence: CentreCorrespondence[]
  loading: boolean
  loaded: boolean
  fetchCorrespondence: () => Promise<void>
}

export const useSecretaryCentreStore = create<CentreState>((set) => ({
  correspondence: [],
  loading: false,
  loaded: false,
  async fetchCorrespondence() {
    set({ loading: true })
    await new Promise(r => setTimeout(r, 300))
    set({ correspondence: _mockCorrespondence.map(c => ({ ...c })), loading: false, loaded: true })
  },
}))
