/* Agentix HIMS — Mock API public surface.
 *
 * Stores import from '@/lib/api' and call typed async methods. The
 * implementation lives in localStorage today; Phase-2 swaps to real REST
 * without changing this surface. See _seed.ts for the demo journey.
 */
export * from './_core'
export { Audit, AuditEntrySchema, installAuditBridge, onAudit } from './audit'
export { Bills, BillSchema, BillLineSchema, PaymentSchema } from './bills'
export { DischargeApi, DischargeSchema } from './discharge'
export { Drugs, DrugSchema } from './drugs'
export { Emergency, ErCaseSchema } from './emergency'
export { Encounters, EncounterSchema } from './encounters'
export { Ipd, BedSchema, IpdStaySchema, VitalSchema, MarDoseSchema, WardSchema } from './ipd'
export { Lab, LabResultSchema } from './lab'
export { Orders, OrderSchema, OrderItemSchema } from './orders'
export { Patients, PatientSchema } from './patients'
export { Pharmacy, PharmacyClaimSchema, DispenseEventSchema, NarcoticLogSchema } from './pharmacy'
export { Prescriptions, PrescriptionSchema, RxLineSchema, SafetyEnvelopeSchema } from './prescriptions'
export { Radiology, RadStudySchema } from './radiology'
export { StaffApi, StaffSchema } from './staff'
export { Visits, VisitSchema, VisitKind, VisitStatus } from './visits'

// Bootstrap helpers
export { ensureSeeded, reseed, runDemoSeed } from './_seed'
