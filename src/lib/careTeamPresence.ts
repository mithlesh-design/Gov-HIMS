/* S14 — Care-Team Presence engine.
 *
 * Composes "who's on for this patient right now" from useHRStore.staff +
 * shifts + duty + current time-of-day. Returns CareTeamMember[] with
 * presence status (on_shift / on_call / off / handover_pending). Pure
 * function — easy to unit test, easy to swap for a real presence service.
 */

import type { StaffMember, ShiftEntry, DutyAssignment, ShiftType } from "@/store/useHRStore"

export type PresenceStatus = "on_shift" | "on_call" | "off" | "handover_pending"

export interface CareTeamMember {
  staffId: string
  name: string
  role: string                // role label — "Doctor", "Nurse", "Pharmacist"
  department: string
  designation: string
  shift?: ShiftType
  ward?: string
  presence: PresenceStatus
  initials: string
  shiftHours?: string         // "07:00–15:00" style label
}

const SHIFT_RANGES: Record<ShiftType, [number, number]> = {
  Morning: [7, 15],
  Evening: [15, 23],
  Night:   [23, 31],          // 23:00 → 07:00 next day, expressed as 23..31 for modulo math
  Off:     [-1, -1],
}

const SHIFT_LABELS: Record<ShiftType, string> = {
  Morning: "07:00–15:00",
  Evening: "15:00–23:00",
  Night:   "23:00–07:00",
  Off:     "Off duty",
}

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('')
}

function hourFromNow(now: Date = new Date()): number {
  return now.getHours() + now.getMinutes() / 60
}

function isShiftActive(shift: ShiftType, now: Date = new Date()): boolean {
  if (shift === "Off") return false
  const [start, end] = SHIFT_RANGES[shift]
  const h = hourFromNow(now)
  if (start <= end) return h >= start && h < end
  // wrap-around (Night)
  return h >= start || h < (end - 24)
}

function isNearHandover(shift: ShiftType, now: Date = new Date()): boolean {
  if (shift === "Off") return false
  const [, end] = SHIFT_RANGES[shift]
  const h = hourFromNow(now)
  const target = end >= 24 ? end - 24 : end
  return Math.abs(h - target) < 0.75       // within 45 min of shift end
}

interface BuildCtx {
  staff: StaffMember[]
  shifts: ShiftEntry[]
  duty?: DutyAssignment[]
  ward?: string
  department?: string         // filter to a department (e.g. "Cardiology") if set
  now?: Date
}

const ROLE_LABEL: Record<string, string> = {
  doctor: "Doctor", nurse: "Nurse", pharmacy: "Pharmacist", lab: "Lab tech",
  radiology: "Radiologist", reception: "Reception", admin: "Admin",
  ot: "OT staff", bed_manager: "Bed manager", emergency: "ER physician",
  blood_bank: "Blood bank", cssd: "CSSD", dietary: "Dietitian", bmw: "BMW",
  ambulance: "Ambulance crew", housekeeping: "Housekeeping",
  insurance: "Insurance", discharge: "Discharge", quality: "Quality",
  audit_officer: "Audit officer", inventory: "Inventory", mortuary: "Mortuary",
  patient: "Patient",
}

export function buildCareTeamPresence(ctx: BuildCtx): CareTeamMember[] {
  const today = (ctx.now ?? new Date()).toISOString().slice(0, 10)
  const shiftsByStaff = new Map<string, ShiftType>()
  for (const s of ctx.shifts ?? []) {
    if (s.date === today) shiftsByStaff.set(s.staffId, s.shift)
  }
  const dutyByStaff = new Map<string, string>()
  for (const d of ctx.duty ?? []) {
    if (d.date === today) dutyByStaff.set(d.staffId, d.ward)
  }

  const ROLES_INCLUDED = new Set(["doctor", "nurse", "pharmacy", "lab", "radiology", "emergency"])
  const filtered = (ctx.staff ?? [])
    .filter((m) => m.status === "active")
    .filter((m) => ROLES_INCLUDED.has(m.role))
    .filter((m) => !ctx.department || m.department === ctx.department)
    .slice(0, 24)

  const result: CareTeamMember[] = filtered.map((m) => {
    const shift = shiftsByStaff.get(m.id) ?? "Off"
    const ward  = dutyByStaff.get(m.id)
    const active = isShiftActive(shift, ctx.now ?? new Date())
    const nearHandover = isNearHandover(shift, ctx.now ?? new Date())
    let presence: PresenceStatus = "off"
    if (active && nearHandover) presence = "handover_pending"
    else if (active) presence = "on_shift"
    else if (shift !== "Off") presence = "on_call"
    return {
      staffId: m.id,
      name: m.name,
      role: ROLE_LABEL[m.role] ?? m.role,
      department: m.department,
      designation: m.designation,
      shift: shift === "Off" ? undefined : shift,
      ward,
      presence,
      initials: initialsOf(m.name),
      shiftHours: SHIFT_LABELS[shift],
    }
  })

  // Sort: on_shift first, then handover_pending, then on_call, then off.
  const rank: Record<PresenceStatus, number> = { on_shift: 0, handover_pending: 1, on_call: 2, off: 3 }
  return result.sort((a, b) => rank[a.presence] - rank[b.presence] || a.name.localeCompare(b.name))
}
