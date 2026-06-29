import type { Role } from '@/types/roles'

// ─────────────────────────────────────────────────────────────────────────
// Admin v2 / Phase 0 / M0.3 — Role-Based Access Control as data.
//
// Permissions live in a single matrix keyed by Role × Action. UI calls
// `canDo(role, action)` instead of hardcoding role checks. This makes it
// trivial to add sub-admin roles later (HR Manager, CFO, Quality Lead, etc.)
// without touching call sites.
//
// Pattern:
//   `<domain>.<entity>.<verb>` — e.g., `hr.staff.write`, `finance.read`.
//
// Defaults: `admin` has everything. `audit_officer` has read-everywhere
// + attest. Clinical roles get clinical reads. Patient role gets nothing.
// ─────────────────────────────────────────────────────────────────────────

export const ACTIONS = [
  // HR / Staff
  'hr.staff.read',          // see staff directory
  'hr.staff.write',         // add / edit / deactivate
  'hr.staff.terminate',     // terminate (separate from deactivate — destructive)
  'hr.credential.read',
  'hr.credential.write',
  'hr.shift.read',
  'hr.shift.write',         // edit individual shifts
  'hr.shift.bulk',          // bulk patterns
  'hr.duty.read',
  'hr.duty.write',
  'hr.leave.read',
  'hr.leave.request',       // self-service leave request
  'hr.leave.decide',        // approve / reject
  'hr.swap.request',
  'hr.swap.decide',
  'hr.sick_call.report',
  'hr.sick_call.replace',
  'hr.overtime.log',

  // Finance
  'finance.read',
  'finance.write',          // mutate bills, dispute resolution
  'finance.export',         // CSV / report export
  'finance.payroll',        // payroll close
  'finance.vendor',         // vendor payments

  // Compliance / Audit
  'compliance.read',
  'compliance.attest',      // mark policy attestations
  'audit.read',
  'audit.export',           // export evidence bundles

  // Operations
  'broadcast.send',         // send hospital-wide announcement
  'broadcast.compose',
  'branch.switch',          // change branch context
  'incident.declare',       // declare MCI / outbreak

  // Clinical (typical clinical action gates — reuse existing role guards as needed)
  'clinical.consult.start',
  'clinical.prescribe',
  'clinical.order_test',
  'clinical.discharge',
] as const

export type Action = (typeof ACTIONS)[number]

// ─── Permissions matrix ─────────────────────────────────────────────────
// `admin` gets every action by default. Other roles are explicit allow-lists.

const ADMIN_ALL = new Set<Action>(ACTIONS)

const AUDIT_OFFICER_PERMS = new Set<Action>([
  'hr.staff.read', 'hr.credential.read', 'hr.shift.read', 'hr.duty.read', 'hr.leave.read',
  'finance.read', 'compliance.read', 'compliance.attest',
  'audit.read', 'audit.export',
])

const QUALITY_PERMS = new Set<Action>([
  'hr.staff.read', 'hr.credential.read', 'hr.shift.read', 'hr.duty.read',
  'compliance.read', 'compliance.attest', 'audit.read',
  'incident.declare',
])

const DOCTOR_PERMS = new Set<Action>([
  'hr.staff.read', 'hr.shift.read', 'hr.duty.read',
  'hr.leave.request', 'hr.swap.request', 'hr.sick_call.report',
  'clinical.consult.start', 'clinical.prescribe', 'clinical.order_test', 'clinical.discharge',
])

const NURSE_PERMS = new Set<Action>([
  'hr.staff.read', 'hr.shift.read', 'hr.duty.read',
  'hr.leave.request', 'hr.swap.request', 'hr.sick_call.report',
])

const SUPPORT_PERMS = new Set<Action>([
  'hr.staff.read', 'hr.shift.read', 'hr.duty.read',
  'hr.leave.request', 'hr.swap.request', 'hr.sick_call.report',
])

const BILLING_PERMS = new Set<Action>([
  ...SUPPORT_PERMS,
  'finance.read', 'finance.write',
])

const INSURANCE_PERMS = new Set<Action>([
  ...SUPPORT_PERMS,
  'finance.read',
])

const EMERGENCY_PERMS = new Set<Action>([
  ...DOCTOR_PERMS,
  'incident.declare',
])

const PATIENT_PERMS = new Set<Action>([])

// HR Manager — full control over the HR/HRMS domain.
const HR_PERMS = new Set<Action>([
  'hr.staff.read', 'hr.staff.write', 'hr.staff.terminate',
  'hr.credential.read', 'hr.credential.write',
  'hr.shift.read', 'hr.shift.write', 'hr.shift.bulk',
  'hr.duty.read', 'hr.duty.write',
  'hr.leave.read', 'hr.leave.request', 'hr.leave.decide',
  'hr.swap.request', 'hr.swap.decide',
  'hr.overtime.log',
])

export const PERMISSIONS_MATRIX: Record<Role, ReadonlySet<Action>> = {
  admin:         ADMIN_ALL,
  hr:            HR_PERMS,
  audit_officer: AUDIT_OFFICER_PERMS,
  quality:       QUALITY_PERMS,
  doctor:        DOCTOR_PERMS,
  emergency:     EMERGENCY_PERMS,
  nurse:         NURSE_PERMS,
  pharmacy:      SUPPORT_PERMS,
  lab:           SUPPORT_PERMS,
  radiology:     SUPPORT_PERMS,
  reception:     SUPPORT_PERMS,
  bed_manager:   SUPPORT_PERMS,
  discharge:     SUPPORT_PERMS,
  ot:            DOCTOR_PERMS,
  billing:       BILLING_PERMS,
  insurance:     INSURANCE_PERMS,
  housekeeping:  SUPPORT_PERMS,
  inventory:     SUPPORT_PERMS,
  blood_bank:    SUPPORT_PERMS,
  cssd:          SUPPORT_PERMS,
  dietary:       SUPPORT_PERMS,
  bmw:           SUPPORT_PERMS,
  mortuary:      SUPPORT_PERMS,
  ambulance:       SUPPORT_PERMS,
  vendor_manager:   SUPPORT_PERMS,
  feedback_analyst: QUALITY_PERMS,
  patient:          PATIENT_PERMS,
  cmo:              ADMIN_ALL,
  secretary:        ADMIN_ALL,
}

/**
 * Returns true if a given role is permitted to perform a given action.
 *
 * Usage at any mutation call site:
 *   if (!canDo(currentUser.role, 'hr.staff.write')) {
 *     toast.error('You don\'t have permission to do this'); return
 *   }
 */
export function canDo(role: Role | undefined, action: Action): boolean {
  if (!role) return false
  return PERMISSIONS_MATRIX[role]?.has(action) ?? false
}

/**
 * Throws a `PermissionDenied` if the role can't perform the action.
 * Intended for places where a hard guard is preferable to a soft check.
 */
export class PermissionDenied extends Error {
  constructor(public role: Role, public action: Action) {
    super(`Permission denied: role "${role}" cannot "${action}"`)
    this.name = 'PermissionDenied'
  }
}

export function assertCan(role: Role | undefined, action: Action): void {
  if (!canDo(role, action)) {
    throw new PermissionDenied(role ?? ('unknown' as Role), action)
  }
}

/**
 * Helper for nav filtering — given a list of nav items each with an optional
 * `requires: Action`, filter to only the items the current role may access.
 */
export function filterByPermission<T extends { requires?: Action }>(
  role: Role | undefined,
  items: T[],
): T[] {
  return items.filter(i => !i.requires || canDo(role, i.requires))
}
