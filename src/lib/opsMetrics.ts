/* Agentix HIMS — Ops command-center metrics (Track C)
 *
 * Pure aggregators that turn the live domain stores into a single operational
 * snapshot for the duty COO: bed occupancy, ER load, OT utilisation, IPD
 * census + ALOS, revenue, claims-at-risk, and staffing. Pure → testable and
 * reusable; the page just renders what these return.
 */

import type { Bed } from '@/store/useAdmissionStore'
import type { ERPatient } from '@/store/useERStore'
import type { OTProcedure } from '@/store/useOTStore'
import type { Inpatient } from '@/store/useInpatientStore'
import type { Bill } from '@/store/useBillingStore'
import type { InsuranceClaim } from '@/store/useInsuranceStore'
import type { StaffMember } from '@/store/useHRStore'

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)

export interface WardOccupancy { ward: string; total: number; occupied: number; pct: number }

export interface BedMetrics {
  total: number; occupied: number; available: number; cleaning: number
  occupancyPct: number; byWard: WardOccupancy[]
}
export function bedMetrics(beds: Bed[]): BedMetrics {
  const occupied = beds.filter(b => b.status === 'Occupied').length
  const available = beds.filter(b => b.status === 'Available').length
  const cleaning = beds.filter(b => b.status === 'Cleaning').length
  const wards = Array.from(new Set(beds.map(b => b.ward)))
  const byWard = wards.map(ward => {
    const w = beds.filter(b => b.ward === ward)
    const occ = w.filter(b => b.status === 'Occupied').length
    return { ward, total: w.length, occupied: occ, pct: pct(occ, w.length) }
  }).sort((a, b) => b.pct - a.pct)
  return { total: beds.length, occupied, available, cleaning, occupancyPct: pct(occupied, beds.length), byWard }
}

export interface ErMetrics {
  active: number; highAcuity: number; awaitingTriage: number; awaitingDisposition: number
}
export function erMetrics(patients: ERPatient[]): ErMetrics {
  const active = patients.filter(p => p.phase !== 'disposed')
  return {
    active: active.length,
    highAcuity: active.filter(p => p.esi != null && p.esi <= 2).length,
    awaitingTriage: active.filter(p => p.phase === 'awaiting_triage').length,
    awaitingDisposition: active.filter(p => p.phase === 'awaiting_disposition').length,
  }
}

export interface OtMetrics {
  total: number; scheduled: number; inProgress: number; completed: number; utilizationPct: number
}
export function otMetrics(procedures: OTProcedure[]): OtMetrics {
  const scheduled = procedures.filter(p => p.status === 'Scheduled' || p.status === 'Pre-Op').length
  const inProgress = procedures.filter(p => p.status === 'In Progress' || p.status === 'Recovery').length
  const completed = procedures.filter(p => p.status === 'Completed').length
  // "In use" = anything off the scheduled list.
  return { total: procedures.length, scheduled, inProgress, completed, utilizationPct: pct(inProgress + completed, procedures.length) }
}

export interface IpdMetrics { census: number; critical: number; alosDays: number; dischargePending: number }
export function ipdMetrics(inpatients: Inpatient[], now: number = Date.now()): IpdMetrics {
  const census = inpatients.filter(i => i.stage !== 'discharged')
  const stays = census
    .map(i => (now - new Date(i.admittedAt).getTime()) / 86_400_000)
    .filter(d => Number.isFinite(d) && d >= 0)
  const alosDays = stays.length ? Math.round((stays.reduce((a, b) => a + b, 0) / stays.length) * 10) / 10 : 0
  return {
    census: census.length,
    critical: census.filter(i => i.condition === 'Critical' || i.condition === 'Serious').length,
    alosDays,
    dischargePending: inpatients.filter(i => i.stage === 'discharge_initiated' || i.condition === 'Discharge-ready').length,
  }
}

export interface RevenueMetrics { collected: number; outstanding: number; settledCount: number; openCount: number }
export function revenueMetrics(bills: Bill[]): RevenueMetrics {
  const collected = bills.reduce((s, b) => s + (b.paidAmount ?? 0), 0)
  const due = (b: Bill) => (b.patientDue ?? b.subtotal ?? 0) - (b.paidAmount ?? 0)
  const outstanding = bills.reduce((s, b) => s + Math.max(0, due(b)), 0)
  return {
    collected,
    outstanding,
    settledCount: bills.filter(b => b.status === 'settled').length,
    openCount: bills.filter(b => b.status !== 'settled').length,
  }
}

export interface ClaimMetrics { atRiskValue: number; rejected: number; pending: number; approved: number }
export function claimMetrics(claims: InsuranceClaim[]): ClaimMetrics {
  const open = claims.filter(c => c.status === 'Pending Pre-Auth' || c.status === 'In Process')
  return {
    atRiskValue: open.reduce((s, c) => s + (c.amount ?? 0), 0),
    rejected: claims.filter(c => c.status === 'Rejected').length,
    pending: open.length,
    approved: claims.filter(c => c.status === 'Approved').length,
  }
}

export interface StaffMetrics { active: number; onLeave: number; total: number }
export function staffMetrics(staff: StaffMember[]): StaffMetrics {
  return {
    active: staff.filter(s => s.status === 'active').length,
    onLeave: staff.filter(s => s.status === 'on_leave').length,
    total: staff.length,
  }
}

export const inr = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${Math.round(n).toLocaleString('en-IN')}`
