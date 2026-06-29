import type {
  StaffMember, ShiftEntry, LeaveRequest, DutyAssignment, OvertimeEntry,
  ShiftType,
} from '@/store/useHRStore'
import { SHIFT_HOURS } from '@/store/useHRStore'

// ─────────────────────────────────────────────────────────────────────────
// Admin v2 / Phase 2 / M2.4 — Shift Conflict Engine
//
// Pure functions for detecting wellbeing + safety issues in a roster:
//   • double-booked: same staff has two non-Off shifts on the same date
//   • leave-during-shift: staff is on approved leave but scheduled to work
//   • insufficient_rest: <11h gap between consecutive shifts (NHS standard)
//   • back_to_back_nights: ≥3 consecutive Night shifts (wellbeing concern)
//   • overtime_risk: scheduled hours >48h in any 7-day rolling window
//   • duty_without_shift: assigned to a ward but Off / no shift scheduled
//
// All functions are pure — no store access, easily testable.
// ─────────────────────────────────────────────────────────────────────────

export type ConflictType =
  | 'double_booked'
  | 'leave_during_shift'
  | 'insufficient_rest'
  | 'back_to_back_nights'
  | 'overtime_risk'
  | 'duty_without_shift'

export type ConflictSeverity = 'info' | 'warning' | 'critical'

export interface ShiftConflict {
  type: ConflictType
  severity: ConflictSeverity
  staffId: string
  date: string                  // primary date of the conflict
  message: string               // human-readable description
  detail?: string               // supplementary info
  resolution?: string           // suggested fix
}

const CONFLICT_SEVERITY: Record<ConflictType, ConflictSeverity> = {
  double_booked:       'critical',
  leave_during_shift:  'critical',
  insufficient_rest:   'warning',
  back_to_back_nights: 'warning',
  overtime_risk:       'warning',
  duty_without_shift:  'info',
}

// ─── Date helpers ────────────────────────────────────────────────────────
function parseDate(d: string): Date { return new Date(d + 'T00:00:00') }
function diffDays(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86400000)
}
function shiftEndHourOffset(shift: ShiftType): number {
  // Hours from midnight of `date` to end of shift.
  // Morning 06–14: ends at 14. Evening 14–22: ends at 22.
  // Night 22–06 (next day): ends at 06 next day = 30h from start of date.
  if (shift === 'Morning') return 14
  if (shift === 'Evening') return 22
  if (shift === 'Night')   return 30  // crosses midnight
  return 0
}
function shiftStartHourOffset(shift: ShiftType): number {
  if (shift === 'Morning') return 6
  if (shift === 'Evening') return 14
  if (shift === 'Night')   return 22
  return 0
}

// ─── Per-staff helpers ───────────────────────────────────────────────────
function shiftsForStaff(staffId: string, shifts: ShiftEntry[]): ShiftEntry[] {
  return shifts
    .filter(s => s.staffId === staffId)
    .sort((a, b) => a.date.localeCompare(b.date))
}

function leavesForStaff(staffId: string, leaves: LeaveRequest[]): LeaveRequest[] {
  return leaves.filter(l => l.staffId === staffId && l.status === 'Approved')
}

// ─── Detectors ───────────────────────────────────────────────────────────

/**
 * Same staff assigned to multiple non-Off shifts on the same day. Surfaced
 * when, e.g., a duty assignment fights with the roster, or a manual cell edit
 * creates an overlap.
 */
export function detectDoubleBooked(shifts: ShiftEntry[]): ShiftConflict[] {
  const out: ShiftConflict[] = []
  const grouped = new Map<string, ShiftEntry[]>()
  for (const s of shifts) {
    if (s.shift === 'Off') continue
    const key = `${s.staffId}@${s.date}`
    const list = grouped.get(key) ?? []
    list.push(s)
    grouped.set(key, list)
  }
  for (const [key, list] of grouped) {
    if (list.length > 1) {
      const [staffId, date] = key.split('@')
      out.push({
        type: 'double_booked',
        severity: CONFLICT_SEVERITY.double_booked,
        staffId: staffId!,
        date: date!,
        message: `${list.length} shifts scheduled on the same day`,
        detail: list.map(s => s.shift).join(' + '),
        resolution: 'Remove the extra shift entry',
      })
    }
  }
  return out
}

/**
 * Staff is on approved leave but also scheduled to a non-Off shift during
 * that leave window.
 */
export function detectLeaveDuringShift(
  shifts: ShiftEntry[],
  leaves: LeaveRequest[],
): ShiftConflict[] {
  const out: ShiftConflict[] = []
  const approved = leaves.filter(l => l.status === 'Approved')
  for (const leave of approved) {
    const overlapping = shifts.filter(s =>
      s.staffId === leave.staffId &&
      s.date >= leave.fromDate && s.date <= leave.toDate &&
      s.shift !== 'Off',
    )
    for (const s of overlapping) {
      out.push({
        type: 'leave_during_shift',
        severity: CONFLICT_SEVERITY.leave_during_shift,
        staffId: s.staffId,
        date: s.date,
        message: `Scheduled ${s.shift} during approved leave`,
        detail: `Leave ${leave.fromDate} → ${leave.toDate} · ${leave.reason}`,
        resolution: 'Mark as Off or find replacement',
      })
    }
  }
  return out
}

/**
 * Gap between end of one shift and start of the next is < 11h.
 * NHS junior-doctor standard; NABH HRM expects ≥11h rest between shifts.
 */
export function detectInsufficientRest(shifts: ShiftEntry[]): ShiftConflict[] {
  const out: ShiftConflict[] = []
  const byStaff = new Map<string, ShiftEntry[]>()
  for (const s of shifts) {
    if (s.shift === 'Off') continue
    const list = byStaff.get(s.staffId) ?? []
    list.push(s)
    byStaff.set(s.staffId, list)
  }
  for (const [staffId, list] of byStaff) {
    list.sort((a, b) => a.date.localeCompare(b.date))
    for (let i = 0; i < list.length - 1; i++) {
      const a = list[i]!, b = list[i + 1]!
      const dayGap = diffDays(a.date, b.date)
      if (dayGap > 1) continue  // separated by ≥1 full day
      // hours between end of A and start of B
      const aEnd = shiftEndHourOffset(a.shift)
      const bStartFromADate = (dayGap * 24) + shiftStartHourOffset(b.shift)
      const gap = bStartFromADate - aEnd
      if (gap < 11 && gap >= 0) {
        out.push({
          type: 'insufficient_rest',
          severity: CONFLICT_SEVERITY.insufficient_rest,
          staffId,
          date: b.date,
          message: `Only ${gap}h rest before ${b.shift}`,
          detail: `Previous ${a.shift} on ${a.date} · rest <11h breaches HRM standard`,
          resolution: 'Adjust one shift to extend the rest window',
        })
      }
    }
  }
  return out
}

/**
 * ≥3 consecutive Night shifts. Increases fatigue and patient-safety risk.
 */
export function detectBackToBackNights(shifts: ShiftEntry[]): ShiftConflict[] {
  const out: ShiftConflict[] = []
  const byStaff = new Map<string, ShiftEntry[]>()
  for (const s of shifts) {
    const list = byStaff.get(s.staffId) ?? []
    list.push(s)
    byStaff.set(s.staffId, list)
  }
  for (const [staffId, list] of byStaff) {
    list.sort((a, b) => a.date.localeCompare(b.date))
    let streak = 0
    let streakStart: string | null = null
    for (let i = 0; i < list.length; i++) {
      const cur = list[i]!
      if (cur.shift === 'Night') {
        if (streak === 0) streakStart = cur.date
        streak++
      } else {
        if (streak >= 3 && streakStart) {
          out.push({
            type: 'back_to_back_nights',
            severity: CONFLICT_SEVERITY.back_to_back_nights,
            staffId,
            date: streakStart,
            message: `${streak} consecutive Night shifts`,
            detail: `Streak from ${streakStart}`,
            resolution: 'Break the run with an Off day',
          })
        }
        streak = 0
        streakStart = null
      }
    }
    if (streak >= 3 && streakStart) {
      out.push({
        type: 'back_to_back_nights',
        severity: CONFLICT_SEVERITY.back_to_back_nights,
        staffId,
        date: streakStart,
        message: `${streak} consecutive Night shifts`,
        detail: `Streak from ${streakStart}`,
        resolution: 'Break the run with an Off day',
      })
    }
  }
  return out
}

/**
 * Scheduled hours in any 7-day rolling window >48h.
 * Working Time Directive baseline; many hospitals enforce strictly.
 */
export function detectOvertimeRisk(shifts: ShiftEntry[]): ShiftConflict[] {
  const out: ShiftConflict[] = []
  const byStaff = new Map<string, ShiftEntry[]>()
  for (const s of shifts) {
    const list = byStaff.get(s.staffId) ?? []
    list.push(s)
    byStaff.set(s.staffId, list)
  }
  for (const [staffId, list] of byStaff) {
    list.sort((a, b) => a.date.localeCompare(b.date))
    for (let i = 0; i < list.length; i++) {
      const windowStart = list[i]!.date
      const windowEnd = (() => {
        const d = parseDate(windowStart); d.setDate(d.getDate() + 6)
        return d.toISOString().split('T')[0]!
      })()
      const window = list.filter(s => s.date >= windowStart && s.date <= windowEnd)
      const hours = window.reduce((sum, s) => sum + (SHIFT_HOURS[s.shift]?.hours ?? 0), 0)
      if (hours > 48) {
        out.push({
          type: 'overtime_risk',
          severity: CONFLICT_SEVERITY.overtime_risk,
          staffId,
          date: windowStart,
          message: `${hours}h scheduled in 7-day window`,
          detail: `Window ${windowStart} → ${windowEnd}`,
          resolution: 'Reduce shifts or split with a colleague',
        })
        break  // one alert per staff is enough; don't spam
      }
    }
  }
  return out
}

/**
 * Staff has a duty assignment (ward + shift) on a date where their roster
 * says Off or no shift entry exists.
 */
export function detectDutyWithoutShift(
  shifts: ShiftEntry[],
  duties: DutyAssignment[],
): ShiftConflict[] {
  const out: ShiftConflict[] = []
  const shiftMap = new Map<string, ShiftType>()
  for (const s of shifts) shiftMap.set(`${s.staffId}@${s.date}`, s.shift)
  for (const d of duties) {
    const rosterShift = shiftMap.get(`${d.staffId}@${d.date}`)
    if (!rosterShift || rosterShift === 'Off') {
      out.push({
        type: 'duty_without_shift',
        severity: CONFLICT_SEVERITY.duty_without_shift,
        staffId: d.staffId,
        date: d.date,
        message: `Duty (${d.ward}) on day with no rostered shift`,
        detail: rosterShift === 'Off' ? 'Rostered Off' : 'No roster entry',
        resolution: 'Add a roster shift or clear the duty',
      })
    } else if (rosterShift !== d.shift) {
      out.push({
        type: 'duty_without_shift',
        severity: 'warning',
        staffId: d.staffId,
        date: d.date,
        message: `Duty shift (${d.shift}) ≠ rostered shift (${rosterShift})`,
        detail: `Ward: ${d.ward}`,
        resolution: 'Align duty shift with roster',
      })
    }
  }
  return out
}

// ─── Aggregator ─────────────────────────────────────────────────────────

export interface ConflictDetectInput {
  staff?: StaffMember[]  // optional — used for filtering
  shifts: ShiftEntry[]
  leaves: LeaveRequest[]
  duties: DutyAssignment[]
}

/** Run every detector and return a merged, sorted list of conflicts. */
export function detectAllConflicts(input: ConflictDetectInput): ShiftConflict[] {
  const { shifts, leaves, duties } = input
  return [
    ...detectDoubleBooked(shifts),
    ...detectLeaveDuringShift(shifts, leaves),
    ...detectInsufficientRest(shifts),
    ...detectBackToBackNights(shifts),
    ...detectOvertimeRisk(shifts),
    ...detectDutyWithoutShift(shifts, duties),
  ].sort((a, b) => {
    // critical > warning > info; then by date
    const sevOrder = { critical: 0, warning: 1, info: 2 } as const
    const sevDiff = sevOrder[a.severity] - sevOrder[b.severity]
    if (sevDiff !== 0) return sevDiff
    return a.date.localeCompare(b.date)
  })
}

/** Index conflicts by `${staffId}@${date}` for fast cell-level lookup. */
export function indexConflictsByCell(conflicts: ShiftConflict[]): Map<string, ShiftConflict[]> {
  const idx = new Map<string, ShiftConflict[]>()
  for (const c of conflicts) {
    const key = `${c.staffId}@${c.date}`
    const list = idx.get(key) ?? []
    list.push(c)
    idx.set(key, list)
  }
  return idx
}

/** Compute the highest-severity badge for a cell. */
export function worstSeverity(conflicts: ShiftConflict[]): ConflictSeverity | undefined {
  if (conflicts.length === 0) return undefined
  if (conflicts.some(c => c.severity === 'critical')) return 'critical'
  if (conflicts.some(c => c.severity === 'warning')) return 'warning'
  return 'info'
}

/** Compute scheduled hours per staff over a date range. */
export function hoursWorked(
  shifts: ShiftEntry[],
  fromDate: string,
  toDate: string,
  overtimeEntries: OvertimeEntry[] = [],
): Map<string, { scheduled: number; overtime: number; total: number }> {
  const out = new Map<string, { scheduled: number; overtime: number; total: number }>()
  for (const s of shifts) {
    if (s.date < fromDate || s.date > toDate) continue
    const h = SHIFT_HOURS[s.shift]?.hours ?? 0
    if (h === 0) continue
    const entry = out.get(s.staffId) ?? { scheduled: 0, overtime: 0, total: 0 }
    entry.scheduled += h
    entry.total = entry.scheduled + entry.overtime
    out.set(s.staffId, entry)
  }
  for (const ot of overtimeEntries) {
    if (ot.date < fromDate || ot.date > toDate) continue
    if (!ot.approved) continue
    const entry = out.get(ot.staffId) ?? { scheduled: 0, overtime: 0, total: 0 }
    entry.overtime += ot.hours
    entry.total = entry.scheduled + entry.overtime
    out.set(ot.staffId, entry)
  }
  return out
}
