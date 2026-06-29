import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type IncidentType = 'Fall' | 'Medication Error' | 'Healthcare-Associated Infection' | 'Equipment Failure' | 'Near Miss' | 'Other'
export type IncidentSeverity = 'Low' | 'Medium' | 'High' | 'Critical'

export type Incident = {
  id: string
  type: IncidentType
  severity: IncidentSeverity
  ward: string
  patientId?: string
  patientName?: string
  staffInvolved?: string
  description: string
  correctiveAction?: string
  reportedBy: string
  reportedAt: string
  resolvedAt?: string
  status: 'Open' | 'Under Review' | 'Resolved'
}

export type AuditTask = {
  id: string
  title: string
  frequency: 'Daily' | 'Weekly' | 'Monthly'
  department: string
  dueDate: string
  completedAt?: string
  completedBy?: string
  status: 'Pending' | 'Completed' | 'Overdue'
}

export interface NabhIndicator {
  handHygieneCompliancePct: number
  cauti1000cathdays: number
  clabsi1000linedays: number
  fallRatePer1000patientdays: number
  medicationErrorRate: number
  re30dayReadmissionPct: number
  patientSatisfactionNPS: number
}

interface QualityState {
  incidents: Incident[]
  auditTasks: AuditTask[]
  qualityMetrics: {
    fallsThisMonth: number
    medicationErrors: number
    haiCount: number
    readmissionRate: number
    avgLOS: number
    patientSatisfaction: number
    auditCompletionPct: number
  }
  nabh: NabhIndicator
  addIncident: (incident: Omit<Incident, 'id' | 'reportedAt' | 'status'>) => void
  resolveIncident: (id: string, correctiveAction: string) => void
  completeAuditTask: (id: string, completedBy: string) => void
  updateNabhIndicator: (indicator: keyof NabhIndicator, value: number) => void
}

export const useQualityStore = create<QualityState>()(persist((set) => ({
  incidents: [
    {
      id: 'INC-001',
      type: 'Fall',
      severity: 'Medium',
      ward: 'General Ward',
      patientId: 'PT-10201',
      patientName: 'Raju Singh',
      staffInvolved: 'Nurse Anjali Desai',
      description: 'Patient found on floor near bed. Attempted to walk to washroom without calling nurse. No fractures. Fall risk score was 14 (high).',
      reportedBy: 'Nurse Anjali Desai',
      reportedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
      status: 'Under Review',
    },
    {
      id: 'INC-002',
      type: 'Medication Error',
      severity: 'High',
      ward: 'ICU',
      patientId: 'PT-10204',
      patientName: 'Sunita Devi',
      description: 'Prescribed Metoprolol 25mg but 50mg administered. Patient BP dropped to 88/50. Managed with IV fluids. Reviewed and corrected.',
      correctiveAction: 'Double-check protocol reinforced for all ICU nurses. Incident reviewed in safety huddle.',
      reportedBy: 'Nurse Pooja Nair',
      reportedAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
      resolvedAt: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
      status: 'Resolved',
    },
    {
      id: 'INC-003',
      type: 'Healthcare-Associated Infection',
      severity: 'High',
      ward: 'General Ward',
      patientId: 'PT-10205',
      patientName: 'Anil Sharma',
      description: 'CAUTI suspected. Catheter in situ for 8 days. Urine culture sent. Patient started on empiric antibiotics.',
      reportedBy: 'Dr. Priya Menon',
      reportedAt: new Date(Date.now() - 3600000).toISOString(),
      status: 'Open',
    },
  ],

  auditTasks: [
    { id: 'AUD-001', title: 'Hand hygiene compliance check (all wards)', frequency: 'Daily', department: 'Quality', dueDate: new Date().toISOString().split('T')[0], status: 'Pending' },
    { id: 'AUD-002', title: 'Crash cart readiness — ER', frequency: 'Daily', department: 'Emergency', dueDate: new Date().toISOString().split('T')[0], completedAt: new Date(Date.now() - 3600000).toISOString(), completedBy: 'Dr. Vikram Rathore', status: 'Completed' },
    { id: 'AUD-003', title: 'Medication storage temperature log', frequency: 'Daily', department: 'Pharmacy', dueDate: new Date().toISOString().split('T')[0], status: 'Pending' },
    { id: 'AUD-004', title: 'Infection control bundle compliance (ICU)', frequency: 'Weekly', department: 'ICU', dueDate: new Date(Date.now() - 24 * 3600000).toISOString().split('T')[0], status: 'Overdue' },
    { id: 'AUD-005', title: 'Biomedical waste disposal audit', frequency: 'Weekly', department: 'Quality', dueDate: new Date().toISOString().split('T')[0], status: 'Pending' },
  ],

  qualityMetrics: {
    fallsThisMonth: 3,
    medicationErrors: 1,
    haiCount: 2,
    readmissionRate: 4.2,
    avgLOS: 4.8,
    patientSatisfaction: 87,
    auditCompletionPct: 68,
  },

  nabh: {
    handHygieneCompliancePct: 78,
    cauti1000cathdays: 1.8,
    clabsi1000linedays: 0.9,
    fallRatePer1000patientdays: 2.1,
    medicationErrorRate: 0.4,
    re30dayReadmissionPct: 4.2,
    patientSatisfactionNPS: 67,
  },

  updateNabhIndicator: (indicator, value) =>
    set(s => ({ nabh: { ...s.nabh, [indicator]: value } })),

  addIncident: (incident) =>
    set((s) => ({
      incidents: [
        ...s.incidents,
        { ...incident, id: `INC-${Date.now()}`, reportedAt: new Date().toISOString(), status: 'Open' },
      ],
      qualityMetrics: {
        ...s.qualityMetrics,
        fallsThisMonth: incident.type === 'Fall' ? s.qualityMetrics.fallsThisMonth + 1 : s.qualityMetrics.fallsThisMonth,
        medicationErrors: incident.type === 'Medication Error' ? s.qualityMetrics.medicationErrors + 1 : s.qualityMetrics.medicationErrors,
        haiCount: incident.type === 'Healthcare-Associated Infection' ? s.qualityMetrics.haiCount + 1 : s.qualityMetrics.haiCount,
      },
    })),

  resolveIncident: (id, correctiveAction) =>
    set((s) => ({
      incidents: s.incidents.map(i =>
        i.id === id ? { ...i, status: 'Resolved', correctiveAction, resolvedAt: new Date().toISOString() } : i
      ),
    })),

  completeAuditTask: (id, completedBy) =>
    set((s) => ({
      auditTasks: s.auditTasks.map(t =>
        t.id === id ? { ...t, status: 'Completed', completedAt: new Date().toISOString(), completedBy } : t
      ),
    })),
}),
  {
    name: 'agentix-qualitystore', version: 1,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))
